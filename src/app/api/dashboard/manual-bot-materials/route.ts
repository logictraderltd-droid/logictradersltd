import { createAdminClient } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: deliveries, error: deliveryError } = await admin
      .from("bot_delivery_requests")
      .select("order_id, product_id, status")
      .eq("user_id", user.id)
      .in("status", ["pending_delivery", "delivered", "received"]);
    if (deliveryError) throw deliveryError;
    if (!deliveries?.length) {
      return NextResponse.json({ materials: [] }, { headers: { "Cache-Control": "private, no-store" } });
    }

    const orderIds = [...new Set(deliveries.map((delivery) => delivery.order_id))];
    const { data: orders, error: orderError } = await admin
      .from("orders")
      .select("id, product_id, product_type, status, metadata")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .in("id", orderIds);
    if (orderError) throw orderError;

    const eligibleOrders = new Map((orders || [])
      .filter((order) => order.product_type === "bot" && order.metadata?.delivery_method === "manual_email")
      .map((order) => [order.id, order.product_id]));
    const eligibleDeliveries = deliveries.filter((delivery) =>
      eligibleOrders.get(delivery.order_id) === delivery.product_id,
    );
    const productIds = [...new Set(eligibleDeliveries.map((delivery) => delivery.product_id))];
    if (!productIds.length) {
      return NextResponse.json({ materials: [] }, { headers: { "Cache-Control": "private, no-store" } });
    }

    const { data: botLinks, error: botLinksError } = await admin
      .from("bot_links")
      .select("product_id, link_url")
      .in("product_id", productIds);
    if (botLinksError) throw botLinksError;

    const linkByProduct = new Map((botLinks || []).map((link) => [link.product_id, link.link_url]));
    const materials = eligibleDeliveries.map((delivery) => ({
      product_id: delivery.product_id,
      status: delivery.status,
      link_url: linkByProduct.get(delivery.product_id) || null,
    }));

    return NextResponse.json({ materials }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Unable to load private bot delivery materials:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Unable to load bot delivery materials." }, { status: 500 });
  }
}
