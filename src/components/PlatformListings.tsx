"use client";

import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";
import { subscribeToPlatformContentChanges } from "@/lib/platformContentSync";

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
          .from("platform_listings")
          .select("id, title, image_url, video_url, description, affiliate_url, published, sort_order, created_at")
          .eq("section_key", contentKey)
          .eq("published", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (cancelled) return;
        setItems(Array.isArray(data) ? data as PlatformListing[] : []);
        setLoadError("");
      } catch (error) {
        console.error(`Unable to load ${contentKey}:`, error);
        if (!cancelled) {
          const message = error && typeof error === "object" && "message" in error && typeof error.message === "string"
            ? error.message
            : "";
          setLoadError(
            message.toLowerCase().includes("platform_listings")
              ? "Platform listings are being set up. Please try again shortly."
              : "This section is temporarily unavailable.",
          );
        }
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
        { event: "*", schema: "public", table: "platform_listings", filter: `section_key=eq.${contentKey}` },
        () => void loadListings(),
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.error(`Live updates unavailable for ${contentKey}:`, status);
        }
      });
    const unsubscribeFromLocalUpdates = subscribeToPlatformContentChanges(contentKey, () => void loadListings());
    const handleWindowFocus = () => void loadListings();
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      cancelled = true;
      unsubscribeFromLocalUpdates();
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
                        <a href={item.affiliate_url} target="_blank" rel="nofollow sponsored noopener noreferrer" className="mt-6 inline-block text-sm font-semibold text-gold-400 underline decoration-gold-400/60 underline-offset-4 hover:text-gold-300">
                          Click this link for more information
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
