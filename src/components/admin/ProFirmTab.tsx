"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { createBrowserClient } from "@/lib/supabase";

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

const SUPABASE_KEY = "pro_firm_content";
const DRAFT_STORAGE_KEY = "admin-pro-firm-draft";

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

const createId = () => crypto.randomUUID();
const CONTENT_REQUEST_TIMEOUT_MS = 15_000;

function withRequestTimeout<T>(request: PromiseLike<T>, message: string, timeoutMs = CONTENT_REQUEST_TIMEOUT_MS): Promise<T> {
  let timeout: number | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeout = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([Promise.resolve(request), timeoutPromise]).finally(() => {
    if (timeout !== undefined) window.clearTimeout(timeout);
  });
}

async function fetchPersistedProFirmContent(timeoutMs = CONTENT_REQUEST_TIMEOUT_MS): Promise<ProFirmContent | null> {
  const supabase = createBrowserClient();
  const { data, error } = await withRequestTimeout(
    supabase
      .from("site_content")
      .select("value")
      .eq("key", SUPABASE_KEY)
      .maybeSingle(),
    "Loading Pro Firm content timed out. Check your connection and retry.",
    timeoutMs
  );
  if (error && error.code !== "PGRST116") throw error;
  if (!data?.value) return null;
  const value = data.value as Partial<ProFirmContent>;
  return {
    ...defaultContent,
    ...value,
    photos: Array.isArray(value.photos) ? value.photos : [],
    videos: Array.isArray(value.videos) ? value.videos : [],
  };
}

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
  const [isLoading, setIsLoading] = useState(true);
  const [isContentLoaded, setIsContentLoaded] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [activeType, setActiveType] = useState<ProFirmMediaType>("photo");
  const [draft, setDraft] = useState({ id: createId(), title: "", url: "", description: "" });
  const isSavingRef = useRef(false);
  const pendingWriteRef = useRef<Promise<void> | null>(null);
  const uncertainWriteRef = useRef(false);
  const [isWritePending, setIsWritePending] = useState(false);
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    try {
      const storedDraft = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (storedDraft) {
        const parsedDraft = JSON.parse(storedDraft) as Partial<typeof draft> & { activeType?: string };
        if (
          typeof parsedDraft.id === "string" &&
          typeof parsedDraft.title === "string" &&
          typeof parsedDraft.url === "string" &&
          typeof parsedDraft.description === "string"
        ) {
          setDraft({
            id: parsedDraft.id,
            title: parsedDraft.title,
            url: parsedDraft.url,
            description: parsedDraft.description,
          });
          if (parsedDraft.activeType === "photo" || parsedDraft.activeType === "video") {
            setActiveType(parsedDraft.activeType);
          }
        }
      }
    } catch (error) {
      console.error("Unable to restore Pro Firm draft:", error);
    } finally {
      setIsDraftRestored(true);
    }
  }, []);

  useEffect(() => {
    if (!isDraftRestored) return;
    try {
      if (!draft.title && !draft.url && !draft.description) {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
        return;
      }
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ ...draft, activeType }));
    } catch (error) {
      console.error("Unable to preserve Pro Firm draft locally:", error);
    }
  }, [activeType, draft, isDraftRestored]);

  useEffect(() => {
    let isMounted = true;
    const loadContent = async () => {
      setIsLoading(true);
      try {
        const savedContent = await fetchPersistedProFirmContent();
        if (isMounted) setContent(savedContent || defaultContent);
        if (isMounted) setIsContentLoaded(true);
      } catch (error) {
        console.error("Failed to load Pro Firm content:", error);
        if (isMounted) {
          setNotification({
            type: "error",
            message: `Unable to load Pro Firm content: ${error instanceof Error ? error.message : "Unexpected database error."}`,
          });
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadContent();
    return () => { isMounted = false; };
  }, [loadAttempt]);

  const mediaList = useMemo(() => content[typeConfig[activeType].key] as ProFirmMediaItem[], [content, activeType]);

  const persistContent = async (nextContent: ProFirmContent) => {
    if (pendingWriteRef.current) {
      throw new Error("The previous database request is still running. Wait for it to finish before retrying.");
    }
    const supabase = createBrowserClient();
    const payload = {
      key: SUPABASE_KEY,
      value: nextContent,
      updated_at: new Date().toISOString(),
    };
    const writePromise = (async () => {
      const { data, error } = await supabase
        .from("site_content")
        .upsert(payload, { onConflict: "key" })
        .select("key")
        .single();
      if (error) throw error;
      if (data?.key !== SUPABASE_KEY) throw new Error("The database did not confirm the Pro Firm save.");
    })();

    pendingWriteRef.current = writePromise;
    setIsWritePending(true);
    const clearPendingWrite = () => {
      if (pendingWriteRef.current === writePromise) {
        pendingWriteRef.current = null;
        setIsWritePending(false);
      }
    };
    void writePromise.then(clearPendingWrite, clearPendingWrite);

    try {
      await withRequestTimeout(writePromise, "The save request timed out; the database may still complete it.");
      uncertainWriteRef.current = false;
    } catch (error) {
      uncertainWriteRef.current = true;
      throw error;
    }
  };

  const addItem = async () => {
    if (isSavingRef.current || !isContentLoaded) return;
    const finalUrl = draft.url.trim();
    if (!draft.title.trim() || !finalUrl) {
      setNotification({ type: "error", message: "Please add a title and a valid URL or upload." });
      return;
    }
    try {
      const parsedUrl = new URL(finalUrl);
      if (!["http:", "https:"].includes(parsedUrl.protocol)) throw new Error();
    } catch {
      setNotification({ type: "error", message: "Enter a valid HTTP or HTTPS URL." });
      return;
    }

    const nextType = typeConfig[activeType].key;
    let contentToSave = content;
    if (uncertainWriteRef.current) {
      isSavingRef.current = true;
      setIsLoading(true);
      setNotification(null);
      try {
        const persistedContent = await fetchPersistedProFirmContent(5_000);
        if (persistedContent) {
          contentToSave = persistedContent;
          setContent(persistedContent);
          const existingItem = persistedContent[nextType].find((item) => item.id === draft.id);
          if (existingItem) {
            if (existingItem.title === draft.title.trim() && existingItem.url === finalUrl && existingItem.description === draft.description.trim()) {
              setDraft({ id: createId(), title: "", url: "", description: "" });
              uncertainWriteRef.current = false;
              setNotification({ type: "success", message: `${typeConfig[activeType].label} save was confirmed.` });
              return;
            }
            setNotification({ type: "error", message: "The previous save contains different details for this draft. Review the loaded content before trying again." });
            return;
          }
        }
        uncertainWriteRef.current = false;
      } catch (error) {
        setNotification({ type: "error", message: `Could not verify the previous save, so no retry was sent. ${error instanceof Error ? error.message : "Unexpected database error."}` });
        return;
      } finally {
        isSavingRef.current = false;
        setIsLoading(false);
      }
    }

    const currentItems: ProFirmMediaItem[] = Array.isArray(contentToSave[nextType]) ? contentToSave[nextType] as ProFirmMediaItem[] : [];
    const alreadySaved = currentItems.find((item) => item.id === draft.id);
    if (alreadySaved) {
      if (alreadySaved.title === draft.title.trim() && alreadySaved.url === finalUrl && alreadySaved.description === draft.description.trim()) {
        setDraft({ id: createId(), title: "", url: "", description: "" });
        setNotification({ type: "success", message: `${typeConfig[activeType].label} save was already confirmed.` });
        return;
      }
      setNotification({ type: "error", message: "This draft ID already exists with different details. Reload Pro Firm content before adding it again." });
      return;
    }
    const nextContent = {
      ...contentToSave,
      [nextType]: [
        ...currentItems,
        {
          id: draft.id,
          title: draft.title.trim(),
          url: finalUrl,
          description: draft.description.trim(),
        },
      ],
    } as ProFirmContent;

    isSavingRef.current = true;
    setIsLoading(true);
    setNotification(null);
    try {
      await persistContent(nextContent);
      setContent(nextContent);
      setDraft({ id: createId(), title: "", url: "", description: "" });
      setNotification({ type: "success", message: `${typeConfig[activeType].label} added successfully and saved.` });
    } catch (error) {
      console.error("Pro Firm item save failed:", error);
      try {
        const persistedContent = await fetchPersistedProFirmContent(5_000);
        if (persistedContent) {
          setContent(persistedContent);
          const savedItem = persistedContent[nextType].find((item) => item.id === draft.id);
          if (savedItem?.title === draft.title.trim() && savedItem.url === finalUrl && savedItem.description === draft.description.trim()) {
            setDraft({ id: createId(), title: "", url: "", description: "" });
            uncertainWriteRef.current = false;
            setNotification({ type: "success", message: `${typeConfig[activeType].label} save was confirmed after a delayed response.` });
            return;
          }
        }
      } catch (reconcileError) {
        console.error("Unable to reconcile Pro Firm item save:", reconcileError);
      }
      setNotification({ type: "error", message: `The save was not confirmed. Your details are preserved. If the request is still running, retry will become available when it settles. ${error instanceof Error ? error.message : "Unexpected database error."}` });
    } finally {
      isSavingRef.current = false;
      setIsLoading(false);
    }
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

  const removeItem = async (itemId: string) => {
    if (isSavingRef.current || !isContentLoaded) return;
    const nextType = typeConfig[activeType].key;
    const currentItems: ProFirmMediaItem[] = Array.isArray(content[nextType]) ? content[nextType] as ProFirmMediaItem[] : [];
    const nextContent = {
      ...content,
      [nextType]: currentItems.filter((item) => item.id !== itemId),
    } as ProFirmContent;

    isSavingRef.current = true;
    setIsLoading(true);
    setNotification(null);
    try {
      await persistContent(nextContent);
      setContent(nextContent);
      setNotification({ type: "success", message: "Item removed and saved." });
    } catch (error) {
      console.error("Pro Firm item removal failed:", error);
      try {
        const persistedContent = await fetchPersistedProFirmContent(5_000);
        if (persistedContent) {
          setContent(persistedContent);
          if (!persistedContent[nextType].some((item) => item.id === itemId)) {
            setNotification({ type: "success", message: "Item removal was confirmed after a delayed response." });
            return;
          }
        }
      } catch (reconcileError) {
        console.error("Unable to reconcile Pro Firm item removal:", reconcileError);
      }
      setNotification({ type: "error", message: `Removal was not confirmed. ${error instanceof Error ? error.message : "Unexpected database error."}` });
    } finally {
      isSavingRef.current = false;
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (isSavingRef.current || !isContentLoaded) return;
    isSavingRef.current = true;
    setIsLoading(true);
    setNotification(null);
    try {
      await persistContent(content);
      setNotification({ type: "success", message: "Pro Firm content saved successfully." });
    } catch (error) {
      console.error("Pro Firm content save failed:", error);
      setNotification({ type: "error", message: `Pro Firm content was not confirmed as saved. ${error instanceof Error ? error.message : "Unexpected database error."}` });
    } finally {
      isSavingRef.current = false;
      setIsLoading(false);
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
          disabled={isLoading || isWritePending || !isContentLoaded}
          className="bg-gold-500 hover:bg-gold-600 text-dark-950 font-bold px-5 py-3 rounded-xl flex items-center gap-2 transition-all disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isLoading ? (isContentLoaded ? "Saving..." : "Loading...") : isWritePending ? "Waiting for previous save..." : "Save changes"}
        </button>
      </div>

      {notification && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${notification.type === "success" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
          {notification.type === "success" ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
          {notification.message}
        </div>
      )}
      {!isContentLoaded && !isLoading && (
        <button
          type="button"
          onClick={() => {
            setNotification(null);
            setLoadAttempt((attempt) => attempt + 1);
          }}
          className="rounded-xl border border-dark-700 px-4 py-2 text-sm text-gold-400 hover:border-gold-500/50"
        >
          Retry loading Pro Firm content
        </button>
      )}

      <div className="dark-card p-6 space-y-8">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Headline</label>
            <input
              type="text"
              value={content.headline}
              disabled={isLoading || isWritePending || !isContentLoaded}
              onChange={(e) => setContent({ ...content, headline: e.target.value })}
              className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Subtitle</label>
            <input
              type="text"
              value={content.subtitle}
              disabled={isLoading || isWritePending || !isContentLoaded}
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
                disabled={isLoading || isWritePending || !isContentLoaded}
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
                disabled={isLoading || isWritePending || !isContentLoaded}
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
                  disabled={isLoading || isWritePending || !isContentLoaded}
                  onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                  className="flex-1 bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50"
                  placeholder="https://example.com/file.jpg"
                />
                <CldUploadWidget
                  uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "logic_traders_unsigned"}
                  options={{ sources: ["local", "url", "camera"], multiple: false, resourceType: activeType === "video" ? "video" : "image" }}
                  onSuccess={handleUploadSuccess}
                  onError={() => setNotification({ type: "error", message: "Upload failed. Please try again." })}
                >
                  {({ open }) => (
                    <button
                      type="button"
                      onClick={() => open()}
                      disabled={isLoading || isWritePending || !isContentLoaded}
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
                disabled={isLoading || isWritePending || !isContentLoaded}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-gold-500/50"
                placeholder="Optional summary"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => void addItem()}
            disabled={isLoading || isWritePending || !isContentLoaded}
            className="bg-gold-500 hover:bg-gold-600 text-dark-950 font-bold px-5 py-3 rounded-xl flex items-center gap-2 transition-all disabled:cursor-not-allowed disabled:opacity-60"
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
                          onClick={() => void removeItem(item.id)}
                          disabled={isLoading || isWritePending}
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
