import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { getMTNMoMoClient } from '@/lib/mtn-momo';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { referenceId, status } = body;

    if (!referenceId) {
      return NextResponse.json(
        { error: 'Missing referenceId' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Find payment by reference ID
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*, orders(*)')
      .eq('provider_payment_id', referenceId)
      .eq('provider', 'mtn_momo')
      .single();

    if (paymentError || !payment) {
      console.error('Payment not found for reference:', referenceId);
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Verify payment status with MTN API
    const mtnClient = getMTNMoMoClient();
    const paymentStatus = await mtnClient.getPaymentStatus(referenceId);

    if (!paymentStatus) {
      console.error('Failed to verify payment status from MTN');
      return NextResponse.json(
        { error: 'Failed to verify payment' },
        { status: 500 }
      );
    }

    // Map MTN status to our status
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

    // Update payment
    await supabase
      .from('payments')
      .update({
        status: newPaymentStatus,
        metadata: {
          ...payment.metadata,
          financial_transaction_id: paymentStatus.financialTransactionId,
          webhook_received_at: new Date().toISOString(),
        },
      })
      .eq('id', payment.id);

    // Update order
    await supabase
      .from('orders')
      .update({ status: newOrderStatus })
      .eq('id', payment.order_id);

    // If successful, grant access
    if (paymentStatus.status === 'SUCCESSFUL') {
      const order = payment.orders;

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
        await supabase
          .from('user_access')
          .upsert({
            user_id: order.user_id,
            product_id: product.id,
            product_type: product.type,
            access_granted_at: new Date().toISOString(),
            access_expires_at: accessExpiresAt,
            is_active: true,
            granted_by: 'payment',
            order_id: order.id,
          }, {
            onConflict: 'user_id,product_id',
          });

        // Create subscription for signal plans
        if (product.type === 'signal' && accessExpiresAt) {
          await supabase
            .from('subscriptions')
            .upsert({
              user_id: order.user_id,
              plan_id: product.id,
              status: 'active',
              current_period_start: new Date().toISOString(),
              current_period_end: accessExpiresAt,
            }, {
              onConflict: 'user_id,plan_id',
            });
        }

        // Create notification
        await supabase
          .from('notifications')
          .insert({
            user_id: order.user_id,
            type: 'payment',
            title: 'Payment Successful',
            message: `Your payment for ${product.name} has been confirmed. You now have full access!`,
            link: product.type === 'course'
              ? `/courses/${product.id}`
              : product.type === 'signal'
                ? `/signals/${product.id}`
                : `/bots/${product.id}`,
          });
      }
    } else if (paymentStatus.status === 'FAILED') {
      // Create notification for failed payment
      await supabase
        .from('notifications')
        .insert({
          user_id: payment.user_id,
          type: 'payment',
          title: 'Payment Failed',
          message: `Your payment attempt failed. Please try again or contact support.`,
          link: `/checkout?productId=${payment.orders.product_id}`,
        });
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
    });
  } catch (error: any) {
    console.error('MTN MoMo webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
