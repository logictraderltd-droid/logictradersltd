"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Play } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";

export interface PlatformListing {
  id: string;
  title: string;
  image_url: string;
  video_url: string;
  description: string;
  affiliate_url: string;
  published: boolean;
  sort_order: number;
}

interface PlatformListingsProps {
  contentKey: string;
  title: string;
  description: string;
  emptyMessage: string;
}

function getVideoEmbedUrl(url: string) {
  const youtube = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([^?&/]+)/i);
  if (youtube) return `https://www.youtube-nocookie.com/embed/${youtube[1]}`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

function isSafeExternalUrl(url: string) {
  try {
    return ["http:", "https:"].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

export default function PlatformListings({
  contentKey,
  title,
  description,
  emptyMessage,
}: PlatformListingsProps) {
  const [items, setItems] = useState<PlatformListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const loadListings = async () => {
      try {
        const { data, error } = await createBrowserClient()
          .from("site_content")
          .select("value")
          .eq("key", contentKey)
          .maybeSingle();
        if (error) throw error;
        if (cancelled) return;
        const records = Array.isArray(data?.value?.items) ? data.value.items : [];
        setItems(records
          .filter((item: PlatformListing) => item.published)
          .sort((a: PlatformListing, b: PlatformListing) => a.sort_order - b.sort_order));
        setLoadError("");
      } catch (error) {
        console.error(`Unable to load ${contentKey}:`, error);
        if (!cancelled) setLoadError("This section is temporarily unavailable.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void loadListings();

    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`platform-listings-${contentKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_content", filter: `key=eq.${contentKey}` },
        () => void loadListings(),
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error(`Live updates unavailable for ${contentKey}:`, status);
        }
      });
    const handleWindowFocus = () => void loadListings();
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleWindowFocus);
      void supabase.removeChannel(channel);
    };
  }, [contentKey]);

  return (
    <section className="min-h-screen bg-dark-950 text-white">
      <section className="pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-gold-400">LOGICTRADERSLTD</p>
            <h1 className="text-4xl font-bold sm:text-5xl">{title}</h1>
            <p className="mx-auto mt-5 max-w-2xl text-gray-400">{description}</p>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-20"><div className="spinner" /></div>
          ) : loadError ? (
            <p role="alert" className="py-16 text-center text-red-400">{loadError}</p>
          ) : items.length ? (
            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => {
                const videoEmbed = item.video_url ? getVideoEmbedUrl(item.video_url) : null;
                return (
                  <article key={item.id} className="dark-card overflow-hidden">
                    {videoEmbed ? (
                      <div className="aspect-video bg-black">
                        <iframe src={videoEmbed} title={`${item.title} video`} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
                      </div>
                    ) : item.video_url && isSafeExternalUrl(item.video_url) ? (
                      <a href={item.video_url} target="_blank" rel="noopener noreferrer" className="flex aspect-video items-center justify-center bg-dark-900 text-gold-400" aria-label={`Watch ${item.title}`}>
                        <Play className="h-12 w-12" />
                      </a>
                    ) : item.image_url && isSafeExternalUrl(item.image_url) ? (
                      <img src={item.image_url} alt={item.title} className="aspect-video w-full object-cover" />
                    ) : (
                      <div className="flex aspect-video items-center justify-center bg-dark-900 text-gray-600">{title}</div>
                    )}
                    <div className="p-6">
                      <h2 className="text-xl font-bold text-white">{item.title}</h2>
                      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-400">{item.description}</p>
                      {item.image_url && item.video_url && isSafeExternalUrl(item.image_url) && (
                        <img src={item.image_url} alt="" className="mt-4 max-h-40 w-full rounded-lg object-cover" />
                      )}
                      {item.affiliate_url && isSafeExternalUrl(item.affiliate_url) && (
                        <a href={item.affiliate_url} target="_blank" rel="nofollow sponsored noopener noreferrer" className="gold-button mt-6 inline-flex items-center gap-2">
                          Learn more <ArrowUpRight className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="py-20 text-center text-gray-400">{emptyMessage}</p>
          )}
          <p className="mx-auto mt-12 max-w-4xl text-center text-xs leading-relaxed text-gray-500">
            External provider links may be affiliate links. Trading, CFDs, and prop-trading services involve financial risk; review each provider&apos;s terms carefully. No results or profits are guaranteed.
          </p>
        </div>
      </section>
    </section>
  );
}
