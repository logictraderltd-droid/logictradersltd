import { createAdminClient } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { reconcileLmbtechPayment } from "@/lib/lmbtech-reconciliation";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    }

    const body = await request.json();
    const referenceId = typeof body.referenceId === "string" ? body.referenceId.trim() : "";
    if (!referenceId) {
      return NextResponse.json({ error: "A payment reference is required." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: payment, error: paymentError } = await admin
      .from("lmbtech_payment_requests")
      .select("reference_id, status, amount_rwf, payment_method, redirect_url")
      .eq("reference_id", referenceId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (paymentError) throw paymentError;
    if (!payment) {
      return NextResponse.json({ error: "Payment request not found." }, { status: 404 });
    }

    const result = await reconcileLmbtechPayment(referenceId);
    return NextResponse.json({
      ...payment,
      status: result.status,
    });
  } catch (error) {
    console.error("Unable to refresh LMBTech payment status:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Unable to check LMBTech payment status." }, { status: 503 });
  }
}
