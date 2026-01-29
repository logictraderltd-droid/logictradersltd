"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Check, TrendingUp, Bell, Zap } from "lucide-react";

const signalPlans = [
  {
    id: "1",
    name: "Weekly Signals",
    description: "Perfect for traders who want to test our signals",
    price: 49.99,
    interval: "week",
    features: [
      "5-10 signals per day",
      "Forex & Crypto pairs",
      "Entry, Stop Loss & Take Profit",
      "24/7 Support",
    ],
    popular: false,
  },
  {
    id: "2",
    name: "Monthly Signals",
    description: "Best value for serious traders",
    price: 149.99,
    interval: "month",
    features: [
      "5-10 signals per day",
      "Forex & Crypto pairs",
      "Entry, Stop Loss & Take Profit",
      "24/7 Priority Support",
      "Weekly market analysis",
      "Risk management tips",
    ],
    popular: true,
  },
];

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
  return (
    <section className="py-20 bg-dark-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
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
            Get real-time trading signals from our expert analysts. High-accuracy entries with clear targets.
          </p>
        </motion.div>

        {/* Signal Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto"
        >
          {signalPlans.map((plan) => (
            <motion.div
              key={plan.id}
              variants={itemVariants}
              className={`dark-card overflow-hidden relative ${
                plan.popular ? "border-gold-500/50" : ""
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-gold-500 text-dark-950 text-xs font-bold px-4 py-1 rounded-bl-lg">
                  MOST POPULAR
                </div>
              )}

              <div className="p-8">
                {/* Header */}
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    plan.popular ? "bg-gold-500/20" : "bg-dark-800"
                  }`}>
                    <TrendingUp className={`w-6 h-6 ${
                      plan.popular ? "text-gold-400" : "text-gray-400"
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
                  <span className="text-gray-500">/{plan.interval}</span>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center space-x-3">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        plan.popular ? "bg-gold-500/20" : "bg-green-500/20"
                      }`}>
                        <Check className={`w-3 h-3 ${
                          plan.popular ? "text-gold-400" : "text-green-400"
                        }`} />
                      </div>
                      <span className="text-gray-300 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Link
                  href={`/signals/${plan.id}`}
                  className={`w-full flex items-center justify-center space-x-2 py-3 rounded-lg font-medium transition-all ${
                    plan.popular
                      ? "gold-button"
                      : "border border-gold-500/50 text-gold-400 hover:bg-gold-500/10"
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  <span>Subscribe Now</span>
                </Link>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* View All Button */}
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
            <span>View Signal History</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
