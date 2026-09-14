"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Award, FileBadge2, Image as ImageIcon, Video, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const STORAGE_KEY = "logictradersltd_pro_firm_content";

type ProFirmMediaType = "photos" | "videos";

interface ProFirmMediaItem {
  id: string;
  title: string;
  url: string;
  description?: string;
}

interface ProFirmContent {
  headline: string;
  subtitle: string;
  photos: ProFirmMediaItem[];
  videos: ProFirmMediaItem[];
}

const defaultContent: ProFirmContent = {
  headline: "Pro Firm",
  subtitle: "A visual showcase of our work, moments, and results from the team behind LOGICTRADERSLTD.",
  photos: [],
  videos: [],
};

const typeConfig: Record<ProFirmMediaType, { label: string; icon: any }> = {
  photos: { label: "Photos", icon: ImageIcon },
  videos: { label: "Videos", icon: Video },
};

const isImageUrl = (value: string) => {
  if (!value) return false;
  if (value.startsWith("data:image/")) return true;
  return /(?:\.(png|jpe?g|gif|webp|avif|svg|bmp|heic|heif|tiff|ico|jfif))(?:\?|$)/i.test(value) || /cloudinary\.com/i.test(value);
};
const isVideoUrl = (value: string) => {
  if (!value) return false;
  return /(?:\.(mp4|webm|ogg|mov|m4v|avi|m3u8|quicktime))(?:\?|$)/i.test(value)
    || /youtube\.com|youtu\.be|vimeo\.com|cloudinary\.com.*\.(mp4|webm|mov|m3u8)/i.test(value);
};
const isPdfUrl = (value: string) => !value ? false : /(?:\.(pdf))(?:\?|$)/i.test(value) || /application\/pdf/i.test(value);
const getVideoEmbedUrl = (url: string) => {
  if (!url) return null;
  if (/youtube\.com|youtu\.be/i.test(url)) {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtube\.com\/embed\/|youtube\.com\/shorts\/|youtu\.be\/)([^?&/]+)/i);
    if (match?.[1]) return `https://www.youtube.com/embed/${match[1]}?rel=0`;
  }
  if (/vimeo\.com/i.test(url)) {
    const match = url.match(/vimeo\.com\/(\d+)/i);
    if (match?.[1]) return `https://player.vimeo.com/video/${match[1]}`;
  }
  return url;
};

export default function PricingPage() {
  const [content, setContent] = useState<ProFirmContent>(defaultContent);
  const [selectedMedia, setSelectedMedia] = useState<ProFirmMediaItem | null>(null);

  useEffect(() => {
    const loadContent = async () => {
      try {
        const { createBrowserClient } = await import("@/lib/supabase");
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from("site_content")
          .select("value")
          .eq("key", "pro_firm_content")
          .maybeSingle();

        if (error && error.code !== "PGRST116") throw error;
        if (data?.value) {
          setContent({ ...defaultContent, ...data.value });
        }
      } catch (error) {
        console.error("Failed to load Pro Firm content:", error);
      }
    };

    void loadContent();
  }, []);

  const sections = useMemo(
    () =>
      (Object.entries(typeConfig) as [ProFirmMediaType, { label: string; icon: any }][]).map(([key, config]) => ({
        key,
        ...config,
        items: content[key] || [],
      })),
    [content]
  );

  return (
    <main className="min-h-screen bg-dark-950 text-white">
      <Navbar />

      <section className="relative overflow-hidden pt-32 pb-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,160,23,0.15),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(234,179,8,0.12),transparent_30%)]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-4xl mx-auto"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gold-500/30 bg-gold-500/10 text-gold-300 text-xs font-semibold uppercase tracking-[0.2em] mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              Pro Firm
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-6">
              <span className="gold-gradient-text">{content.headline || "Pro Firm"}</span>
            </h1>
            <p className="text-gray-300 text-lg max-w-3xl mx-auto leading-relaxed">
              {content.subtitle || "Credentials, achievements, and proof of performance from the team behind LOGICTRADERSLTD."}
            </p>
          </motion.div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            {sections.map(({ key, label, icon: Icon, items }) => (
              <div key={key} className="rounded-2xl border border-dark-800 bg-dark-900/70 p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gold-500/10 text-gold-400 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-2xl font-bold text-white">{items.length}</span>
                </div>
                <p className="text-sm text-gray-400">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          {sections.map(({ key, label, icon: Icon, items }) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-3xl border border-dark-800 bg-gradient-to-br from-dark-900 via-dark-950 to-dark-900 p-6 sm:p-8 shadow-[0_0_30px_rgba(0,0,0,0.25)]"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gold-500/10 text-gold-400 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Showcase</p>
                    <h2 className="text-2xl font-bold text-white">{label}</h2>
                  </div>
                </div>
              </div>

              {items.length === 0 ? (
                <div className="border border-dashed border-dark-700 rounded-2xl p-10 text-center text-gray-500">
                  No {label.toLowerCase()} available yet.
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {items.map((item) => {
                    const mediaUrl = getVideoEmbedUrl(item.url);
                    const shouldRenderVideo = key === "videos" || isVideoUrl(item.url);
                    const shouldRenderImage = key === "photos" || isImageUrl(item.url);
                    const shouldRenderPdf = isPdfUrl(item.url);

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedMedia(item)}
                        className="group overflow-hidden rounded-2xl border border-dark-800 bg-dark-950/80 text-left transition-all hover:border-gold-500/30 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(212,160,23,0.08)]"
                      >
                        {shouldRenderVideo ? (
                          <div className="h-56 overflow-hidden bg-dark-950">
                            {mediaUrl && /youtube\.com|youtu\.be|vimeo\.com/i.test(item.url) ? (
                              <iframe
                                className="h-full w-full"
                                src={mediaUrl}
                                title={item.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            ) : (
                              <video className="h-full w-full object-cover" src={item.url} controls preload="metadata" playsInline />
                            )}
                          </div>
                        ) : shouldRenderImage ? (
                          <img src={item.url} alt={item.title} className="h-56 w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                        ) : shouldRenderPdf ? (
                          <iframe src={item.url} title={item.title} className="h-56 w-full border-0 bg-white" />
                        ) : (
                          <div className="h-56 bg-[radial-gradient(circle_at_center,rgba(212,160,23,0.14),transparent_40%),linear-gradient(135deg,#0f172a,#111827)] flex items-center justify-center text-gold-400">
                            <Sparkles className="w-12 h-12" />
                          </div>
                        )}

                        <div className="p-5 space-y-3">
                          <h3 className="font-bold text-lg text-white">{item.title}</h3>
                          {item.description && <p className="text-sm text-gray-400 leading-relaxed">{item.description}</p>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {selectedMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setSelectedMedia(null)}
        >
          <div className="relative w-full max-w-6xl rounded-2xl border border-dark-700 bg-dark-950 p-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setSelectedMedia(null)}
              className="absolute right-4 top-4 z-10 rounded-full bg-black/60 px-3 py-1 text-sm text-white hover:bg-black/80"
            >
              Close
            </button>

            <div className="max-h-[85vh] overflow-auto rounded-xl bg-black">
              {isVideoUrl(selectedMedia.url) ? (
                selectedMedia.url.includes("youtube.com") || selectedMedia.url.includes("youtu.be") || selectedMedia.url.includes("vimeo.com") ? (
                  <iframe
                    src={getVideoEmbedUrl(selectedMedia.url) || selectedMedia.url}
                    title={selectedMedia.title}
                    className="h-[70vh] w-full rounded-xl"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video src={selectedMedia.url} controls autoPlay className="h-[70vh] w-full object-contain" playsInline />
                )
              ) : isPdfUrl(selectedMedia.url) ? (
                <iframe src={selectedMedia.url} title={selectedMedia.title} className="h-[70vh] w-full rounded-xl" />
              ) : (
                <img src={selectedMedia.url} alt={selectedMedia.title} className="max-h-[70vh] w-full rounded-xl object-contain" />
              )}
            </div>

            <div className="p-4">
              <h3 className="text-xl font-bold text-white">{selectedMedia.title}</h3>
              {selectedMedia.description && <p className="mt-2 text-sm text-gray-400">{selectedMedia.description}</p>}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </main>
  );
}
