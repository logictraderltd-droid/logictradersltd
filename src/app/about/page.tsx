"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Target,
  Users,
  Award,
  TrendingUp,
  Shield,
  Zap,
  Heart,
  Globe,
} from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-dark-950">
      {/* Hero Section */}
      <section className="relative py-20 border-b border-dark-800">
        <div className="absolute inset-0 bg-gradient-to-b from-gold-500/5 to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className="text-5xl font-bold mb-6 gold-gradient-text">
              About LOGICTRADERSLTD
            </h1>
            <p className="text-xl text-gray-300">
              Empowering traders worldwide with professional tools, education, and
              strategies to succeed in financial markets.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
              <p className="text-gray-300 mb-4">
                At LOGICTRADERSLTD, we believe that everyone deserves access to
                professional-grade trading tools and education. Our mission is to
                democratize trading success by providing:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start">
                  <TrendingUp className="w-6 h-6 text-gold-400 mr-3 flex-shrink-0 mt-1" />
                  <span className="text-gray-300">
                    High-quality educational content that transforms beginners into
                    confident traders
                  </span>
                </li>
                <li className="flex items-start">
                  <Shield className="w-6 h-6 text-gold-400 mr-3 flex-shrink-0 mt-1" />
                  <span className="text-gray-300">
                    Reliable trading signals backed by proven strategies and expert
                    analysis
                  </span>
                </li>
                <li className="flex items-start">
                  <Zap className="w-6 h-6 text-gold-400 mr-3 flex-shrink-0 mt-1" />
                  <span className="text-gray-300">
                    Automated trading solutions that work around the clock
                  </span>
                </li>
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="dark-card p-8"
            >
              <Target className="w-16 h-16 text-gold-400 mb-6" />
              <h3 className="text-2xl font-bold mb-4">Our Vision</h3>
              <p className="text-gray-300">
                To become the world's most trusted platform for trading education and
                tools, helping millions of traders achieve financial independence through
                smart, disciplined, and informed trading decisions.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 bg-dark-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Our Core Values</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              These principles guide everything we do and every decision we make.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="dark-card p-6 text-center"
            >
              <Shield className="w-12 h-12 text-gold-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-3">Integrity</h3>
              <p className="text-gray-400 text-sm">
                We operate with complete transparency and honesty in all our services and
                recommendations.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="dark-card p-6 text-center"
            >
              <Award className="w-12 h-12 text-gold-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-3">Excellence</h3>
              <p className="text-gray-400 text-sm">
                We strive for excellence in every course, signal, and tool we provide to
                our community.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="dark-card p-6 text-center"
            >
              <Users className="w-12 h-12 text-gold-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-3">Community</h3>
              <p className="text-gray-400 text-sm">
                We build a supportive community where traders help each other grow and
                succeed.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="dark-card p-6 text-center"
            >
              <Heart className="w-12 h-12 text-gold-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-3">Customer Focus</h3>
              <p className="text-gray-400 text-sm">
                Your success is our success. We're committed to your trading journey
                every step of the way.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Our Impact</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Numbers that reflect our commitment to trader success
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="text-4xl font-bold gold-gradient-text mb-2">10,000+</div>
              <p className="text-gray-400">Active Traders</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="text-4xl font-bold gold-gradient-text mb-2">87%</div>
              <p className="text-gray-400">Signal Win Rate</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="text-4xl font-bold gold-gradient-text mb-2">50+</div>
              <p className="text-gray-400">Expert Courses</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className="text-4xl font-bold gold-gradient-text mb-2">24/7</div>
              <p className="text-gray-400">Customer Support</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-20 bg-dark-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Meet Our Experts</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Our team of professional traders and educators with decades of combined
              experience
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Michael Chen",
                role: "Head Trader & Founder",
                experience: "15+ years in Forex & Crypto",
              },
              {
                name: "Sarah Williams",
                role: "Lead Trading Educator",
                experience: "10+ years teaching traders",
              },
              {
                name: "David Martinez",
                role: "Algorithm Developer",
                experience: "12+ years in trading bots",
              },
            ].map((member, index) => (
              <motion.div
                key={member.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="dark-card p-6 text-center"
              >
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">{member.name}</h3>
                <p className="text-gold-400 text-sm mb-2">{member.role}</p>
                <p className="text-gray-400 text-sm">{member.experience}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="dark-card p-12"
          >
            <Globe className="w-16 h-16 text-gold-400 mx-auto mb-6" />
            <h2 className="text-3xl font-bold mb-4">Ready to Start Trading?</h2>
            <p className="text-gray-300 mb-8">
              Join thousands of successful traders who trust LOGICTRADERSLTD for their
              trading journey.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/courses" className="gold-button">
                Browse Courses
              </Link>
              <Link
                href="/register"
                className="px-8 py-3 rounded-lg border border-gold-500 text-gold-400 hover:bg-gold-500/10 transition-colors"
              >
                Create Account
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
