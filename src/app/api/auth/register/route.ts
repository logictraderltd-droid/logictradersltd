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

    // Upsert user record in users table (avoid duplicate errors)
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: email,
        role: 'customer',
      }, { onConflict: 'id' });

    if (userError) {
      console.error('Error upserting user record:', userError);
      return NextResponse.json(
        { error: 'Failed to create or update user record' },
        { status: 500 }
      );
    }

    // Save profile fields on the users table
    try {
      const { data: updatedUser, error: updateErr } = await supabase
        .from('users')
        .update({ first_name: firstName || '', last_name: lastName || '' })
        .eq('id', userId)
        .select('id')
        .single();

      if (updateErr) {
        console.error('Error updating users table with profile fields:', updateErr);
      }
    } catch (err: any) {
      console.error('Unexpected error updating users with profile fields:', err);
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
