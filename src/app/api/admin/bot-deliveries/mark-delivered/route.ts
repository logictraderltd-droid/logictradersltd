import { createAdminClient } from '@/lib/supabase';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });

    const { data: userRow, error: roleError } = await authClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (roleError) throw roleError;
    if (userRow?.role !== 'admin') return NextResponse.json({ error: 'Forbidden.' }, { status: 403 });

    const body = await request.json();
    const orderId = typeof body.orderId === 'string' ? body.orderId : '';
    if (!orderId) return NextResponse.json({ error: 'Missing order ID.' }, { status: 400 });

    const admin = createAdminClient();
    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('id, status, product_type, metadata')
      .eq('id', orderId)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order || order.status !== 'completed' || order.product_type !== 'bot' || order.metadata?.delivery_method !== 'manual_email') {
      return NextResponse.json({ error: 'Only paid manual-delivery bot orders can be marked delivered.' }, { status: 409 });
    }

    const { data: delivery, error: deliveryError } = await admin
      .from('bot_delivery_requests')
      .select('id, status')
      .eq('order_id', orderId)
      .maybeSingle();
    if (deliveryError) throw deliveryError;
    if (!delivery || delivery.status === 'pending_payment' || delivery.status === 'payment_failed') {
      return NextResponse.json({ error: 'No verified delivery request exists for this order.' }, { status: 409 });
    }
    if (delivery.status === 'pending_delivery') {
      const now = new Date().toISOString();
      const { data: updated, error: updateError } = await admin
        .from('bot_delivery_requests')
        .update({ status: 'delivered', delivered_at: now, updated_at: now })
        .eq('id', delivery.id)
        .eq('status', 'pending_delivery')
        .select('id')
        .maybeSingle();
      if (updateError) throw updateError;
      if (!updated) {
        const { data: currentDelivery, error: currentDeliveryError } = await admin
          .from('bot_delivery_requests')
          .select('status')
          .eq('id', delivery.id)
          .maybeSingle();
        if (currentDeliveryError) throw currentDeliveryError;
        return NextResponse.json({
          success: true,
          status: currentDelivery?.status === 'received' ? 'received' : 'delivered',
        });
      }
    }

    return NextResponse.json({
      success: true,
      status: delivery.status === 'received' ? 'received' : 'delivered',
    });
  } catch (error) {
    console.error('Unable to update bot delivery status:', error);
    return NextResponse.json({ error: 'Unable to update delivery status.' }, { status: 500 });
  }
}
