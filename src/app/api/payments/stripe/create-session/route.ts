import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` :
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const authClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value; },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      },
    );
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Please sign in before checkout.' }, { status: 401 });
    }

    const body = await request.json();
    const productId = typeof body.productId === 'string' ? body.productId : '';
    if (!productId) return NextResponse.json({ error: 'Missing product ID.' }, { status: 400 });

    const admin = createAdminClient();
    const { data: product, error: productError } = await admin
      .from('products')
      .select('id, name, description, product_type, price_cents, currency, thumbnail_url, is_active, metadata')
      .eq('id', productId)
      .maybeSingle();
    if (productError) throw productError;
    if (!product || !product.is_active) {
      return NextResponse.json({ error: 'This product is not available for purchase.' }, { status: 404 });
    }
    if (product.metadata?.is_free === true) {
      return NextResponse.json({ error: 'Free courses do not require checkout.' }, { status: 400 });
    }

    const amountCents = Number(product.price_cents);
    const currency = String(product.currency || 'USD').toUpperCase();
    if (!Number.isSafeInteger(amountCents) || amountCents <= 0 || !/^[A-Z]{3}$/.test(currency)) {
      return NextResponse.json({ error: 'Product price or currency is not configured correctly.' }, { status: 400 });
    }

    let botCustomer: { full_name: string; email: string; mt5_account_number: string } | null = null;
    const deliveryMethod = product.product_type === 'bot'
      ? product.metadata?.delivery_method === 'manual_email' ? 'manual_email' : 'automatic_download'
      : null;
    if (deliveryMethod === 'manual_email') {
      const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const mt5AccountNumber = typeof body.mt5AccountNumber === 'string' ? body.mt5AccountNumber.trim() : '';
      if (fullName.length < 2 || fullName.length > 150 ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
          mt5AccountNumber.length < 3 || mt5AccountNumber.length > 64) {
        return NextResponse.json({ error: 'Enter your full name, valid email address, and MT5 account number.' }, { status: 400 });
      }
      botCustomer = { full_name: fullName, email, mt5_account_number: mt5AccountNumber };
    }

    if (product.product_type === 'bot' && deliveryMethod === 'automatic_download') {
      const { data: botLink, error: botLinkError } = await admin
        .from('bot_links')
        .select('download_url')
        .eq('product_id', product.id)
        .limit(1)
        .maybeSingle();
      if (botLinkError) throw botLinkError;
      if (!botLink?.download_url) {
        return NextResponse.json({ error: 'This bot is not ready for automatic delivery.' }, { status: 400 });
      }
    }

    const orderMetadata = deliveryMethod ? { delivery_method: deliveryMethod } : {};
    const { data: order, error: orderError } = await admin
      .from('orders')
      .insert({
        user_id: user.id,
        product_id: product.id,
        amount_cents: amountCents,
        product_type: product.product_type,
        currency,
        status: 'pending',
        payment_method: 'stripe',
        metadata: orderMetadata,
      })
      .select('id')
      .single();
    if (orderError) throw orderError;

    if (botCustomer) {
      const { error: deliveryError } = await admin.from('bot_delivery_requests').insert({
        order_id: order.id,
        user_id: user.id,
        product_id: product.id,
        ...botCustomer,
        status: 'pending_payment',
      });
      if (deliveryError) throw deliveryError;
    }

    const metadata = {
      order_id: order.id,
      user_id: user.id,
      product_id: product.id,
      product_type: product.product_type,
    };
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      payment_intent_data: { metadata },
      line_items: [{
        price_data: {
          currency: currency.toLowerCase(),
          product_data: {
            name: product.name,
            description: product.description || undefined,
            images: product.thumbnail_url ? [product.thumbnail_url] : undefined,
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${APP_URL}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/checkout?product=${product.id}&canceled=true`,
      metadata,
      client_reference_id: order.id,
    });

    const { error: updateError } = await admin
      .from('orders')
      .update({ payment_intent_id: session.id })
      .eq('id', order.id);
    if (updateError) throw updateError;

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Stripe session error:', error);
    return NextResponse.json({ error: 'Unable to create checkout session.' }, { status: 500 });
  }
}
