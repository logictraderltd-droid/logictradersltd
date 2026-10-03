import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const fullName = typeof body.fullName === 'string'
      ? body.fullName.trim()
      : [body.firstName, body.lastName].filter((name) => typeof name === 'string').join(' ').trim();

    if (!fullName) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 });
    }

    // Get server session to identify the current user
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = session.user.id;

    // Use admin client to update users table
    const admin = createAdminClient();
    const profileUpdate = {
      full_name: fullName,
      updated_at: new Date().toISOString(),
    };

    const { error } = await admin
      .from('users')
      .update(profileUpdate)
      .eq('id', userId);

    if (error) {
      console.error('Error updating users profile:', error);
      return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Complete-profile API error:', err);
    return NextResponse.json({ error: err.message || 'Unexpected error' }, { status: 500 });
  }
}
