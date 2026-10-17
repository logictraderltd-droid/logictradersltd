"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { CldUploadWidget } from "next-cloudinary";
import { Pencil, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase";

interface CFDBlocker {
  id: string;
  name: string;
  profile_image_url: string;
  video_url: string;
  description: string;
  affiliate_url: string;
  published: boolean;
  sort_order: number;
  created_at: string;
}

type BlockerForm = Omit<CFDBlocker, "created_at">;

const emptyForm = (): BlockerForm => ({
  id: crypto.randomUUID(),
  name: "",
  profile_image_url: "",
  video_url: "",
  description: "",
  affiliate_url: "",
  published: true,
  sort_order: 0,
});

class SaveTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`The save request timed out after ${timeoutMs / 1000} seconds.`);
    this.name = "SaveTimeoutError";
  }
}

function withRequestTimeout<T>(
  request: (signal: AbortSignal) => PromiseLike<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      controller.abort();
      reject(new SaveTimeoutError(timeoutMs));
    }, timeoutMs);
  });
  const pending = Promise.resolve().then(() => request(controller.signal));
  return Promise.race([pending, timeout]).finally(() => {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId);
  });
}

function matchesSavedData(item: CFDBlocker, form: BlockerForm) {
  return item.id === form.id &&
    item.name === form.name &&
    item.profile_image_url === form.profile_image_url &&
    item.video_url === form.video_url &&
    item.description === form.description &&
    item.affiliate_url === form.affiliate_url &&
    item.published === form.published &&
    item.sort_order === form.sort_order;
}

function isUncertainWriteError(error: unknown) {
  if (error instanceof SaveTimeoutError) return true;
  if (error instanceof TypeError) return true;
  return error instanceof Error && error.name === "AbortError";
}

function validOptionalUrl(value: string) {
  if (!value.trim()) return true;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "An unexpected database error occurred.";
}

export function CFDBlockersTab() {
  const [items, setItems] = useState<CFDBlocker[]>([]);
  const [form, setForm] = useState<BlockerForm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifyingSave, setIsVerifyingSave] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const savingRef = useRef(false);

  const loadItems = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const { data, error } = await createBrowserClient()
        .from("cfd_blockers")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      setItems((data || []) as CFDBlocker[]);
    } catch (error) {
      console.error("Unable to load CFD Blockers:", error);
      setLoadError(`Could not load CFD Blockers. Apply the CFD Blockers database migration and check admin permissions. ${errorMessage(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, []);

  const saveBlocker = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form || savingRef.current) return;

    const normalized = {
      ...form,
      name: form.name.trim(),
      description: form.description.trim(),
      profile_image_url: form.profile_image_url.trim(),
      video_url: form.video_url.trim(),
      affiliate_url: form.affiliate_url.trim(),
    };
    if (!normalized.name || normalized.name.length > 160 || !normalized.description || normalized.description.length > 5000) {
      setNotice("Enter a name (1–160 characters) and a description (1–5,000 characters).");
      return;
    }
    if (!Number.isInteger(normalized.sort_order) || normalized.sort_order < -2147483648 || normalized.sort_order > 2147483647) {
      setNotice("Display order must be a whole number in the supported range.");
      return;
    }
    if (
      normalized.profile_image_url.length > 2048 ||
      normalized.video_url.length > 2048 ||
      normalized.affiliate_url.length > 2048 ||
      !validOptionalUrl(normalized.profile_image_url) ||
      !validOptionalUrl(normalized.video_url) ||
      !validOptionalUrl(normalized.affiliate_url)
    ) {
      setNotice("Profile, video, and affiliate links must be valid HTTP(S) URLs no longer than 2,048 characters.");
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    setIsVerifyingSave(false);
    setNotice("");
    try {
      const now = new Date().toISOString();
      const previousItem = items.find((item) => item.id === normalized.id);
      const payload = { ...normalized, updated_at: now };
      const supabase = createBrowserClient();
      let data: CFDBlocker;
      try {
        const result = await withRequestTimeout((signal) =>
          supabase
            .from("cfd_blockers")
            .upsert(payload, { onConflict: "id" })
            .abortSignal(signal),
        15_000);
        if (result.error) throw result.error;
        data = { ...payload, created_at: previousItem?.created_at ?? now };
      } catch (saveError) {
        if (!isUncertainWriteError(saveError)) throw saveError;
        setIsVerifyingSave(true);
        setNotice("The save response was delayed. Checking whether the database completed the save…");
        let reconciliation;
        try {
          reconciliation = await withRequestTimeout((signal) =>
            supabase
              .from("cfd_blockers")
              .select("*")
              .eq("id", normalized.id)
              .abortSignal(signal)
              .maybeSingle(),
          5_000);
        } catch (verificationError) {
          throw new Error(
            `The save outcome could not be verified. The server may have saved it. Keep this form open and retry; the same listing ID will be reused. Save: ${errorMessage(saveError)} Verification: ${errorMessage(verificationError)}`,
          );
        }
        if (reconciliation.error) {
          throw new Error(
            `The save outcome could not be verified. The server may have saved it. Keep this form open and retry; the same listing ID will be reused. ${errorMessage(reconciliation.error)}`,
          );
        }
        if (!reconciliation.data || !matchesSavedData(reconciliation.data as CFDBlocker, normalized)) {
          throw saveError;
        }
        data = reconciliation.data as CFDBlocker;
      }
      if (!data || data.id !== normalized.id) {
        throw new Error("The database did not confirm this CFD Blocker was saved.");
      }
      setItems((current) => {
        const exists = current.some((item) => item.id === data.id);
        return exists
          ? current.map((item) => item.id === data.id ? data as CFDBlocker : item)
          : [data as CFDBlocker, ...current];
      });
      setForm(null);
      setNotice(`"${data.name}" saved successfully.`);
    } catch (error) {
      console.error("Unable to save CFD Blocker:", error);
      setNotice(`Could not confirm saving "${normalized.name}". Your form is preserved; retrying uses the same listing ID. ${errorMessage(error)}`);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
      setIsVerifyingSave(false);
    }
  };

  const deleteBlocker = async (item: CFDBlocker) => {
    if (savingRef.current || !window.confirm(`Delete "${item.name}"?`)) return;
    savingRef.current = true;
    setIsSaving(true);
    setNotice("");
    try {
      const { data, error } = await createBrowserClient()
        .from("cfd_blockers")
        .delete()
        .eq("id", item.id)
        .select("id")
        .single();
      if (error) throw error;
      if (!data) throw new Error("The database did not confirm the deletion.");
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      if (form?.id === item.id) setForm(null);
      setNotice(`"${item.name}" deleted.`);
    } catch (error) {
      console.error("Unable to delete CFD Blocker:", error);
      setNotice(`Could not delete "${item.name}". ${errorMessage(error)}`);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-white">CFD Blocker</h2>
        <p className="mt-1 text-gray-400">Add providers with a profile, introduction video, details, and affiliate link.</p>
      </header>

      {notice && <p role="status" className="rounded-lg border border-dark-700 bg-dark-900 px-4 py-3 text-sm text-gray-300">{notice}</p>}
      {loadError && (
        <div role="alert" className="space-y-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          <p>{loadError}</p>
          <button type="button" onClick={() => void loadItems()} className="font-semibold underline">Retry loading</button>
        </div>
      )}

      {!form && (
        <button type="button" disabled={isLoading || Boolean(loadError) || isSaving} onClick={() => { setForm(emptyForm()); setNotice(""); }} className="gold-button inline-flex items-center gap-2 disabled:opacity-50">
          <Plus className="h-4 w-4" /> Add CFD Blocker
        </button>
      )}

      {form && (
        <form onSubmit={saveBlocker} className="dark-card space-y-5 p-5">
          <fieldset disabled={isSaving} className="space-y-5 disabled:opacity-80">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xl font-semibold text-white">{items.some((item) => item.id === form.id) ? "Edit CFD Blocker" : "Add CFD Blocker"}</h3>
              <button type="button" onClick={() => setForm(null)} aria-label="Close editor" className="rounded-lg p-2 text-gray-400 hover:bg-dark-800"><X className="h-5 w-5" /></button>
            </div>
            <label className="block space-y-1 text-sm text-gray-400">
              <span>Name</span>
              <input required maxLength={160} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="dark-input w-full" />
            </label>
            <div className="space-y-1 text-sm text-gray-400">
              <label htmlFor="cfd-profile-image">Profile image or logo URL</label>
              <div className="flex gap-2">
                <input id="cfd-profile-image" type="url" maxLength={2048} value={form.profile_image_url} onChange={(event) => setForm({ ...form, profile_image_url: event.target.value })} className="dark-input w-full" placeholder="https://" />
                <CldUploadWidget uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "logic_traders_unsigned"} onSuccess={(result: any) => {
                  if (result.info?.secure_url) setForm((current) => current ? { ...current, profile_image_url: result.info.secure_url } : current);
                }}>
                  {({ open }) => <button type="button" onClick={() => open()} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-dark-700 bg-dark-800 px-3 text-gray-300"><Upload className="h-4 w-4" /> Upload</button>}
                </CldUploadWidget>
              </div>
            </div>
            <div className="space-y-1 text-sm text-gray-400">
              <label htmlFor="cfd-video">Video URL (YouTube, Vimeo, or hosted video)</label>
              <div className="flex gap-2">
                <input id="cfd-video" type="url" maxLength={2048} value={form.video_url} onChange={(event) => setForm({ ...form, video_url: event.target.value })} className="dark-input w-full" placeholder="https://" />
                <CldUploadWidget uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "logic_traders_unsigned"} options={{ resourceType: "video" }} onSuccess={(result: any) => {
                  if (result.info?.secure_url) setForm((current) => current ? { ...current, video_url: result.info.secure_url } : current);
                }}>
                  {({ open }) => <button type="button" onClick={() => open()} className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-dark-700 bg-dark-800 px-3 text-gray-300"><Upload className="h-4 w-4" /> Upload</button>}
                </CldUploadWidget>
              </div>
            </div>
            <label className="block space-y-1 text-sm text-gray-400">
              <span>Description</span>
              <textarea required maxLength={5000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="dark-input min-h-32 w-full" />
            </label>
            <label className="block space-y-1 text-sm text-gray-400">
              <span>Affiliate link</span>
              <input type="url" maxLength={2048} value={form.affiliate_url} onChange={(event) => setForm({ ...form, affiliate_url: event.target.value })} className="dark-input w-full" placeholder="https://" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1 text-sm text-gray-400">
                <span>Display order</span>
                <input type="number" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: Number(event.target.value) })} className="dark-input w-full" />
              </label>
              <label className="flex items-center gap-3 text-sm text-gray-300">
                <input type="checkbox" checked={form.published} onChange={(event) => setForm({ ...form, published: event.target.checked })} />
                Show publicly
              </label>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={isSaving} className="gold-button inline-flex items-center gap-2 disabled:opacity-50"><Save className="h-4 w-4" />{isVerifyingSave ? "Checking save..." : isSaving ? "Saving..." : "Save CFD Blocker"}</button>
              <button type="button" disabled={isSaving} onClick={() => setForm(null)} className="rounded-lg border border-dark-700 px-4 py-2 text-sm text-gray-300 disabled:opacity-50">Cancel</button>
            </div>
          </fieldset>
        </form>
      )}

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-white">Saved CFD Blockers</h3>
        {isLoading ? <div className="spinner" /> : items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-dark-700 p-8 text-center text-gray-500">No CFD Blockers yet.</p>
        ) : items.map((item) => (
          <article key={item.id} className="dark-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            {item.profile_image_url ? <img src={item.profile_image_url} alt="" className="h-16 w-16 rounded-lg bg-dark-950 object-cover" /> : <div className="h-16 w-16 rounded-lg bg-dark-950" />}
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-white">{item.name}</h4>
              <p className="line-clamp-2 text-sm text-gray-400">{item.description}</p>
              <p className="mt-1 text-xs text-gray-500">{item.published ? "Published" : "Hidden"}{item.affiliate_url ? " · Affiliate link set" : ""}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" disabled={isSaving} onClick={() => { setForm({ ...item }); setNotice(""); }} className="rounded-lg border border-dark-700 p-2 text-gray-300 disabled:opacity-50" aria-label={`Edit ${item.name}`}><Pencil className="h-4 w-4" /></button>
              <button type="button" disabled={isSaving} onClick={() => void deleteBlocker(item)} className="rounded-lg border border-red-500/30 p-2 text-red-300 disabled:opacity-50" aria-label={`Delete ${item.name}`}><Trash2 className="h-4 w-4" /></button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
