import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'MTN Mobile Money checkout is not configured yet. Please use Stripe Checkout.' },
    { status: 503 },
  );
}
