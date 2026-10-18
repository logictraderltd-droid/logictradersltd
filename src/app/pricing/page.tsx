"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PlatformListings from "@/components/PlatformListings";

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-dark-950 text-white">
      <Navbar />

      <section className="relative overflow-hidden pt-32 pb-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,160,23,0.15),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(234,179,8,0.12),transparent_30%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-4xl mx-auto"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gold-500/30 bg-gold-500/10 text-gold-300 text-xs font-semibold uppercase tracking-[0.2em] mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              Pro Firm
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6">
              <span className="gold-gradient-text">Pro Firm</span>
            </h1>
            <p className="text-gray-300 text-lg max-w-3xl mx-auto leading-relaxed">
              Compare prop trading firms and explore firm-specific resources and links.
            </p>
          </motion.div>
        </div>
      </section>

      <PlatformListings
        contentKey="pro_firm_listings"
        title="Prop Trading Firms"
        description="Compare firm information and explore firm-specific resources and links."
        emptyMessage="Firm listings will appear here when published."
      />

      <Footer />
    </main>
  );
}
