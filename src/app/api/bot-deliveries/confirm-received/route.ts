import { createAdminClient } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Sign in to confirm your bot delivery." }, { status: 401 });
    }

    const body = await request.json();
    const orderId = typeof body.orderId === "string" ? body.orderId : "";
    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: order, error: orderError } = await admin
      .from("orders")
      .select("id, user_id, product_id, status, product_type, metadata")
      .eq("id", orderId)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order || order.user_id !== user.id) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }
    if (order.status !== "completed" || order.product_type !== "bot" ||
        order.metadata?.delivery_method !== "manual_email") {
      return NextResponse.json({ error: "Only paid manual-delivery bot orders can be confirmed." }, { status: 409 });
    }

    const { data: delivery, error: deliveryError } = await admin
      .from("bot_delivery_requests")
      .select("id, status")
      .eq("order_id", orderId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (deliveryError) throw deliveryError;
    if (!delivery || !["pending_delivery", "delivered", "received"].includes(delivery.status)) {
      return NextResponse.json({ error: "This bot delivery is not awaiting customer confirmation." }, { status: 409 });
    }

    const now = new Date().toISOString();
    if (delivery.status !== "received") {
      const update = delivery.status === "delivered"
        ? { status: "received", updated_at: now }
        : { status: "received", delivered_at: now, updated_at: now };
      const { data: updated, error: updateError } = await admin
        .from("bot_delivery_requests")
        .update(update)
        .eq("id", delivery.id)
        .eq("user_id", user.id)
        .in("status", ["pending_delivery", "delivered"])
        .select("id")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!updated) {
        return NextResponse.json({ error: "Delivery status changed. Refresh the dashboard and try again." }, { status: 409 });
      }
    }

    const { error: accessError } = await admin
      .from("user_access")
      .upsert({
        user_id: user.id,
        product_id: order.product_id,
        product_type: "bot",
        order_id: order.id,
        granted_by: user.id,
        is_active: true,
        expires_at: null,
        access_expires_at: null,
      }, { onConflict: "user_id,product_id" });
    if (accessError) throw accessError;

    return NextResponse.json({ success: true, status: "received" });
  } catch (error) {
    console.error("Unable to confirm bot delivery receipt:", error);
    return NextResponse.json({ error: "Unable to confirm bot delivery receipt." }, { status: 500 });
  }
}
