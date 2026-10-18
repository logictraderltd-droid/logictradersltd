import { createAdminClient } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  { params }: { params: { productId: string } }
) {
  try {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params.productId)) {
      return NextResponse.json({ error: "Invalid product ID." }, { status: 400 });
    }

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

    const admin = createAdminClient();
    const { data: deleted, error: deleteError } = await admin.rpc(
      "admin_delete_product_and_history",
      { target_product_id: params.productId }
    );
    if (deleteError) throw deleteError;
    if (!deleted) {
      return NextResponse.json({ error: "Product not found or already deleted." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unable to delete product and related history:", error);
    return NextResponse.json(
      { error: "Unable to delete product and related history. Ensure the product deletion migration has been applied." },
      { status: 500 }
    );
  }
}
