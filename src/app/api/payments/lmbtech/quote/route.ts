import { createManualPaymentQuote, formatSettlementAmount } from "@/lib/manual-payments";
import { createAdminClient } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Please sign in before checkout." }, { status: 401 });

    const body = await request.json();
    const productId = typeof body.productId === "string" ? body.productId.trim() : "";
    if (!productId) return NextResponse.json({ error: "Choose a product." }, { status: 400 });

    const admin = createAdminClient();
    const { data: product, error: productError } = await admin
      .from("products")
      .select("id, price_cents, currency, is_active, metadata")
      .eq("id", productId)
      .maybeSingle();
    if (productError) throw productError;
    if (!product || !product.is_active || product.metadata?.is_free === true) {
      return NextResponse.json({ error: "This product is not available for paid checkout." }, { status: 404 });
    }

    const { quote, token } = await createManualPaymentQuote({
      userId: user.id,
      productId: product.id,
      originalAmountCents: Number(product.price_cents),
      originalCurrency: String(product.currency || "USD"),
      method: "mobile_money",
      displayCurrency: "RWF",
    });
    return NextResponse.json({
      token,
      amountRwf: quote.amountMinor,
      amount: formatSettlementAmount(quote.amountMinor, "RWF"),
      exchangeRate: quote.exchangeRate,
      rateAsOf: quote.rateAsOf,
      expiresAt: quote.expiresAt,
    });
  } catch (error) {
    console.error("Unable to create LMBTech quote:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Unable to calculate a current LMBTech payment amount." }, { status: 503 });
  }
}
