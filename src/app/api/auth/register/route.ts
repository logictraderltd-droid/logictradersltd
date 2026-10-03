import { createAdminClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, email } = body;
    const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Upsert user record in users table (avoid duplicate errors)
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: email,
        full_name: fullName,
      }, { onConflict: 'id' });

    if (userError) {
      console.error('Error upserting user record:', userError);
      return NextResponse.json(
        { error: 'Failed to create or update user record' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Registration API error:', error);
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 500 }
    );
  }
}
