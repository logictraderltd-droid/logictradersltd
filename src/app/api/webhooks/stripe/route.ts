import { createAdminClient } from "@/lib/supabase";
import { fulfillVerifiedOrder } from "@/lib/fulfill-verified-order";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

async function fulfillCheckoutSession(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid" || session.mode !== "payment") {
    throw new Error("Stripe checkout session is not a paid one-time payment.");
  }

  const orderId = session.client_reference_id || session.metadata?.order_id;
  const userId = session.metadata?.user_id;
  const productId = session.metadata?.product_id;
  if (!orderId || !userId || !productId || session.metadata?.order_id !== orderId) {
    throw new Error("Checkout session is missing order, user, or product identifiers.");
  }

  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id || session.id;
  const currency = (session.currency || "").toUpperCase();
  if (!Number.isSafeInteger(session.amount_total)) {
    throw new Error("Stripe payment amount is invalid.");
  }

  const supabase = createAdminClient();
  const { data: order, error: orderLookupError } = await supabase
    .from("orders")
    .select("id, user_id, product_id, product_type, amount_cents, currency, payment_intent_id")
    .eq("id", orderId)
    .maybeSingle();
  if (orderLookupError) throw orderLookupError;
  if (!order ||
      order.user_id !== userId ||
      order.product_id !== productId ||
      order.payment_intent_id !== session.id ||
      session.metadata?.product_type !== order.product_type ||
      Number(order.amount_cents) !== session.amount_total ||
      String(order.currency).toUpperCase() !== currency) {
    throw new Error("Stripe checkout session does not match its stored order.");
  }

  await fulfillVerifiedOrder({
    orderId,
    userId,
    productId,
    productType: order.product_type,
    originalAmountCents: Number(order.amount_cents),
    originalCurrency: currency,
    paymentId: paymentIntentId,
    paymentAmountMinor: session.amount_total,
    paymentCurrency: currency,
    provider: "stripe",
  });
}

export async function POST(request: Request) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("stripe-signature");
    if (!signature) return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error) {
      console.error("Webhook signature verification failed:", error);
      return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
    }

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.payment_status === "paid") await fulfillCheckoutSession(session);
    } else if (event.type === "checkout.session.expired") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.client_reference_id || session.metadata?.order_id;
      if (orderId) {
        const admin = createAdminClient();
        const { error: orderError } = await admin
          .from("orders")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", orderId)
          .eq("payment_intent_id", session.id)
          .eq("status", "pending");
        if (orderError) throw orderError;
        const { error: deliveryError } = await admin
          .from("bot_delivery_requests")
          .update({ status: "payment_failed", updated_at: new Date().toISOString() })
          .eq("order_id", orderId)
          .eq("status", "pending_payment");
        if (deliveryError) throw deliveryError;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed:", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
