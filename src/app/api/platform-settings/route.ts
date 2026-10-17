import { createAdminClient } from "@/lib/supabase";
import {
  DEFAULT_PLATFORM_SETTINGS,
  PLATFORM_SETTINGS_KEY,
  type PlatformSettings,
} from "@/lib/platform-settings";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("site_content")
      .select("value")
      .eq("key", PLATFORM_SETTINGS_KEY)
      .maybeSingle();
    if (error) throw error;

    const value = data?.value;
    const settings = value && typeof value === "object" && !Array.isArray(value)
      ? { ...DEFAULT_PLATFORM_SETTINGS, ...value }
      : DEFAULT_PLATFORM_SETTINGS;
    return NextResponse.json({ settings }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to load public platform settings:", error);
    return NextResponse.json({ error: "Unable to load platform settings." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
    const { data: userRow, error: roleError } = await authClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (roleError) throw roleError;
    if (userRow?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const body = await request.json();
    const settings = body?.settings as Partial<PlatformSettings> | undefined;
    if (!settings || typeof settings !== "object" ||
        typeof settings.platformName !== "string" ||
        settings.platformName.trim().length < 2 ||
        settings.platformName.trim().length > 80 ||
        typeof settings.supportEmail !== "string" ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.supportEmail.trim()) ||
        typeof settings.maintenanceMode !== "boolean" ||
        typeof settings.registrationsOpen !== "boolean" ||
        typeof settings.mobileMoneyEnabled !== "boolean" ||
        typeof settings.binanceEnabled !== "boolean" ||
        typeof settings.adminNotificationsEnabled !== "boolean") {
      return NextResponse.json({ error: "Enter a valid platform name, support email, and setting values." }, { status: 400 });
    }

    const savedSettings: PlatformSettings = {
      ...DEFAULT_PLATFORM_SETTINGS,
      ...settings,
      platformName: settings.platformName.trim(),
      supportEmail: settings.supportEmail.trim().toLowerCase(),
    };
    const admin = createAdminClient();
    const { error: saveError } = await admin
      .from("site_content")
      .upsert({
        key: PLATFORM_SETTINGS_KEY,
        value: savedSettings,
        updated_at: new Date().toISOString(),
      }, { onConflict: "key" });
    if (saveError) throw saveError;

    return NextResponse.json({ settings: savedSettings });
  } catch (error) {
    console.error("Unable to save platform settings:", error);
    return NextResponse.json({ error: "Unable to save platform settings." }, { status: 500 });
  }
}
