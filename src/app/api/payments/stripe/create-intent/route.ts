import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Stripe payments are disabled for new purchases. Choose Mobile Money or Binance ID.' },
    { status: 410 },
  );
}
