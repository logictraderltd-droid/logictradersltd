import {
  createManualPaymentQuote,
  formatSettlementAmount,
  type DisplayCurrency,
  type ManualPaymentMethod,
} from "@/lib/manual-payments";
import { createAdminClient } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

function getQuoteErrorMessage(error: unknown) {
  const record = error && typeof error === "object"
    ? error as { code?: unknown; message?: unknown }
    : null;
  const code = typeof record?.code === "string" ? record.code : "";
  const detail = typeof record?.message === "string"
    ? record.message
    : error instanceof Error
      ? error.message
      : "";

  if (["42P01", "42703", "PGRST200", "PGRST204", "PGRST205"].includes(code) ||
      /manual_payment_requests/i.test(detail) && /(does not exist|not found|schema cache|could not find)/i.test(detail)) {
    return "Payment setup is incomplete. Apply supabase/migrations/2026-10-18-manual-payments.sql to the Supabase project and retry.";
  }
  return detail || "Unable to obtain a current payment quote.";
}

export async function POST(request: Request) {
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Please sign in before checkout." }, { status: 401 });
    }

    const body = await request.json();
    const productId = typeof body.productId === "string" ? body.productId : "";
    const method = body.method;
    const displayCurrency = body.displayCurrency;
    if (!productId || (method !== "mobile_money" && method !== "binance")) {
      return NextResponse.json({ error: "Select a product and supported payment method." }, { status: 400 });
    }
    const supportedDisplayCurrencies = method === "mobile_money" ? ["USD", "RWF"] : ["USD", "USDT"];
    if (!supportedDisplayCurrencies.includes(displayCurrency)) {
      return NextResponse.json({ error: "Choose a display currency supported by this payment method." }, { status: 400 });
    }

    const admin = createAdminClient();
    if (method === "binance") {
      const { data: existingRequest, error: existingError } = await admin
        .from("manual_payment_requests")
        .select("id, order_id, method, amount_minor, currency, display_amount_minor, display_currency, original_amount_cents, original_currency, exchange_rate, rate_source, rate_as_of, quote_expires_at, sender_phone, customer_binance_id, transaction_reference, status")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .eq("method", method)
        .in("status", ["pending", "verifying"])
        .maybeSingle();
      if (existingError) throw existingError;
      if (existingRequest) {
        return NextResponse.json({
          existingRequest: {
            id: existingRequest.id,
            orderId: existingRequest.order_id,
            method: existingRequest.method,
            amountMinor: existingRequest.amount_minor,
            currency: existingRequest.currency,
            amount: formatSettlementAmount(existingRequest.amount_minor, existingRequest.currency),
            displayAmount: formatSettlementAmount(existingRequest.display_amount_minor, existingRequest.display_currency),
            displayCurrency: existingRequest.display_currency,
            originalAmount: existingRequest.original_amount_cents / 100,
            originalCurrency: existingRequest.original_currency,
            exchangeRate: Number(existingRequest.exchange_rate),
            rateSource: existingRequest.rate_source,
            rateAsOf: existingRequest.rate_as_of,
            quoteExpiresAt: existingRequest.quote_expires_at,
            senderPhone: existingRequest.sender_phone,
            customerBinanceId: existingRequest.customer_binance_id,
            transactionReference: existingRequest.transaction_reference,
            status: existingRequest.status,
          },
        });
      }
    }

    const { data: product, error: productError } = await admin
      .from("products")
      .select("id, price_cents, currency, is_active, metadata")
      .eq("id", productId)
      .maybeSingle();
    if (productError) throw productError;
    if (!product || !product.is_active) {
      return NextResponse.json({ error: "This product is not available for purchase." }, { status: 404 });
    }
    if (product.metadata?.is_free === true) {
      return NextResponse.json({ error: "Free products do not require checkout." }, { status: 400 });
    }

    const { quote, token } = await createManualPaymentQuote({
      userId: user.id,
      productId: product.id,
      originalAmountCents: Number(product.price_cents),
      originalCurrency: String(product.currency || "USD"),
      method: method as ManualPaymentMethod,
      displayCurrency: displayCurrency as DisplayCurrency,
    });

    return NextResponse.json({
      token,
      quote: {
        ...quote,
        originalAmount: quote.originalAmountCents / 100,
        displayAmount: formatSettlementAmount(quote.displayAmountMinor, quote.displayCurrency),
        amount: formatSettlementAmount(quote.amountMinor, quote.currency),
      },
    });
  } catch (error) {
    console.error("Unable to create payment quote:", error);
    const message = getQuoteErrorMessage(error);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
