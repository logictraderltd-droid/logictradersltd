import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: video, error: videoError } = await supabase
      .from('course_videos')
      .select('id, product_id, video_url')
      .eq('id', params.videoId)
      .maybeSingle();

    if (videoError || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const { data: access, error: accessError } = await supabase
      .from('user_access')
      .select('expires_at')
      .eq('user_id', user.id)
      .eq('product_id', video.product_id)
      .eq('is_active', true)
      .maybeSingle();

    if (accessError || !access) {
      return NextResponse.json({ error: 'Access denied. Please purchase this course first.' }, { status: 403 });
    }

    if (access.expires_at && new Date(access.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Your access to this content has expired.' }, { status: 403 });
    }

    if (!video.video_url) {
      return NextResponse.json({ error: 'Video URL is missing' }, { status: 404 });
    }

    return NextResponse.json({ url: video.video_url });
  } catch (error) {
    console.error('Error fetching course video:', error);
    return NextResponse.json({ error: 'Failed to load course video' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    const body = await request.json();
    const progressSeconds = Number(body.progressSeconds);

    if (!Number.isFinite(progressSeconds) || progressSeconds < 0) {
      return NextResponse.json({ error: 'Invalid video progress' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: video, error: videoError } = await supabase
      .from('course_videos')
      .select('product_id')
      .eq('id', params.videoId)
      .maybeSingle();

    if (videoError || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    const { data: access, error: accessError } = await supabase
      .from('user_access')
      .select('expires_at')
      .eq('user_id', user.id)
      .eq('product_id', video.product_id)
      .eq('is_active', true)
      .maybeSingle();

    if (accessError || !access || (access.expires_at && new Date(access.expires_at) < new Date())) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('video_progress')
      .upsert({
        user_id: user.id,
        lesson_id: params.videoId,
        progress_seconds: Math.floor(progressSeconds),
        completed: body.completed === true,
        last_watched_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating video progress:', error);
      return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error updating video progress:', error);
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}