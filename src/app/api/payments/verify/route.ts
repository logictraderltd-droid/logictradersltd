import { createAdminClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20',
});

export async function POST(request: Request) {
    try {
        const { sessionId } = await request.json();

        if (!sessionId) {
            return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
        }

        console.log(`🔍 Verifying session: ${sessionId}`);

        // 1. Retrieve the Session from Stripe (using ID from URL)
        const session = await stripe.checkout.sessions.retrieve(sessionId);

        if (session.payment_status !== 'paid') {
            return NextResponse.json({ error: 'Payment not completed or pending' }, { status: 400 });
        }

        const supabase = createAdminClient();

        // 2. Force Grant Access (Idempotent Upsert)
        // We trust Stripe's data source of truth
        if (session.metadata?.user_id && session.metadata?.product_id) {
            console.log(`✅ Payment verified! Granting access to user ${session.metadata.user_id}`);

            // Update Order Status
            const orderId = session.client_reference_id || session.metadata.order_id;
            if (orderId) {
                const { error: orderError } = await supabase
                    .from('orders')
                    .update({ status: 'completed', updated_at: new Date().toISOString() })
                    .eq('id', orderId);

                if (orderError) console.error('Error updating order:', orderError);
            }

            // Check if payment exists
            const paymentId = session.payment_intent as string || session.id;
            const { data: existingPayment } = await supabase
                .from('payments')
                .select('id')
                .eq('provider_payment_id', paymentId)
                .single();

            if (!existingPayment) {
                const { error: paymentError } = await supabase
                    .from('payments')
                    .insert({
                        user_id: session.metadata.user_id,
                        order_id: orderId,
                        amount: session.amount_total ? session.amount_total / 100 : 0,
                        currency: session.currency?.toUpperCase() || 'USD',
                        provider: 'stripe',
                        provider_payment_id: paymentId,
                        status: 'completed'
                    }); // Let DB handle created_at/updated_at defaults if possible, otherwise...

                if (paymentError) console.error('Error recording payment:', paymentError);
            }

            // Upsert Access - Remove starts_at
            // Check if access exists first to be safe
            const { data: existingAccess } = await supabase
                .from('user_access')
                .select('id')
                .eq('user_id', session.metadata.user_id)
                .eq('product_id', session.metadata.product_id)
                .single();

            if (!existingAccess) {
                const { error: accessError } = await supabase.from('user_access').insert({
                    user_id: session.metadata.user_id,
                    product_id: session.metadata.product_id,
                    product_type: session.metadata.product_type || 'course',
                    is_active: true,
                    granted_by: 'payment',
                    order_id: orderId
                    // starts_at removed
                });

                if (accessError) {
                    console.error('Error granting access:', accessError);
                    throw accessError;
                }
            } else {
                // Ensure it is active
                await supabase.from('user_access').update({ is_active: true }).eq('id', existingAccess.id);
            }
            return NextResponse.json({ success: true, message: 'Access granted' });
        }

        return NextResponse.json({ error: 'Missing metadata in session' }, { status: 400 });

    } catch (error: any) {
        console.error('Verify error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
