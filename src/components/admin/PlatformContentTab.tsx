"use client";

import { FormEvent, useEffect, useState } from "react";
import { Plus, Save, Trash2, Upload } from "lucide-react";
import { CldUploadWidget } from "next-cloudinary";
import { createBrowserClient } from "@/lib/supabase";
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
  published: false,
  sort_order: 0,
});

function validOptionalUrl(value: string) {
  if (!value.trim()) return true;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function PlatformContentTab({ initialSectionKey = contentSections[0].key }: { initialSectionKey?: string }) {
  const [sectionKey, setSectionKey] = useState<string>(initialSectionKey);
  const [items, setItems] = useState<PlatformListing[]>([]);
  const [communityUrl, setCommunityUrl] = useState("");
  const [vipUrl, setVipUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const section = contentSections.find((entry) => entry.key === sectionKey) ?? contentSections[0];

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
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
        if (!cancelled) setNotice("Could not load this section. Check its Supabase permissions.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [sectionKey]);

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

  const saveListings = async (event: FormEvent) => {
    event.preventDefault();
    if (items.some((item) => !item.title.trim() || !validOptionalUrl(item.image_url) || !validOptionalUrl(item.video_url) || !validOptionalUrl(item.affiliate_url))) {
      setNotice("Each listing needs a title. Image, video, and affiliate links must be valid HTTP(S) URLs.");
      return;
    }
    setIsSaving(true);
    setNotice("");
    try {
      const { error } = await createBrowserClient().from("site_content").upsert(
        { key: sectionKey, value: { items }, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
      if (error) throw error;
      setNotice("Content saved.");
    } catch (error) {
      console.error("Unable to save platform content:", error);
      setNotice("Could not save content. Check that the Supabase migration and admin policies are applied.");
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

  const updateItem = (id: string, patch: Partial<PlatformListing>) => {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Platform content</h2>
        <p className="mt-1 text-gray-400">Manage public listings, affiliate links, and signal community destinations.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {contentSections.map((entry) => (
          <button key={entry.key} type="button" onClick={() => setSectionKey(entry.key)} className={`rounded-lg px-4 py-2 text-sm font-medium ${sectionKey === entry.key ? "bg-gold-500 text-dark-950" : "bg-dark-800 text-gray-300"}`}>
            {entry.title}
          </button>
        ))}
      </div>

      <form onSubmit={saveListings} className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div><h3 className="text-xl font-semibold text-white">{section.title}</h3><p className="text-sm text-gray-400">{section.description}</p></div>
          <button type="button" onClick={() => setItems((current) => [...current, blankListing()])} className="inline-flex items-center gap-2 rounded-lg bg-dark-800 px-4 py-2 text-sm text-white hover:bg-dark-700"><Plus className="h-4 w-4" /> Add listing</button>
        </div>
        {isLoading ? <div className="spinner" /> : items.map((item) => (
          <div key={item.id} className="dark-card space-y-4 p-5">
            <div className="flex justify-between gap-3">
              <h4 className="font-semibold text-white">{item.title || "New listing"}</h4>
              <button type="button" onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} className="text-red-400" aria-label={`Remove ${item.title || "listing"}`}><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1 text-sm text-gray-400">Name / title<input value={item.title} onChange={(event) => updateItem(item.id, { title: event.target.value })} className="dark-input w-full" required /></label>
              <div className="space-y-1 text-sm text-gray-400">
                <label htmlFor={`image-${item.id}`}>Profile / image URL</label>
                <div className="flex gap-2">
                  <input id={`image-${item.id}`} type="url" value={item.image_url} onChange={(event) => updateItem(item.id, { image_url: event.target.value })} className="dark-input w-full" placeholder="https://" />
                  <CldUploadWidget uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "logic_traders_unsigned"} onSuccess={(result: any) => { if (result.info?.secure_url) updateItem(item.id, { image_url: result.info.secure_url }); }}>
                    {({ open }) => <button type="button" onClick={() => open()} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-dark-700 bg-dark-800 px-3 text-gray-300"><Upload className="h-4 w-4" /> Upload</button>}
                  </CldUploadWidget>
                </div>
              </div>
              <div className="space-y-1 text-sm text-gray-400">
                <label htmlFor={`video-${item.id}`}>Video URL (YouTube, Vimeo, or hosted video)</label>
                <div className="flex gap-2">
                  <input id={`video-${item.id}`} type="url" value={item.video_url} onChange={(event) => updateItem(item.id, { video_url: event.target.value })} className="dark-input w-full" placeholder="https://" />
                  <CldUploadWidget uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "logic_traders_unsigned"} options={{ resourceType: "video" }} onSuccess={(result: any) => { if (result.info?.secure_url) updateItem(item.id, { video_url: result.info.secure_url }); }}>
                    {({ open }) => <button type="button" onClick={() => open()} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-dark-700 bg-dark-800 px-3 text-gray-300"><Upload className="h-4 w-4" /> Upload</button>}
                  </CldUploadWidget>
                </div>
              </div>
              <label className="space-y-1 text-sm text-gray-400">Affiliate / provider URL<input type="url" value={item.affiliate_url} onChange={(event) => updateItem(item.id, { affiliate_url: event.target.value })} className="dark-input w-full" placeholder="https://" /></label>
              <label className="space-y-1 text-sm text-gray-400">Display order<input type="number" value={item.sort_order} onChange={(event) => updateItem(item.id, { sort_order: Number(event.target.value) })} className="dark-input w-full" /></label>
              <label className="flex items-center gap-3 text-sm text-gray-300"><input type="checkbox" checked={item.published} onChange={(event) => updateItem(item.id, { published: event.target.checked })} /> Published on the public site</label>
            </div>
            <label className="block space-y-1 text-sm text-gray-400">Description<textarea value={item.description} onChange={(event) => updateItem(item.id, { description: event.target.value })} className="dark-input min-h-24 w-full" /></label>
          </div>
        ))}
        {!isLoading && items.length === 0 && <p className="rounded-xl border border-dashed border-dark-700 p-8 text-center text-gray-500">No listings yet. Add a listing to publish content here.</p>}
        <div className="flex items-center gap-4">
          <button type="submit" disabled={isSaving || isLoading} className="gold-button inline-flex items-center gap-2 disabled:opacity-50"><Save className="h-4 w-4" />{isSaving ? "Saving..." : "Save listings"}</button>
          {notice && <p role="status" className="text-sm text-gray-300">{notice}</p>}
        </div>
      </form>

      <section className="dark-card space-y-4 p-5">
        <div><h3 className="text-xl font-semibold text-white">Signals community links</h3><p className="text-sm text-gray-400">Public community and paid VIP destinations. VIP link is only shown to users with current access.</p></div>
        <label className="block space-y-1 text-sm text-gray-400">Public Telegram community URL<input type="url" value={communityUrl} onChange={(event) => setCommunityUrl(event.target.value)} className="dark-input w-full" placeholder="https://t.me/..." /></label>
        <label className="block space-y-1 text-sm text-gray-400">VIP Telegram community URL<input type="url" value={vipUrl} onChange={(event) => setVipUrl(event.target.value)} className="dark-input w-full" placeholder="https://t.me/..." /></label>
        <button type="button" onClick={saveSignalLinks} disabled={isSaving} className="gold-button inline-flex items-center gap-2 disabled:opacity-50"><Save className="h-4 w-4" /> Save community links</button>
      </section>
    </div>
  );
}
