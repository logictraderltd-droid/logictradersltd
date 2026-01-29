"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Play, TrendingUp, BarChart3, Shield } from "lucide-react";

// Animated candlestick component
const Candlestick = ({ delay = 0, height = 60, isGreen = true }: { delay?: number; height?: number; isGreen?: boolean }) => (
  <motion.div
    initial={{ height: 0, opacity: 0 }}
    animate={{ height, opacity: 1 }}
    transition={{ duration: 0.5, delay }}
    className={`w-3 rounded-sm ${isGreen ? 'bg-green-500' : 'bg-red-500'}`}
    style={{ 
      boxShadow: isGreen ? '0 0 10px rgba(34, 197, 94, 0.5)' : '0 0 10px rgba(239, 68, 68, 0.5)'
    }}
  />
);

// Floating particle component
const FloatingParticle = ({ delay = 0, x, y }: { delay?: number; x: string; y: string }) => (
  <motion.div
    className="absolute w-2 h-2 rounded-full bg-gold-500/30"
    style={{ left: x, top: y }}
    animate={{
      y: [0, -20, 0],
      opacity: [0.3, 0.6, 0.3],
    }}
    transition={{
      duration: 4,
      delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-dark-950">
        {/* Grid Pattern */}
        <div className="absolute inset-0 chart-grid opacity-30" />
        
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gold-600/5 rounded-full blur-3xl" />
        
        {/* Floating Particles */}
        <FloatingParticle delay={0} x="10%" y="20%" />
        <FloatingParticle delay={1} x="20%" y="60%" />
        <FloatingParticle delay={2} x="80%" y="30%" />
        <FloatingParticle delay={1.5} x="70%" y="70%" />
        <FloatingParticle delay={0.5} x="40%" y="80%" />
        <FloatingParticle delay={2.5} x="90%" y="50%" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column - Text */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-left"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gold-500/10 border border-gold-500/30 mb-6"
            >
              <span className="w-2 h-2 rounded-full bg-gold-400 animate-pulse" />
              <span className="text-sm text-gold-400 font-medium">Premium Trading Platform</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6"
            >
              Master the Markets with{" "}
              <span className="gold-gradient-text">Logic & Precision</span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-lg text-gray-400 mb-8 max-w-xl mx-auto lg:mx-0"
            >
              Unlock professional trading education, real-time signals, and powerful automation tools. 
              Join thousands of successful traders who trust LOGICTRADERSLTD.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start space-y-4 sm:space-y-0 sm:space-x-4"
            >
              <Link
                href="/register"
                className="gold-button flex items-center space-x-2 w-full sm:w-auto justify-center"
              >
                <span>Get Started</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/courses"
                className="flex items-center space-x-2 px-6 py-3 rounded-lg border border-gold-500/50 text-gold-400 hover:bg-gold-500/10 transition-all w-full sm:w-auto justify-center"
              >
                <Play className="w-5 h-5" />
                <span>View Courses</span>
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mt-12 grid grid-cols-3 gap-6"
            >
              <div className="text-center lg:text-left">
                <div className="text-2xl sm:text-3xl font-bold gold-gradient-text">10K+</div>
                <div className="text-sm text-gray-500">Active Traders</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-2xl sm:text-3xl font-bold gold-gradient-text">95%</div>
                <div className="text-sm text-gray-500">Success Rate</div>
              </div>
              <div className="text-center lg:text-left">
                <div className="text-2xl sm:text-3xl font-bold gold-gradient-text">24/7</div>
                <div className="text-sm text-gray-500">Support</div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column - Animated Chart */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="hidden lg:flex items-center justify-center"
          >
            <div className="relative">
              {/* Main Chart Container */}
              <div className="relative w-80 h-80 rounded-2xl bg-dark-900/80 border border-gold-500/20 p-6 backdrop-blur-sm">
                {/* Chart Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium text-gray-300">EUR/USD</span>
                  </div>
                  <span className="text-sm font-bold text-green-500">+2.45%</span>
                </div>

                {/* Candlestick Chart */}
                <div className="flex items-end justify-between h-48 px-4 space-x-2">
                  <Candlestick delay={0} height={40} isGreen={false} />
                  <Candlestick delay={0.1} height={60} isGreen={true} />
                  <Candlestick delay={0.2} height={35} isGreen={false} />
                  <Candlestick delay={0.3} height={80} isGreen={true} />
                  <Candlestick delay={0.4} height={55} isGreen={true} />
                  <Candlestick delay={0.5} height={45} isGreen={false} />
                  <Candlestick delay={0.6} height={70} isGreen={true} />
                  <Candlestick delay={0.7} height={50} isGreen={true} />
                  <Candlestick delay={0.8} height={65} isGreen={false} />
                  <Candlestick delay={0.9} height={85} isGreen={true} />
                </div>

                {/* Chart Footer */}
                <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                  <span>1H</span>
                  <span>4H</span>
                  <span className="text-gold-400">1D</span>
                  <span>1W</span>
                  <span>1M</span>
                </div>
              </div>

              {/* Floating Cards */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-4 -right-4 w-32 h-20 rounded-xl bg-dark-800/90 border border-gold-500/20 p-3 backdrop-blur-sm"
              >
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-gold-400" />
                  <span className="text-xs text-gray-400">Signals</span>
                </div>
                <div className="mt-1 text-lg font-bold text-green-400">+127 pips</div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-4 -left-4 w-32 h-20 rounded-xl bg-dark-800/90 border border-gold-500/20 p-3 backdrop-blur-sm"
              >
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-gold-400" />
                  <span className="text-xs text-gray-400">Security</span>
                </div>
                <div className="mt-1 text-lg font-bold text-gold-400">Protected</div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-dark-950 to-transparent" />
    </section>
  );
}
