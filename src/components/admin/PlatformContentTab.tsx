"use client";

import { FormEvent, useEffect, useState } from "react";
import { Pencil, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { CldUploadWidget } from "next-cloudinary";
import { createBrowserClient } from "@/lib/supabase";
import type { PlatformListing } from "@/components/PlatformListings";

const contentSections = [
  { key: "cfd_blocker_content", title: "CFD Blocker", description: "Providers, profile images, videos, details, and affiliate offers." },
  { key: "pro_firm_listings", title: "Pro Firm listings", description: "Manage each firm and its own profile, video, description, and affiliate link." },
  { key: "copy_trading_content", title: "Copy Trading", description: "Providers, strategies, promotional images, videos, and links." },
] as const;

const blankListing = (sortOrder = 0): PlatformListing => ({
  id: crypto.randomUUID(),
  title: "",
  image_url: "",
  video_url: "",
  description: "",
  affiliate_url: "",
  published: true,
  sort_order: sortOrder,
});

function validOptionalUrl(value: string) {
  if (!value.trim()) return true;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function PlatformContentTab() {
  const [sectionKey, setSectionKey] = useState<string>(contentSections[0].key);
  const [items, setItems] = useState<PlatformListing[]>([]);
  const [draft, setDraft] = useState<PlatformListing | null>(null);
  const [communityUrl, setCommunityUrl] = useState("");
  const [vipUrl, setVipUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [notice, setNotice] = useState("");

  const section = contentSections.find((entry) => entry.key === sectionKey) ?? contentSections[0];

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setHasLoadError(false);
      setNotice("");
      try {
        const supabase = createBrowserClient();
        const { data, error } = await supabase.from("site_content").select("value").eq("key", sectionKey).maybeSingle();
        if (error) throw error;
        if (!cancelled) {
          setItems(Array.isArray(data?.value?.items) ? data.value.items : []);
        }
      } catch (error) {
        console.error("Unable to load platform content:", error);
        if (!cancelled) {
          setHasLoadError(true);
          setNotice("Could not load this section. Check its Supabase permissions, then retry.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [sectionKey, loadAttempt]);

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
    if (!draft.title.trim() || !validOptionalUrl(draft.image_url) || !validOptionalUrl(draft.video_url) || !validOptionalUrl(draft.affiliate_url)) {
      setNotice("The listing needs a name. Image, video, and affiliate links must be valid HTTP(S) URLs.");
      return;
    }
    setIsSaving(true);
    setNotice("");
    const savedListing = { ...draft, title: draft.title.trim(), description: draft.description.trim() };
    const nextItems = items.some((item) => item.id === draft.id)
      ? items.map((item) => item.id === draft.id ? savedListing : item)
      : [...items, savedListing];
    try {
      const { error } = await createBrowserClient().from("site_content").upsert(
        { key: sectionKey, value: { items: nextItems }, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
      if (error) throw error;
      setItems(nextItems);
      setDraft(null);
      setNotice(`"${savedListing.title}" saved successfully.`);
    } catch (error) {
      console.error("Unable to save platform content:", error);
      setNotice("Could not save content. Check that the Supabase migration and admin policies are applied.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteListing = async (item: PlatformListing) => {
    if (isSaving || !window.confirm(`Delete "${item.title}"? This will remove it from the public site.`)) return;
    setIsSaving(true);
    setNotice("");
    const nextItems = items.filter((entry) => entry.id !== item.id);
    try {
      const { error } = await createBrowserClient().from("site_content").upsert(
        { key: sectionKey, value: { items: nextItems }, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
      if (error) throw error;
      setItems(nextItems);
      setNotice(`"${item.title}" deleted.`);
    } catch (error) {
      console.error("Unable to delete platform listing:", error);
      setNotice("Could not delete this listing. Please retry.");
    } finally {
      setIsSaving(false);
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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Platform content</h2>
        <p className="mt-1 text-gray-400">Manage public listings, affiliate links, and signal community destinations.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {contentSections.map((entry) => (
          <button key={entry.key} type="button" onClick={() => { setItems([]); setIsLoading(true); setHasLoadError(false); setSectionKey(entry.key); setDraft(null); setNotice(""); }} className={`rounded-lg px-4 py-2 text-sm font-medium ${sectionKey === entry.key ? "bg-gold-500 text-dark-950" : "bg-dark-800 text-gray-300"}`}>
            {entry.title}
          </button>
        ))}
      </div>

      <section className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div><h3 className="text-xl font-semibold text-white">{section.title}</h3><p className="text-sm text-gray-400">{section.description}</p></div>
          <button type="button" disabled={isLoading || isSaving || hasLoadError} onClick={() => { setDraft(blankListing(Math.max(-1, ...items.map((item) => item.sort_order)) + 1)); setNotice(""); }} className="inline-flex items-center gap-2 rounded-lg bg-dark-800 px-4 py-2 text-sm text-white hover:bg-dark-700 disabled:opacity-50"><Plus className="h-4 w-4" /> Add listing</button>
        </div>
        {notice && <p role="status" className="rounded-lg border border-dark-700 bg-dark-900 px-4 py-3 text-sm text-gray-300">{notice}</p>}
        {hasLoadError && <button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)} className="text-sm font-semibold text-gold-400 underline">Retry loading listings</button>}
        {isLoading ? <div className="spinner" /> : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-dark-700 p-8 text-center text-gray-500">No saved listings yet. Use “Add listing” to create one.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
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
                  <button type="button" disabled={isSaving} onClick={() => { setDraft({ ...item }); setNotice(""); }} className="inline-flex items-center gap-2 rounded-lg border border-dark-700 px-3 py-2 text-sm text-gray-200 hover:border-gold-500/50 disabled:opacity-50">
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

      {draft && (
        <form onSubmit={saveListing} className="dark-card space-y-5 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-white">{items.some((item) => item.id === draft.id) ? "Edit listing" : "Add listing"}</h3>
              <p className="text-sm text-gray-400">Save this listing before starting another.</p>
            </div>
            <button type="button" disabled={isSaving} onClick={() => setDraft(null)} className="rounded-lg p-2 text-gray-400 hover:bg-dark-800 hover:text-white" aria-label="Close listing editor"><X className="h-5 w-5" /></button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm text-gray-400">Name / title<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className="dark-input w-full" required /></label>
            <div className="space-y-1 text-sm text-gray-400">
              <label htmlFor="listing-image">Profile / image URL</label>
              <div className="flex gap-2">
                <input id="listing-image" type="url" value={draft.image_url} onChange={(event) => setDraft({ ...draft, image_url: event.target.value })} className="dark-input w-full" placeholder="https://" />
                <CldUploadWidget uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "logic_traders_unsigned"} onSuccess={(result: any) => { if (result.info?.secure_url) setDraft((current) => current ? { ...current, image_url: result.info.secure_url } : current); }}>
                  {({ open }) => <button type="button" onClick={() => open()} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-dark-700 bg-dark-800 px-3 text-gray-300"><Upload className="h-4 w-4" /> Upload</button>}
                </CldUploadWidget>
              </div>
            </div>
            <div className="space-y-1 text-sm text-gray-400">
              <label htmlFor="listing-video">Video URL (YouTube, Vimeo, or hosted video)</label>
              <div className="flex gap-2">
                <input id="listing-video" type="url" value={draft.video_url} onChange={(event) => setDraft({ ...draft, video_url: event.target.value })} className="dark-input w-full" placeholder="https://" />
                <CldUploadWidget uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "logic_traders_unsigned"} options={{ resourceType: "video" }} onSuccess={(result: any) => { if (result.info?.secure_url) setDraft((current) => current ? { ...current, video_url: result.info.secure_url } : current); }}>
                  {({ open }) => <button type="button" onClick={() => open()} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-dark-700 bg-dark-800 px-3 text-gray-300"><Upload className="h-4 w-4" /> Upload</button>}
                </CldUploadWidget>
              </div>
            </div>
            <label className="space-y-1 text-sm text-gray-400">Affiliate / provider URL<input type="url" value={draft.affiliate_url} onChange={(event) => setDraft({ ...draft, affiliate_url: event.target.value })} className="dark-input w-full" placeholder="https://" /></label>
            <label className="space-y-1 text-sm text-gray-400">Display order<input type="number" value={draft.sort_order} onChange={(event) => setDraft({ ...draft, sort_order: Number(event.target.value) })} className="dark-input w-full" /></label>
            <label className="flex items-center gap-3 text-sm text-gray-300"><input type="checkbox" checked={draft.published} onChange={(event) => setDraft({ ...draft, published: event.target.checked })} /> Published on the public site</label>
          </div>
          <label className="block space-y-1 text-sm text-gray-400">Image / video description<textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} className="dark-input min-h-24 w-full" /></label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={isSaving || isLoading} className="gold-button inline-flex items-center gap-2 disabled:opacity-50"><Save className="h-4 w-4" />{isSaving ? "Saving..." : "Save listing"}</button>
            <button type="button" disabled={isSaving} onClick={() => setDraft(null)} className="inline-flex items-center gap-2 rounded-lg border border-dark-700 px-4 py-2 text-sm text-gray-300 hover:bg-dark-800 disabled:opacity-50"><X className="h-4 w-4" /> Cancel</button>
            {notice && <p role="status" className="text-sm text-gray-300">{notice}</p>}
          </div>
        </form>
      )}

      <section className="dark-card space-y-4 p-5">
        <div><h3 className="text-xl font-semibold text-white">Signals community links</h3><p className="text-sm text-gray-400">Public community and paid VIP destinations. VIP link is only shown to users with current access.</p></div>
        <label className="block space-y-1 text-sm text-gray-400">Public Telegram community URL<input type="url" value={communityUrl} onChange={(event) => setCommunityUrl(event.target.value)} className="dark-input w-full" placeholder="https://t.me/..." /></label>
        <label className="block space-y-1 text-sm text-gray-400">VIP Telegram community URL<input type="url" value={vipUrl} onChange={(event) => setVipUrl(event.target.value)} className="dark-input w-full" placeholder="https://t.me/..." /></label>
        <button type="button" onClick={saveSignalLinks} disabled={isSaving} className="gold-button inline-flex items-center gap-2 disabled:opacity-50"><Save className="h-4 w-4" /> Save community links</button>
      </section>
    </div>
  );
}
