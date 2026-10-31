import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getPlatformSettings } from "@/lib/platform-settings";
import { verifyManualPaymentQuote, type ManualPaymentQuote } from "@/lib/manual-payments";
import {
  getLmbtechCallbackUrl,
  getLmbtechCardRedirectUrl,
  getLmbtechRedirectUrl,
  initiateLmbtechCollection,
  type LmbtechPaymentMethod,
} from "@/lib/lmbtech";
import { NextResponse } from "next/server";

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getDeliveryDetails(
  body: Record<string, unknown>,
  product: { product_type: string; metadata: Record<string, unknown> | null },
) {
  const deliveryMethod = product.product_type === "bot"
    ? product.metadata?.delivery_method === "manual_email" ? "manual_email" : "automatic_download"
    : null;
  if (deliveryMethod !== "manual_email") return { deliveryMethod, customer: null };

  const email = cleanString(body.deliveryEmail).toLowerCase();
  const mt5AccountNumber = cleanString(body.mt5AccountNumber);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      mt5AccountNumber.length < 3 || mt5AccountNumber.length > 64) {
    throw new Error("Enter a valid delivery email and MT5 account number.");
  }
  return { deliveryMethod, customer: { email, mt5_account_number: mt5AccountNumber } };
}

export async function POST(request: Request) {
  let orderId: string | null = null;
  let paymentRequestId: string | null = null;
  let gatewayAttempted = false;
  let stage = "checking sign-in";
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Please sign in before checkout." }, { status: 401 });
    }
    if (!user.email) {
      return NextResponse.json({ error: "Add an email address to your account before checkout." }, { status: 400 });
    }

    const body = await request.json() as Record<string, unknown>;
    const productId = cleanString(body.productId);
    const quoteToken = cleanString(body.quoteToken);
    const paymentMethod = body.paymentMethod;
    const fullName = cleanString(body.fullName || user.user_metadata?.full_name);
    const payerPhone = cleanString(body.payerPhone).replace(/[\s()-]/g, "");
    if (!productId || !quoteToken || (paymentMethod !== "MTN_MOMO_RWA" && paymentMethod !== "card")) {
      return NextResponse.json({ error: "Choose a supported LMBTech payment method." }, { status: 400 });
    }
    if (fullName.length < 2 || fullName.length > 150) {
      return NextResponse.json({ error: "Enter your full name." }, { status: 400 });
    }
    if (paymentMethod === "MTN_MOMO_RWA" && !/^\+2507\d{8}$/.test(payerPhone)) {
      return NextResponse.json({ error: "Enter a Rwanda mobile number in +2507XXXXXXXX format." }, { status: 400 });
    }
    const settings = await getPlatformSettings();
    if ((paymentMethod === "MTN_MOMO_RWA" && !settings.lmbtechMobileMoneyEnabled) ||
        (paymentMethod === "card" && !settings.lmbtechCardEnabled)) {
      return NextResponse.json({ error: "This payment method is currently unavailable. Choose another method." }, { status: 403 });
    }

    const admin = createAdminClient();
    stage = "checking product";
    const { data: product, error: productError } = await admin
      .from("products")
      .select("id, name, product_type, price_cents, currency, is_active, metadata")
      .eq("id", productId)
      .maybeSingle();
    if (productError) throw productError;
    if (!product || !product.is_active || product.metadata?.is_free === true) {
      return NextResponse.json({ error: "This product is not available for paid checkout." }, { status: 404 });
    }
    if (String(product.currency || "USD").toUpperCase() !== "USD") {
      return NextResponse.json({ error: "LMBTech checkout currently requires products priced in USD." }, { status: 400 });
    }
    let quote: ManualPaymentQuote;
    try {
      quote = verifyManualPaymentQuote(quoteToken, user.id);
    } catch (quoteError) {
      return NextResponse.json({
        error: quoteError instanceof Error ? quoteError.message : "The payment quote is invalid or expired.",
        refreshQuote: true,
      }, { status: 409 });
    }
    if (quote.productId !== product.id || quote.method !== "mobile_money" || quote.currency !== "RWF" ||
        quote.originalAmountCents !== Number(product.price_cents)) {
      return NextResponse.json({ error: "The payment quote does not match the current product price. Request a new quote." }, { status: 409 });
    }

    if (product.product_type === "course") {
      const { data: access, error: accessError } = await admin
        .from("user_access")
        .select("expires_at")
        .eq("user_id", user.id)
        .eq("product_id", product.id)
        .eq("is_active", true)
        .maybeSingle();
      if (accessError) throw accessError;
      if (access && (!access.expires_at || new Date(access.expires_at) > new Date())) {
        return NextResponse.json({ error: "You already have access to this course." }, { status: 409 });
      }
    }

    stage = "checking pending payment";
    const { data: existingRequest, error: existingError } = await admin
      .from("lmbtech_payment_requests")
      .select("reference_id, payment_method, amount_rwf, status, redirect_url")
      .eq("user_id", user.id)
      .eq("product_id", product.id)
      .eq("status", "pending")
      .maybeSingle();
    if (existingError) throw existingError;
    if (existingRequest) {
      return NextResponse.json({
        request: existingRequest,
        reused: true,
      });
    }

    const { data: existingManualRequest, error: existingManualError } = await admin
      .from("manual_payment_requests")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", product.id)
      .in("status", ["pending", "verifying"])
      .maybeSingle();
    if (existingManualError) throw existingManualError;
    if (existingManualRequest) {
      return NextResponse.json({
        error: "You already have a pending manual payment request for this product. Resolve it before starting another payment.",
      }, { status: 409 });
    }

    const amountRwf = quote.amountMinor;
    const exchangeRate = quote.exchangeRate;
    let deliveryDetails: ReturnType<typeof getDeliveryDetails>;
    try {
      deliveryDetails = getDeliveryDetails(body, product);
    } catch (deliveryError) {
      return NextResponse.json({
        error: deliveryError instanceof Error ? deliveryError.message : "Invalid bot delivery details.",
      }, { status: 400 });
    }
    const { deliveryMethod, customer } = deliveryDetails;
    const referenceId = `LMB-${randomUUID()}`;
    stage = "creating order";
    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        user_id: user.id,
        product_id: product.id,
        amount: Number(product.price_cents) / 100,
        amount_cents: Number(product.price_cents),
        product_type: product.product_type,
        currency: "USD",
        status: "pending",
        payment_method: `lmbtech_${paymentMethod.toLowerCase()}`,
        metadata: { payment_provider: "lmbtech", delivery_method: deliveryMethod },
      })
      .select("id")
      .single();
    if (orderError) throw orderError;
    orderId = order.id;

    stage = "saving payment request";
    const { data: payment, error: paymentError } = await admin
      .from("lmbtech_payment_requests")
      .insert({
        reference_id: referenceId,
        order_id: order.id,
        user_id: user.id,
        product_id: product.id,
        payment_method: paymentMethod,
        amount_rwf: amountRwf,
        original_amount_cents: Number(product.price_cents),
        exchange_rate: exchangeRate,
        status: "pending",
      })
      .select("id")
      .single();
    if (paymentError) throw paymentError;
    paymentRequestId = payment.id;

    if (customer) {
      stage = "saving bot delivery details";
      const { error: deliveryError } = await admin.from("bot_delivery_requests").insert({
        order_id: order.id,
        user_id: user.id,
        product_id: product.id,
        full_name: fullName,
        ...customer,
        status: "pending_payment",
      });
      if (deliveryError) throw deliveryError;
    }

    stage = "initiating LMBTech payment";
    const callbackUrl = getLmbtechCallbackUrl();
    const cardRedirectUrl = paymentMethod === "card"
      ? getLmbtechCardRedirectUrl(product.id, referenceId)
      : undefined;
    gatewayAttempted = true;
    const gatewayResponse = await initiateLmbtechCollection({
      email: user.email,
      name: fullName,
      amount: amountRwf,
      servicePaid: `Order ${order.id}`,
      referenceId,
      callbackUrl,
      paymentMethod: paymentMethod as LmbtechPaymentMethod,
      ...(paymentMethod === "MTN_MOMO_RWA" ? { payerPhone } : {}),
      ...(cardRedirectUrl ? { cardRedirectUrl } : {}),
    });
    const redirectUrl = paymentMethod === "card" ? getLmbtechRedirectUrl(gatewayResponse) : null;
    if (redirectUrl) {
      const { error: redirectError } = await admin
        .from("lmbtech_payment_requests")
        .update({ redirect_url: redirectUrl })
        .eq("id", payment.id);
      if (redirectError) throw redirectError;
    }

    return NextResponse.json({
      request: {
        reference_id: referenceId,
        payment_method: paymentMethod,
        amount_rwf: amountRwf,
        status: "pending",
        redirect_url: redirectUrl,
      },
      reused: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to initiate LMBTech payment.";
    console.error("Unable to initiate LMBTech payment:", { stage, message });
    if (orderId && !gatewayAttempted) {
      const admin = createAdminClient();
      await admin.from("orders").update({ status: "failed" }).eq("id", orderId).eq("status", "pending");
      if (paymentRequestId) {
        await admin.from("lmbtech_payment_requests")
          .update({ status: "failed" }).eq("id", paymentRequestId).eq("status", "pending");
      }
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
