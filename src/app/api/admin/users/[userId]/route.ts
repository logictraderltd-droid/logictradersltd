import { createAdminClient } from "@/lib/supabase";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const authClient = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) {
    return { response: NextResponse.json({ error: "Unauthorized." }, { status: 401 }) };
  }

  const { data: profile, error } = await authClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (profile?.role !== "admin") {
    return { response: NextResponse.json({ error: "Forbidden." }, { status: 403 }) };
  }
  return { user };
}

type RouteContext = { params: { userId: string } };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const adminCheck = await requireAdmin();
    if ("response" in adminCheck) return adminCheck.response;
    const { user } = adminCheck;
    const { userId } = params;
    if (!userId) return NextResponse.json({ error: "User ID is required." }, { status: 400 });

    const body = await request.json();
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const role = body.role;
    if (fullName.length > 150 || (role !== "admin" && role !== "customer")) {
      return NextResponse.json({ error: "Enter a name up to 150 characters and choose a valid role." }, { status: 400 });
    }
    if (user.id === userId && role !== "admin") {
      return NextResponse.json({ error: "You cannot remove your own administrator role." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: target, error: lookupError } = await admin
      .from("users")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

    if (target.role === "admin" && role !== "admin") {
      const { count, error: countError } = await admin
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin")
        .neq("id", userId);
      if (countError) throw countError;
      if (count === 0) {
        return NextResponse.json({ error: "At least one administrator account must remain." }, { status: 409 });
      }
    }

    const { data, error: updateError } = await admin
      .from("users")
      .update({ full_name: fullName || null, role, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .select("id, email, role, full_name, created_at, updated_at")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!data) return NextResponse.json({ error: "User details were not updated." }, { status: 500 });
    return NextResponse.json({ user: data });
  } catch (error) {
    console.error("Unable to update admin-managed user:", error);
    return NextResponse.json({ error: "Unable to update user details." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const adminCheck = await requireAdmin();
    if ("response" in adminCheck) return adminCheck.response;
    const { user } = adminCheck;
    const { userId } = params;
    if (!userId) return NextResponse.json({ error: "User ID is required." }, { status: 400 });
    if (user.id === userId) {
      return NextResponse.json({ error: "You cannot delete your own administrator account." }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: target, error: lookupError } = await admin
      .from("users")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
    if (target.role === "admin") {
      return NextResponse.json({ error: "Administrator accounts cannot be deleted from User Management." }, { status: 409 });
    }

    const { count: orderCount, error: orderError } = await admin
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (orderError) throw orderError;
    if ((orderCount || 0) > 0) {
      return NextResponse.json({
        error: "This account has order history and cannot be deleted without removing financial records. User deletion is blocked to preserve that history.",
      }, { status: 409 });
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unable to delete admin-managed user:", error);
    return NextResponse.json({ error: "Unable to delete user account." }, { status: 500 });
  }
}
