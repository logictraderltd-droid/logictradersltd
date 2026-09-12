import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getMTNMoMoClient } from '@/lib/mtn-momo';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productId, phoneNumber } = body;

    if (!productId || !phoneNumber) {
      return NextResponse.json(
        { error: 'Missing required fields: productId and phoneNumber' },
        { status: 400 }
      );
    }

    // Validate phone number format
    const phoneRegex = /^(\+256|0)?[7][0-9]{8}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Use format: 07XXXXXXXX or +256XXXXXXXXX' },
        { status: 400 }
      );
    }

    // Get product details
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('is_active', true)
      .single();

    if (productError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Check if user already has access
    const { data: existingAccess } = await supabase
      .from('user_access')
      .select('*')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .eq('is_active', true)
      .single();

    if (existingAccess) {
      return NextResponse.json(
        { error: 'You already have access to this product' },
        { status: 400 }
      );
    }

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        product_id: productId,
        product_type: product.type,
        amount: product.price,
        currency: product.currency,
        status: 'pending',
        payment_method: 'mtn_momo',
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('Failed to create order:', orderError);
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      );
    }

    // Initialize MTN Mobile Money payment
    const mtnClient = getMTNMoMoClient();
    const paymentResult = await mtnClient.requestPayment({
      amount: parseFloat(product.price),
      phoneNumber,
      orderId: order.id,
      description: `Payment for ${product.name}`,
    });

    if (!paymentResult.success) {
      // Update order status to failed
      await supabase
        .from('orders')
        .update({ status: 'failed' })
        .eq('id', order.id);

      return NextResponse.json(
        { error: paymentResult.error || 'Payment initialization failed' },
        { status: 400 }
      );
    }

    // Create payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: order.id,
        user_id: user.id,
        amount: product.price,
        currency: product.currency,
        provider: 'mtn_momo',
        provider_payment_id: paymentResult.referenceId,
        status: 'pending',
        metadata: {
          phone_number: phoneNumber,
        },
      });

    if (paymentError) {
      console.error('Failed to create payment record:', paymentError);
    }

    // Update order with payment processing status
    await supabase
      .from('orders')
      .update({ status: 'processing' })
      .eq('id', order.id);

    return NextResponse.json({
      success: true,
      orderId: order.id,
      referenceId: paymentResult.referenceId,
      message: 'Payment request sent. Please approve on your phone.',
      instructions: [
        '1. Check your phone for MTN Mobile Money prompt',
        '2. Enter your PIN to approve the payment',
        '3. Wait for confirmation',
      ],
    });
  } catch (error: any) {
    console.error('MTN MoMo payment creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
