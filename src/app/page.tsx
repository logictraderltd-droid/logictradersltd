"use client";

import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Hero from "@/sections/Hero";
import FeaturedCourses from "@/sections/FeaturedCourses";
import FeaturedSignals from "@/sections/FeaturedSignals";
import FeaturedBots from "@/sections/FeaturedBots";
import WhyChooseUs from "@/sections/WhyChooseUs";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-dark-950">
      <Navbar />
      <Hero />
      
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <FeaturedCourses />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <FeaturedSignals />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <FeaturedBots />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <WhyChooseUs />
      </motion.div>

      <p className="mx-auto max-w-5xl px-4 pb-8 text-center text-xs leading-relaxed text-gray-500">
        Trading forex, CFDs, and other financial instruments involves substantial risk and may result in loss of capital. Nothing on this site is financial advice or a guarantee of results. Past performance does not predict future results.
      </p>

      <Footer />
    </main>
  );
}
