import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CFDBlockers from "@/components/CFDBlockers";

export const metadata: Metadata = {
  title: "CFD Blocker | LOGICTRADERSLTD",
  description: "Explore CFD blocker providers, product details, videos, and affiliate offers.",
};

export default function CfdBlockerPage() {
  return (
    <main className="min-h-screen bg-dark-950">
      <Navbar />
      <CFDBlockers />
      <Footer />
    </main>
  );
}
