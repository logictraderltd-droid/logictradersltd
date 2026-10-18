import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { createAdminClient } from '@/lib/supabase';
import { createServerSupabaseClient } from '@/lib/supabase-server';

function getDownloadSetupError(error: unknown) {
  const dbError = error as { code?: string; message?: string };
  const details = `${dbError?.code || ''} ${dbError?.message || ''}`.toLowerCase();
  if (details.includes('download_tokens') &&
      (details.includes('pgrst205') || details.includes('42p01') || details.includes('schema cache'))) {
    return 'Bot downloads are not enabled in the database yet. Please contact support.';
  }
  return 'Unable to prepare this bot download. Please try again or contact support.';
}

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

    const admin = createAdminClient();

    // Verify product is a bot
    const { data: product, error: productError } = await admin
      .from('products')
      .select('id, name, product_type, metadata')
      .eq('id', productId)
      .eq('product_type', 'bot')
      .maybeSingle();

    if (productError) throw productError;
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found or not a bot' },
        { status: 404 }
      );
    }
    if (product.metadata?.delivery_method === 'manual_email') {
      return NextResponse.json(
        { error: 'This bot is delivered manually by email and cannot be downloaded here.' },
        { status: 409 }
      );
    }

    // Check user access
    const { data: accessData, error: accessError } = await admin
      .from('user_access')
      .select('expires_at')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .eq('is_active', true)
      .maybeSingle();

    if (accessError) throw accessError;
    if (!accessData) {
      return NextResponse.json(
        { error: 'Access denied. Please purchase this bot first.' },
        { status: 403 }
      );
    }

    // Check if access has expired
    if (accessData.expires_at && new Date(accessData.expires_at) <= new Date()) {
      const expiryDate = new Date(accessData.expires_at);
      return NextResponse.json(
        { error: `Your access to this content expired on ${expiryDate.toLocaleDateString()}.` },
        { status: 403 }
      );
    }

    // Get bot details
    const { data: bot, error: botError } = await admin
      .from('bot_links')
      .select('download_url, instructions')
      .eq('product_id', productId)
      .limit(1)
      .maybeSingle();

    if (botError) throw botError;
    if (!bot?.download_url) {
      return NextResponse.json(
        { error: 'A downloadable file is not configured for this bot.' },
        { status: 404 }
      );
    }

    // Generate download token (valid for 24 hours, max 3 downloads)
    const { data: token, error: tokenError } = await admin
      .from('download_tokens')
      .insert({
        token: randomBytes(32).toString('hex'),
        user_id: user.id,
        product_id: productId,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        max_downloads: 3,
      })
      .select()
      .single();

    if (tokenError) throw tokenError;
    if (!token) throw new Error('Download token was not returned after creation.');

    // Return download info
    return NextResponse.json({
      success: true,
      token: token.token,
      productName: product.name,
      downloadUrl: bot.download_url,
      setupInstructions: bot.instructions,
      expiresIn: 24 * 60 * 60, // 24 hours in seconds
      maxDownloads: 3,
    });

  } catch (error) {
    console.error('Error generating download:', error);
    return NextResponse.json(
      { error: getDownloadSetupError(error) },
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
    const token = typeof body.token === 'string' ? body.token : '';

    if (!token) {
      return NextResponse.json(
        { error: 'Token required' },
        { status: 400 }
      );
    }

    const authClient = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const admin = createAdminClient();

    // Verify token
    const { data: tokenData, error: tokenError } = await admin
      .from('download_tokens')
      .select('user_id, product_id, expires_at, download_count, max_downloads')
      .eq('token', token)
      .eq('product_id', params.productId)
      .maybeSingle();

    if (tokenError) throw tokenError;
    if (!tokenData || tokenData.user_id !== user.id) {
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
    const { data: product, error: productError } = await admin
      .from('products')
      .select('id, product_type, metadata')
      .eq('id', params.productId)
      .maybeSingle();
    if (productError) throw productError;
    if (!product || product.product_type !== 'bot' || product.metadata?.delivery_method === 'manual_email') {
      return NextResponse.json({ error: 'This bot is not available for download.' }, { status: 409 });
    }

    const { data: accessData, error: accessError } = await admin
      .from('user_access')
      .select('expires_at')
      .eq('user_id', user.id)
      .eq('product_id', params.productId)
      .eq('is_active', true)
      .maybeSingle();
    if (accessError) throw accessError;
    if (!accessData) {
      return NextResponse.json({ error: 'Access denied. Please purchase this bot first.' }, { status: 403 });
    }
    if (accessData.expires_at && new Date(accessData.expires_at) <= new Date()) {
      return NextResponse.json({ error: 'Your access to this content has expired.' }, { status: 403 });
    }

    const { data: bot, error: botError } = await admin
      .from('bot_links')
      .select('download_url')
      .eq('product_id', params.productId)
      .limit(1)
      .maybeSingle();
    if (botError) throw botError;

    if (!bot?.download_url) {
      return NextResponse.json(
        { error: 'A downloadable file is not configured for this bot.' },
        { status: 404 }
      );
    }

    // Increment download count
    const { data: updatedToken, error: updateError } = await admin
      .from('download_tokens')
      .update({
        download_count: tokenData.download_count + 1,
      })
      .eq('token', token)
      .eq('download_count', tokenData.download_count)
      .lt('download_count', tokenData.max_downloads)
      .select('token')
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updatedToken) {
      return NextResponse.json(
        { error: 'Download limit reached or this token has already been used.' },
        { status: 409 }
      );
    }

    // Log download event
    const { error: analyticsError } = await admin
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
    if (analyticsError) console.error('Unable to record bot download analytics:', analyticsError);

    return NextResponse.json({
      success: true,
      downloadUrl: bot.download_url,
      remainingDownloads: tokenData.max_downloads - tokenData.download_count - 1,
    });

  } catch (error) {
    console.error('Error processing download:', error);
    return NextResponse.json(
      { error: getDownloadSetupError(error) },
      { status: 500 }
    );
  }
}
