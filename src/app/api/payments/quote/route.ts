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
    ? error as { message?: unknown }
    : null;
  const detail = typeof record?.message === "string"
    ? record.message
    : error instanceof Error
      ? error.message
      : "";

  if (/manual_payment_requests/i.test(detail) &&
      /(does not exist|not found|schema cache|could not find)/i.test(detail)) {
    return "The manual payment request table is missing. Contact the site administrator.";
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
