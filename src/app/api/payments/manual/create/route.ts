import {
  formatSettlementAmount,
  verifyManualPaymentQuote,
  type ManualPaymentQuote,
} from "@/lib/manual-payments";
import { createAdminClient } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

function getPaymentRequestErrorMessage(error: unknown) {
  const record = error && typeof error === "object"
    ? error as { code?: unknown; message?: unknown; details?: unknown }
    : null;
  const code = typeof record?.code === "string" ? record.code : "";
  const details = [
    record?.message,
    record?.details,
    error instanceof Error ? error.message : null,
  ].filter((value): value is string => typeof value === "string").join(" ");

  if (/manual_payment_requests/i.test(details) &&
      (["42P01", "42703", "PGRST204", "PGRST205"].includes(code) ||
        /(does not exist|not found|schema cache|could not find)/i.test(details))) {
    return "Payment setup is incomplete. Ask the site administrator to apply supabase/migrations/2026-10-18-manual-payments.sql to the production Supabase project.";
  }
  if (/SUPABASE_SERVICE_ROLE_KEY|service role key is missing/i.test(details)) {
    return "The payment service is not fully configured. Contact the site administrator.";
  }
  if (code === "42501" || /permission denied|not authorized/i.test(details)) {
    return "The payment service could not access the order database. Contact the site administrator.";
  }
  return "Unable to save your payment request. No payment was confirmed. Retry, or use the Mobile Money fallback below and contact the site administrator with your transaction reference.";
}

function paymentRequestResponse(request: {
  id: string;
  order_id: string;
  method: string;
  amount_minor: number;
  currency: "RWF" | "USDT";
  display_amount_minor: number;
  display_currency: "USD" | "RWF" | "USDT";
  original_amount_cents: number;
  original_currency: string;
  exchange_rate: number;
  rate_source: string;
  rate_as_of: string;
  quote_expires_at: string;
  sender_phone: string | null;
  customer_binance_id: string | null;
  transaction_reference: string | null;
  status: string;
}) {
  return {
    id: request.id,
    orderId: request.order_id,
    method: request.method,
    amountMinor: request.amount_minor,
    currency: request.currency,
    amount: formatSettlementAmount(request.amount_minor, request.currency),
    displayCurrency: request.display_currency,
    displayAmount: formatSettlementAmount(request.display_amount_minor, request.display_currency),
    originalAmount: request.original_amount_cents / 100,
    originalCurrency: request.original_currency,
    exchangeRate: Number(request.exchange_rate),
    rateSource: request.rate_source,
    rateAsOf: request.rate_as_of,
    quoteExpiresAt: request.quote_expires_at,
    senderPhone: request.sender_phone,
    customerBinanceId: request.customer_binance_id,
    transactionReference: request.transaction_reference,
    status: request.status,
  };
}

async function markOrderCreationFailed(
  admin: ReturnType<typeof createAdminClient>,
  orderId: string,
  deliveryRequestCreated: boolean,
) {
  const { error: orderError } = await admin
    .from("orders")
    .update({ status: "failed" })
    .eq("id", orderId)
    .eq("status", "pending");
  if (orderError) console.error("Unable to mark incomplete manual-payment order as failed:", orderError);
  if (deliveryRequestCreated) {
    const { error: deliveryError } = await admin
      .from("bot_delivery_requests")
      .update({ status: "payment_failed" })
      .eq("order_id", orderId)
      .eq("status", "pending_payment");
    if (deliveryError) console.error("Unable to mark incomplete bot delivery request as failed:", deliveryError);
  }
}

export async function POST(request: Request) {
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Please sign in before checkout." }, { status: 401 });
    }

    const body = await request.json();
    const token = typeof body.quoteToken === "string" ? body.quoteToken : "";
    let quote: ManualPaymentQuote;
    try {
      quote = verifyManualPaymentQuote(token, user.id);
    } catch (error) {
      return NextResponse.json({
        error: error instanceof Error ? error.message : "The payment quote is invalid or expired.",
        refreshQuote: true,
      }, { status: 409 });
    }

    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    if (fullName.length < 2 || fullName.length > 150) {
      return NextResponse.json({ error: "Enter your full name." }, { status: 400 });
    }
    const reference = typeof body.transactionReference === "string"
      ? body.transactionReference.trim()
      : "";
    if (reference && (reference.length < 3 || reference.length > 120)) {
      return NextResponse.json({ error: "Enter a transaction reference between 3 and 120 characters." }, { status: 400 });
    }

    let senderPhone: string | null = null;
    let customerBinanceId: string | null = null;
    if (quote.method === "mobile_money") {
      const rawPhone = typeof body.senderPhone === "string" ? body.senderPhone.trim() : "";
      const phone = rawPhone.replace(/[()\s-]/g, "");
      if (!/^\+?[1-9]\d{7,14}$/.test(phone)) {
        return NextResponse.json({ error: "Enter a valid Mobile Money sender phone number." }, { status: 400 });
      }
      senderPhone = phone;
    } else {
      const binanceId = typeof body.customerBinanceId === "string"
        ? body.customerBinanceId.trim()
        : "";
      if (binanceId.length < 3 || binanceId.length > 64 || binanceId === "536834998") {
        return NextResponse.json({ error: "Enter your own Binance ID, not the recipient ID." }, { status: 400 });
      }
      customerBinanceId = binanceId;
    }

    const admin = createAdminClient();
    const { data: product, error: productError } = await admin
      .from("products")
      .select("id, name, description, product_type, price_cents, currency, thumbnail_url, is_active, metadata")
      .eq("id", quote.productId)
      .maybeSingle();
    if (productError) throw productError;
    if (!product || !product.is_active || product.metadata?.is_free === true ||
        Number(product.price_cents) !== quote.originalAmountCents ||
        String(product.currency || "USD").toUpperCase() !== quote.originalCurrency) {
      return NextResponse.json({ error: "The product price changed or this product is unavailable. Request a new quote." }, { status: 409 });
    }

    const { data: existingRequest, error: existingError } = await admin
      .from("manual_payment_requests")
      .select("id, order_id, method, amount_minor, currency, display_amount_minor, display_currency, original_amount_cents, original_currency, exchange_rate, rate_source, rate_as_of, quote_expires_at, sender_phone, customer_binance_id, transaction_reference, status")
      .eq("user_id", user.id)
      .eq("product_id", product.id)
      .in("status", ["pending", "verifying"])
      .maybeSingle();
    if (existingError) throw existingError;
    if (existingRequest) {
      return NextResponse.json({ request: paymentRequestResponse(existingRequest), reused: true });
    }

    let botCustomer: { email: string; mt5_account_number: string } | null = null;
    const deliveryMethod = product.product_type === "bot"
      ? product.metadata?.delivery_method === "manual_email" ? "manual_email" : "automatic_download"
      : null;
    if (deliveryMethod === "manual_email") {
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const mt5AccountNumber = typeof body.mt5AccountNumber === "string"
        ? body.mt5AccountNumber.trim()
        : "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
          mt5AccountNumber.length < 3 || mt5AccountNumber.length > 64) {
        return NextResponse.json({ error: "Enter a valid delivery email and MT5 account number." }, { status: 400 });
      }
      botCustomer = { email, mt5_account_number: mt5AccountNumber };
    }

    if (product.product_type === "bot" && deliveryMethod === "automatic_download") {
      const { data: botLink, error: botLinkError } = await admin
        .from("bot_links")
        .select("download_url")
        .eq("product_id", product.id)
        .limit(1)
        .maybeSingle();
      if (botLinkError) throw botLinkError;
      if (!botLink?.download_url) {
        return NextResponse.json({ error: "This bot is not ready for automatic delivery." }, { status: 400 });
      }
    }

    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        user_id: user.id,
        product_id: product.id,
        amount: quote.originalAmountCents / 100,
        amount_cents: quote.originalAmountCents,
        product_type: product.product_type,
        currency: quote.originalCurrency,
        status: "pending",
        payment_method: quote.method,
        metadata: deliveryMethod ? { delivery_method: deliveryMethod } : {},
      })
      .select("id")
      .single();
    if (orderError) throw orderError;

    if (botCustomer) {
      const { error: deliveryError } = await admin.from("bot_delivery_requests").insert({
        order_id: order.id,
        user_id: user.id,
        product_id: product.id,
        full_name: fullName,
        ...botCustomer,
        status: "pending_payment",
      });
      if (deliveryError) {
        await markOrderCreationFailed(admin, order.id, false);
        throw deliveryError;
      }
    }

    const { data: paymentRequest, error: paymentError } = await admin
      .from("manual_payment_requests")
      .insert({
        quote_id: quote.quoteId,
        order_id: order.id,
        user_id: user.id,
        product_id: product.id,
        method: quote.method,
        amount_minor: quote.amountMinor,
        currency: quote.currency,
        display_amount_minor: quote.displayAmountMinor,
        display_currency: quote.displayCurrency,
        original_amount_cents: quote.originalAmountCents,
        original_currency: quote.originalCurrency,
        exchange_rate: quote.exchangeRate,
        rate_source: quote.rateSource,
        rate_as_of: quote.rateAsOf,
        quote_issued_at: quote.issuedAt,
        quote_expires_at: quote.expiresAt,
        full_name: fullName,
        sender_phone: senderPhone,
        customer_binance_id: customerBinanceId,
        transaction_reference: reference || null,
        status: "pending",
      })
      .select("id, order_id, method, amount_minor, currency, display_amount_minor, display_currency, original_amount_cents, original_currency, exchange_rate, rate_source, rate_as_of, quote_expires_at, sender_phone, customer_binance_id, transaction_reference, status")
      .single();
    if (paymentError) {
      await markOrderCreationFailed(admin, order.id, Boolean(botCustomer));
      if (paymentError.code === "23505") {
        const { data: currentRequest, error: lookupError } = await admin
          .from("manual_payment_requests")
          .select("id, order_id, method, amount_minor, currency, display_amount_minor, display_currency, original_amount_cents, original_currency, exchange_rate, rate_source, rate_as_of, quote_expires_at, sender_phone, customer_binance_id, transaction_reference, status")
          .eq("user_id", user.id)
          .eq("product_id", product.id)
          .in("status", ["pending", "verifying"])
          .maybeSingle();
        if (lookupError) throw lookupError;
        if (currentRequest) {
          return NextResponse.json({ request: paymentRequestResponse(currentRequest), reused: true });
        }
        return NextResponse.json({
          error: "This payment quote has already been used or has expired. Request a fresh quote.",
          refreshQuote: true,
        }, { status: 409 });
      }
      throw paymentError;
    }

    return NextResponse.json({ request: paymentRequestResponse(paymentRequest), reused: false });
  } catch (error) {
    console.error("Unable to create manual payment request:", error);
    return NextResponse.json({ error: getPaymentRequestErrorMessage(error) }, { status: 500 });
  }
}
