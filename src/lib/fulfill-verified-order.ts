import { createAdminClient } from "@/lib/supabase";

export interface VerifiedOrderPayment {
  orderId: string;
  userId: string;
  productId: string;
  productType: string;
  originalAmountCents: number;
  originalCurrency: string;
  paymentId: string;
  paymentAmountMinor: number;
  paymentCurrency: string;
  provider: string;
}

export async function fulfillVerifiedOrder(payment: VerifiedOrderPayment) {
  const supabase = createAdminClient();
  const { data: order, error: orderLookupError } = await supabase
    .from("orders")
    .select("id, user_id, product_id, product_type, amount_cents, currency, status, metadata")
    .eq("id", payment.orderId)
    .maybeSingle();
  if (orderLookupError) throw orderLookupError;
  if (!order ||
      order.user_id !== payment.userId ||
      order.product_id !== payment.productId ||
      order.product_type !== payment.productType ||
      Number(order.amount_cents) !== payment.originalAmountCents ||
      String(order.currency).toUpperCase() !== payment.originalCurrency.toUpperCase()) {
    throw new Error("Verified payment does not match its stored order.");
  }

  const { data: priorTransaction, error: priorError } = await supabase
    .from("platform_payment_transactions")
    .select("id")
    .eq("provider", payment.provider)
    .eq("provider_payment_id", payment.paymentId)
    .maybeSingle();
  if (priorError) throw priorError;
  if (order.status === "completed" && priorTransaction) return;

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, product_type, metadata")
    .eq("id", payment.productId)
    .maybeSingle();
  if (productError) throw productError;
  if (!product || product.product_type !== payment.productType) {
    throw new Error("Product type does not match the stored order.");
  }

  const { error: transactionError } = await supabase
    .from("platform_payment_transactions")
    .upsert({
      provider: payment.provider,
      provider_payment_id: payment.paymentId,
      order_id: payment.orderId,
      user_id: payment.userId,
      amount_cents: payment.paymentAmountMinor,
      currency: payment.paymentCurrency.toUpperCase(),
      status: "paid",
      updated_at: new Date().toISOString(),
    }, { onConflict: "provider,provider_payment_id" });
  if (transactionError) throw transactionError;

  const now = new Date();
  let expiresAt: string | null = null;
  if (product.product_type === "signal") {
    const { data: plan, error: planError } = await supabase
      .from("signal_plans")
      .select("duration_days")
      .eq("product_id", payment.productId)
      .limit(1)
      .maybeSingle();
    if (planError) throw planError;
    if (!plan || ![30, 365].includes(plan.duration_days)) {
      throw new Error("VIP signal plan must have a 30-day or 365-day duration.");
    }
    expiresAt = new Date(now.getTime() + plan.duration_days * 24 * 60 * 60 * 1000).toISOString();

    const { error: subscriptionError } = await supabase
      .from("subscriptions")
      .upsert({
        order_id: payment.orderId,
        user_id: payment.userId,
        product_id: payment.productId,
        status: "active",
        starts_at: now.toISOString(),
        ends_at: expiresAt,
        updated_at: now.toISOString(),
      }, { onConflict: "order_id" });
    if (subscriptionError) throw subscriptionError;
  }

  const deliveryMethod = order.metadata?.delivery_method;
  if (product.product_type === "bot" && deliveryMethod === "manual_email") {
    const { data: deliveryRequest, error: deliveryLookupError } = await supabase
      .from("bot_delivery_requests")
      .select("id")
      .eq("order_id", payment.orderId)
      .eq("user_id", payment.userId)
      .maybeSingle();
    if (deliveryLookupError) throw deliveryLookupError;
    if (!deliveryRequest) throw new Error("Verified manual-delivery bot payment has no delivery request.");

    const { error: deliveryUpdateError } = await supabase
      .from("bot_delivery_requests")
      .update({ status: "pending_delivery", updated_at: now.toISOString() })
      .eq("id", deliveryRequest.id);
    if (deliveryUpdateError) throw deliveryUpdateError;
  } else {
    const accessPayload: Record<string, unknown> = {
      user_id: payment.userId,
      product_id: payment.productId,
      order_id: payment.orderId,
      is_active: true,
      expires_at: expiresAt,
    };
    const { error: accessError } = await supabase
      .from("user_access")
      .upsert(accessPayload, { onConflict: "user_id,product_id" });
    if (accessError) throw accessError;
  }

  const { error: orderUpdateError } = await supabase
    .from("orders")
    .update({ status: "completed", updated_at: now.toISOString() })
    .eq("id", payment.orderId)
    .eq("user_id", payment.userId);
  if (orderUpdateError) throw orderUpdateError;
}
