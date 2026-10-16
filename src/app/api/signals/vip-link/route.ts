import { createAdminClient } from '@/lib/supabase';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Sign in to check VIP access.' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: accessRows, error: accessError } = await admin
      .from('user_access')
      .select('product_id, expires_at, products!inner(product_type)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString());
    if (accessError) throw accessError;

    const hasVipAccess = accessRows?.some((access) => {
      const product = Array.isArray(access.products) ? access.products[0] : access.products;
      return product?.product_type === 'signal';
    });
    if (!hasVipAccess) {
      return NextResponse.json({ error: 'No active VIP signal access.' }, { status: 403 });
    }

    const { data: settings, error: settingsError } = await admin
      .from('platform_private_settings')
      .select('value')
      .eq('key', 'signal_vip_telegram')
      .maybeSingle();
    if (settingsError) throw settingsError;

    const url = settings?.value?.url;
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: 'VIP Telegram destination is not configured.' }, { status: 503 });
    }

    return NextResponse.json({ url }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Unable to retrieve VIP community link:', error);
    return NextResponse.json({ error: 'Unable to load VIP community link.' }, { status: 500 });
  }
}
