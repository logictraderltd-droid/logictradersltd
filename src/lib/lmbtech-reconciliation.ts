import { createAdminClient } from "@/lib/supabase";
import { fulfillVerifiedOrder } from "@/lib/fulfill-verified-order";
import { getLmbtechTransactionStatus } from "@/lib/lmbtech";

export async function reconcileLmbtechPayment(referenceId: string, callbackTransactionId?: string) {
  const admin = createAdminClient();
  const { data: payment, error: paymentError } = await admin
    .from("lmbtech_payment_requests")
    .select("id, reference_id, order_id, user_id, product_id, amount_rwf, original_amount_cents, status, gateway_transaction_id")
    .eq("reference_id", referenceId)
    .maybeSingle();
  if (paymentError) throw paymentError;
  if (!payment) throw new Error("LMBTech payment reference was not found.");
  if (payment.status === "success") return { status: "success" as const, alreadyProcessed: true };

  const transaction = await getLmbtechTransactionStatus(referenceId);
  if (callbackTransactionId && transaction.transactionId &&
      callbackTransactionId !== transaction.transactionId) {
    throw new Error("LMBTech callback transaction ID did not match the status response.");
  }

  if (transaction.status === "pending") {
    return { status: transaction.status, alreadyProcessed: false };
  }

  if (transaction.status === "success") {
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id, user_id, product_id, product_type, amount_cents, currency, status")
      .eq("id", payment.order_id)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order || order.user_id !== payment.user_id || order.product_id !== payment.product_id ||
        Number(order.amount_cents) !== Number(payment.original_amount_cents) ||
        String(order.currency).toUpperCase() !== "USD" ||
        order.status === "failed" || order.status === "refunded") {
      throw new Error("LMBTech payment does not match a payable order.");
    }

    await fulfillVerifiedOrder({
      orderId: order.id,
      userId: order.user_id,
      grantedByUserId: order.user_id,
      productId: order.product_id,
      productType: order.product_type,
      originalAmountCents: Number(payment.original_amount_cents),
      originalCurrency: "USD",
      paymentId: transaction.transactionId || referenceId,
      paymentAmountMinor: Number(payment.amount_rwf),
      paymentCurrency: "RWF",
      provider: "lmbtech",
    });
  } else {
    const { error: orderError } = await admin
      .from("orders")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("id", payment.order_id)
      .eq("status", "pending");
    if (orderError) throw orderError;
  }

  const { error: updateError } = await admin
    .from("lmbtech_payment_requests")
    .update({
      status: transaction.status,
      gateway_transaction_id: transaction.transactionId || callbackTransactionId || payment.gateway_transaction_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id)
    .neq("status", "success");
  if (updateError) throw updateError;
  return { status: transaction.status, alreadyProcessed: false };
}

export async function reconcileLmbtechPayout(referenceId: string, callbackTransactionId?: string) {
  const admin = createAdminClient();
  const { data: payout, error: payoutError } = await admin
    .from("lmbtech_payouts")
    .select("id, reference_id, status, gateway_transaction_id")
    .eq("reference_id", referenceId)
    .maybeSingle();
  if (payoutError) throw payoutError;
  if (!payout) throw new Error("LMBTech payout reference was not found.");
  if (payout.status === "success") return { status: "success" as const, alreadyProcessed: true };

  const transaction = await getLmbtechTransactionStatus(referenceId);
  if (callbackTransactionId && transaction.transactionId &&
      callbackTransactionId !== transaction.transactionId) {
    throw new Error("LMBTech callback transaction ID did not match the status response.");
  }

  const { error: updateError } = await admin
    .from("lmbtech_payouts")
    .update({
      status: transaction.status,
      gateway_transaction_id: transaction.transactionId || callbackTransactionId || payout.gateway_transaction_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payout.id)
    .neq("status", "success");
  if (updateError) throw updateError;
  return { status: transaction.status, alreadyProcessed: false };
}
