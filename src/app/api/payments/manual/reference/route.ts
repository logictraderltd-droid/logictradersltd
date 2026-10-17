import { createAdminClient } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function PATCH(request: Request) {
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    }

    const body = await request.json();
    const requestId = typeof body.requestId === "string" ? body.requestId : "";
    const reference = typeof body.transactionReference === "string"
      ? body.transactionReference.trim()
      : "";
    if (!requestId || reference.length < 3 || reference.length > 120) {
      return NextResponse.json({ error: "Enter a transaction reference between 3 and 120 characters." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: paymentRequest, error: updateError } = await admin
      .from("manual_payment_requests")
      .update({ transaction_reference: reference })
      .eq("id", requestId)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!paymentRequest) {
      return NextResponse.json({ error: "This payment request cannot be updated." }, { status: 409 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unable to update customer payment reference:", error);
    return NextResponse.json({ error: "Unable to update payment reference." }, { status: 500 });
  }
}
