"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Copy, CreditCard, ExternalLink, Lock } from "lucide-react";
import { createBrowserClient, normalizeProductRow } from "@/lib/supabase";
import { Product } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type PaymentMethod = "mobile_money" | "binance";

interface PaymentQuote {
  token: string;
  quote: {
    amount: string;
    amountMinor: number;
    currency: "RWF" | "USDT";
    displayAmount: string;
    displayCurrency: "USD" | "RWF" | "USDT";
    exchangeRate: number;
    rateSource: "ExchangeRate-API" | "CoinGecko";
    expiresAt: string;
    originalAmount: number;
    originalCurrency: string;
    rateAsOf: string;
  };
}

const MOMO_USSD = "*182*1*1*0794303438";
const MOMO_PHONE = "+250794303438";
const BINANCE_ID = "536834998";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get("product");
  const { isAuthenticated, user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mobile_money");
  const [displayCurrency, setDisplayCurrency] = useState<"USD" | "RWF" | "USDT">("USD");
  const [quote, setQuote] = useState<PaymentQuote | null>(null);
  const [quoteVersion, setQuoteVersion] = useState(0);
  const [quoteError, setQuoteError] = useState("");
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [customerBinanceId, setCustomerBinanceId] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [email, setEmail] = useState("");
  const [mt5AccountNumber, setMt5AccountNumber] = useState("");
  const [requestError, setRequestError] = useState("");
  const [copiedItem, setCopiedItem] = useState("");

  useEffect(() => {
    if (user?.email) setEmail(user.email);
    if (user?.full_name) setFullName(user.full_name);
  }, [user?.email, user?.full_name]);

  useEffect(() => {
    if (!productId) {
      router.push("/");
      return;
    }

    let cancelled = false;
    const fetchProduct = async () => {
      setQuote(null);
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();

      if (cancelled) return;
      if (error || !data) {
        console.error("Error fetching product:", error);
        router.push("/");
        return;
      }
      setProduct(normalizeProductRow(data));
      setIsLoading(false);
    };

    void fetchProduct();
    return () => { cancelled = true; };
  }, [productId, router]);

  useEffect(() => {
    if (!product?.id || !isAuthenticated || product.metadata?.is_free === true) {
      setQuote(null);
      setQuoteError("");
      setQuoteLoading(false);
      return;
    }

    const controller = new AbortController();
    const loadQuote = async () => {
      setQuote(null);
      setQuoteError("");
      setQuoteLoading(true);
      try {
        const response = await fetch("/api/payments/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: product.id, method: paymentMethod, displayCurrency }),
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to get a current payment quote.");
        setQuote(data);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Unable to load payment quote:", error);
        setQuoteError(error instanceof Error ? error.message : "Unable to get a current payment quote.");
      } finally {
        if (!controller.signal.aborted) setQuoteLoading(false);
      }
    };
    void loadQuote();
    return () => controller.abort();
  }, [product?.id, product?.metadata?.is_free, isAuthenticated, paymentMethod, displayCurrency, quoteVersion]);

  const copyValue = async (value: string, item: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedItem(item);
      window.setTimeout(() => setCopiedItem(""), 1800);
    } catch (error) {
      console.error("Unable to copy payment detail:", error);
      setRequestError("Copy was blocked by this browser. Select and copy the displayed value instead.");
    }
  };

  const ensureQuoteIsCurrent = () => {
    if (!quote || Date.parse(quote.quote.expiresAt) <= Date.now()) {
      setRequestError("This quote has expired. Get a fresh quote before sending payment.");
      setQuote(null);
      setQuoteVersion((version) => version + 1);
      return false;
    }
    return true;
  };

  const isFreeCourse = product?.type === "course" && product.metadata?.is_free === true;
  const originalPrice = product
    ? new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: product.currency || "USD",
    }).format(product.price)
    : "";

  if (isLoading) {
    return (
      <main className="min-h-screen bg-dark-950">
        <Navbar />
        <div className="flex items-center justify-center py-32"><div className="spinner" /></div>
        <Footer />
      </main>
    );
  }
  if (!product) return null;

  return (
    <main className="min-h-screen bg-dark-950">
      <Navbar />
      <section className="pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-8">
            <Link href={`/${product.type}s`} className="flex items-center space-x-2 text-gray-400 hover:text-gold-400 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to {product.type}s</span>
            </Link>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="dark-card p-6">
                <h2 className="text-xl font-bold mb-6">Purchase Summary</h2>
                <div className="flex items-start space-x-4 mb-6 pb-6 border-b border-dark-800">
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-gold-500/20 to-gold-600/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gold-400">
                      {product.type === "course" ? "📚" : product.type === "signal" ? "📡" : "🤖"}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold">{product.name}</h3>
                    <p className="text-sm text-gray-400 capitalize">{product.type}</p>
                  </div>
                </div>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Administrator&apos;s price</span>
                    <span>{isFreeCourse ? "Free" : originalPrice}</span>
                  </div>
                  {quote && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Payment amount to send</span>
                      <span>{quote.quote.amount}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-dark-800">
                  <span className="font-bold">Total</span>
                  <span className="text-2xl font-bold gold-gradient-text">
                    {isFreeCourse ? "Free" : quote?.quote.displayAmount || originalPrice}
                  </span>
                </div>
                {quote && (
                  <div className="mt-4 space-y-1 text-xs text-gray-500">
                    <p>Live rate ({quote.quote.rateSource}): {quote.quote.exchangeRate.toFixed(quote.quote.currency === "RWF" ? 4 : 6)} {quote.quote.currency} per USD.</p>
                    <p>Rate timestamp: {new Date(quote.quote.rateAsOf).toLocaleString()} · Quote expires {new Date(quote.quote.expiresAt).toLocaleTimeString()}.</p>
                    <p>No conversion fee is added by this checkout.</p>
                  </div>
                )}
              </div>
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="text-center"><Lock className="w-6 h-6 text-gold-400 mx-auto mb-2" /><span className="text-xs text-gray-500">Server-verified quote</span></div>
                <div className="text-center"><Check className="w-6 h-6 text-gold-400 mx-auto mb-2" /><span className="text-xs text-gray-500">Manual verification</span></div>
                <div className="text-center"><CreditCard className="w-6 h-6 text-gold-400 mx-auto mb-2" /><span className="text-xs text-gray-500">Manual payment details</span></div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
              <div className="dark-card p-6">
                    <h2 className="text-xl font-bold mb-2">Manual payment method and currency</h2>
                    <p className="text-sm text-gray-400 mb-4">Choose a display currency and transfer manually. Mobile Money settles in RWF; Binance Pay settles in USDT. USD is for display only.</p>
                    <label className="mb-6 block space-y-1 text-sm text-gray-400">Display currency
                      <select
                        value={displayCurrency}
                        onChange={(event) => {
                          setQuote(null);
                          setDisplayCurrency(event.target.value as "USD" | "RWF" | "USDT");
                        }}
                        className="dark-input w-full"
                      >
                        <option value="USD">USD · US dollars (display only)</option>
                        {paymentMethod === "mobile_money"
                          ? <option value="RWF">RWF · Rwandan francs (Mobile Money settlement)</option>
                          : <option value="USDT">USDT · Tether (Binance settlement)</option>}
                      </select>
                    </label>

                    <div className="space-y-3 mb-6">
                      <button type="button" onClick={() => { setQuote(null); setPaymentMethod("mobile_money"); setDisplayCurrency("USD"); }}
                        className={`w-full flex items-center space-x-3 p-4 rounded-lg border transition-all ${paymentMethod === "mobile_money" ? "border-gold-500 bg-gold-500/10" : "border-dark-700 hover:border-dark-600"}`}>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === "mobile_money" ? "border-gold-500" : "border-gray-500"}`}>
                          {paymentMethod === "mobile_money" && <div className="w-2.5 h-2.5 rounded-full bg-gold-500" />}
                        </div>
                        <div className="flex-1 text-left">
                          <span className="font-medium">Mobile Money · RWF</span>
                          <p className="text-xs text-gray-500">MTN Rwanda · manual payment confirmation</p>
                        </div>
                        <span className="text-2xl">📱</span>
                      </button>
                      <button type="button" onClick={() => { setQuote(null); setPaymentMethod("binance"); setDisplayCurrency("USD"); }}
                        className={`w-full flex items-center space-x-3 p-4 rounded-lg border transition-all ${paymentMethod === "binance" ? "border-gold-500 bg-gold-500/10" : "border-dark-700 hover:border-dark-600"}`}>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === "binance" ? "border-gold-500" : "border-gray-500"}`}>
                          {paymentMethod === "binance" && <div className="w-2.5 h-2.5 rounded-full bg-gold-500" />}
                        </div>
                        <div className="flex-1 text-left">
                          <span className="font-medium">Binance ID · USDT</span>
                          <p className="text-xs text-gray-500">Binance Pay ID transfer · manual confirmation</p>
                        </div>
                        <span className="text-2xl">🟡</span>
                      </button>
                    </div>

                    <div className="mb-6 space-y-4 rounded-lg border border-dark-700 bg-dark-800/40 p-4">
                      <label className="block space-y-1 text-sm text-gray-400">Your full name
                        <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="dark-input w-full" autoComplete="name" required />
                      </label>
                      {paymentMethod === "mobile_money" ? (
                        <label className="block space-y-1 text-sm text-gray-400">Your MTN Mobile Money sender phone number
                          <input value={senderPhone} onChange={(event) => setSenderPhone(event.target.value)} className="dark-input w-full" autoComplete="tel" placeholder="+250..." required />
                        </label>
                      ) : (
                        <label className="block space-y-1 text-sm text-gray-400">Your Binance ID
                          <input value={customerBinanceId} onChange={(event) => setCustomerBinanceId(event.target.value)} className="dark-input w-full" autoComplete="off" required />
                        </label>
                      )}
                      <label className="block space-y-1 text-sm text-gray-400">Transaction reference (add after sending)
                        <input value={transactionReference} onChange={(event) => setTransactionReference(event.target.value)} className="dark-input w-full" autoComplete="off" />
                      </label>
                      {product.type === "bot" && product.metadata?.delivery_method === "manual_email" && (
                        <>
                          <p className="pt-2 text-sm font-semibold text-white">Bot delivery details (sent to the administrator with your payment details)</p>
                          <label className="block space-y-1 text-sm text-gray-400">Delivery email
                            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="dark-input w-full" autoComplete="email" />
                          </label>
                          <label className="block space-y-1 text-sm text-gray-400">MT5 account number
                            <input value={mt5AccountNumber} onChange={(event) => setMt5AccountNumber(event.target.value)} className="dark-input w-full" autoComplete="off" />
                          </label>
                        </>
                      )}
                    </div>

                    {quoteLoading && <p className="mb-4 text-sm text-gray-400">Getting a current server-calculated exchange-rate quote...</p>}
                    {quoteError && (
                      <div role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                        <p>{quoteError}</p>
                        <button type="button" onClick={() => setQuoteVersion((version) => version + 1)} className="mt-2 underline">Retry quote</button>
                      </div>
                    )}
                    {requestError && <p role="alert" className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{requestError}</p>}
                    {quote && (
                      <div className="mb-4 space-y-4 rounded-lg border border-gold-500/40 bg-gold-500/10 p-4 text-sm text-gray-200">
                        {paymentMethod === "mobile_money" ? (
                          <>
                            <p className="font-semibold text-white">MTN Mobile Money · send exactly {quote.quote.amount}</p>
                            <p>Recipient name: <strong className="text-white">Bwenge Patrick MAHORO</strong></p>
                            <p>Recipient number: <span className="font-mono text-white">{MOMO_PHONE}</span></p>
                            <p>Your sender name: <span className="text-white">{fullName || "Enter your name above"}</span></p>
                            <p>Your sender number: <span className="font-mono text-white">{senderPhone || "Enter your MTN number above"}</span></p>
                            <p className="break-all font-mono text-lg text-white">{`${MOMO_USSD}*${quote.quote.amountMinor}#`}</p>
                            <div className="flex flex-wrap gap-2">
                              <a
                                href={`tel:${MOMO_USSD}*${quote.quote.amountMinor}%23`}
                                onClick={(event) => {
                                  if (!ensureQuoteIsCurrent()) event.preventDefault();
                                }}
                                className="inline-flex items-center gap-2 rounded-lg bg-gold-500 px-4 py-2 font-semibold text-dark-950"
                              >
                                Dial Mobile Money <ExternalLink className="h-4 w-4" />
                              </a>
                              <button type="button" onClick={() => { if (ensureQuoteIsCurrent()) void copyValue(`${MOMO_USSD}*${quote.quote.amountMinor}#`, "ussd"); }} className="inline-flex items-center gap-2 rounded-lg border border-dark-600 px-4 py-2 text-white">
                                <Copy className="h-4 w-4" /> {copiedItem === "ussd" ? "Copied" : "Copy dial code"}
                              </button>
                              <button
                                type="button"
                                onClick={() => { if (ensureQuoteIsCurrent()) void copyValue([
                                  `Payment for: ${product.name}`,
                                  `Amount: ${quote.quote.amount}`,
                                  `Sender name: ${fullName}`,
                                  `Sender MTN number: ${senderPhone}`,
                                  email ? `Delivery email: ${email}` : "",
                                  mt5AccountNumber ? `MT5 account: ${mt5AccountNumber}` : "",
                                  `Transaction reference: ${transactionReference.trim() || "add after sending"}`,
                                ].filter(Boolean).join("\n"), "momo-details"); }}
                                className="inline-flex items-center gap-2 rounded-lg border border-dark-600 px-4 py-2 text-white"
                              >
                                <Copy className="h-4 w-4" /> {copiedItem === "momo-details" ? "Copied" : "Copy my payment details"}
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <p className="font-semibold text-white">Manual Binance Pay transfer · send exactly {quote.quote.amount}</p>
                            <p className="text-xs text-gray-400">Quote expires at {new Date(quote.quote.expiresAt).toLocaleTimeString()}.</p>
                            <p>Recipient name: <strong className="text-white">logic trader Kigali</strong></p>
                            <p>Recipient Binance ID: <span className="font-mono text-lg text-white">{BINANCE_ID}</span></p>
                            <p>Send USDT only. Do not send another asset.</p>
                            <div className="flex flex-wrap gap-2">
                              <button type="button" onClick={() => void copyValue(BINANCE_ID, "binance-id")} className="inline-flex items-center gap-2 rounded-lg border border-dark-600 px-4 py-2 text-white">
                                <Copy className="h-4 w-4" /> {copiedItem === "binance-id" ? "Copied" : "Copy recipient Binance ID"}
                              </button>
                              <button type="button" onClick={() => void copyValue("logic trader Kigali", "binance-name")} className="inline-flex items-center gap-2 rounded-lg border border-dark-600 px-4 py-2 text-white">
                                <Copy className="h-4 w-4" /> {copiedItem === "binance-name" ? "Copied" : "Copy recipient name"}
                              </button>
                              <button
                                type="button"
                                onClick={() => { if (ensureQuoteIsCurrent()) void copyValue([
                                  `Payment for: ${product.name}`,
                                  `Amount: ${quote.quote.amount}`,
                                  `Sender name: ${fullName}`,
                                  `Sender Binance ID: ${customerBinanceId}`,
                                  email ? `Delivery email: ${email}` : "",
                                  mt5AccountNumber ? `MT5 account: ${mt5AccountNumber}` : "",
                                  `Transaction reference: ${transactionReference.trim() || "add after sending"}`,
                                ].filter(Boolean).join("\n"), "binance-details"); }}
                                className="inline-flex items-center gap-2 rounded-lg border border-dark-600 px-4 py-2 text-white"
                              >
                                <Copy className="h-4 w-4" /> {copiedItem === "binance-details" ? "Copied" : "Copy my payment details"}
                              </button>
                            </div>
                            <p className="text-xs text-gray-400">Your Binance ID: {customerBinanceId || "Enter your Binance ID above"}</p>
                          </>
                        )}
                        <p className="text-xs text-gray-400">
                          This manual transfer does not create a website order or grant access. After sending, provide your name,
                          sender details, transaction reference, and any delivery details to the site administrator for matching and verification.
                        </p>
                      </div>
                    )}
                    {!isAuthenticated && <p className="mb-4 text-center text-sm text-gray-400">Sign in to get a current payment quote and continue checkout.</p>}
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-dark-950">
        <Navbar />
        <div className="flex items-center justify-center py-32"><div className="spinner" /></div>
        <Footer />
      </main>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
