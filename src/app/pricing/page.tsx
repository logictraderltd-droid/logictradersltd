"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, ArrowRight, BookOpen, Bell, Bot } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const pricingTiers = [
  {
    name: "Starter",
    description: "Perfect for beginners",
    price: "Free",
    period: "",
    icon: BookOpen,
    features: [
      "Access to free courses",
      "Community forum access",
      "Basic market updates",
      "Email support",
    ],
    cta: "Get Started",
    href: "/register",
    highlighted: false,
  },
  {
    name: "Pro Trader",
    description: "For serious traders",
    price: "$149",
    period: "/month",
    icon: Bell,
    features: [
      "All Starter features",
      "Premium signal subscription",
      "Advanced courses access",
      "Priority support",
      "Weekly market analysis",
    ],
    cta: "Subscribe Now",
    href: "/signals",
    highlighted: true,
  },
  {
    name: "Elite",
    description: "Complete trading suite",
    price: "$499",
    period: "",
    icon: Bot,
    features: [
      "All Pro Trader features",
      "Trading bot license",
      "1-on-1 mentorship",
      "Custom strategies",
      "Lifetime updates",
    ],
    cta: "Go Elite",
    href: "/bots",
    highlighted: false,
  },
];

export default function PricingPage() {
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
              Pricing Plans
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Choose Your <span className="gold-gradient-text">Trading Journey</span>
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Select the plan that fits your trading goals. Upgrade or downgrade at any time.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {pricingTiers.map((tier, index) => {
              const Icon = tier.icon;
              return (
                <motion.div
                  key={tier.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`dark-card overflow-hidden ${
                    tier.highlighted ? "border-gold-500/50 scale-105" : ""
                  }`}
                >
                  {tier.highlighted && (
                    <div className="bg-gold-500 text-dark-950 text-center py-2 text-sm font-bold">
                      MOST POPULAR
                    </div>
                  )}
                  
                  <div className="p-8">
                    {/* Header */}
                    <div className="flex items-center space-x-3 mb-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        tier.highlighted ? "bg-gold-500/20" : "bg-dark-800"
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          tier.highlighted ? "text-gold-400" : "text-gray-400"
                        }`} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{tier.name}</h3>
                        <p className="text-sm text-gray-500">{tier.description}</p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      <span className="text-4xl font-bold gold-gradient-text">
                        {tier.price}
                      </span>
                      <span className="text-gray-500">{tier.period}</span>
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 mb-8">
                      {tier.features.map((feature, i) => (
                        <li key={i} className="flex items-center space-x-3">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            tier.highlighted ? "bg-gold-500/20" : "bg-green-500/20"
                          }`}>
                            <Check className={`w-3 h-3 ${
                              tier.highlighted ? "text-gold-400" : "text-green-400"
                            }`} />
                          </div>
                          <span className="text-gray-300 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <Link
                      href={tier.href}
                      className={`w-full flex items-center justify-center space-x-2 py-3 rounded-lg font-medium transition-all ${
                        tier.highlighted
                          ? "gold-button"
                          : "border border-gold-500/50 text-gold-400 hover:bg-gold-500/10"
                      }`}
                    >
                      <span>{tier.cta}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "Can I upgrade or downgrade my plan?",
                a: "Yes, you can change your plan at any time. Changes will take effect at the start of your next billing cycle.",
              },
              {
                q: "Is there a money-back guarantee?",
                a: "Yes, we offer a 7-day money-back guarantee for all paid plans. No questions asked.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept credit/debit cards via Stripe and MTN Mobile Money (in selected regions).",
              },
              {
                q: "How do I access my purchased content?",
                a: "After purchase, you'll have immediate access to all your content through your personal dashboard.",
              },
            ].map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="dark-card p-6"
              >
                <h3 className="font-bold mb-2">{faq.q}</h3>
                <p className="text-gray-400 text-sm">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
