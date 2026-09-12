import { createAdminClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, email, firstName, lastName } = body;

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Create user record in users table
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: email,
        role: 'customer',
      });

    if (userError) {
      console.error('Error creating user record:', userError);
      return NextResponse.json(
        { error: 'Failed to create user record' },
        { status: 500 }
      );
    }

    // Create user profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        first_name: firstName || '',
        last_name: lastName || '',
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Don't fail if profile creation fails, user record is already created
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
