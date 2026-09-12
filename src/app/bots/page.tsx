"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bot, Cpu, Download, Settings, ArrowRight, Check, Zap } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";
import { TradingBot } from "@/types";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function BotsPage() {
  const [bots, setBots] = useState<TradingBot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [strategyFilter, setStrategyFilter] = useState("all");

  useEffect(() => {
    const fetchBots = async () => {
      const supabase = createBrowserClient();
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("type", "bot")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching bots:", error);
      } else {
        setBots(data || []);
      }
      setIsLoading(false);
    };

    fetchBots();
  }, []);

  const filteredBots = bots.filter(bot => {
    const matchesSearch = bot.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bot.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getRequirements = (bot: TradingBot): string[] => {
    return bot.metadata?.requirements || [
      "MT4/MT5 Platform",
      "VPS Recommended",
      "Minimum $500 Balance",
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
              <Bot className="w-4 h-4 inline mr-2" />
              Trading Automation
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Professional <span className="gold-gradient-text">Trading Bots</span>
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Automate your trading with our professional-grade bots. Trade 24/7 without emotions
              and maximize your profits.
            </p>

            {/* Search Bar */}
            <div className="mt-12 max-w-2xl mx-auto px-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search trading bots..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-dark-900 border border-dark-800 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-gold-500/50 transition-all pl-14 shadow-2xl"
                />
                <Bot className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="dark-card p-6 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-gold-500/20 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-gold-400" />
              </div>
              <h3 className="text-lg font-bold mb-2">24/7 Trading</h3>
              <p className="text-gray-400 text-sm">
                Trade around the clock without missing any opportunities
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="dark-card p-6 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-gold-500/20 flex items-center justify-center mx-auto mb-4">
                <Cpu className="w-6 h-6 text-gold-400" />
              </div>
              <h3 className="text-lg font-bold mb-2">No Emotions</h3>
              <p className="text-gray-400 text-sm">
                Remove emotional decision-making from your trading
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="dark-card p-6 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-gold-500/20 flex items-center justify-center mx-auto mb-4">
                <Settings className="w-6 h-6 text-gold-400" />
              </div>
              <h3 className="text-lg font-bold mb-2">Fully Customizable</h3>
              <p className="text-gray-400 text-sm">
                Configure settings to match your trading style
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Bots Grid */}
      <section className="pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="spinner" />
            </div>
          ) : filteredBots.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-8">
              {filteredBots.map((bot, index) => (
                <motion.div
                  key={bot.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="dark-card overflow-hidden group"
                >
                  <div className="p-8">
                    {/* Header */}
                    <div className="flex items-start space-x-4 mb-6">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-500/20 to-gold-600/10 flex items-center justify-center group-hover:from-gold-500/30 group-hover:to-gold-600/20 transition-all">
                        <Bot className="w-8 h-8 text-gold-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold group-hover:text-gold-400 transition-colors">
                          {bot.name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">{bot.description}</p>
                      </div>
                    </div>

                    {/* Requirements */}
                    <div className="mb-6">
                      <p className="text-sm text-gray-400 mb-3">Requirements:</p>
                      <div className="flex flex-wrap gap-2">
                        {getRequirements(bot).map((req, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 rounded-full bg-dark-800 text-xs text-gray-400"
                          >
                            {req}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Features */}
                    <ul className="space-y-2 mb-6">
                      {(bot.metadata?.features || ["Auto Trading", "Risk Management", "Backtested Strategy"]).map((feature: string, i: number) => (
                        <li key={i} className="flex items-center space-x-2 text-sm text-gray-400">
                          <Check className="w-4 h-4 text-green-500" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Price & CTA */}
                    <div className="flex items-center justify-between pt-6 border-t border-dark-800">
                      <div className="text-2xl font-bold gold-gradient-text">
                        ${bot.price}
                      </div>
                      <Link
                        href={`/checkout?product=${bot.id}`}
                        className="flex items-center space-x-2 px-6 py-2 rounded-lg bg-gold-500/10 text-gold-400 hover:bg-gold-500/20 transition-all"
                      >
                        <Download className="w-4 h-4" />
                        <span className="text-sm font-medium">Get Bot</span>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <Bot className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-400">No bots available</h3>
              <p className="text-gray-500 mt-2">Check back soon for new trading bots</p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
