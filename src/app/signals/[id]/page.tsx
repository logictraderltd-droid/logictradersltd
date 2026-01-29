"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  TrendingUp,
  Bell,
  Check,
  Star,
  ShoppingCart,
  BarChart3,
  Clock,
  Award,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { createBrowserClient } from "@/lib/supabase";

interface SignalPlan {
  id: string;
  product_id: string;
  interval: string;
  features: string[];
  max_signals_per_day: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  thumbnail_url: string;
  metadata: any;
}

interface Signal {
  id: string;
  symbol: string;
  direction: string;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  status: string;
  result: string | null;
  created_at: string;
}

export default function SignalPlanDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [signalPlan, setSignalPlan] = useState<SignalPlan | null>(null);
  const [recentSignals, setRecentSignals] = useState<Signal[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPlanData();
  }, [params.id, user]);

  const fetchPlanData = async () => {
    const supabase = createBrowserClient();

    try {
      // Fetch product
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", params.id)
        .eq("type", "signal")
        .single();

      if (productError) throw productError;
      setProduct(productData);

      // Fetch signal plan details
      const { data: planData, error: planError } = await supabase
        .from("signal_plans")
        .select("*")
        .eq("product_id", params.id)
        .single();

      if (planError) throw planError;
      setSignalPlan(planData);

      // Fetch recent signals (preview - last 3)
      const { data: signalsData } = await supabase
        .from("signals")
        .select("*")
        .eq("plan_id", params.id)
        .order("created_at", { ascending: false })
        .limit(3);

      setRecentSignals(signalsData || []);

      // Check if user has active subscription
      if (user) {
        const { data: accessData } = await supabase
          .from("user_access")
          .select("*")
          .eq("user_id", user.id)
          .eq("product_id", params.id)
          .eq("is_active", true)
          .single();

        if (accessData) {
          // Check if subscription hasn't expired
          if (
            !accessData.access_expires_at ||
            new Date(accessData.access_expires_at) > new Date()
          ) {
            setHasAccess(true);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching signal plan:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/signals/${params.id}`);
      return;
    }
    router.push(`/checkout?product=${params.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!product || !signalPlan) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Signal Plan Not Found</h1>
          <Link href="/signals" className="gold-button">
            Back to Signal Plans
          </Link>
        </div>
      </div>
    );
  }

  const planName = signalPlan.interval.charAt(0).toUpperCase() + signalPlan.interval.slice(1);
  const duration = signalPlan.interval === "weekly" ? "7 days" : "30 days";

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Hero Section */}
      <section className="relative py-20 border-b border-dark-800">
        <div className="absolute inset-0 bg-gradient-to-b from-gold-500/5 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <Link
            href="/signals"
            className="inline-flex items-center text-gray-400 hover:text-gold-400 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Signal Plans
          </Link>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Plan Info */}
            <div>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-gold-500/20 text-gold-400 text-sm mb-4">
                {planName} Plan
              </div>

              <h1 className="text-4xl font-bold mb-4 gold-gradient-text">
                {product.name}
              </h1>

              <p className="text-gray-300 text-lg mb-6">{product.description}</p>

              <div className="flex items-center space-x-6 text-gray-400 mb-8">
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-gold-400" />
                  <span>{duration} access</span>
                </div>
                <div className="flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-gold-400" />
                  <span>Up to {signalPlan.max_signals_per_day} signals/day</span>
                </div>
              </div>

              {/* Price and CTA */}
              <div className="flex items-center space-x-4">
                <div>
                  <div className="text-3xl font-bold gold-gradient-text">
                    ${product.price}
                  </div>
                  <p className="text-sm text-gray-500">per {signalPlan.interval}</p>
                </div>
                {hasAccess ? (
                  <Link href="/dashboard?tab=signals" className="gold-button flex items-center">
                    <Bell className="w-5 h-5 mr-2" />
                    View My Signals
                  </Link>
                ) : (
                  <button onClick={handleSubscribe} className="gold-button flex items-center">
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Subscribe Now
                  </button>
                )}
              </div>
            </div>

            {/* Stats Card */}
            <div className="dark-card p-8">
              <h3 className="text-xl font-bold mb-6">Performance Stats</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-3xl font-bold text-green-400 mb-2">87%</div>
                  <p className="text-sm text-gray-400">Win Rate</p>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gold-400 mb-2">2.3:1</div>
                  <p className="text-sm text-gray-400">Risk/Reward</p>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-400 mb-2">1,234</div>
                  <p className="text-sm text-gray-400">Total Signals</p>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-400 mb-2">567</div>
                  <p className="text-sm text-gray-400">Active Users</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-12">
              {/* Features */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="dark-card p-8"
              >
                <h2 className="text-2xl font-bold mb-6">What's Included</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {signalPlan.features.map((feature, index) => (
                    <div key={index} className="flex items-start">
                      <Check className="w-5 h-5 text-gold-400 mr-3 flex-shrink-0 mt-1" />
                      <span className="text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Recent Signals Preview */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="dark-card p-8"
              >
                <h2 className="text-2xl font-bold mb-6">Recent Signals</h2>
                {recentSignals.length > 0 ? (
                  <div className="space-y-4">
                    {recentSignals.map((signal) => (
                      <div
                        key={signal.id}
                        className="p-4 rounded-lg bg-dark-900 border border-dark-800"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                signal.direction === "buy"
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-red-500/20 text-red-400"
                              }`}
                            >
                              <TrendingUp className="w-5 h-5" />
                            </div>
                            <div>
                              <h3 className="font-bold">{signal.symbol}</h3>
                              <p className="text-sm text-gray-500 capitalize">
                                {signal.direction}
                              </p>
                            </div>
                          </div>
                          {signal.result && (
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                signal.result === "win"
                                  ? "bg-green-500/20 text-green-400"
                                  : signal.result === "loss"
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-gray-500/20 text-gray-400"
                              }`}
                            >
                              {signal.result}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Entry</p>
                            <p className="font-medium">{signal.entry_price}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Stop Loss</p>
                            <p className="font-medium text-red-400">
                              {signal.stop_loss || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500">Take Profit</p>
                            <p className="font-medium text-green-400">
                              {signal.take_profit || "-"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!hasAccess && (
                      <div className="text-center py-8 border-t border-dark-800">
                        <p className="text-gray-400 mb-4">
                          Subscribe to view all signals in real-time
                        </p>
                        <button onClick={handleSubscribe} className="gold-button">
                          Subscribe Now
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <TrendingUp className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No recent signals available</p>
                  </div>
                )}
              </motion.div>

              {/* How It Works */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="dark-card p-8"
              >
                <h2 className="text-2xl font-bold mb-6">How It Works</h2>
                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="w-10 h-10 rounded-lg bg-gold-500/20 flex items-center justify-center text-gold-400 font-bold mr-4 flex-shrink-0">
                      1
                    </div>
                    <div>
                      <h3 className="font-bold mb-2">Subscribe to the Plan</h3>
                      <p className="text-gray-400">
                        Choose your preferred plan ({signalPlan.interval}) and complete the
                        payment securely.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-10 h-10 rounded-lg bg-gold-500/20 flex items-center justify-center text-gold-400 font-bold mr-4 flex-shrink-0">
                      2
                    </div>
                    <div>
                      <h3 className="font-bold mb-2">Get Instant Access</h3>
                      <p className="text-gray-400">
                        Access your dashboard immediately and start receiving trading
                        signals.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-10 h-10 rounded-lg bg-gold-500/20 flex items-center justify-center text-gold-400 font-bold mr-4 flex-shrink-0">
                      3
                    </div>
                    <div>
                      <h3 className="font-bold mb-2">Receive Signals</h3>
                      <p className="text-gray-400">
                        Get up to {signalPlan.max_signals_per_day} high-quality trading
                        signals every day with entry, stop loss, and take profit levels.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-10 h-10 rounded-lg bg-gold-500/20 flex items-center justify-center text-gold-400 font-bold mr-4 flex-shrink-0">
                      4
                    </div>
                    <div>
                      <h3 className="font-bold mb-2">Execute & Profit</h3>
                      <p className="text-gray-400">
                        Follow the signals, manage your risk, and track your performance.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="dark-card p-6 sticky top-24 space-y-6">
                <div>
                  <h3 className="text-xl font-bold mb-4">This Plan Includes:</h3>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center text-gray-300">
                      <Bell className="w-5 h-5 mr-3 text-gold-400" />
                      <span>Real-time signal notifications</span>
                    </div>
                    <div className="flex items-center text-gray-300">
                      <TrendingUp className="w-5 h-5 mr-3 text-gold-400" />
                      <span>{signalPlan.max_signals_per_day} signals per day</span>
                    </div>
                    <div className="flex items-center text-gray-300">
                      <BarChart3 className="w-5 h-5 mr-3 text-gold-400" />
                      <span>Detailed entry & exit points</span>
                    </div>
                    <div className="flex items-center text-gray-300">
                      <Award className="w-5 h-5 mr-3 text-gold-400" />
                      <span>87% average win rate</span>
                    </div>
                    <div className="flex items-center text-gray-300">
                      <Clock className="w-5 h-5 mr-3 text-gold-400" />
                      <span>{duration} full access</span>
                    </div>
                  </div>
                </div>

                {!hasAccess && (
                  <>
                    <div className="border-t border-dark-800 pt-6">
                      <div className="text-3xl font-bold gold-gradient-text mb-2">
                        ${product.price}
                      </div>
                      <p className="text-sm text-gray-500 mb-4">
                        per {signalPlan.interval}
                      </p>
                      <button onClick={handleSubscribe} className="gold-button w-full">
                        <ShoppingCart className="w-5 h-5 mr-2" />
                        Subscribe Now
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 text-center">
                      Cancel anytime. No hidden fees.
                    </p>
                  </>
                )}

                {hasAccess && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <div className="flex items-center text-green-400 mb-2">
                      <Check className="w-5 h-5 mr-2" />
                      <span className="font-medium">Active Subscription</span>
                    </div>
                    <p className="text-sm text-gray-400">
                      You have access to all signals
                    </p>
                    <Link
                      href="/dashboard?tab=signals"
                      className="block w-full mt-4 py-2 rounded-lg bg-green-500/20 text-green-400 text-center hover:bg-green-500/30 transition-colors"
                    >
                      View Signals
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
