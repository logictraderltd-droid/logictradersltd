import { createAdminClient } from "@/lib/supabase";

export const PLATFORM_SETTINGS_KEY = "platform_settings";

export interface PlatformSettings {
  platformName: string;
  supportEmail: string;
  maintenanceMode: boolean;
  registrationsOpen: boolean;
  mobileMoneyEnabled: boolean;
  binanceEnabled: boolean;
  adminNotificationsEnabled: boolean;
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  platformName: "LOGICTRADERSLTD",
  supportEmail: "logictradersltd@gmail.com",
  maintenanceMode: false,
  registrationsOpen: true,
  mobileMoneyEnabled: true,
  binanceEnabled: true,
  adminNotificationsEnabled: true,
};

export async function getPlatformSettings() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("site_content")
    .select("value")
    .eq("key", PLATFORM_SETTINGS_KEY)
    .maybeSingle();
  if (error) throw error;

  const value = data?.value;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return DEFAULT_PLATFORM_SETTINGS;
  }

  return {
    ...DEFAULT_PLATFORM_SETTINGS,
    ...value,
  } as PlatformSettings;
}
