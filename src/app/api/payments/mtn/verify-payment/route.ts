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
    const { referenceId, orderId } = body;

    if (!referenceId || !orderId) {
      return NextResponse.json(
        { error: 'Missing required fields: referenceId and orderId' },
        { status: 400 }
      );
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check payment status from MTN
    const mtnClient = getMTNMoMoClient();
    const paymentStatus = await mtnClient.getPaymentStatus(referenceId);

    if (!paymentStatus) {
      return NextResponse.json(
        { error: 'Failed to verify payment status' },
        { status: 500 }
      );
    }

    // Get payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .eq('provider_payment_id', referenceId)
      .single();

    if (paymentError || !payment) {
      console.error('Payment record not found:', paymentError);
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      );
    }

    // Update payment status based on MTN response
    let newPaymentStatus: string;
    let newOrderStatus: string;

    switch (paymentStatus.status) {
      case 'SUCCESSFUL':
        newPaymentStatus = 'completed';
        newOrderStatus = 'completed';
        break;
      case 'FAILED':
        newPaymentStatus = 'failed';
        newOrderStatus = 'failed';
        break;
      case 'PENDING':
      default:
        newPaymentStatus = 'pending';
        newOrderStatus = 'processing';
        break;
    }

    // Update payment record
    const { error: updatePaymentError } = await supabase
      .from('payments')
      .update({
        status: newPaymentStatus,
        metadata: {
          ...payment.metadata,
          financial_transaction_id: paymentStatus.financialTransactionId,
          verified_at: new Date().toISOString(),
        },
      })
      .eq('id', payment.id);

    if (updatePaymentError) {
      console.error('Failed to update payment:', updatePaymentError);
    }

    // Update order status
    const { error: updateOrderError } = await supabase
      .from('orders')
      .update({ status: newOrderStatus })
      .eq('id', orderId);

    if (updateOrderError) {
      console.error('Failed to update order:', updateOrderError);
    }

    // If payment is successful, grant access
    if (paymentStatus.status === 'SUCCESSFUL') {
      // Get product details
      const { data: product } = await supabase
        .from('products')
        .select('*')
        .eq('id', order.product_id)
        .single();

      if (product) {
        // Calculate expiry for signal subscriptions
        let accessExpiresAt = null;
        if (product.type === 'signal') {
          const { data: signalPlan } = await supabase
            .from('signal_plans')
            .select('*')
            .eq('product_id', product.id)
            .single();

          if (signalPlan) {
            const now = new Date();
            if (signalPlan.interval === 'weekly') {
              accessExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
            } else if (signalPlan.interval === 'monthly') {
              accessExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
            }
          }
        }

        // Grant access
        const { error: accessError } = await supabase
          .from('user_access')
          .upsert({
            user_id: user.id,
            product_id: product.id,
            product_type: product.type,
            access_granted_at: new Date().toISOString(),
            access_expires_at: accessExpiresAt,
            is_active: true,
            granted_by: 'payment',
            order_id: orderId,
          }, {
            onConflict: 'user_id,product_id',
          });

        if (accessError) {
          console.error('Failed to grant access:', accessError);
        }

        // Create subscription for signal plans
        if (product.type === 'signal' && accessExpiresAt) {
          const { error: subscriptionError } = await supabase
            .from('subscriptions')
            .upsert({
              user_id: user.id,
              plan_id: product.id,
              status: 'active',
              current_period_start: new Date().toISOString(),
              current_period_end: accessExpiresAt,
            }, {
              onConflict: 'user_id,plan_id',
            });

          if (subscriptionError) {
            console.error('Failed to create subscription:', subscriptionError);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      status: paymentStatus.status,
      order: {
        id: order.id,
        status: newOrderStatus,
      },
      payment: {
        status: newPaymentStatus,
        transactionId: paymentStatus.financialTransactionId,
      },
      message:
        paymentStatus.status === 'SUCCESSFUL'
          ? 'Payment successful! You now have access to the product.'
          : paymentStatus.status === 'FAILED'
            ? 'Payment failed. Please try again.'
            : 'Payment is still processing. Please check back in a moment.',
    });
  } catch (error: any) {
    console.error('MTN MoMo payment verification error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
