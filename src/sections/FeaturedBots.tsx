"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Bot, Cpu, Download, Settings } from "lucide-react";

const tradingBots = [
  {
    id: "1",
    name: "AutoTrader Pro",
    description: "Fully automated trading bot for MT4/MT5 with advanced risk management",
    price: 299.99,
    features: [
      "MT4/MT5 Compatible",
      "Auto Risk Management",
      "Multiple Strategies",
      "24/7 Auto Trading",
    ],
    icon: Bot,
  },
  {
    id: "2",
    name: "Scalper X",
    description: "High-frequency scalping bot for quick trades and fast profits",
    price: 199.99,
    features: [
      "High-Frequency Trading",
      "Sub-second Execution",
      "Low Spread Optimization",
      "Built-in News Filter",
    ],
    icon: Cpu,
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

export default function FeaturedBots() {
  return (
    <section className="py-20 bg-dark-950">
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
            <Bot className="w-4 h-4 inline mr-2" />
            Trading Automation
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Featured <span className="gold-gradient-text">Trading Bots</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Automate your trading with our professional-grade bots. Trade 24/7 without emotions.
          </p>
        </motion.div>

        {/* Bot Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto"
        >
          {tradingBots.map((bot) => {
            const Icon = bot.icon;
            return (
              <motion.div
                key={bot.id}
                variants={itemVariants}
                className="dark-card overflow-hidden group"
              >
                <div className="p-8">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-500/20 to-gold-600/10 flex items-center justify-center group-hover:from-gold-500/30 group-hover:to-gold-600/20 transition-all">
                        <Icon className="w-8 h-8 text-gold-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold group-hover:text-gold-400 transition-colors">
                          {bot.name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">{bot.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {bot.features.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-2 text-sm text-gray-400"
                      >
                        <Settings className="w-4 h-4 text-gold-500/60" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Price & CTA */}
                  <div className="flex items-center justify-between pt-6 border-t border-dark-800">
                    <div className="text-2xl font-bold gold-gradient-text">
                      ${bot.price}
                    </div>
                    <Link
                      href={`/bots/${bot.id}`}
                      className="flex items-center space-x-2 px-6 py-2 rounded-lg bg-gold-500/10 text-gold-400 hover:bg-gold-500/20 transition-all"
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

        {/* View All Button */}
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
