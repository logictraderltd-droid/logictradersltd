import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const productId = params.productId;

    // Get user session
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify product is a bot
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, type')
      .eq('id', productId)
      .eq('type', 'bot')
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found or not a bot' },
        { status: 404 }
      );
    }

    // Check user access
    const { data: accessData, error: accessError } = await supabase
      .from('user_access')
      .select('*')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .eq('is_active', true)
      .single();

    if (accessError || !accessData) {
      return NextResponse.json(
        { error: 'Access denied. Please purchase this bot first.' },
        { status: 403 }
      );
    }

    // Check if access has expired
    if (accessData.access_expires_at) {
      const expiryDate = new Date(accessData.access_expires_at);
      if (expiryDate < new Date()) {
        return NextResponse.json(
          { error: 'Your access to this content has expired.' },
          { status: 403 }
        );
      }
    }

    // Get bot details
    const { data: bot, error: botError } = await supabase
      .from('trading_bots')
      .select('*')
      .eq('product_id', productId)
      .single();

    if (botError || !bot) {
      return NextResponse.json(
        { error: 'Bot details not found' },
        { status: 404 }
      );
    }

    // Generate download token (valid for 24 hours, max 3 downloads)
    const { data: token, error: tokenError } = await supabase
      .from('download_tokens')
      .insert({
        user_id: user.id,
        product_id: productId,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        max_downloads: 3,
      })
      .select()
      .single();

    if (tokenError || !token) {
      console.error('Error creating download token:', tokenError);
      return NextResponse.json(
        { error: 'Failed to generate download token' },
        { status: 500 }
      );
    }

    // Return download info
    return NextResponse.json({
      success: true,
      token: token.token,
      productName: product.name,
      downloadUrl: bot.download_url,
      version: bot.version,
      setupInstructions: bot.setup_instructions,
      requirements: bot.requirements,
      expiresIn: 24 * 60 * 60, // 24 hours in seconds
      maxDownloads: 3,
    });

  } catch (error: any) {
    console.error('Error generating download:', error);
    return NextResponse.json(
      { error: 'Failed to generate download' },
      { status: 500 }
    );
  }
}

// Verify token and initiate download
export async function POST(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token required' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Verify token
    const { data: tokenData, error: tokenError } = await supabase
      .from('download_tokens')
      .select('*')
      .eq('token', token)
      .eq('product_id', params.productId)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 403 }
      );
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Token has expired' },
        { status: 403 }
      );
    }

    // Check if download limit reached
    if (tokenData.download_count >= tokenData.max_downloads) {
      return NextResponse.json(
        { error: 'Download limit reached' },
        { status: 403 }
      );
    }

    // Get bot download URL
    const { data: bot } = await supabase
      .from('trading_bots')
      .select('download_url, version')
      .eq('product_id', params.productId)
      .single();

    if (!bot || !bot.download_url) {
      return NextResponse.json(
        { error: 'Download not available' },
        { status: 404 }
      );
    }

    // Increment download count
    await supabase
      .from('download_tokens')
      .update({
        download_count: tokenData.download_count + 1,
      })
      .eq('token', token);

    // Log download event
    await supabase
      .from('analytics_events')
      .insert({
        user_id: tokenData.user_id,
        event_type: 'bot_download',
        event_data: {
          product_id: params.productId,
          token: token,
          download_count: tokenData.download_count + 1,
        },
      });

    return NextResponse.json({
      success: true,
      downloadUrl: bot.download_url,
      version: bot.version,
      remainingDownloads: tokenData.max_downloads - tokenData.download_count - 1,
    });

  } catch (error: any) {
    console.error('Error processing download:', error);
    return NextResponse.json(
      { error: 'Failed to process download' },
      { status: 500 }
    );
  }
}
