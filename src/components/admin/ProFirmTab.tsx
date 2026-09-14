"use client";

import { useEffect, useMemo, useState } from "react";
import { CldUploadWidget } from "next-cloudinary";
import {
  Award,
  Check,
  FileBadge2,
  Globe,
  Image as ImageIcon,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Video,
  X,
} from "lucide-react";

type ProFirmMediaType = "photo" | "video";

export interface ProFirmMediaItem {
  id: string;
  title: string;
  url: string;
  description?: string;
}

export interface ProFirmContent {
  headline: string;
  subtitle: string;
  photos: ProFirmMediaItem[];
  videos: ProFirmMediaItem[];
}

const STORAGE_KEY = "logictradersltd_pro_firm_content";

const defaultContent: ProFirmContent = {
  headline: "Pro Firm",
  subtitle: "A visual showcase of our work, results, and moments from the team behind LOGICTRADERSLTD.",
  photos: [],
  videos: [],
};

type ProFirmTypeConfig = {
  label: string;
  icon: any;
  key: "photos" | "videos";
};

const typeConfig: Record<ProFirmMediaType, ProFirmTypeConfig> = {
  photo: { label: "Photos", icon: ImageIcon, key: "photos" },
  video: { label: "Videos", icon: Video, key: "videos" },
};

const createId = () => Math.random().toString(36).slice(2, 10);

const isImageUrl = (value: string) => {
  if (!value) return false;
  if (value.startsWith("data:image/")) return true;
  return /(?:\.(png|jpe?g|gif|webp|avif|svg|bmp|heic|heif|tiff|ico|jfif))(?:\?|$)/i.test(value) || /cloudinary\.com/i.test(value);
};
const isPdfUrl = (value: string) => !value ? false : /(?:\.(pdf))(?:\?|$)/i.test(value) || /application\/pdf/i.test(value);

const getUploadUrlFromResult = (result: any): string | null => {
  if (!result) return null;
  const nestedInfo = result?.info ?? result;
  const secureUrl = nestedInfo?.secure_url || result?.secure_url || nestedInfo?.url || result?.url;
  return secureUrl || null;
};

export function ProFirmTab() {
  const [content, setContent] = useState<ProFirmContent>(defaultContent);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [activeType, setActiveType] = useState<ProFirmMediaType>("photo");
  const [draft, setDraft] = useState({ title: "", url: "", description: "" });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setContent({ ...defaultContent, ...JSON.parse(raw) });
      }
    } catch (error) {
      console.error("Failed to load Pro Firm content:", error);
    }
  }, []);

  const mediaList = useMemo(() => content[typeConfig[activeType].key] as ProFirmMediaItem[], [content, activeType]);

  const saveContent = (nextContent: ProFirmContent) => {
    setContent(nextContent);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextContent));
  };

  const addItem = () => {
    const finalUrl = draft.url.trim();
    if (!draft.title.trim() || !finalUrl) {
      setNotification({ type: "error", message: "Please add a title and a valid URL or upload." });
      return;
    }

    const nextType = typeConfig[activeType].key;
    const currentItems: ProFirmMediaItem[] = Array.isArray(content[nextType]) ? content[nextType] as ProFirmMediaItem[] : [];
    const nextContent = {
      ...content,
      [nextType]: [
        ...currentItems,
        {
          id: createId(),
          title: draft.title.trim(),
          url: finalUrl,
          description: draft.description.trim(),
        },
      ],
    } as ProFirmContent;

    saveContent(nextContent);
    setDraft({ title: "", url: "", description: "" });
    setNotification({ type: "success", message: `${typeConfig[activeType].label} added successfully.` });
  };

  const handleUploadSuccess = (result: any) => {
    const uploadedUrl = getUploadUrlFromResult(result);
    if (!uploadedUrl) {
      setNotification({ type: "error", message: "Upload completed but the image URL could not be read." });
      return;
    }

    setDraft((prev) => ({ ...prev, url: uploadedUrl }));
    setNotification({ type: "success", message: "Upload ready. Click Add item to save it to the gallery." });
  };

  const removeItem = (itemId: string) => {
    const nextType = typeConfig[activeType].key;
    const currentItems: ProFirmMediaItem[] = Array.isArray(content[nextType]) ? content[nextType] as ProFirmMediaItem[] : [];
    const nextContent = {
      ...content,
      [nextType]: currentItems.filter((item) => item.id !== itemId),
    } as ProFirmContent;

    saveContent(nextContent);
    setNotification({ type: "success", message: "Item removed." });
  };

  const handleSave = () => {
    setIsLoading(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
      setNotification({ type: "success", message: "Pro Firm content saved successfully." });
    } catch (error) {
      setNotification({ type: "error", message: "Something went wrong while saving." });
    } finally {
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Pro Firm</h2>
          <p className="text-gray-400 mt-1">Manage the photo and video gallery shown on the public Pro Firm page.</p>
        </div>
        <button
          onClick={handleSave}
          className="bg-gold-500 hover:bg-gold-600 text-dark-950 font-bold px-5 py-3 rounded-xl flex items-center gap-2 transition-all"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save changes
        </button>
      </div>

      {notification && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${notification.type === "success" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
          {notification.type === "success" ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
          {notification.message}
        </div>
      )}

      <div className="dark-card p-6 space-y-8">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Headline</label>
            <input
              type="text"
              value={content.headline}
              onChange={(e) => setContent({ ...content, headline: e.target.value })}
              className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Subtitle</label>
            <input
              type="text"
              value={content.subtitle}
              onChange={(e) => setContent({ ...content, subtitle: e.target.value })}
              className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(Object.entries(typeConfig) as [ProFirmMediaType, ProFirmTypeConfig][]).map(([key, config]) => {
            const Icon = config.icon;
            const count = (content[config.key] || []).length;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveType(key)}
                className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all ${activeType === key ? "border-gold-500 bg-gold-500/10 text-gold-400" : "border-dark-800 bg-dark-950 text-gray-300"}`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{config.label}</span>
                </div>
                <span className="text-xs bg-dark-800 px-2 py-1 rounded-full">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-dark-800 bg-dark-950/60 p-5 space-y-5">
          <div className="flex items-center gap-3 text-gold-400">
            <Sparkles className="w-5 h-5" />
            <h3 className="font-bold text-white">Add {typeConfig[activeType].label}</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-400">Title</label>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50"
                placeholder="e.g. FTMO Challenge Certificate"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-400">URL or file upload</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={draft.url}
                  onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                  className="flex-1 bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50"
                  placeholder="https://example.com/file.jpg"
                />
                <CldUploadWidget
                  uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "logic_traders_unsigned"}
                  onSuccess={handleUploadSuccess}
                  onError={() => setNotification({ type: "error", message: "Upload failed. Please try again." })}
                >
                  {({ open }) => (
                    <button
                      type="button"
                      onClick={() => open()}
                      className="px-4 py-3 bg-dark-800 border border-dark-700 text-gray-300 rounded-xl hover:border-gold-500/50 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <Globe className="w-4 h-4" />
                      Browser Upload
                    </button>
                  )}
                </CldUploadWidget>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-400">Description</label>
              <input
                type="text"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50"
                placeholder="Optional summary"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={addItem}
            className="bg-gold-500 hover:bg-gold-600 text-dark-950 font-bold px-5 py-3 rounded-xl flex items-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add item
          </button>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white">Current {typeConfig[activeType].label}</h3>

          {mediaList.length === 0 ? (
            <div className="border border-dashed border-dark-700 rounded-2xl p-8 text-center text-gray-500">
              No {typeConfig[activeType].label.toLowerCase()} added yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {mediaList.map((item) => {
                const shouldRenderImage = isImageUrl(item.url);
                const shouldRenderPdf = isPdfUrl(item.url);

                return (
                  <div key={item.id} className="border border-dark-800 rounded-2xl overflow-hidden bg-dark-950/60">
                    {shouldRenderImage ? (
                      <img src={item.url} alt={item.title} className="h-40 w-full object-cover" />
                    ) : shouldRenderPdf ? (
                      <iframe src={item.url} title={item.title} className="h-40 w-full border-0 bg-white" />
                    ) : activeType === "video" ? (
                      <div className="h-40 bg-dark-900 flex items-center justify-center text-gray-400">
                        <Video className="w-8 h-8" />
                      </div>
                    ) : (
                      <div className="h-40 bg-dark-900 flex items-center justify-center text-gray-400">
                        <FileBadge2 className="w-8 h-8" />
                      </div>
                    )}

                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="font-semibold text-white">{item.title}</h4>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {item.description && <p className="text-sm text-gray-400">{item.description}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
