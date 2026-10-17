import { fulfillVerifiedOrder } from "@/lib/fulfill-verified-order";
import { createAdminClient } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let claimedRequestId: string | null = null;
  let claimedAt: string | null = null;
  let fulfillmentCompleted = false;
  let stage = "checking admin authentication";
  const supportReference = crypto.randomUUID();

  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const { data: userRow, error: roleError } = await authClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (roleError) throw roleError;
    if (userRow?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const body = await request.json();
    const requestId = typeof body.requestId === "string" ? body.requestId : "";
    const action = body.action;
    if (!requestId || (action !== "approve" && action !== "reject")) {
      return NextResponse.json({ error: "Choose a payment request and a valid action." }, { status: 400 });
    }

    const admin = createAdminClient();
    stage = "loading payment request";
    const { data: paymentRequest, error: lookupError } = await admin
      .from("manual_payment_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!paymentRequest) return NextResponse.json({ error: "Payment request not found." }, { status: 404 });

    if (action === "reject") {
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";
      if (reason.length < 5 || reason.length > 500) {
        return NextResponse.json({ error: "Enter a rejection reason between 5 and 500 characters." }, { status: 400 });
      }
      stage = "saving rejection";
      const { data: rejected, error: rejectError } = await admin
        .from("manual_payment_requests")
        .update({
          status: "rejected",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason,
          verification_started_at: null,
        })
        .eq("id", requestId)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (rejectError) throw rejectError;
      if (!rejected) {
        return NextResponse.json({ error: "Only pending payment requests can be rejected." }, { status: 409 });
      }
      return NextResponse.json({ success: true, status: "rejected" });
    }

    if (paymentRequest.status === "paid") {
      return NextResponse.json({ success: true, status: "paid", alreadyVerified: true });
    }
    if (paymentRequest.status === "rejected") {
      return NextResponse.json({ error: "Rejected payment requests cannot be approved." }, { status: 409 });
    }
    if (!paymentRequest.transaction_reference) {
      return NextResponse.json({ error: "A customer transaction reference is required before approval." }, { status: 400 });
    }

    const now = new Date().toISOString();
    let claimQuery = admin
      .from("manual_payment_requests")
      .update({ status: "verifying", verification_started_at: now })
      .eq("id", requestId);
    if (paymentRequest.status === "pending") {
      claimQuery = claimQuery.eq("status", "pending");
    } else {
      const staleBefore = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      claimQuery = claimQuery.eq("status", "verifying").lt("verification_started_at", staleBefore);
    }
    const { data: claimed, error: claimError } = await claimQuery.select("id").maybeSingle();
    if (claimError) throw claimError;
    if (!claimed) {
      return NextResponse.json({ error: "This payment request is already being checked." }, { status: 409 });
    }
    claimedRequestId = requestId;
    claimedAt = now;

    stage = "checking linked order";
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id, user_id, product_id, product_type, amount_cents, currency, status")
      .eq("id", paymentRequest.order_id)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order || order.user_id !== paymentRequest.user_id ||
        order.product_id !== paymentRequest.product_id ||
        Number(order.amount_cents) !== Number(paymentRequest.original_amount_cents) ||
        String(order.currency).toUpperCase() !== paymentRequest.original_currency ||
        order.status === "failed" || order.status === "refunded") {
      throw new Error("Payment request does not match a payable order.");
    }

    stage = "granting access and recording payment";
    await fulfillVerifiedOrder({
      orderId: order.id,
      userId: order.user_id,
      productId: order.product_id,
      productType: order.product_type,
      originalAmountCents: Number(paymentRequest.original_amount_cents),
      originalCurrency: paymentRequest.original_currency,
      paymentId: paymentRequest.id,
      paymentAmountMinor: Number(paymentRequest.amount_minor),
      paymentCurrency: paymentRequest.currency,
      provider: paymentRequest.method === "mobile_money" ? "manual_mobile_money" : "manual_binance",
    });
    fulfillmentCompleted = true;

    const verifiedAt = new Date().toISOString();
    stage = "saving approved payment status";
    const { data: verified, error: verifyError } = await admin
      .from("manual_payment_requests")
      .update({
        status: "paid",
        reviewed_by: user.id,
        reviewed_at: verifiedAt,
        verification_started_at: null,
        rejection_reason: null,
      })
      .eq("id", requestId)
      .eq("status", "verifying")
      .select("id")
      .maybeSingle();
    if (verifyError) throw verifyError;
    if (!verified) {
      throw new Error("Payment fulfillment completed, but its verification status could not be saved.");
    }
    return NextResponse.json({ success: true, status: "paid" });
  } catch (error) {
    if (claimedRequestId && claimedAt && !fulfillmentCompleted) {
      const admin = createAdminClient();
      const { error: releaseError } = await admin
        .from("manual_payment_requests")
        .update({ status: "pending", verification_started_at: null })
        .eq("id", claimedRequestId)
        .eq("status", "verifying")
        .eq("verification_started_at", claimedAt);
      if (releaseError) console.error("Unable to release payment verification claim:", releaseError);
    }
    const record = error && typeof error === "object"
      ? error as { code?: unknown; message?: unknown; details?: unknown; hint?: unknown }
      : null;
    const databaseMessage = [
      record?.message,
      record?.details,
      record?.hint,
      error instanceof Error ? error.message : null,
    ].filter((value): value is string => typeof value === "string").join(" ");
    console.error("Unable to verify manual payment:", {
      supportReference,
      stage,
      code: record?.code,
      message: databaseMessage || String(error),
    });
    return NextResponse.json({
      error: `Could not complete payment approval while ${stage}. ${databaseMessage || "Check the server logs for details."}`,
      supportReference,
    }, { status: 500 });
  }
}
