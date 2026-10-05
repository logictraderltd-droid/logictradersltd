CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

ALTER TABLE public.course_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage course videos" ON public.course_videos;
DROP POLICY IF EXISTS "Enrolled users can view course videos" ON public.course_videos;

CREATE POLICY "Admins can manage course videos" ON public.course_videos
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Enrolled users can view course videos" ON public.course_videos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_access
      WHERE user_access.user_id = auth.uid()
        AND user_access.product_id = course_videos.product_id
        AND user_access.is_active = true
        AND (user_access.expires_at IS NULL OR user_access.expires_at > NOW())
    )
  );