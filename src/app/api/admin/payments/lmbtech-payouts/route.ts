import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getLmbtechCallbackUrl, initiateLmbtechPayout } from "@/lib/lmbtech";
import { NextResponse } from "next/server";

async function getAdminUser() {
  const authClient = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return { user: null, response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  const { data: userRow, error: roleError } = await authClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (roleError) throw roleError;
  if (userRow?.role !== "admin") return { user: null, response: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  return { user, response: null };
}

export async function GET() {
  try {
    const { response } = await getAdminUser();
    if (response) return response;
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("lmbtech_payouts")
      .select("id, reference_id, recipient_email, recipient_name, payer_phone, amount_rwf, service_paid, status, gateway_transaction_id, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return NextResponse.json({ payouts: data || [] });
  } catch (error) {
    console.error("Unable to load LMBTech payouts:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Unable to load payouts." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let payoutId: string | null = null;
  let gatewayAttempted = false;
  try {
    const { user, response } = await getAdminUser();
    if (response) return response;
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const payerPhone = typeof body.payerPhone === "string" ? body.payerPhone.trim().replace(/[\s()-]/g, "") : "";
    const amountRwf = Number(body.amountRwf);
    const servicePaid = typeof body.servicePaid === "string" ? body.servicePaid.trim() : "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
        name.length < 2 || name.length > 150 || !/^\+2507\d{8}$/.test(payerPhone) ||
        !Number.isSafeInteger(amountRwf) || amountRwf <= 0 ||
        servicePaid.length < 2 || servicePaid.length > 150) {
      return NextResponse.json({ error: "Enter a valid recipient, Rwanda mobile number, whole RWF amount, and payout purpose." }, { status: 400 });
    }

    const referenceId = `LMB-PAYOUT-${randomUUID()}`;
    const admin = createAdminClient();
    const { data: payout, error: insertError } = await admin
      .from("lmbtech_payouts")
      .insert({
        reference_id: referenceId,
        initiated_by: user!.id,
        recipient_email: email,
        recipient_name: name,
        payer_phone: payerPhone,
        amount_rwf: amountRwf,
        service_paid: servicePaid,
        status: "pending",
      })
      .select("id")
      .single();
    if (insertError) throw insertError;
    payoutId = payout.id;

    const callbackUrl = getLmbtechCallbackUrl();
    gatewayAttempted = true;
    await initiateLmbtechPayout({
      email,
      name,
      amount: amountRwf,
      payerPhone,
      servicePaid,
      referenceId,
      callbackUrl,
    });

    return NextResponse.json({ referenceId, status: "pending" }, { status: 202 });
  } catch (error) {
    console.error("Unable to initiate LMBTech payout:", error instanceof Error ? error.message : "Unknown error");
    if (payoutId && !gatewayAttempted) {
      const admin = createAdminClient();
      await admin.from("lmbtech_payouts").update({ status: "failed" }).eq("id", payoutId).eq("status", "pending");
    }
    return NextResponse.json({ error: "Unable to initiate the payout. Check payout status before retrying." }, { status: 500 });
  }
}
