import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';
  const isEmailSignup = searchParams.get('flow') === 'email_signup';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin;

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // After exchanging code, check if user has names in public.users; if not, redirect to complete-profile
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (session && session.user) {
        try {
          let userRole: string | null = null;

          if (isEmailSignup) {
            const { data: userRow, error: userErr } = await supabase
              .from('users')
              .select('role')
              .eq('id', session.user.id)
              .maybeSingle();
            if (!userErr) userRole = userRow?.role ?? null;
          } else {
            const { data: userRow, error: userErr } = await supabase
              .from('users')
              .select('full_name, role')
              .eq('id', session.user.id)
              .maybeSingle();

            if (!userErr && userRow && !userRow.full_name?.trim()) {
              return NextResponse.redirect(`${appUrl}/complete-profile`);
            }
            if (!userErr) userRole = userRow?.role ?? null;
          }

          if (userRole === 'admin') {
            return NextResponse.redirect(`${appUrl}/admin`);
          }
        } catch (e) {
          // ignore and continue redirect
        }
      }

      const safeNext = next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
      return NextResponse.redirect(new URL(safeNext, appUrl));
    }
  }

  return NextResponse.redirect(`${appUrl}/login?error=auth_callback_error`);
}
