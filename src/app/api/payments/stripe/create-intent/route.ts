import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'PaymentIntents are disabled. Use the verified Stripe Checkout flow.' },
    { status: 503 },
  );
}
