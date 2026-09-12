"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check, TrendingUp, Bell, Zap } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";

interface SignalPlanItem {
  id: string;
  name: string;
  description: string;
  price: number;
  metadata?: Record<string, any>;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export default function FeaturedSignals() {
  const [plans, setPlans] = useState<SignalPlanItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedPlans = async () => {
      try {
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("type", "signal")
          .eq("is_active", true)
          .order("price", { ascending: true })
          .limit(2);

        if (error) throw error;
        setPlans(data || []);
      } catch (error) {
        console.error("Unable to load featured signal plans:", error);
        setPlans([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeaturedPlans();
  }, []);

  return (
    <section className="py-20 bg-dark-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1 rounded-full bg-gold-500/10 text-gold-400 text-sm font-medium mb-4">
            <Bell className="w-4 h-4 inline mr-2" />
            Trading Signals
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Professional <span className="gold-gradient-text">Signal Plans</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Subscription access is configured from the platform catalog, so each plan reflects the data in Supabase.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12"><div className="spinner" /></div>
        ) : plans.length > 0 ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto"
          >
            {plans.map((plan, index) => {
              const isPopular = Boolean(plan.metadata?.popular) || index === 0;
              const featureList = Array.isArray(plan.metadata?.features) ? plan.metadata.features : [
                "Market commentary",
                "Entry and risk notes",
                "Platform updates",
                "Subscriber support"
              ];

              return (
                <motion.div
                  key={plan.id}
                  variants={itemVariants}
                  className={`dark-card overflow-hidden relative ${isPopular ? "border-gold-500/50" : ""}`}
                >
                  {isPopular && (
                    <div className="absolute top-0 right-0 bg-gold-500 text-dark-950 text-xs font-bold px-4 py-1 rounded-bl-lg">
                      MOST POPULAR
                    </div>
                  )}

                  <div className="p-8">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isPopular ? "bg-gold-500/20" : "bg-dark-800"}`}>
                        <TrendingUp className={`w-6 h-6 ${isPopular ? "text-gold-400" : "text-gray-400"}`} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{plan.name}</h3>
                        <p className="text-sm text-gray-500">{plan.description}</p>
                      </div>
                    </div>

                    <div className="mb-6">
                      <span className="text-4xl font-bold gold-gradient-text">
                        ${Number(plan.price || 0).toFixed(2)}
                      </span>
                      <span className="text-gray-500">/{plan.metadata?.interval || "month"}</span>
                    </div>

                    <ul className="space-y-3 mb-8">
                      {featureList.map((feature, idx) => (
                        <li key={idx} className="flex items-center space-x-3">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isPopular ? "bg-gold-500/20" : "bg-green-500/20"}`}>
                            <Check className={`w-3 h-3 ${isPopular ? "text-gold-400" : "text-green-400"}`} />
                          </div>
                          <span className="text-gray-300 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      href={`/signals/${plan.id}`}
                      className={`w-full flex items-center justify-center space-x-2 py-3 rounded-lg font-medium transition-all ${isPopular ? "gold-button" : "border border-gold-500/50 text-gold-400 hover:bg-gold-500/10"}`}
                    >
                      <Zap className="w-4 h-4" />
                      <span>Subscribe Now</span>
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg font-medium">No signal plans are available right now.</p>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center mt-12"
        >
          <Link
            href="/signals"
            className="inline-flex items-center space-x-2 text-gold-400 hover:text-gold-300 transition-colors"
          >
            <span>View Signal Plans</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
