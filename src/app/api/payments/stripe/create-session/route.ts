import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20',
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request: Request) {
    console.log("💳 Creating Session with Key:", process.env.STRIPE_SECRET_KEY?.substring(0, 8) + "...");
    try {
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

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const { productId } = body;

        if (!productId) {
            return NextResponse.json(
                { error: 'Missing product ID' },
                { status: 400 }
            );
        }

        // Get product details
        const { data: product, error: productError } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

        if (productError || !product) {
            return NextResponse.json(
                { error: 'Product not found' },
                { status: 404 }
            );
        }

        // Create order record (Pending)
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                user_id: user.id,
                product_id: productId,
                product_type: product.type,
                amount: product.price,
                currency: (product.currency || 'USD').toUpperCase(),
                status: 'pending',
                payment_method: 'stripe',
            })
            .select()
            .single();

        if (orderError) {
            console.error('Error creating order:', orderError);
            return NextResponse.json(
                { error: 'Failed to create order' },
                { status: 500 }
            );
        }

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            payment_intent_data: {
                metadata: {
                    order_id: order.id,
                    user_id: user.id,
                    product_id: productId,
                    product_type: product.type,
                },
            },
            line_items: [
                {
                    price_data: {
                        currency: product.currency?.toLowerCase() || 'usd',
                        product_data: {
                            name: product.name,
                            description: product.description || undefined,
                            images: product.image_url ? [product.image_url] : undefined,
                        },
                        unit_amount: Math.round(product.price * 100),
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${APP_URL}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
            cancel_url: `${APP_URL}/checkout?product=${productId}&canceled=true`,
            metadata: {
                order_id: order.id,
                user_id: user.id,
                product_id: productId,
                product_type: product.type,
            },
            client_reference_id: order.id,
        });

        return NextResponse.json({ url: session.url });

    } catch (error: any) {
        console.error('Stripe session error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create checkout session' },
            { status: 500 }
        );
    }
}
