"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, CreditCard, Lock, Check, Loader2 } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";
import { Product } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import { Suspense } from "react";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = searchParams.get("product");
  const { isAuthenticated, user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "mtn">("stripe");

  console.log("Stripe Key Loaded:", process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.substring(0, 8) + "...");

  useEffect(() => {
    if (!productId) {
      router.push("/");
      return;
    }

    const fetchProduct = async () => {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();

      if (error || !data) {
        console.error("Error fetching product:", error);
        router.push("/");
        return;
      }

      setProduct(data);
      setIsLoading(false);
    };

    fetchProduct();
  }, [productId, router]);

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/checkout?product=${productId}`);
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch("/api/payments/stripe/create-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: product?.id,
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }

    } catch (error: any) {
      console.error("Checkout error:", error);
      alert(error.message || "Payment failed");
      setIsProcessing(false); // Only stop processing on error
    } finally {
      // Don't stop processing if redirecting, to prevent UI flash
      if (!window.location.href.includes('checkout.stripe.com')) {
        setIsProcessing(false);
      }
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-dark-950">
        <Navbar />
        <div className="flex items-center justify-center py-32">
          <div className="spinner" />
        </div>
        <Footer />
      </main>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <main className="min-h-screen bg-dark-950">
      <Navbar />

      <section className="pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8"
          >
            <Link
              href={`/${product.type}s`}
              className="flex items-center space-x-2 text-gray-400 hover:text-gold-400 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to {product.type}s</span>
            </Link>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Order Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="dark-card p-6">
                <h2 className="text-xl font-bold mb-6">Order Summary</h2>

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
                    <span className="text-gray-400">Subtotal</span>
                    <span>${product.price}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Tax</span>
                    <span>$0.00</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-dark-800">
                  <span className="font-bold">Total</span>
                  <span className="text-2xl font-bold gold-gradient-text">
                    ${product.price}
                  </span>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <Lock className="w-6 h-6 text-gold-400 mx-auto mb-2" />
                  <span className="text-xs text-gray-500">Secure Payment</span>
                </div>
                <div className="text-center">
                  <Check className="w-6 h-6 text-gold-400 mx-auto mb-2" />
                  <span className="text-xs text-gray-500">Instant Access</span>
                </div>
                <div className="text-center">
                  <CreditCard className="w-6 h-6 text-gold-400 mx-auto mb-2" />
                  <span className="text-xs text-gray-500">Money Back</span>
                </div>
              </div>
            </motion.div>

            {/* Payment Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="dark-card p-6">
                <h2 className="text-xl font-bold mb-6">Payment Method</h2>

                {/* Payment Options */}
                <div className="space-y-3 mb-6">
                  <button
                    onClick={() => setPaymentMethod("stripe")}
                    className={`w-full flex items-center space-x-3 p-4 rounded-lg border transition-all ${paymentMethod === "stripe"
                      ? "border-gold-500 bg-gold-500/10"
                      : "border-dark-700 hover:border-dark-600"
                      }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === "stripe" ? "border-gold-500" : "border-gray-500"
                      }`}>
                      {paymentMethod === "stripe" && (
                        <div className="w-2.5 h-2.5 rounded-full bg-gold-500" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <span className="font-medium">Credit/Debit Card</span>
                      <p className="text-xs text-gray-500">Powered by Stripe</p>
                    </div>
                    <div className="flex space-x-2">
                      <span className="text-2xl">💳</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setPaymentMethod("mtn")}
                    className={`w-full flex items-center space-x-3 p-4 rounded-lg border transition-all ${paymentMethod === "mtn"
                      ? "border-gold-500 bg-gold-500/10"
                      : "border-dark-700 hover:border-dark-600"
                      }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMethod === "mtn" ? "border-gold-500" : "border-gray-500"
                      }`}>
                      {paymentMethod === "mtn" && (
                        <div className="w-2.5 h-2.5 rounded-full bg-gold-500" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <span className="font-medium">MTN Mobile Money</span>
                      <p className="text-xs text-gray-500">Mobile payment</p>
                    </div>
                    <span className="text-2xl">📱</span>
                  </button>
                </div>

                {/* Payment Info */}
                {paymentMethod === "stripe" && (
                  <div className="p-4 rounded-lg bg-dark-800/50 mb-6">
                    <p className="text-sm text-gray-400">
                      You will be redirected to Stripe&apos;s secure checkout page to complete your payment.
                    </p>
                  </div>
                )}

                {paymentMethod === "mtn" && (
                  <div className="p-4 rounded-lg bg-dark-800/50 mb-6">
                    <p className="text-sm text-gray-400">
                      MTN Mobile Money integration coming soon. Please use card payment for now.
                    </p>
                  </div>
                )}

                {/* Checkout Button */}
                <button
                  onClick={handleCheckout}
                  disabled={isProcessing || paymentMethod === "mtn"}
                  className="w-full gold-button flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Purchase</span>
                      <span className="font-normal">- ${product.price}</span>
                    </>
                  )}
                </button>

                {!isAuthenticated && (
                  <p className="mt-4 text-center text-sm text-gray-400">
                    You&apos;ll be asked to sign in before completing your purchase
                  </p>
                )}
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
        <div className="flex items-center justify-center py-32">
          <div className="spinner" />
        </div>
        <Footer />
      </main>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
