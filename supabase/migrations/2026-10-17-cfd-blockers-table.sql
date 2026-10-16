BEGIN;

CREATE TABLE IF NOT EXISTS public.cfd_blockers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 160),
  profile_image_url TEXT NOT NULL DEFAULT '' CHECK (char_length(profile_image_url) <= 2048),
  video_url TEXT NOT NULL DEFAULT '' CHECK (char_length(video_url) <= 2048),
  description TEXT NOT NULL CHECK (char_length(btrim(description)) BETWEEN 1 AND 5000),
  affiliate_url TEXT NOT NULL DEFAULT '' CHECK (char_length(affiliate_url) <= 2048),
  published BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cfd_blockers_public_order
  ON public.cfd_blockers (published, sort_order, created_at DESC);

ALTER TABLE public.cfd_blockers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published CFD Blockers" ON public.cfd_blockers;
CREATE POLICY "Public can view published CFD Blockers" ON public.cfd_blockers
  FOR SELECT TO anon, authenticated
  USING (published = TRUE);

DROP POLICY IF EXISTS "Admins can view all CFD Blockers" ON public.cfd_blockers;
CREATE POLICY "Admins can view all CFD Blockers" ON public.cfd_blockers
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage CFD Blockers" ON public.cfd_blockers;
CREATE POLICY "Admins can manage CFD Blockers" ON public.cfd_blockers
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT ON public.cfd_blockers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cfd_blockers TO authenticated;

COMMIT;
