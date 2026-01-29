import { createAdminClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  console.log("🔔 Webhook received!");
  try {
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.client_reference_id || session.metadata?.order_id;

        console.log(`Processing checkout session for order: ${orderId}`);

        if (orderId) {
          // Update order status
          const { error: orderError } = await supabase
            .from('orders')
            .update({
              status: 'completed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', orderId);

          if (orderError) {
            console.error('Error updating order:', orderError);
          } else {
            // 1. Create/Record Payment Record
            const { error: paymentError } = await supabase
              .from('payments')
              .upsert({
                user_id: session.metadata?.user_id || '',
                order_id: orderId,
                amount: session.amount_total ? session.amount_total / 100 : 0,
                currency: session.currency?.toUpperCase() || 'USD',
                provider: 'stripe',
                provider_payment_id: session.payment_intent as string || session.id,
                status: 'completed',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, { onConflict: 'provider_payment_id' });

            if (paymentError) console.error('Error creating payment record:', paymentError);

            // 2. Grant Access
            if (session.metadata?.user_id && session.metadata?.product_id && session.metadata?.product_type) {
              const { error: accessError } = await supabase
                .from('user_access')
                .upsert({
                  user_id: session.metadata.user_id,
                  product_id: session.metadata.product_id,
                  product_type: session.metadata.product_type,
                  is_active: true,
                  starts_at: new Date().toISOString()
                }, { onConflict: 'user_id,product_id' });
              // ...

              if (accessError) {
                console.error('Failed to grant access:', accessError);
              } else {
                console.log('✅ Access granted successfully!');
              }
            }
          }
        }
        break;
      }

      case 'payment_intent.succeeded': {
        // Handle standalone payment intents (if any)
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        if (!paymentIntent.metadata.order_id) break; // Skip if no order_id (likely from checkout)

        // ... existing logic ...
        const { error: paymentError } = await supabase
          .from('payments')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString(),
          })
          .eq('provider_payment_id', paymentIntent.id);

        if (paymentError) console.error('Error updating payment:', paymentError);

        const { error: orderError } = await supabase
          .from('orders')
          .update({
            status: 'completed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', paymentIntent.metadata.order_id);

        if (orderError) console.error('Error updating order:', orderError);

        // Also grant access here just in case
        if (paymentIntent.metadata?.user_id && paymentIntent.metadata?.product_id) {
          await supabase.from('user_access').insert({
            user_id: paymentIntent.metadata.user_id,
            product_id: paymentIntent.metadata.product_id,
            product_type: paymentIntent.metadata.product_type || 'course', // fallback
            is_active: true
          });
        }

        break;
      }

      case 'payment_intent.payment_failed': {
        // ... same as before but cleaner log ...
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('Payment failed:', paymentIntent.id);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
