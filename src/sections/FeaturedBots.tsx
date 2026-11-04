"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Bot, Download, Settings } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";
import { useNearViewport } from "@/lib/useNearViewport";
import { InlineVideo } from "@/components/InlineVideo";

interface FeaturedBot {
  id: string;
  name: string;
  description: string;
  price: number;
  thumbnail_url: string | null;
  metadata?: {
    bot_type?: string;
    delivery_method?: string;
    demo_video_url?: string;
    features?: unknown;
  };
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
  const { ref, hasEnteredViewport } = useNearViewport<HTMLElement>();

  useEffect(() => {
    if (!hasEnteredViewport) return;
    const fetchFeaturedBots = async () => {
      try {
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from("products")
          .select("id,name,description,price_cents,thumbnail_url,metadata,product_type,created_at")
          .eq("is_active", true)
          .eq("product_type", "bot")
          .order("created_at", { ascending: false })
          .limit(2);

        if (error) throw error;

        setBots((data || []).map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description || "",
          price: Number(item.price_cents ?? 0) / 100,
          thumbnail_url: item.thumbnail_url,
          metadata: item.metadata,
        })));
      } catch (error) {
        console.error("Unable to load featured bots:", error);
        setBots([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeaturedBots();
  }, [hasEnteredViewport]);

  return (
    <section ref={ref} className="py-14 sm:py-20 bg-dark-950">
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
              const features = Array.isArray(bot.metadata?.features)
                ? bot.metadata.features.filter((feature): feature is string => typeof feature === "string")
                : [];
              const botType = typeof bot.metadata?.bot_type === "string" && bot.metadata.bot_type.trim()
                ? bot.metadata.bot_type
                : "Trading Bot";
              const deliveryMethod = bot.metadata?.delivery_method === "manual_email"
                ? "Manual email delivery"
                : "Automatic download";

              return (
                <motion.div
                  key={bot.id}
                  variants={itemVariants}
                  className="dark-card overflow-hidden group"
                >
                  <div className="relative aspect-video overflow-hidden bg-dark-900">
                    {typeof bot.metadata?.demo_video_url === "string" && bot.metadata.demo_video_url ? (
                      <InlineVideo url={bot.metadata.demo_video_url} title={`${bot.name} demonstration`} poster={bot.thumbnail_url} />
                    ) : bot.thumbnail_url ? (
                      <img src={bot.thumbnail_url} alt={bot.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gold-400/40">
                        <Bot className="h-14 w-14" />
                      </div>
                    )}
                    <span className="absolute left-3 top-3 border border-gold-500/30 bg-dark-950/85 px-3 py-1 text-xs font-semibold text-gold-200">
                      {botType}
                    </span>
                  </div>

                  <div className="p-4 sm:p-6">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <h3 className="text-lg font-bold text-white transition-colors group-hover:text-gold-400 sm:text-xl">
                        {bot.name}
                      </h3>
                    </div>
                    <p className="mb-3 line-clamp-2 min-h-10 text-sm text-gray-400">{bot.description}</p>
                    <p className="mb-4 text-xs font-semibold text-gold-300">Delivery: {deliveryMethod}</p>

                    {features.length > 0 && <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {features.map((feature, i) => (
                        <div
                          key={i}
                          className="flex items-center space-x-2 text-sm text-gray-400"
                        >
                          <Settings className="w-4 h-4 text-gold-500/60" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>}

                    <div className="flex items-center justify-between gap-3 border-t border-dark-800 pt-4">
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
