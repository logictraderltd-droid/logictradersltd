"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Pencil, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { CldUploadWidget } from "next-cloudinary";
import { createBrowserClient } from "@/lib/supabase";
import { notifyPlatformContentChanged } from "@/lib/platformContentSync";
import type { PlatformListing } from "@/components/PlatformListings";

const contentSections = [
  { key: "cfd_blocker_content", title: "CFD Blocker", description: "Providers, profile images, videos, details, and affiliate offers." },
  { key: "pro_firm_listings", title: "Pro Firm listings", description: "Manage each firm and its own profile, video, description, and affiliate link." },
  { key: "copy_trading_content", title: "Copy Trading", description: "Providers, strategies, promotional images, videos, and links." },
] as const;

const blankListing = (): PlatformListing => ({
  id: crypto.randomUUID(),
  title: "",
  image_url: "",
  video_url: "",
  description: "",
  affiliate_url: "",
  published: true,
  sort_order: 0,
});

const getDraftStorageKey = (sectionKey: string) => `platform-content-draft:${sectionKey}`;
const ACTIVE_SECTION_STORAGE_KEY = "platform-content-active-section";

function readStoredDraft(sectionKey: string): PlatformListing | null {
  try {
    const stored = window.localStorage.getItem(getDraftStorageKey(sectionKey));
    if (!stored) return null;
    return parseListingDraft(JSON.parse(stored));
  } catch (error) {
    console.error("Unable to restore saved listing draft:", error);
    return null;
  }
}

function parseListingDraft(value: unknown): PlatformListing | null {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    !("id" in value) ||
    typeof value.id !== "string" ||
    !("title" in value) ||
    typeof value.title !== "string" ||
    !("image_url" in value) ||
    typeof value.image_url !== "string" ||
    !("video_url" in value) ||
    typeof value.video_url !== "string" ||
    !("description" in value) ||
    typeof value.description !== "string" ||
    !("affiliate_url" in value) ||
    typeof value.affiliate_url !== "string" ||
    !("published" in value) ||
    typeof value.published !== "boolean" ||
    !("sort_order" in value) ||
    typeof value.sort_order !== "number"
  ) {
    return null;
  }
  return {
    id: value.id,
    title: value.title,
    image_url: value.image_url,
    video_url: value.video_url,
    description: value.description,
    affiliate_url: value.affiliate_url,
    published: value.published,
    sort_order: value.sort_order,
  };
}

function listingsMatch(left: PlatformListing, right: PlatformListing) {
  return left.id === right.id &&
    left.title === right.title &&
    left.image_url === right.image_url &&
    left.video_url === right.video_url &&
    left.description === right.description &&
    left.affiliate_url === right.affiliate_url &&
    left.published === right.published &&
    left.sort_order === right.sort_order;
}

function validOptionalUrl(value: string) {
  if (!value.trim()) return true;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function describeDatabaseError(error: unknown) {
  if (error && typeof error === "object") {
    const databaseError = error as { code?: string; message?: string; details?: string; hint?: string };
    if ("name" in error && error.name === "AbortError") {
      return "The database request timed out after 20 seconds. Your draft is preserved; reload this section before retrying to confirm whether it reached the database.";
    }
    return [databaseError.message, databaseError.details, databaseError.hint, databaseError.code ? `Code: ${databaseError.code}` : ""]
      .filter(Boolean)
      .join(" ");
  }
  return error instanceof Error ? error.message : "Unknown database error.";
}

function withRequestTimeout<T>(
  request: (signal: AbortSignal) => PromiseLike<T>,
  timeoutMs = 20_000,
): Promise<T> {
  const controller = new AbortController();
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      controller.abort();
      reject(new Error(`The database request timed out after ${timeoutMs / 1000} seconds. Your draft is preserved; reload before retrying because the request may still finish on the server.`));
    }, timeoutMs);
  });

  const pendingRequest = Promise.resolve().then(() => request(controller.signal));
  return Promise.race([pendingRequest, timeout])
    .finally(() => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    });
}

export function PlatformContentTab() {
  const [sectionKey, setSectionKey] = useState<string>(contentSections[0].key);
  const [hasRestoredSection, setHasRestoredSection] = useState(false);
  const [items, setItems] = useState<PlatformListing[]>([]);
  const [draft, setDraft] = useState<PlatformListing | null>(null);
  const [draftOwnerId, setDraftOwnerId] = useState<string | null>(null);
  const [draftSyncReady, setDraftSyncReady] = useState(false);
  const [draftSaveStatus, setDraftSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [communityUrl, setCommunityUrl] = useState("");
  const [vipUrl, setVipUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [notice, setNotice] = useState("");
  const draftSaveTimerRef = useRef<number | null>(null);
  const draftSaveQueueRef = useRef<Promise<void>>(Promise.resolve());

  const section = contentSections.find((entry) => entry.key === sectionKey) ?? contentSections[0];

  useEffect(() => {
    try {
      const storedSectionKey = window.localStorage.getItem(ACTIVE_SECTION_STORAGE_KEY);
      if (contentSections.some((entry) => entry.key === storedSectionKey)) {
        setSectionKey(storedSectionKey as string);
      }
    } catch (error) {
      console.error("Unable to restore the active platform content section:", error);
    }
    setHasRestoredSection(true);
  }, []);

  useEffect(() => {
    if (!hasRestoredSection) return;
    try {
      window.localStorage.setItem(ACTIVE_SECTION_STORAGE_KEY, sectionKey);
    } catch (error) {
      console.error("Unable to remember the active platform content section:", error);
    }
  }, [sectionKey, hasRestoredSection]);

  useEffect(() => {
    if (!hasRestoredSection) return;
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setHasLoadError(false);
      setDraftSyncReady(false);
      setDraftOwnerId(null);
      setNotice("");
      setDraft(readStoredDraft(sectionKey));
      try {
        const supabase = createBrowserClient();
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!authData.user) throw new Error("Your admin session could not be verified. Sign in again before editing listings.");
        const { data: listings, error: listingsError } = await supabase
          .from("platform_listings")
          .select("*")
          .eq("section_key", sectionKey)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false });
        if (listingsError) throw listingsError;

        let cloudDraft: PlatformListing | null = null;
        let cloudDraftError: unknown = null;
        try {
          const { data: draftData, error: draftsError } = await withRequestTimeout((signal) =>
            supabase
              .from("platform_listing_drafts")
              .select("listing_id, value")
              .eq("user_id", authData.user.id)
              .eq("section_key", sectionKey)
              .order("updated_at", { ascending: false })
              .limit(1)
              .abortSignal(signal)
              .maybeSingle(),
          8_000);
          if (draftsError) throw draftsError;
          cloudDraft = draftData
            ? parseListingDraft({ ...draftData.value, id: draftData.listing_id })
            : null;
        } catch (error) {
          cloudDraftError = error;
          console.error("Unable to load cloud platform listing draft:", error);
        }

        if (!cancelled) {
          const loadedItems = Array.isArray(listings) ? listings as PlatformListing[] : [];
          const matchingSavedItem = cloudDraft && loadedItems.find((item) => listingsMatch(item, cloudDraft));
          setItems(loadedItems);
          setDraft(matchingSavedItem ? null : cloudDraft ?? readStoredDraft(sectionKey));
          setDraftSaveStatus(cloudDraftError ? "error" : matchingSavedItem || cloudDraft ? "saved" : "idle");
          setDraftOwnerId(authData.user.id);
          setDraftSyncReady(!cloudDraftError);
          if (cloudDraftError) {
            setNotice(`Listings loaded. Cross-browser draft sync is unavailable, but saving listings still works. ${describeDatabaseError(cloudDraftError)}`);
          }
          if (matchingSavedItem) {
            void supabase
              .from("platform_listing_drafts")
              .delete()
              .eq("user_id", authData.user.id)
              .eq("section_key", sectionKey)
              .eq("listing_id", matchingSavedItem.id)
              .then(({ error }) => {
                if (error) console.error("Unable to clean up a previously saved platform draft:", error);
              });
          }
        }
      } catch (error) {
        console.error("Unable to load platform content:", error);
        if (!cancelled) {
          setHasLoadError(true);
          const details = describeDatabaseError(error);
          setNotice(
            details.toLowerCase().includes("platform_listings")
              ? `The platform listings table is not available. Run the platform listings migration in Supabase, then retry. ${details}`
              : `Could not load this section. Check its Supabase permissions, then retry. ${details}`,
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [sectionKey, loadAttempt, hasRestoredSection]);

  const saveDraftToCloud = (listing: PlatformListing, key: string, ownerId: string) => {
    const save = (signal: AbortSignal) =>
      createBrowserClient()
        .from("platform_listing_drafts")
        .upsert({
          user_id: ownerId,
          section_key: key,
          listing_id: listing.id,
          value: {
            title: listing.title,
            image_url: listing.image_url,
            video_url: listing.video_url,
            description: listing.description,
            affiliate_url: listing.affiliate_url,
            published: listing.published,
            sort_order: listing.sort_order,
          },
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,section_key,listing_id" })
        .abortSignal(signal);
    const queuedSave = draftSaveQueueRef.current
      .catch(() => undefined)
      .then(() => withRequestTimeout(save, 10_000))
      .then(({ error }) => {
        if (error) throw error;
      });
    draftSaveQueueRef.current = queuedSave;
    return queuedSave;
  };

  useEffect(() => {
    if (!draftSyncReady || !draftOwnerId || !draft) return;
    let cancelled = false;
    setDraftSaveStatus("saving");
    const timerId = window.setTimeout(() => {
      draftSaveTimerRef.current = null;
      if (!draftSyncReady) {
        setDraftSaveStatus("error");
        return;
      }
      void saveDraftToCloud(draft, sectionKey, draftOwnerId).then(() => {
        if (!cancelled) setDraftSaveStatus("saved");
      }).catch((error) => {
        console.error("Unable to sync platform listing draft:", error);
        if (!cancelled) {
          setDraftSaveStatus("error");
          setNotice(`Draft is only saved in this browser and could not sync to your account: ${describeDatabaseError(error)}`);
        }
      });
    }, 400);
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden" || draftSaveTimerRef.current !== timerId) return;
      window.clearTimeout(timerId);
      if (draftSaveTimerRef.current === timerId) draftSaveTimerRef.current = null;
      if (!draftSyncReady) return;
      void saveDraftToCloud(draft, sectionKey, draftOwnerId).then(() => {
        if (!cancelled) setDraftSaveStatus("saved");
      }).catch((error) => {
        console.error("Unable to save platform draft when leaving the page:", error);
        if (!cancelled) {
          setDraftSaveStatus("error");
          setNotice(`Draft could not sync before leaving this page: ${describeDatabaseError(error)}`);
        }
      });
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    draftSaveTimerRef.current = timerId;
    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (draftSaveTimerRef.current === timerId) draftSaveTimerRef.current = null;
    };
  }, [draft, draftOwnerId, draftSyncReady, sectionKey]);

  const saveDraftLocally = (key: string, value: PlatformListing | null) => {
    try {
      if (value) {
        window.localStorage.setItem(getDraftStorageKey(key), JSON.stringify(value));
      } else {
        window.localStorage.removeItem(getDraftStorageKey(key));
      }
    } catch (error) {
      console.error("Unable to persist listing draft in this browser:", error);
      setNotice("The draft could not be saved in this browser. Keep this page open until the listing is saved.");
    }
  };

  const updateDraft = (patch: Partial<PlatformListing>) => {
    if (!draft) return;
    const updatedDraft = { ...draft, ...patch };
    setDraft(updatedDraft);
    saveDraftLocally(sectionKey, updatedDraft);
  };

  useEffect(() => {
    let cancelled = false;
    const loadSignals = async () => {
      try {
        const supabase = createBrowserClient();
        const [{ data, error }, { data: privateData, error: privateError }] = await Promise.all([
          supabase.from("site_content").select("value").eq("key", "signal_community_settings").maybeSingle(),
          supabase.from("platform_private_settings").select("value").eq("key", "signal_vip_telegram").maybeSingle(),
        ]);
        if (error) throw error;
        if (privateError) throw privateError;
        if (!cancelled) {
          setCommunityUrl(data?.value?.community_url ?? "");
          setVipUrl(privateData?.value?.url ?? "");
        }
      } catch (error) {
        console.error("Unable to load signal community settings:", error);
      }
    };
    void loadSignals();
    return () => { cancelled = true; };
  }, []);

  const saveListing = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    if (
      !draft.title.trim() ||
      draft.title.trim().length > 160 ||
      draft.description.length > 5000 ||
      draft.image_url.length > 2048 ||
      draft.video_url.length > 2048 ||
      draft.affiliate_url.length > 2048 ||
      !validOptionalUrl(draft.image_url) ||
      !validOptionalUrl(draft.video_url) ||
      !validOptionalUrl(draft.affiliate_url)
    ) {
      setNotice("Check the listing fields: name must be 1–160 characters, description up to 5,000, URLs up to 2,048 characters, and URLs must be valid HTTP(S) links.");
      return;
    }
    if (hasLoadError || isLoading) {
      setNotice("This section has not loaded successfully. Retry loading it before saving so existing listings are not overwritten.");
      return;
    }
    setIsSaving(true);
    setNotice("");
    const savedListing = { ...draft, title: draft.title.trim(), description: draft.description.trim() };
    try {
      if (draftSaveTimerRef.current !== null) {
        window.clearTimeout(draftSaveTimerRef.current);
        draftSaveTimerRef.current = null;
      }
      const supabase = createBrowserClient();
      const editing = items.some((item) => item.id === savedListing.id);
      const payload = {
        title: savedListing.title,
        image_url: savedListing.image_url,
        video_url: savedListing.video_url,
        description: savedListing.description,
        affiliate_url: savedListing.affiliate_url,
        published: savedListing.published,
        sort_order: editing
          ? savedListing.sort_order
          : Math.min(0, ...items.map((item) => item.sort_order)) - 1,
        updated_at: new Date().toISOString(),
      };
      const result = await withRequestTimeout((signal) =>
        editing
          ? supabase
              .from("platform_listings")
              .update(payload)
              .eq("section_key", sectionKey)
              .eq("id", savedListing.id)
              .abortSignal(signal)
              .select("*")
              .single()
          : supabase
              .from("platform_listings")
              .insert({ ...payload, section_key: sectionKey, id: savedListing.id })
              .abortSignal(signal)
              .select("*")
              .single(),
      );
      const { data, error } = result;
      if (error) throw error;
      if (!data) throw new Error("The database did not return the saved listing.");
      if (draftSyncReady && draftOwnerId) {
        const cleanupDraft = draftSaveQueueRef.current
          .catch(() => undefined)
          .then(() => withRequestTimeout((signal) =>
            supabase
              .from("platform_listing_drafts")
              .delete()
              .eq("user_id", draftOwnerId)
              .eq("section_key", sectionKey)
              .eq("listing_id", savedListing.id)
              .abortSignal(signal),
          8_000))
          .then(({ error }) => {
            if (error) throw error;
          });
        void cleanupDraft.catch((error) => {
          console.error("Listing saved, but cloud draft cleanup failed:", error);
          setNotice(`"${savedListing.title}" is published, but its private draft could not be cleaned up: ${describeDatabaseError(error)}`);
        });
      }
      setItems((current) => editing
        ? current.map((item) => item.id === savedListing.id ? data as PlatformListing : item)
        : [data as PlatformListing, ...current]);
      notifyPlatformContentChanged(sectionKey);
      saveDraftLocally(sectionKey, null);
      setDraft(null);
      setDraftSaveStatus("idle");
      setNotice(`"${savedListing.title}" saved successfully.`);
    } catch (error) {
      console.error("Unable to save platform content:", error);
      setNotice(`Could not save "${savedListing.title}". Your draft is preserved. ${describeDatabaseError(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteListing = async (item: PlatformListing) => {
    if (isSaving || !window.confirm(`Delete "${item.title}"? This will remove it from the public site.`)) return;
    if (hasLoadError || isLoading) {
      setNotice("This section has not loaded successfully. Retry loading it before deleting a listing.");
      return;
    }
    setIsSaving(true);
    setNotice("");
    try {
      const supabase = createBrowserClient();
      const result = await withRequestTimeout((signal) =>
        supabase
          .from("platform_listings")
          .delete()
          .eq("section_key", sectionKey)
          .eq("id", item.id)
          .abortSignal(signal)
          .select("id")
          .single(),
      );
      const { data, error } = result;
      if (error) throw error;
      if (!data) throw new Error("The database did not confirm the listing deletion.");
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      notifyPlatformContentChanged(sectionKey);
      setNotice(`"${item.title}" deleted.`);
    } catch (error) {
      console.error("Unable to delete platform listing:", error);
      setNotice(`Could not delete "${item.title}". ${describeDatabaseError(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const cancelDraft = async () => {
    if (!draft || isSaving) return;
    if (draftSaveTimerRef.current !== null) {
      window.clearTimeout(draftSaveTimerRef.current);
      draftSaveTimerRef.current = null;
    }
    const cancelledDraft = draft;
    setDraft(null);
    saveDraftLocally(sectionKey, null);
    setDraftSaveStatus("idle");
    if (!draftOwnerId || !draftSyncReady) return;
    try {
      await saveDraftToCloud(cancelledDraft, sectionKey, draftOwnerId);
      const { error } = await createBrowserClient()
        .from("platform_listing_drafts")
        .delete()
        .eq("user_id", draftOwnerId)
        .eq("section_key", sectionKey)
        .eq("listing_id", cancelledDraft.id);
      if (error) throw error;
    } catch (error) {
      console.error("Unable to remove cancelled platform listing draft:", error);
      setNotice(`Draft was cleared here but could not be removed from your account: ${describeDatabaseError(error)}`);
    }
  };

  const saveSignalLinks = async () => {
    if (!validOptionalUrl(communityUrl) || !validOptionalUrl(vipUrl)) {
      setNotice("Telegram destinations must be valid HTTP(S) URLs.");
      return;
    }
    setIsSaving(true);
    setNotice("");
    try {
      const supabase = createBrowserClient();
      const [{ error: publicError }, { error: privateError }] = await Promise.all([
        supabase.from("site_content").upsert(
          { key: "signal_community_settings", value: { community_url: communityUrl.trim() }, updated_at: new Date().toISOString() },
          { onConflict: "key" },
        ),
        supabase.from("platform_private_settings").upsert(
          { key: "signal_vip_telegram", value: { url: vipUrl.trim() }, updated_at: new Date().toISOString() },
          { onConflict: "key" },
        ),
      ]);
      if (publicError) throw publicError;
      if (privateError) throw privateError;
      setNotice("Signal community links saved.");
    } catch (error) {
      console.error("Unable to save signal links:", error);
      setNotice("Could not save signal links. Check the Supabase admin policy.");
    } finally {
      setIsSaving(false);
    }
  };

  const repeatedUrlCount = draft ? (draft.description.match(/https?:\/\//gi) || []).length : 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Platform content</h2>
        <p className="mt-1 text-gray-400">Manage public listings, affiliate links, and signal community destinations.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {contentSections.map((entry) => (
          <button key={entry.key} type="button" disabled={isSaving} onClick={() => {
            saveDraftLocally(sectionKey, draft);
            if (draft && draftOwnerId) {
              if (draftSaveTimerRef.current !== null) {
                window.clearTimeout(draftSaveTimerRef.current);
                draftSaveTimerRef.current = null;
              }
              void saveDraftToCloud(draft, sectionKey, draftOwnerId).catch((error) => {
                console.error("Unable to save draft before switching platform sections:", error);
                setNotice(`Draft could not sync before switching sections: ${describeDatabaseError(error)}`);
              });
            }
            try {
              window.localStorage.setItem(ACTIVE_SECTION_STORAGE_KEY, entry.key);
            } catch (error) {
              console.error("Unable to remember the selected platform content section:", error);
            }
            setItems([]);
            setIsLoading(true);
            setHasLoadError(false);
            setSectionKey(entry.key);
            setDraft(null);
            setNotice("");
          }} className={`rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${sectionKey === entry.key ? "bg-gold-500 text-dark-950" : "bg-dark-800 text-gray-300"}`}>
            {entry.title}
          </button>
        ))}
      </div>

      <section className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div><h3 className="text-xl font-semibold text-white">{section.title}</h3><p className="text-sm text-gray-400">{section.description}</p></div>
          <button type="button" disabled={isLoading || isSaving || hasLoadError} onClick={() => { const newDraft = blankListing(); setDraft(newDraft); saveDraftLocally(sectionKey, newDraft); setNotice(""); }} className="inline-flex items-center gap-2 rounded-lg bg-dark-800 px-4 py-2 text-sm text-white hover:bg-dark-700 disabled:opacity-50"><Plus className="h-4 w-4" /> Add listing</button>
        </div>
        {notice && <p role="status" className="rounded-lg border border-dark-700 bg-dark-900 px-4 py-3 text-sm text-gray-300">{notice}</p>}
        {hasLoadError && <button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)} className="text-sm font-semibold text-gold-400 underline">Retry loading listings</button>}
      </section>

      {draft && (
        <form onSubmit={saveListing} className="dark-card space-y-5 p-5">
          <fieldset disabled={isSaving} className="space-y-5 disabled:opacity-80">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-white">{items.some((item) => item.id === draft.id) ? "Edit listing" : "Add listing"}</h3>
              <p className="text-sm text-gray-400">
                {draftSaveStatus === "saving" && "Saving draft to your account…"}
                {draftSaveStatus === "saved" && "Draft saved to your account; you can continue in another browser."}
                {draftSaveStatus === "error" && "Draft sync failed; it is only saved in this browser."}
                {draftSaveStatus === "idle" && "Your unfinished changes will sync to your account automatically."}
              </p>
            </div>
            <button type="button" disabled={isSaving} onClick={() => void cancelDraft()} className="rounded-lg p-2 text-gray-400 hover:bg-dark-800 hover:text-white" aria-label="Close listing editor"><X className="h-5 w-5" /></button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm text-gray-400">Name / title<input value={draft.title} maxLength={160} onChange={(event) => updateDraft({ title: event.target.value })} className="dark-input w-full" required /></label>
            <div className="space-y-1 text-sm text-gray-400">
              <label htmlFor="listing-image">Profile / image URL</label>
              <div className="flex gap-2">
                <input id="listing-image" type="url" value={draft.image_url} maxLength={2048} onChange={(event) => updateDraft({ image_url: event.target.value })} className="dark-input w-full" placeholder="https://" />
                <CldUploadWidget uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "logic_traders_unsigned"} onSuccess={(result: any) => { if (result.info?.secure_url) updateDraft({ image_url: result.info.secure_url }); }}>
                  {({ open }) => <button type="button" onClick={() => open()} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-dark-700 bg-dark-800 px-3 text-gray-300"><Upload className="h-4 w-4" /> Upload</button>}
                </CldUploadWidget>
              </div>
            </div>
            <div className="space-y-1 text-sm text-gray-400">
              <label htmlFor="listing-video">Video URL (YouTube, Vimeo, or hosted video)</label>
              <div className="flex gap-2">
                <input id="listing-video" type="url" value={draft.video_url} maxLength={2048} onChange={(event) => updateDraft({ video_url: event.target.value })} className="dark-input w-full" placeholder="https://" />
                <CldUploadWidget uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "logic_traders_unsigned"} options={{ resourceType: "video" }} onSuccess={(result: any) => { if (result.info?.secure_url) updateDraft({ video_url: result.info.secure_url }); }}>
                  {({ open }) => <button type="button" onClick={() => open()} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-dark-700 bg-dark-800 px-3 text-gray-300"><Upload className="h-4 w-4" /> Upload</button>}
                </CldUploadWidget>
              </div>
            </div>
            <label className="space-y-1 text-sm text-gray-400">Affiliate / provider URL<input type="url" value={draft.affiliate_url} maxLength={2048} onChange={(event) => updateDraft({ affiliate_url: event.target.value })} className="dark-input w-full" placeholder="https://" /></label>
            <label className="space-y-1 text-sm text-gray-400">Display order<input type="number" value={draft.sort_order} onChange={(event) => updateDraft({ sort_order: Number(event.target.value) })} className="dark-input w-full" /></label>
            <label className="flex items-center gap-3 text-sm text-gray-300"><input type="checkbox" checked={draft.published} onChange={(event) => updateDraft({ published: event.target.checked })} /> Published on the public site</label>
          </div>
          <label className="block space-y-1 text-sm text-gray-400">Image / video description<textarea value={draft.description} maxLength={5000} onChange={(event) => updateDraft({ description: event.target.value })} className="dark-input min-h-24 w-full" /></label>
          <div className="flex flex-wrap justify-between gap-2 text-xs text-gray-500">
            <span>{draft.description.length}/5000 characters</span>
            {repeatedUrlCount > 2 && <span className="text-amber-300">This description contains {repeatedUrlCount} URLs. Check for accidental repeated pastes.</span>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={isSaving || isLoading} className="gold-button inline-flex items-center gap-2 disabled:opacity-50"><Save className="h-4 w-4" />{isSaving ? "Saving..." : "Save listing"}</button>
            <button type="button" disabled={isSaving} onClick={() => void cancelDraft()} className="inline-flex items-center gap-2 rounded-lg border border-dark-700 px-4 py-2 text-sm text-gray-300 hover:bg-dark-800 disabled:opacity-50"><X className="h-4 w-4" /> Cancel</button>
            {notice && <p role="status" className="text-sm text-gray-300">{notice}</p>}
          </div>
          </fieldset>
        </form>
      )}

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-white">Saved listings</h3>
        {isLoading ? <div className="spinner" /> : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-dark-700 p-8 text-center text-gray-500">No saved listings yet. Use “Add listing” to create one.</p>
        ) : (
          <div className="space-y-3">
            {[...items].sort((a, b) => a.sort_order - b.sort_order).map((item) => (
              <article key={item.id} className="dark-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                {item.image_url ? <img src={item.image_url} alt="" className="h-20 w-28 rounded-lg bg-dark-950 object-cover" /> : (
                  <div className="flex h-20 w-28 items-center justify-center rounded-lg bg-dark-950 text-xs text-gray-600">No image</div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-white">{item.title}</h4>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${item.published ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-400"}`}>
                      {item.published ? "Published" : "Draft"}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-gray-400">{item.description || "No description added."}</p>
                  {item.affiliate_url && <p className="mt-1 truncate text-xs text-gold-400">{item.affiliate_url}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" disabled={isSaving} onClick={() => { const editDraft = { ...item }; setDraft(editDraft); saveDraftLocally(sectionKey, editDraft); setNotice(""); }} className="inline-flex items-center gap-2 rounded-lg border border-dark-700 px-3 py-2 text-sm text-gray-200 hover:border-gold-500/50 disabled:opacity-50">
                    <Pencil className="h-4 w-4" /> Edit
                  </button>
                  <button type="button" disabled={isSaving} onClick={() => void deleteListing(item)} className="inline-flex items-center gap-2 rounded-lg border border-dark-700 px-3 py-2 text-sm text-red-400 hover:border-red-500/50 disabled:opacity-50" aria-label={`Delete ${item.title}`}>
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="dark-card space-y-4 p-5">
        <div><h3 className="text-xl font-semibold text-white">Signals community links</h3><p className="text-sm text-gray-400">Public community and paid VIP destinations. VIP link is only shown to users with current access.</p></div>
        <label className="block space-y-1 text-sm text-gray-400">Public Telegram community URL<input type="url" value={communityUrl} onChange={(event) => setCommunityUrl(event.target.value)} className="dark-input w-full" placeholder="https://t.me/..." /></label>
        <label className="block space-y-1 text-sm text-gray-400">VIP Telegram community URL<input type="url" value={vipUrl} onChange={(event) => setVipUrl(event.target.value)} className="dark-input w-full" placeholder="https://t.me/..." /></label>
        <button type="button" onClick={saveSignalLinks} disabled={isSaving} className="gold-button inline-flex items-center gap-2 disabled:opacity-50"><Save className="h-4 w-4" /> Save community links</button>
      </section>
    </div>
  );
}
