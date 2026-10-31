"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, CreditCard, Smartphone } from "lucide-react";
import { createBrowserClient, normalizeProductRow } from "@/lib/supabase";
import { Product } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type PaymentMethod = "MTN_MOMO_RWA" | "card";
type PaymentStatus = "pending" | "success" | "failed" | "cancelled";

interface Quote {
  token: string;
  amount: string;
  amountRwf: number;
  exchangeRate: number;
  rateAsOf: string;
  expiresAt: string;
}

interface PaymentRequest {
  reference_id: string;
  payment_method: PaymentMethod;
  amount_rwf: number;
  status: PaymentStatus;
  redirect_url: string | null;
}

function LmbtechCheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get("product");
  const returnReference = searchParams.get("lmbtech_reference");
  const { isAuthenticated, user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [method, setMethod] = useState<PaymentMethod>("MTN_MOMO_RWA");
  const [availableMethods, setAvailableMethods] = useState({ MTN_MOMO_RWA: false, card: false });
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteVersion, setQuoteVersion] = useState(0);
  const [quoteError, setQuoteError] = useState("");
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [fullName, setFullName] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [deliveryEmail, setDeliveryEmail] = useState("");
  const [mt5AccountNumber, setMt5AccountNumber] = useState("");
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.full_name) setFullName(user.full_name);
    if (user?.email) setDeliveryEmail(user.email);
  }, [user?.email, user?.full_name]);

  useEffect(() => {
    let cancelled = false;
    const loadMethods = async () => {
      try {
        const response = await fetch("/api/platform-settings", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load payment methods.");
        if (!cancelled) {
          setAvailableMethods({
            MTN_MOMO_RWA: result.settings?.lmbtechMobileMoneyEnabled === true,
            card: result.settings?.lmbtechCardEnabled === true,
          });
        }
      } catch (settingsError) {
        if (!cancelled) setQuoteError(settingsError instanceof Error ? settingsError.message : "Unable to load payment methods.");
      } finally {
        if (!cancelled) setLoadingMethods(false);
      }
    };
    void loadMethods();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (availableMethods[method]) return;
    if (availableMethods.MTN_MOMO_RWA) setMethod("MTN_MOMO_RWA");
    else if (availableMethods.card) setMethod("card");
  }, [availableMethods, method]);

  useEffect(() => {
    if (!productId) {
      router.replace("/");
      return;
    }
    let cancelled = false;
    const loadProduct = async () => {
      const { data, error: productError } = await createBrowserClient()
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();
      if (cancelled) return;
      if (productError || !data) {
        router.replace("/");
        return;
      }
      setProduct(normalizeProductRow(data));
      setLoadingProduct(false);
    };
    void loadProduct();
    return () => { cancelled = true; };
  }, [productId, router]);

  useEffect(() => {
    if (!product?.id || !isAuthenticated || product.metadata?.is_free === true) {
      setQuote(null);
      setLoadingQuote(false);
      return;
    }
    let cancelled = false;
    const loadQuote = async () => {
      setLoadingQuote(true);
      setQuoteError("");
      try {
        const response = await fetch("/api/payments/lmbtech/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: product.id }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to calculate the payment amount.");
        if (!cancelled) setQuote(result);
      } catch (quoteLoadError) {
        if (!cancelled) setQuoteError(quoteLoadError instanceof Error ? quoteLoadError.message : "Unable to calculate the payment amount.");
      } finally {
        if (!cancelled) setLoadingQuote(false);
      }
    };
    void loadQuote();
    return () => { cancelled = true; };
  }, [product?.id, product?.metadata?.is_free, isAuthenticated, quoteVersion]);

  useEffect(() => {
    if (!returnReference) return;
    setPaymentRequest({
      reference_id: returnReference,
      payment_method: "card",
      amount_rwf: 0,
      status: "pending",
      redirect_url: null,
    });
  }, [returnReference]);

  const pendingReferenceId = paymentRequest?.status === "pending" ? paymentRequest.reference_id : null;

  useEffect(() => {
    if (!pendingReferenceId) return;
    let cancelled = false;
    const referenceId = pendingReferenceId;
    const checkStatus = async () => {
      try {
        const response = await fetch("/api/payments/lmbtech/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ referenceId }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to check payment status.");
        if (!cancelled) setPaymentRequest((current) => current?.reference_id === result.reference_id
          ? { ...current, ...result }
          : current);
      } catch (statusError) {
        if (!cancelled) setError(statusError instanceof Error ? statusError.message : "Unable to check payment status.");
      }
    };
    void checkStatus();
    const interval = window.setInterval(() => { void checkStatus(); }, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [pendingReferenceId]);

  const submitPayment = async () => {
    if (!product || !quote || submitting) return;
    setError("");
    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(`/checkout/lmbtech?product=${product.id}`)}`);
      return;
    }
    if (Date.parse(quote.expiresAt) <= Date.now()) {
      setQuote(null);
      setQuoteVersion((version) => version + 1);
      setError("This quote expired. Refresh the amount before continuing.");
      return;
    }
    if (fullName.trim().length < 2) {
      setError("Enter your full name.");
      return;
    }
    if (method === "MTN_MOMO_RWA" && !/^\+2507\d{8}$/.test(payerPhone.replace(/[\s()-]/g, ""))) {
      setError("Enter a Rwanda mobile number in +2507XXXXXXXX format.");
      return;
    }
    const manualBotDelivery = product.type === "bot" && product.metadata?.delivery_method === "manual_email";
    if (manualBotDelivery &&
        (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(deliveryEmail.trim()) || mt5AccountNumber.trim().length < 3)) {
      setError("Enter a valid delivery email and MT5 account number.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/payments/lmbtech/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          quoteToken: quote.token,
          paymentMethod: method,
          fullName,
          payerPhone,
          deliveryEmail,
          mt5AccountNumber,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.refreshQuote) {
          setQuote(null);
          setQuoteVersion((version) => version + 1);
        }
        throw new Error(result.error || "Unable to start your payment.");
      }
      const request = result.request as PaymentRequest;
      setPaymentRequest(request);
      if (request.payment_method === "card" && request.redirect_url) {
        window.location.assign(request.redirect_url);
      } else if (request.payment_method === "card") {
        setError("Card checkout was initiated but no redirect URL was returned. Check the payment status before retrying.");
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to start your payment.");
    } finally {
      setSubmitting(false);
    }
  };

  const price = product
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: product.currency || "USD" }).format(product.price)
    : "";
  const manualBotDelivery = product?.type === "bot" && product.metadata?.delivery_method === "manual_email";

  if (loadingProduct) {
    return <main className="min-h-screen bg-dark-950"><Navbar /><div className="flex justify-center py-32"><div className="spinner" /></div><Footer /></main>;
  }
  if (!product) return null;

  return (
    <main className="min-h-screen bg-dark-950">
      <Navbar />
      <section className="py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Link href={`/${product.type}s`} className="mb-8 inline-flex items-center gap-2 text-gray-400 hover:text-gold-400">
            <ArrowLeft className="h-4 w-4" /> Back to {product.type}s
          </Link>
          <div className="grid gap-8 lg:grid-cols-2">
            <section className="dark-card p-6">
              <h1 className="text-xl font-bold text-white">Checkout</h1>
              <div className="mt-6 border-b border-dark-800 pb-5">
                <h2 className="font-semibold text-white">{product.name}</h2>
                <p className="mt-1 text-sm capitalize text-gray-400">{product.type}</p>
              </div>
              <dl className="mt-5 space-y-3 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-gray-400">Product price</dt><dd>{product.metadata?.is_free === true ? "Free" : price}</dd></div>
                {quote && <div className="flex justify-between gap-4"><dt className="text-gray-400">Amount to pay</dt><dd className="font-semibold text-white">{quote.amount}</dd></div>}
              </dl>
              {quote && <p className="mt-5 text-xs text-gray-500">RWF/USD rate {quote.exchangeRate.toFixed(4)} · Updated {new Date(quote.rateAsOf).toLocaleString()} · Quote expires {new Date(quote.expiresAt).toLocaleTimeString()}</p>}
            </section>

            <section className="dark-card p-6">
              {paymentRequest ? (
                <div>
                  <div className={`rounded border p-4 ${paymentRequest.status === "success" ? "border-green-500/40 bg-green-500/10" : paymentRequest.status === "failed" || paymentRequest.status === "cancelled" ? "border-red-500/40 bg-red-500/10" : "border-amber-500/40 bg-amber-500/10"}`}>
                    <h2 className="font-semibold text-white">{paymentRequest.status === "success" ? "Payment confirmed" : paymentRequest.status === "pending" ? "Payment pending" : `Payment ${paymentRequest.status}`}</h2>
                    <p className="mt-2 text-sm text-gray-300">Reference: <span className="font-mono">{paymentRequest.reference_id}</span></p>
                    {paymentRequest.status === "pending" && <p className="mt-2 text-sm text-gray-300">We’ll refresh the payment status automatically. For Mobile Money, approve the prompt on your phone.</p>}
                    {paymentRequest.status === "success" && <p className="mt-2 text-sm text-green-200">Your order is complete and access is being prepared.</p>}
                  </div>
                  {paymentRequest.status === "success" && <Link href="/dashboard" className="mt-5 inline-block text-sm text-gold-300 underline">Go to dashboard</Link>}
                  {(paymentRequest.status === "failed" || paymentRequest.status === "cancelled") && <button type="button" onClick={() => { setPaymentRequest(null); setQuote(null); setQuoteVersion((version) => version + 1); }} className="mt-5 text-sm text-gold-300 underline">Start a new payment</button>}
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-bold text-white">Payment method</h2>
                  {!loadingMethods && (availableMethods.MTN_MOMO_RWA || availableMethods.card) ? (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {availableMethods.MTN_MOMO_RWA && <button type="button" onClick={() => setMethod("MTN_MOMO_RWA")} className={`flex items-center justify-center gap-2 border p-3 text-sm ${method === "MTN_MOMO_RWA" ? "border-gold-500 bg-gold-500/10 text-white" : "border-dark-700 text-gray-400"}`}>
                        <Smartphone className="h-4 w-4" /> Mobile Money
                      </button>}
                      {availableMethods.card && <button type="button" onClick={() => setMethod("card")} className={`flex items-center justify-center gap-2 border p-3 text-sm ${method === "card" ? "border-gold-500 bg-gold-500/10 text-white" : "border-dark-700 text-gray-400"}`}>
                        <CreditCard className="h-4 w-4" /> Card
                      </button>}
                    </div>
                  ) : <p className="mt-4 text-sm text-gray-400">{loadingMethods ? "Loading payment methods..." : "No LMBTech payment methods are currently available."}</p>}
                  {!isAuthenticated && <p className="mt-4 text-sm text-gray-400">Sign in to continue checkout.</p>}
                  <div className="mt-5 space-y-4">
                    <label className="block space-y-1 text-sm text-gray-400">Full name
                      <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="dark-input w-full" autoComplete="name" />
                    </label>
                    {method === "MTN_MOMO_RWA" && <label className="block space-y-1 text-sm text-gray-400">Mobile Money number
                      <input value={payerPhone} onChange={(event) => setPayerPhone(event.target.value)} className="dark-input w-full" autoComplete="tel" placeholder="+2507XXXXXXXX" />
                    </label>}
                    {manualBotDelivery && <>
                      <label className="block space-y-1 text-sm text-gray-400">Bot delivery email
                        <input type="email" value={deliveryEmail} onChange={(event) => setDeliveryEmail(event.target.value)} className="dark-input w-full" autoComplete="email" />
                      </label>
                      <label className="block space-y-1 text-sm text-gray-400">MT5 account number
                        <input value={mt5AccountNumber} onChange={(event) => setMt5AccountNumber(event.target.value)} className="dark-input w-full" />
                      </label>
                    </>}
                  </div>
                  {quoteError && <p role="alert" className="mt-4 text-sm text-red-300">{quoteError}</p>}
                  {quoteError && <button type="button" onClick={() => setQuoteVersion((version) => version + 1)} className="mt-2 text-sm text-gold-300 underline">Refresh payment amount</button>}
                  {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
                  {loadingQuote && <p className="mt-4 text-sm text-gray-400">Calculating current RWF amount...</p>}
                  <button type="button" onClick={() => void submitPayment()} disabled={!isAuthenticated || !quote || loadingQuote || loadingMethods || !availableMethods[method] || submitting || Boolean(quoteError)} className="gold-button mt-5 flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50">
                    <Check className="h-4 w-4" /> {submitting ? "Connecting to LMBTech..." : method === "card" ? "Continue to secure card payment" : "Request Mobile Money payment"}
                  </button>
                  <p className="mt-3 text-center text-xs text-gray-500">Payment confirmation is received from LMBTech and checked before access is granted.</p>
                </>
              )}
            </section>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

export default function LmbtechCheckoutPage() {
  return <Suspense fallback={<main className="min-h-screen bg-dark-950"><Navbar /><div className="flex justify-center py-32"><div className="spinner" /></div><Footer /></main>}><LmbtechCheckoutContent /></Suspense>;
}
