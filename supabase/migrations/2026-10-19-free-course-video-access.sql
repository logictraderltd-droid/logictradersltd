BEGIN;

ALTER TABLE public.course_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enrolled users can view course videos" ON public.course_videos;
CREATE POLICY "Enrolled users can view course videos" ON public.course_videos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.products
      WHERE products.id = course_videos.product_id
        AND products.is_active = true
        AND products.product_type = 'course'
        AND products.metadata->>'is_free' = 'true'
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_access
      WHERE user_access.user_id = auth.uid()
        AND user_access.product_id = course_videos.product_id
        AND user_access.is_active = true
        AND (user_access.expires_at IS NULL OR user_access.expires_at > NOW())
    )
  );

GRANT SELECT ON public.course_videos TO authenticated;

COMMIT;
