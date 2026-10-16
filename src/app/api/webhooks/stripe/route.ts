import { createAdminClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

async function fulfillCheckoutSession(session: Stripe.Checkout.Session) {
  if (session.payment_status !== 'paid' || session.mode !== 'payment') {
    throw new Error('Stripe checkout session is not a paid one-time payment.');
  }

  const orderId = session.client_reference_id || session.metadata?.order_id;
  const userId = session.metadata?.user_id;
  const productId = session.metadata?.product_id;
  if (!orderId || !userId || !productId || session.metadata?.order_id !== orderId) {
    throw new Error('Checkout session is missing order, user, or product identifiers.');
  }

  const supabase = createAdminClient();
  const { data: order, error: orderLookupError } = await supabase
    .from('orders')
    .select('id, user_id, product_id, product_type, amount_cents, currency, status, metadata, payment_intent_id')
    .eq('id', orderId)
    .maybeSingle();
  if (orderLookupError) throw orderLookupError;
  if (!order || order.user_id !== userId || order.product_id !== productId) {
    throw new Error('Checkout session does not match its stored order.');
  }
  if (order.payment_intent_id !== session.id) {
    throw new Error('Checkout session does not match the session stored for this order.');
  }

  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id || session.id;
  const currency = (session.currency || '').toUpperCase();
  if (order.status === 'completed') {
    const { data: priorTransaction, error: priorError } = await supabase
      .from('platform_payment_transactions')
      .select('id')
      .eq('provider', 'stripe')
      .eq('provider_payment_id', paymentIntentId)
      .maybeSingle();
    if (priorError) throw priorError;
    if (priorTransaction) return;
  }

  if (!Number.isSafeInteger(session.amount_total) ||
      session.amount_total !== order.amount_cents ||
      currency !== String(order.currency).toUpperCase()) {
    throw new Error('Stripe payment amount or currency does not match the stored order.');
  }

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, product_type, metadata')
    .eq('id', productId)
    .maybeSingle();
  if (productError) throw productError;
  if (!product || product.product_type !== order.product_type ||
      session.metadata?.product_type !== order.product_type) {
    throw new Error('Product type does not match the stored order.');
  }

  const { error: transactionError } = await supabase
    .from('platform_payment_transactions')
    .upsert({
      provider: 'stripe',
      provider_payment_id: paymentIntentId,
      order_id: orderId,
      user_id: userId,
      amount_cents: session.amount_total,
      currency,
      status: 'paid',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'provider,provider_payment_id' });
  if (transactionError) throw transactionError;

  const now = new Date();
  let expiresAt: string | null = null;
  if (product.product_type === 'signal') {
    const { data: plan, error: planError } = await supabase
      .from('signal_plans')
      .select('duration_days')
      .eq('product_id', productId)
      .limit(1)
      .maybeSingle();
    if (planError) throw planError;
    if (!plan || ![30, 365].includes(plan.duration_days)) {
      throw new Error('VIP signal plan must have a 30-day or 365-day duration.');
    }
    expiresAt = new Date(now.getTime() + plan.duration_days * 24 * 60 * 60 * 1000).toISOString();

    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .upsert({
        order_id: orderId,
        user_id: userId,
        product_id: productId,
        status: 'active',
        starts_at: now.toISOString(),
        ends_at: expiresAt,
        updated_at: now.toISOString(),
      }, { onConflict: 'order_id' });
    if (subscriptionError) throw subscriptionError;
  }

  const deliveryMethod = order.metadata?.delivery_method;
  if (product.product_type === 'bot' && deliveryMethod === 'manual_email') {
    const { data: deliveryRequest, error: deliveryLookupError } = await supabase
      .from('bot_delivery_requests')
      .select('id')
      .eq('order_id', orderId)
      .eq('user_id', userId)
      .maybeSingle();
    if (deliveryLookupError) throw deliveryLookupError;
    if (!deliveryRequest) throw new Error('Verified manual-delivery bot payment has no delivery request.');

    const { error: deliveryUpdateError } = await supabase
      .from('bot_delivery_requests')
      .update({ status: 'pending_delivery', updated_at: now.toISOString() })
      .eq('id', deliveryRequest.id);
    if (deliveryUpdateError) throw deliveryUpdateError;
  } else {
    const accessPayload: Record<string, unknown> = {
      user_id: userId,
      product_id: productId,
      order_id: orderId,
      is_active: true,
      expires_at: expiresAt,
    };
    const { error: accessError } = await supabase
      .from('user_access')
      .upsert(accessPayload, { onConflict: 'user_id,product_id' });
    if (accessError) throw accessError;
  }

  const { error: orderUpdateError } = await supabase
    .from('orders')
    .update({ status: 'completed', updated_at: now.toISOString() })
    .eq('id', orderId)
    .eq('user_id', userId);
  if (orderUpdateError) throw orderUpdateError;
}

export async function POST(request: Request) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature');
    if (!signature) return NextResponse.json({ error: 'Missing Stripe signature.' }, { status: 400 });

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === 'paid') await fulfillCheckoutSession(session);
    } else if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.client_reference_id || session.metadata?.order_id;
      if (orderId) {
        const admin = createAdminClient();
        const { error: orderError } = await admin
          .from('orders')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', orderId)
          .eq('payment_intent_id', session.id)
          .eq('status', 'pending');
        if (orderError) throw orderError;
        const { error: deliveryError } = await admin
          .from('bot_delivery_requests')
          .update({ status: 'payment_failed', updated_at: new Date().toISOString() })
          .eq('order_id', orderId)
          .eq('status', 'pending_payment');
        if (deliveryError) throw deliveryError;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook processing failed:', error);
    return NextResponse.json({ error: 'Webhook processing failed.' }, { status: 500 });
  }
}
