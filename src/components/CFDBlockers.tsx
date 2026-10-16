"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase";

interface CFDBlocker {
  id: string;
  name: string;
  profile_image_url: string;
  video_url: string;
  description: string;
  affiliate_url: string;
}

function embedUrl(value: string) {
  const youtube = value.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([^?&/]+)/i);
  if (youtube) return `https://www.youtube-nocookie.com/embed/${youtube[1]}`;
  const vimeo = value.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

function safeHttpUrl(value: string) {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export default function CFDBlockers() {
  const [items, setItems] = useState<CFDBlocker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data, error } = await createBrowserClient()
          .from("cfd_blockers")
          .select("id, name, profile_image_url, video_url, description, affiliate_url")
          .eq("published", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false });
        if (error) throw error;
        if (!cancelled) setItems((data || []) as CFDBlocker[]);
      } catch (error) {
        console.error("Unable to load public CFD Blockers:", error);
        if (!cancelled) setLoadError("CFD Blockers are temporarily unavailable.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="min-h-screen px-4 pb-20 pt-32 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-gold-400">LOGICTRADERSLTD</p>
          <h1 className="mt-3 text-4xl font-bold sm:text-5xl">CFD Blocker</h1>
          <p className="mt-5 text-gray-400">Explore CFD blocker providers, what they offer, and their affiliate offers.</p>
        </header>
        {isLoading ? (
          <div className="flex justify-center py-20"><div className="spinner" /></div>
        ) : loadError ? (
          <p role="alert" className="py-16 text-center text-red-400">{loadError}</p>
        ) : items.length ? (
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => {
              const videoEmbed = safeHttpUrl(item.video_url) ? embedUrl(item.video_url) : null;
              const isHostedVideo = /\.(mp4|webm|ogg)(?:$|\?)/i.test(item.video_url);
              return (
                <article key={item.id} className="dark-card overflow-hidden">
                  {videoEmbed ? (
                    <div className="aspect-video bg-black">
                      <iframe src={videoEmbed} title={`${item.name} introduction`} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
                    </div>
                  ) : isHostedVideo && safeHttpUrl(item.video_url) ? (
                    <video src={item.video_url} poster={item.profile_image_url || undefined} controls preload="metadata" className="aspect-video w-full bg-black object-contain" />
                  ) : item.profile_image_url && safeHttpUrl(item.profile_image_url) ? (
                    <img src={item.profile_image_url} alt={item.name} className="aspect-video w-full bg-dark-900 object-cover" />
                  ) : (
                    <div className="flex aspect-video items-center justify-center bg-dark-900 text-gray-500">{item.name}</div>
                  )}
                  <div className="p-6">
                    <h2 className="text-xl font-bold">{item.name}</h2>
                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-400">{item.description}</p>
                    {item.video_url && !videoEmbed && !isHostedVideo && safeHttpUrl(item.video_url) && (
                      <a href={item.video_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-sm font-semibold text-gold-400 underline">Watch introduction video</a>
                    )}
                    {item.affiliate_url && safeHttpUrl(item.affiliate_url) && (
                      <a href={item.affiliate_url} target="_blank" rel="nofollow sponsored noopener noreferrer" className="mt-5 inline-block text-sm font-semibold text-gold-400 underline decoration-gold-400/60 underline-offset-4 hover:text-gold-300">
                        Visit provider offer
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="py-20 text-center text-gray-400">CFD Blocker providers will appear here when published.</p>
        )}
      </div>
    </section>
  );
}
