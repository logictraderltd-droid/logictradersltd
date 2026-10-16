"use client";

import { useEffect, useMemo, useState } from "react";
import { CldUploadWidget } from "next-cloudinary";
import {
  Check,
  Film,
  Globe,
  Plus,
  Trash2,
  Video,
  Instagram,
  Facebook,
  Youtube,
  Music2,
  Send,
} from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";

interface ShortItem {
  id: string;
  title: string;
  description: string;
  type: "short";
  video_url: string;
  source: "youtube" | "video";
  thumbnail_url?: string;
}

interface SocialItem {
  id: string;
  label: string;
  href: string;
  platform: "youtube" | "instagram" | "facebook" | "tiktok" | "telegram" | "custom";
}

const SUPABASE_KEY = "marketing_content";

const defaultShorts: ShortItem[] = [];
const defaultSocialLinks: SocialItem[] = [];

const createId = () => Math.random().toString(36).slice(2, 10);

const isHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
};

const getUploadUrlFromResult = (result: any): string | null => {
  if (!result) return null;
  const nestedInfo = result?.info ?? result;
  const secureUrl = nestedInfo?.secure_url || result?.secure_url || nestedInfo?.url || result?.url;
  return secureUrl || null;
};

function getPlatformIcon(platform: SocialItem["platform"]) {
  switch (platform) {
    case "youtube": return Youtube;
    case "instagram": return Instagram;
    case "facebook": return Facebook;
    case "tiktok": return Music2;
    case "telegram": return Send;
    default: return Globe;
  }
}

export function MarketingTab() {
  const [shorts, setShorts] = useState<ShortItem[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialItem[]>([]);
  const [shortDraft, setShortDraft] = useState({
    title: "",
    description: "",
    video_url: "",
    source: "youtube" as "youtube" | "video",
    thumbnail_url: "",
  });
  const [socialDraft, setSocialDraft] = useState({
    label: "",
    href: "",
    platform: "custom" as SocialItem["platform"],
  });
  const [isContentLoaded, setIsContentLoaded] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadContent = async () => {
      setIsLoadingContent(true);
      try {
        const supabase = createBrowserClient();
        const { data, error } = await supabase
          .from("site_content")
          .select("value")
          .eq("key", SUPABASE_KEY)
          .maybeSingle();

        if (error && error.code !== "PGRST116") throw error;

        const content = data?.value ?? { shorts: defaultShorts, socialLinks: defaultSocialLinks };
        if (!isMounted) return;
        setShorts(Array.isArray(content.shorts) ? content.shorts : defaultShorts);
        setSocialLinks(Array.isArray(content.socialLinks) ? content.socialLinks : defaultSocialLinks);
        setIsContentLoaded(true);
        setNotification(null);
      } catch (error) {
        console.error("Failed to load marketing content:", error);
        if (isMounted) setNotification({
          type: "error",
          message: `Unable to load marketing content: ${getErrorMessage(error, "Unknown error.")}`,
        });
      } finally {
        if (isMounted) setIsLoadingContent(false);
      }
    };

    void loadContent();
    return () => {
      isMounted = false;
    };
  }, [loadAttempt]);

  const persistContent = async (nextShorts: ShortItem[], nextLinks: SocialItem[]) => {
    const supabase = createBrowserClient();
    const payload = {
      key: SUPABASE_KEY,
      value: { shorts: nextShorts, socialLinks: nextLinks },
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("site_content")
      .upsert(payload, { onConflict: "key" });

    if (error) {
      console.error("Marketing save failed:", error);
      throw error;
    }
  };

  const addShort = async () => {
    if (isSaving || !isContentLoaded) return;
    const finalUrl = shortDraft.video_url.trim();
    if (!shortDraft.title.trim() || !finalUrl) {
      setNotification({ type: "error", message: "Please add a title and video URL." });
      return;
    }
    if (!isHttpUrl(finalUrl)) {
      setNotification({ type: "error", message: "Enter a valid HTTP or HTTPS video URL." });
      return;
    }

    const nextShort: ShortItem = {
      id: createId(),
      title: shortDraft.title.trim(),
      description: shortDraft.description.trim(),
      type: "short",
      video_url: finalUrl,
      source: shortDraft.source,
      thumbnail_url: shortDraft.thumbnail_url.trim(),
    };

    const nextShorts = [nextShort, ...shorts];
    const nextLinks = socialLinks;
    setIsSaving(true);
    try {
      await persistContent(nextShorts, nextLinks);
      setShorts(nextShorts);
      setShortDraft({ title: "", description: "", video_url: "", source: "youtube", thumbnail_url: "" });
      setNotification({ type: "success", message: "Market short added and saved." });
    } catch (error) {
      setNotification({ type: "error", message: `Short was not saved: ${getErrorMessage(error, "Please retry.")}` });
    } finally {
      setIsSaving(false);
    }
  };

  const addSocialLink = async () => {
    if (isSaving || !isContentLoaded) return;
    const finalHref = socialDraft.href.trim();
    const finalLabel = socialDraft.label.trim();

    if (!finalHref || !finalLabel) {
      setNotification({ type: "error", message: "Please add both a label and a URL." });
      return;
    }
    if (!isHttpUrl(finalHref)) {
      setNotification({ type: "error", message: "Enter a valid HTTP or HTTPS social link." });
      return;
    }

    const nextLink: SocialItem = {
      id: createId(),
      label: finalLabel,
      href: finalHref,
      platform: socialDraft.platform,
    };

    const nextLinks = [nextLink, ...socialLinks];
    const nextShorts = shorts;
    setIsSaving(true);
    try {
      await persistContent(nextShorts, nextLinks);
      setSocialLinks(nextLinks);
      setSocialDraft({ label: "", href: "", platform: "custom" });
      setNotification({ type: "success", message: "Social link added and saved." });
    } catch (error) {
      setNotification({ type: "error", message: `Social link was not saved: ${getErrorMessage(error, "Please retry.")}` });
    } finally {
      setIsSaving(false);
    }
  };

  const removeShort = async (id: string) => {
    if (isSaving || !isContentLoaded) return;
    const nextShorts = shorts.filter((item) => item.id !== id);
    setIsSaving(true);
    try {
      await persistContent(nextShorts, socialLinks);
      setShorts(nextShorts);
      setNotification({ type: "success", message: "Market short removed and saved." });
    } catch (error) {
      setNotification({ type: "error", message: `Short removal failed: ${getErrorMessage(error, "Please retry.")}` });
    } finally {
      setIsSaving(false);
    }
  };

  const removeSocialLink = async (id: string) => {
    if (isSaving || !isContentLoaded) return;
    const nextLinks = socialLinks.filter((item) => item.id !== id);
    setIsSaving(true);
    try {
      await persistContent(shorts, nextLinks);
      setSocialLinks(nextLinks);
      setNotification({ type: "success", message: "Social link removed and saved." });
    } catch (error) {
      setNotification({ type: "error", message: `Social link removal failed: ${getErrorMessage(error, "Please retry.")}` });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadSuccess = (result: any) => {
    const uploadedUrl = getUploadUrlFromResult(result);
    if (!uploadedUrl) {
      setNotification({ type: "error", message: "Upload completed but the video URL could not be read." });
      return;
    }

    setShortDraft((prev) => ({
      ...prev,
      video_url: uploadedUrl,
      source: uploadedUrl.includes("youtube.com") || uploadedUrl.includes("youtu.be") ? "youtube" : "video",
    }));
    setNotification({ type: "success", message: "Upload ready. Add the short to save it." });
  };

  const socialPreview = useMemo(() => socialLinks.slice(0, 6), [socialLinks]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Marketing Content</h2>
          <p className="text-gray-400 mt-1">Manage homepage market shorts and the social media marquee.</p>
        </div>
        {(isLoadingContent || isSaving) && (
          <span role="status" className="text-sm text-gold-400">
            {isLoadingContent ? "Loading saved content..." : "Saving changes..."}
          </span>
        )}
      </div>

      {notification && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${notification.type === "success" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
          {notification.type === "success" ? <Check className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
          {notification.message}
          {notification.type === "error" && !isContentLoaded && !isLoadingContent && (
            <button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)} className="ml-auto font-bold underline">
              Retry
            </button>
          )}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="dark-card p-6 space-y-5">
          <div className="flex items-center gap-3 text-gold-400">
            <Video className="w-5 h-5" />
            <h3 className="text-lg font-bold text-white">Market Shorts</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Title</label>
              <input
                type="text"
                value={shortDraft.title}
                onChange={(e) => setShortDraft({ ...shortDraft, title: e.target.value })}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50"
                placeholder="Trading insight"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Description</label>
              <input
                type="text"
                value={shortDraft.description}
                onChange={(e) => setShortDraft({ ...shortDraft, description: e.target.value })}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50"
                placeholder="Short summary"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Video URL</label>
              <input
                type="url"
                value={shortDraft.video_url}
                onChange={(e) => setShortDraft({ ...shortDraft, video_url: e.target.value })}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50"
                placeholder="https://youtube.com/embed/... or direct video URL"
              />
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-gray-400">or upload a short video</span>
              <CldUploadWidget
                uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "logic_traders_unsigned"}
                onSuccess={handleUploadSuccess}
                options={{ sources: ["local", "url", "camera"], multiple: false, resourceType: "video" }}
              >
                {({ open }) => (
                  <button
                    type="button"
                    onClick={() => open()}
                    className="bg-dark-900 border border-dark-700 hover:border-gold-500/50 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all"
                  >
                    Upload video
                  </button>
                )}
              </CldUploadWidget>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Thumbnail URL (optional)</label>
              <input
                type="url"
                value={shortDraft.thumbnail_url}
                onChange={(e) => setShortDraft({ ...shortDraft, thumbnail_url: e.target.value })}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50"
                placeholder="https://example.com/thumb.jpg"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Source</label>
              <select
                value={shortDraft.source}
                onChange={(e) => setShortDraft({ ...shortDraft, source: e.target.value as "youtube" | "video" })}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50"
              >
                <option value="youtube">YouTube embed</option>
                <option value="video">Direct video</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => void addShort()}
              disabled={isSaving || !isContentLoaded}
              className="bg-gold-500 hover:bg-gold-600 text-dark-950 font-bold px-5 py-3 rounded-xl flex items-center gap-2 transition-all disabled:cursor-wait disabled:opacity-60"
            >
              <Plus className="w-4 h-4" />
              Add short
            </button>
          </div>

          <div className="space-y-3 pt-4 border-t border-dark-800">
            {shorts.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-dark-800 bg-dark-950/60 p-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-white font-medium">
                    <Film className="w-4 h-4 text-gold-400" />
                    <span>{item.title}</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1 break-all">{item.video_url}</p>
                </div>
                <button type="button" onClick={() => removeShort(item.id)} disabled={isSaving || !isContentLoaded} className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-50">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="dark-card p-6 space-y-5">
          <div className="flex items-center gap-3 text-gold-400">
            <Globe className="w-5 h-5" />
            <h3 className="text-lg font-bold text-white">Social Media Marquee</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Label</label>
              <input
                type="text"
                value={socialDraft.label}
                onChange={(e) => setSocialDraft({ ...socialDraft, label: e.target.value })}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50"
                placeholder="YouTube"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Link</label>
              <input
                type="url"
                value={socialDraft.href}
                onChange={(e) => setSocialDraft({ ...socialDraft, href: e.target.value })}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50"
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Platform</label>
              <select
                value={socialDraft.platform}
                onChange={(e) => setSocialDraft({ ...socialDraft, platform: e.target.value as SocialItem["platform"] })}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50"
              >
                <option value="youtube">YouTube</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="tiktok">TikTok</option>
                <option value="telegram">Telegram</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => void addSocialLink()}
              disabled={isSaving || !isContentLoaded}
              className="bg-gold-500 hover:bg-gold-600 text-dark-950 font-bold px-5 py-3 rounded-xl flex items-center gap-2 transition-all disabled:cursor-wait disabled:opacity-60"
            >
              <Plus className="w-4 h-4" />
              Add social link
            </button>
          </div>

          <div className="space-y-3 pt-4 border-t border-dark-800">
            {socialPreview.map((item) => {
              const Icon = getPlatformIcon(item.platform);
              return (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-dark-800 bg-dark-950/60 p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="rounded-full border border-gold-500/20 bg-gold-500/10 p-2">
                      <Icon className="w-4 h-4 text-gold-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-white truncate">{item.label}</p>
                      <p className="text-xs text-gray-400 truncate">{item.href}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => removeSocialLink(item.id)} disabled={isSaving || !isContentLoaded} className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-50">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
