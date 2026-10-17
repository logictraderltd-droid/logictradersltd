import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Use the manual Mobile Money payment request flow for new purchases.' },
    { status: 410 },
  );
}
