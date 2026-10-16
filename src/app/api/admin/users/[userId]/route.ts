import { createAdminClient } from '@/lib/supabase';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

async function getAuthorizedAdmin() {
  const authClient = await createServerSupabaseClient();
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) {
    return { response: NextResponse.json({ error: 'Unauthorized.' }, { status: 401 }) };
  }

  const { data: userRow, error: roleError } = await authClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (roleError) throw roleError;
  if (userRow?.role !== 'admin') {
    return { response: NextResponse.json({ error: 'Forbidden.' }, { status: 403 }) };
  }

  return { user };
}

function isValidUserId(userId: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId);
}

export async function PATCH(request: Request, { params }: { params: { userId: string } }) {
  try {
    const authorization = await getAuthorizedAdmin();
    if ('response' in authorization) return authorization.response;

    if (!isValidUserId(params.userId)) {
      return NextResponse.json({ error: 'Invalid user ID.' }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid user details.' }, { status: 400 });
    }

    const { email, full_name: fullName, role } = body as Record<string, unknown>;
    if (
      typeof email !== 'string' ||
      typeof fullName !== 'string' ||
      typeof role !== 'string'
    ) {
      return NextResponse.json({ error: 'Email, full name, and role are required.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = fullName.trim();
    if (
      normalizedEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
      normalizedName.length > 120 ||
      !['admin', 'customer'].includes(role)
    ) {
      return NextResponse.json({ error: 'Enter a valid email, name (up to 120 characters), and role.' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: target, error: targetError } = await admin
      .from('users')
      .select('id, email, role')
      .eq('id', params.userId)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

    if (target.id === authorization.user.id && role !== 'admin') {
      return NextResponse.json({ error: 'You cannot remove your own admin role.' }, { status: 409 });
    }

    if (target.role === 'admin' && role !== 'admin') {
      const { count, error: countError } = await admin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin');
      if (countError) throw countError;
      if ((count ?? 0) <= 1) {
        return NextResponse.json({ error: 'The last administrator cannot be demoted.' }, { status: 409 });
      }
    }

    const { error: authUpdateError } = await admin.auth.admin.updateUserById(target.id, {
      email: normalizedEmail,
      email_confirm: true,
    });
    if (authUpdateError) {
      return NextResponse.json({ error: authUpdateError.message }, { status: 400 });
    }

    const { data: updatedUser, error: updateError } = await admin
      .from('users')
      .update({ email: normalizedEmail, full_name: normalizedName, role })
      .eq('id', target.id)
      .select('*')
      .single();

    if (updateError) {
      const { error: rollbackError } = await admin.auth.admin.updateUserById(target.id, {
        email: target.email,
        email_confirm: true,
      });
      if (rollbackError) {
        console.error('Unable to roll back auth email after user profile update failed:', rollbackError);
      }
      throw updateError;
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Unable to update admin-managed user:', error);
    return NextResponse.json({ error: 'Unable to update user.' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { userId: string } }) {
  try {
    const authorization = await getAuthorizedAdmin();
    if ('response' in authorization) return authorization.response;

    if (!isValidUserId(params.userId)) {
      return NextResponse.json({ error: 'Invalid user ID.' }, { status: 400 });
    }
    if (params.userId === authorization.user.id) {
      return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 409 });
    }

    const admin = createAdminClient();
    const { data: target, error: targetError } = await admin
      .from('users')
      .select('id, role')
      .eq('id', params.userId)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!target) return NextResponse.json({ error: 'User not found.' }, { status: 404 });

    if (target.role === 'admin') {
      const { count, error: countError } = await admin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin');
      if (countError) throw countError;
      if ((count ?? 0) <= 1) {
        return NextResponse.json({ error: 'The last administrator cannot be deleted.' }, { status: 409 });
      }
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(target.id);
    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unable to delete admin-managed user:', error);
    return NextResponse.json({ error: 'Unable to delete user.' }, { status: 500 });
  }
}
