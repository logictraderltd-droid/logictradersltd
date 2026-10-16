import { createServerSupabaseClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await request.json();
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session ID.' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.metadata?.user_id !== user.id) {
      return NextResponse.json({ error: 'This payment does not belong to the signed-in user.' }, { status: 403 });
    }

    const orderId = session.client_reference_id || session.metadata?.order_id;
    if (!orderId || session.metadata?.order_id !== orderId) {
      return NextResponse.json({ error: 'The payment has no matching order.' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('id, status')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });

    return NextResponse.json({
      success: session.payment_status === 'paid' && order.status === 'completed',
      status: order.status,
      message: order.status === 'completed'
        ? 'Payment confirmed.'
        : session.payment_status === 'paid'
          ? 'Payment confirmed by Stripe. Access is being prepared.'
          : 'Payment is still pending.',
    });
  } catch (error) {
    console.error('Payment status check failed:', error);
    return NextResponse.json({ error: 'Unable to verify payment status.' }, { status: 500 });
  }
}
