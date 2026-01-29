"use client";

import { motion } from "framer-motion";
import { Target, Shield, TrendingUp, Users, Award, Clock } from "lucide-react";

const features = [
  {
    icon: Target,
    title: "High Accuracy",
    description: "Our signals and strategies are backed by rigorous backtesting and real-market performance data.",
  },
  {
    icon: Shield,
    title: "Risk Management",
    description: "Learn professional risk management techniques to protect your capital and maximize returns.",
  },
  {
    icon: TrendingUp,
    title: "Proven Strategies",
    description: "Access battle-tested trading strategies developed by industry professionals with years of experience.",
  },
  {
    icon: Users,
    title: "Expert Support",
    description: "Get 24/7 support from our team of trading experts who are dedicated to your success.",
  },
  {
    icon: Award,
    title: "Quality Education",
    description: "Comprehensive video courses designed to take you from beginner to advanced trader.",
  },
  {
    icon: Clock,
    title: "Real-time Signals",
    description: "Receive instant trading signals with clear entry, stop loss, and take profit levels.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export default function WhyChooseUs() {
  return (
    <section className="py-20 bg-dark-900/30">
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
            Why Choose Us
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            The <span className="gold-gradient-text">LOGICTRADERSLTD</span> Advantage
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            We combine cutting-edge technology with expert knowledge to deliver the best trading experience
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                className="dark-card p-6 group hover:border-gold-500/50 transition-all"
              >
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gold-500/20 to-gold-600/10 flex items-center justify-center mb-4 group-hover:from-gold-500/30 group-hover:to-gold-600/20 transition-all">
                  <Icon className="w-7 h-7 text-gold-400" />
                </div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-gold-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8"
        >
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-bold gold-gradient-text mb-2">10K+</div>
            <div className="text-sm text-gray-500">Active Members</div>
          </div>
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-bold gold-gradient-text mb-2">95%</div>
            <div className="text-sm text-gray-500">Signal Accuracy</div>
          </div>
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-bold gold-gradient-text mb-2">50+</div>
            <div className="text-sm text-gray-500">Countries Served</div>
          </div>
          <div className="text-center">
            <div className="text-3xl sm:text-4xl font-bold gold-gradient-text mb-2">4.9</div>
            <div className="text-sm text-gray-500">User Rating</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
