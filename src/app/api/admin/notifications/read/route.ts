import { createAdminClient } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

async function getAdminUser() {
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
  return { user };
}

export async function GET() {
  try {
    const auth = await getAdminUser();
    if (auth.response) return auth.response;

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("admin_notification_reads")
      .select("activity_key")
      .eq("user_id", auth.user!.id);
    if (error) throw error;
    return NextResponse.json({ activityKeys: (data || []).map((row) => row.activity_key) });
  } catch (error) {
    console.error("Unable to load notification read state:", error);
    return NextResponse.json({ error: "Unable to load saved notification state." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getAdminUser();
    if (auth.response) return auth.response;

    const body = await request.json();
    const activityKeys: unknown = body?.activityKeys;
    if (!Array.isArray(activityKeys) || activityKeys.length < 1 || activityKeys.length > 100 ||
        !activityKeys.every((key) => typeof key === "string" && key.length <= 200 && /^[a-z-]+:[^:]+$/.test(key))) {
      return NextResponse.json({ error: "Provide between 1 and 100 valid notification IDs." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("admin_notification_reads")
      .upsert(
        activityKeys.map((activity_key: string) => ({
          user_id: auth.user!.id,
          activity_key,
        })),
        { onConflict: "user_id,activity_key", ignoreDuplicates: true },
      );
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unable to save notification read state:", error);
    return NextResponse.json({ error: "Unable to save notification read state." }, { status: 500 });
  }
}
