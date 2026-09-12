import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const videoId = params.videoId;

    // Get user session
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get video details
    const { data: lesson, error: lessonError } = await supabase
      .from('course_lessons')
      .select(`
        *,
        products!course_lessons_course_id_fkey (
          id,
          name,
          type
        )
      `)
      .eq('id', videoId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    // Check if lesson is preview (accessible to everyone)
    if (lesson.is_preview) {
      return generateSignedUrl(lesson.cloudinary_public_id);
    }

    // Check user access to the course
    const { data: accessData, error: accessError } = await supabase
      .from('user_access')
      .select('*')
      .eq('user_id', user.id)
      .eq('product_id', lesson.products.id)
      .eq('is_active', true)
      .single();

    if (accessError || !accessData) {
      return NextResponse.json(
        { error: 'Access denied. Please purchase this course first.' },
        { status: 403 }
      );
    }

    // Check if access has expired
    if (accessData.access_expires_at) {
      const expiryDate = new Date(accessData.access_expires_at);
      if (expiryDate < new Date()) {
        return NextResponse.json(
          { error: 'Your access to this content has expired.' },
          { status: 403 }
        );
      }
    }

    // Generate signed URL for video
    return generateSignedUrl(lesson.cloudinary_public_id);

  } catch (error: any) {
    console.error('Error streaming video:', error);
    return NextResponse.json(
      { error: 'Failed to stream video' },
      { status: 500 }
    );
  }
}

function generateSignedUrl(publicId: string) {
  try {
    // Generate signed URL that expires in 1 hour
    const signedUrl = cloudinary.url(publicId, {
      resource_type: 'video',
      type: 'authenticated',
      sign_url: true,
      secure: true,
      expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    });

    return NextResponse.json({
      url: signedUrl,
      expiresIn: 3600,
    });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate video URL' },
      { status: 500 }
    );
  }
}

// Update video progress
export async function POST(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const videoId = params.videoId;
    const body = await request.json();
    const { progressSeconds, completed } = body;

    // Get user session
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify user has access to this video
    const { data: lesson } = await supabase
      .from('course_lessons')
      .select('course_id')
      .eq('id', videoId)
      .single();

    if (!lesson) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      );
    }

    const { data: accessData } = await supabase
      .from('user_access')
      .select('*')
      .eq('user_id', user.id)
      .eq('product_id', lesson.course_id)
      .eq('is_active', true)
      .single();

    if (!accessData) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Update or create progress record
    const { data, error } = await supabase
      .from('video_progress')
      .upsert({
        user_id: user.id,
        lesson_id: videoId,
        progress_seconds: progressSeconds,
        completed: completed || false,
        last_watched_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating progress:', error);
      return NextResponse.json(
        { error: 'Failed to update progress' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('Error updating video progress:', error);
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    );
  }
}
