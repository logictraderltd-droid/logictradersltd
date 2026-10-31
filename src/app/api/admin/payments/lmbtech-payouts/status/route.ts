import { createServerSupabaseClient } from "@/lib/supabase-server";
import { reconcileLmbtechPayout } from "@/lib/lmbtech-reconciliation";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    const { data: userRow, error: roleError } = await authClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (roleError) throw roleError;
    if (userRow?.role !== "admin") return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    const body = await request.json();
    const referenceId = typeof body.referenceId === "string" ? body.referenceId.trim() : "";
    if (!referenceId) return NextResponse.json({ error: "A payout reference is required." }, { status: 400 });

    const result = await reconcileLmbtechPayout(referenceId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Unable to refresh LMBTech payout status:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Unable to check payout status." }, { status: 503 });
  }
}
