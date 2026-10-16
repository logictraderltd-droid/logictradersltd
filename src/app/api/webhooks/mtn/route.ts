import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'MTN Mobile Money webhook processing is not configured yet.' },
    { status: 503 },
  );
}
