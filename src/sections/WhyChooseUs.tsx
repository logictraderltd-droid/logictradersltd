"use client";

import { motion } from "framer-motion";
import { Target, Shield, TrendingUp, Users, Award, Clock } from "lucide-react";

const features = [
  {
    icon: Target,
    title: "Clear Signal Details",
    description: "Review published entry, stop-loss, and take-profit information before making independent decisions.",
  },
  {
    icon: Shield,
    title: "Risk Management",
    description: "Explore educational material about risk controls. Trading still involves a risk of loss.",
  },
  {
    icon: TrendingUp,
    title: "Trading Tools",
    description: "Compare the listed tools and services, and review their features and requirements.",
  },
  {
    icon: Users,
    title: "Expert Support",
    description: "Find platform information and community resources to support your learning.",
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
    <section className="py-14 sm:py-20 bg-dark-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10 sm:mb-16"
        >
          <span className="inline-block px-4 py-1 rounded-full bg-gold-500/10 text-gold-400 text-sm font-medium mb-4">
            Why Choose Us
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
            The <span className="gold-gradient-text">LOGICTRADERSLTD</span> Advantage
          </h2>
          <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto">
            We combine cutting-edge technology with expert knowledge to deliver the best trading experience
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid gap-5 sm:gap-8 md:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                className="dark-card p-4 sm:p-6 group hover:border-gold-500/50 transition-all"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-gold-500/20 to-gold-600/10 flex items-center justify-center mb-4 group-hover:from-gold-500/30 group-hover:to-gold-600/20 transition-all">
                  <Icon className="w-5 h-5 sm:w-7 sm:h-7 text-gold-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 group-hover:text-gold-400 transition-colors">
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
          className="mt-12 sm:mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8"
        >
          <div className="text-center">
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold gold-gradient-text mb-2">Courses</div>
            <div className="text-xs sm:text-sm text-gray-500">Beginner to professional</div>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold gold-gradient-text mb-2">Signals</div>
            <div className="text-xs sm:text-sm text-gray-500">One-time VIP plans</div>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold gold-gradient-text mb-2">Bots</div>
            <div className="text-xs sm:text-sm text-gray-500">Digital trading tools</div>
          </div>
          <div className="text-center">
            <div className="text-2xl sm:text-3xl lg:text-4xl font-bold gold-gradient-text mb-2">Providers</div>
            <div className="text-xs sm:text-sm text-gray-500">External listings</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
