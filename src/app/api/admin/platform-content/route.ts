import { createAdminClient } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

const SECTION_KEYS = new Set([
  "cfd_blocker_content",
  "pro_firm_listings",
  "copy_trading_content",
]);

function validHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return true;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

async function requireAdmin() {
  const authClient = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return { response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };

  const { data: userRow, error: roleError } = await authClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (roleError) throw roleError;
  if (userRow?.role !== "admin") return { response: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };

  return { admin: createAdminClient() };
}

export async function PUT(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const body = await request.json();
    if (body?.action === "save_listing") {
      const item = body.item;
      const sectionKey = body.sectionKey;
      if (!item || typeof item.id !== "string" || !item.id ||
          typeof sectionKey !== "string" || !SECTION_KEYS.has(sectionKey) ||
          typeof item.title !== "string" || !item.title.trim() ||
          !validHttpUrl(item.image_url) || !validHttpUrl(item.video_url) ||
          !validHttpUrl(item.affiliate_url) ||
          typeof item.description !== "string" ||
          typeof item.published !== "boolean" ||
          !Number.isInteger(item.sort_order)) {
        return NextResponse.json({ error: "Enter a title and valid listing details before saving." }, { status: 400 });
      }

      const { data, error } = await auth.admin
        .from("platform_listings")
        .upsert({
          id: item.id,
          section_key: sectionKey,
          title: item.title.trim(),
          image_url: item.image_url.trim(),
          video_url: item.video_url.trim(),
          description: item.description,
          affiliate_url: item.affiliate_url.trim(),
          published: item.published,
          sort_order: item.sort_order,
          updated_at: new Date().toISOString(),
        }, { onConflict: "section_key,id" })
        .select("id,section_key")
        .single();
      if (error) throw error;
      return NextResponse.json({ success: true, listing: data });
    }

    if (body?.action === "save_signal_links") {
      const communityUrl = body.communityUrl;
      const vipUrl = body.vipUrl;
      if (!validHttpUrl(communityUrl) || !validHttpUrl(vipUrl)) {
        return NextResponse.json({ error: "Telegram destinations must be valid HTTP(S) URLs." }, { status: 400 });
      }
      const updatedAt = new Date().toISOString();
      const { error: publicError } = await auth.admin
        .from("site_content")
        .upsert({
          key: "signal_community_settings",
          value: { community_url: communityUrl.trim() },
          updated_at: updatedAt,
        }, { onConflict: "key" });
      if (publicError) throw publicError;

      const { error: privateError } = await auth.admin
        .from("platform_private_settings")
        .upsert({
          key: "signal_vip_telegram",
          value: { url: vipUrl.trim() },
          updated_at: updatedAt,
        }, { onConflict: "key" });
      if (privateError) throw privateError;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unsupported platform content action." }, { status: 400 });
  } catch (error) {
    console.error("Unable to save platform content:", error);
    return NextResponse.json({ error: "Unable to save platform content. Please try again." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireAdmin();
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const sectionKey = searchParams.get("sectionKey") || "";
    const id = searchParams.get("id") || "";
    if (!SECTION_KEYS.has(sectionKey) || !id) {
      return NextResponse.json({ error: "A valid listing section and ID are required." }, { status: 400 });
    }

    const { data, error } = await auth.admin
      .from("platform_listings")
      .delete()
      .eq("section_key", sectionKey)
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Listing not found or already deleted." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unable to delete platform listing:", error);
    return NextResponse.json({ error: "Unable to delete platform listing. Please try again." }, { status: 500 });
  }
}
