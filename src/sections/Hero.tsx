"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Play, Video, Volume2, VolumeX, Youtube, Instagram, Facebook, Send, Music2 } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";

interface ShortVideo {
  id: string;
  name: string;
  description: string;
  type: string;
  thumbnail_url?: string;
  video_url: string;
  source: "youtube" | "video";
}

const suppliedYoutubeShorts: ShortVideo[] = [
  {
    id: "youtube-short-IT47FNXAoKc",
    name: "Trading insight",
    description: "Watch the latest LOGICTRADERSLTD short.",
    type: "short",
    video_url: "https://www.youtube.com/embed/IT47FNXAoKc?autoplay=1&mute=1&loop=1&playlist=IT47FNXAoKc&rel=0",
    source: "youtube",
  },
  {
    id: "youtube-short-HUBb2-Oxa84",
    name: "Trading insight",
    description: "Watch another LOGICTRADERSLTD short.",
    type: "short",
    video_url: "https://www.youtube.com/embed/HUBb2-Oxa84?autoplay=1&mute=1&loop=1&playlist=HUBb2-Oxa84&rel=0",
    source: "youtube",
  },
];

const socialLinks = [
  { label: "YouTube", icon: Youtube, href: "https://www.youtube.com/@sam_elabigael" },
  { label: "Instagram", icon: Instagram, href: "https://www.instagram.com/sam_elabigael/" },
  { label: "Facebook", icon: Facebook, href: "https://www.facebook.com/sam_elabigael" },
  { label: "TikTok", icon: Music2, href: "https://www.tiktok.com/@sam_elabigael" },
  { label: "Telegram", icon: Send, href: "https://t.me/sam_elabigael" },
];

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
  const [shorts, setShorts] = useState<ShortVideo[]>([]);
  const [isLoadingShorts, setIsLoadingShorts] = useState(true);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const loadShorts = async () => {
      try {
        const { data, error } = await createBrowserClient()
          .from("products")
          .select("id, name, description, type, thumbnail_url, metadata")
          .eq("is_active", true)
          .in("type", ["course", "signal", "bot"])
          .order("created_at", { ascending: false });

        if (error) throw error;

        const videos = (data || [])
          .map((product) => ({
            id: product.id,
            name: product.name,
            description: product.description,
            type: product.type,
            thumbnail_url: product.thumbnail_url,
            video_url: product.metadata?.video_url,
            source: product.metadata?.video_url?.includes("youtube.com") || product.metadata?.video_url?.includes("youtu.be") ? "youtube" : "video",
          }))
          .filter((video) => Boolean(video.video_url))
          .slice(0, 6) as ShortVideo[];

        setShorts([...suppliedYoutubeShorts, ...videos.filter((video) => !suppliedYoutubeShorts.some((short) => short.id === video.id))]);
      } catch (error) {
        console.error("Unable to load homepage shorts:", error);
        setShorts(suppliedYoutubeShorts);
      } finally {
        setIsLoadingShorts(false);
      }
    };

    loadShorts();
  }, []);

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
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="social-marquee mb-8 sm:mb-10 min-h-[56px] sm:min-h-[68px] w-full overflow-hidden rounded-2xl border border-gold-500/25 bg-dark-900/80 py-2 sm:py-3 shadow-2xl shadow-black/20">
          <div className="social-marquee-track flex w-max items-center gap-2 sm:gap-4 whitespace-nowrap">
            {[...socialLinks, ...socialLinks].map(({ label, icon: Icon, href }, index) => (
              <a
                key={`${label}-${index}`}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 sm:gap-3 rounded-full border border-white/10 bg-white/[.04] px-3 py-2 text-[11px] sm:px-5 sm:py-3 sm:text-sm font-semibold text-gray-200 transition-colors hover:border-gold-500/60 hover:bg-gold-500/10 hover:text-gold-300"
              >
                <Icon className="h-4 w-4 text-gold-400 sm:h-5 sm:w-5" />
                <span>{label}</span>
                <span className="text-gold-400">&gt;</span>
              </a>
            ))}
          </div>
        </div>
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-center">
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
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.08] tracking-[-0.04em] mb-5 sm:mb-6 max-w-[14ch] mx-auto lg:mx-0"
            >
              Master the Markets with{" "}
              <span className="gold-gradient-text">Logic & Precision</span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-base sm:text-lg text-gray-400 mb-7 sm:mb-8 max-w-xl mx-auto lg:mx-0"
            >
              Unlock professional trading education, real-time signals, and powerful automation tools. 
              Join thousands of successful traders who trust LOGICTRADERSLTD.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 sm:gap-4 w-full sm:w-auto"
            >
              <Link
                href="/register"
                className="gold-button flex items-center space-x-2 w-full sm:w-auto justify-center px-5 sm:px-6"
              >
                <span>Get Started</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/courses"
                className="flex items-center space-x-2 px-5 sm:px-6 py-3 rounded-lg border border-gold-500/50 text-gold-400 hover:bg-gold-500/10 transition-all w-full sm:w-auto justify-center"
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
              className="mt-10 sm:mt-12 grid grid-cols-3 gap-3 sm:gap-6"
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

          {/* Right Column - Vertical short-video feed */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="flex items-center justify-center w-full"
          >
            <div className="relative w-full max-w-[330px] sm:max-w-[380px] mx-auto">
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2 text-sm text-gray-300"><Video className="h-4 w-4 text-gold-400" /><span>Market shorts</span></div>
                <button type="button" onClick={() => setMuted((value) => !value)} className="rounded-md border border-white/10 bg-dark-900/80 p-2 text-gray-400 hover:text-white" aria-label={muted ? "Unmute videos" : "Mute videos"}>
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              </div>

              {isLoadingShorts ? (
                <div className="flex h-[420px] sm:h-[520px] items-center justify-center rounded-2xl border border-gold-500/20 bg-dark-900/80"><div className="spinner" /></div>
              ) : shorts.length > 0 ? (
                <div className="shorts-feed h-[420px] sm:h-[520px] snap-y snap-mandatory overflow-y-auto rounded-2xl border border-gold-500/20 bg-dark-900/80 shadow-2xl shadow-black/30">
                  {shorts.map((short) => (
                    <article key={short.id} className="relative h-full min-h-full snap-start overflow-hidden bg-black">
                      {short.source === "youtube" ? (
                        <iframe className="h-full w-full" src={short.video_url.replace("mute=1", `mute=${muted ? "1" : "0"}`)} title={short.name} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
                      ) : (
                        <video className="h-full w-full object-cover" src={short.video_url} poster={short.thumbnail_url} muted={muted} loop playsInline autoPlay />
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-5 pt-24">
                        <span className="mb-2 inline-block rounded-full bg-gold-500/90 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-dark-950">{short.type}</span>
                        <h3 className="text-lg font-bold text-white">{short.name}</h3>
                        <p className="mt-1 line-clamp-2 text-sm text-gray-300">{short.description}</p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="flex h-[520px] flex-col items-center justify-center rounded-2xl border border-dashed border-gold-500/30 bg-dark-900/80 p-8 text-center">
                  <Video className="mb-4 h-10 w-10 text-gold-400" />
                  <h3 className="text-lg font-semibold text-white">Shorts are coming soon</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-400">Published product videos will appear here one at a time.</p>
                </div>
              )}
              <p className="mt-3 text-center text-xs text-gray-500">Scroll to move through the feed</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-dark-950 to-transparent" />
    </section>
  );
}
