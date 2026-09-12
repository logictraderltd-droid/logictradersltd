"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bell, Check, TrendingUp, ArrowRight, Star } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";
import { SignalPlan } from "@/types";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function SignalsPage() {
  const [plans, setPlans] = useState<SignalPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("type", "signal")
        .eq("is_active", true)
        .order("price", { ascending: true });

      if (error) {
        console.error("Error fetching signal plans:", error);
      } else {
        setPlans(data || []);
      }
      setIsLoading(false);
    };

    fetchPlans();
  }, []);

  const getFeatures = (plan: SignalPlan): string[] => {
    return plan.metadata?.features || [
      "5-10 signals per day",
      "Forex & Crypto pairs",
      "Entry, Stop Loss & Take Profit",
      "24/7 Support",
    ];
  };

  return (
    <main className="min-h-screen bg-dark-950">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <span className="inline-block px-4 py-1 rounded-full bg-gold-500/10 text-gold-400 text-sm font-medium mb-4">
              <Bell className="w-4 h-4 inline mr-2" />
              Trading Signals
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Professional <span className="gold-gradient-text">Signal Plans</span>
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Get real-time trading signals from our expert analysts. High-accuracy entries 
              with clear stop loss and take profit levels.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="dark-card p-6 text-center"
            >
              <div className="text-3xl font-bold gold-gradient-text mb-1">95%</div>
              <div className="text-sm text-gray-500">Accuracy Rate</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="dark-card p-6 text-center"
            >
              <div className="text-3xl font-bold gold-gradient-text mb-1">10+</div>
              <div className="text-sm text-gray-500">Signals Daily</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="dark-card p-6 text-center"
            >
              <div className="text-3xl font-bold gold-gradient-text mb-1">24/7</div>
              <div className="text-sm text-gray-500">Support</div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="dark-card p-6 text-center"
            >
              <div className="text-3xl font-bold gold-gradient-text mb-1">5K+</div>
              <div className="text-sm text-gray-500">Subscribers</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing Plans */}
      <section className="pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="spinner" />
            </div>
          ) : plans.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-8">
              {plans.map((plan, index) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`dark-card overflow-hidden relative ${
                    plan.metadata?.popular ? "border-gold-500/50" : ""
                  }`}
                >
                  {plan.metadata?.popular && (
                    <div className="absolute top-0 right-0 bg-gold-500 text-dark-950 text-xs font-bold px-4 py-1 rounded-bl-lg flex items-center">
                      <Star className="w-3 h-3 mr-1" />
                      MOST POPULAR
                    </div>
                  )}

                  <div className="p-8">
                    {/* Header */}
                    <div className="flex items-center space-x-3 mb-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        plan.metadata?.popular ? "bg-gold-500/20" : "bg-dark-800"
                      }`}>
                        <TrendingUp className={`w-6 h-6 ${
                          plan.metadata?.popular ? "text-gold-400" : "text-gray-400"
                        }`} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{plan.name}</h3>
                        <p className="text-sm text-gray-500">{plan.description}</p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      <span className="text-4xl font-bold gold-gradient-text">
                        ${plan.price}
                      </span>
                      <span className="text-gray-500">/{plan.metadata?.interval || "month"}</span>
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 mb-8">
                      {getFeatures(plan).map((feature, i) => (
                        <li key={i} className="flex items-center space-x-3">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            plan.metadata?.popular ? "bg-gold-500/20" : "bg-green-500/20"
                          }`}>
                            <Check className={`w-3 h-3 ${
                              plan.metadata?.popular ? "text-gold-400" : "text-green-400"
                            }`} />
                          </div>
                          <span className="text-gray-300 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <Link
                      href={`/checkout?product=${plan.id}`}
                      className={`w-full flex items-center justify-center space-x-2 py-3 rounded-lg font-medium transition-all ${
                        plan.metadata?.popular
                          ? "gold-button"
                          : "border border-gold-500/50 text-gold-400 hover:bg-gold-500/10"
                      }`}
                    >
                      <span>Subscribe Now</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <Bell className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-400">No signal plans available</h3>
              <p className="text-gray-500 mt-2">Check back soon for new plans</p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
