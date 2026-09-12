"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Bot, Cpu, Download, Settings } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";

interface FeaturedBot {
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

export default function FeaturedBots() {
  const [bots, setBots] = useState<FeaturedBot[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeaturedBots = async () => {
      try {
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("product_type", "bot")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(2);

        if (error) throw error;
        setBots((data || []).map((item: any) => ({ ...item, type: item.product_type ?? item.type ?? "bot" })));
      } catch (error) {
        console.error("Unable to load featured bots:", error);
        setBots([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeaturedBots();
  }, []);

  return (
    <section className="py-14 sm:py-20 bg-dark-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 sm:mb-16"
        >
          <span className="inline-block px-4 py-1 rounded-full bg-gold-500/10 text-gold-400 text-sm font-medium mb-4">
            <Bot className="w-4 h-4 inline mr-2" />
            Trading Automation
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
            Featured <span className="gold-gradient-text">Trading Bots</span>
          </h2>
          <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto">
            Review the platform&apos;s current automation catalog and choose the bot that matches your setup.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12"><div className="spinner" /></div>
        ) : bots.length > 0 ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid gap-6 sm:gap-8 md:grid-cols-2 max-w-4xl mx-auto"
          >
            {bots.map((bot, index) => {
              const Icon = index % 2 === 0 ? Bot : Cpu;
              const features = Array.isArray(bot.metadata?.features) ? bot.metadata.features : [
                "Automation",
                "Risk controls",
                "Market coverage"
              ];

              return (
                <motion.div
                  key={bot.id}
                  variants={itemVariants}
                  className="dark-card overflow-hidden group"
                >
                  <div className="p-4 sm:p-8">
                    <div className="flex items-start justify-between mb-5 sm:mb-6">
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-gold-500/20 to-gold-600/10 flex items-center justify-center group-hover:from-gold-500/30 group-hover:to-gold-600/20 transition-all">
                          <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-gold-400" />
                        </div>
                        <div>
                          <h3 className="text-lg sm:text-xl font-bold group-hover:text-gold-400 transition-colors">
                            {bot.name}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-500 mt-1">{bot.description}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                      {features.map((feature, i) => (
                        <div
                          key={i}
                          className="flex items-center space-x-2 text-sm text-gray-400"
                        >
                          <Settings className="w-4 h-4 text-gold-500/60" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-6 border-t border-dark-800">
                      <div className="text-xl sm:text-2xl font-bold gold-gradient-text">
                        ${Number(bot.price || 0).toFixed(2)}
                      </div>
                      <Link
                        href={`/bots/${bot.id}`}
                        className="flex items-center space-x-2 px-4 sm:px-6 py-2 rounded-lg bg-gold-500/10 text-gold-400 hover:bg-gold-500/20 transition-all"
                      >
                        <Download className="w-4 h-4" />
                        <span className="text-sm font-medium">Get Bot</span>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg font-medium">No trading bots are available right now.</p>
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
            href="/bots"
            className="inline-flex items-center space-x-2 px-8 py-3 rounded-lg border border-gold-500/50 text-gold-400 hover:bg-gold-500/10 transition-all"
          >
            <span>View All Bots</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
