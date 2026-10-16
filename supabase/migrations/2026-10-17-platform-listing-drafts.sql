BEGIN;

CREATE TABLE IF NOT EXISTS public.platform_listing_drafts (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL
    CHECK (section_key IN ('cfd_blocker_content', 'pro_firm_listings', 'copy_trading_content')),
  listing_id TEXT NOT NULL,
  value JSONB NOT NULL CHECK (jsonb_typeof(value) = 'object'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, section_key, listing_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_listing_drafts_updated
  ON public.platform_listing_drafts (user_id, section_key, updated_at DESC);

ALTER TABLE public.platform_listing_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage their platform listing drafts"
  ON public.platform_listing_drafts;
CREATE POLICY "Admins can manage their platform listing drafts"
  ON public.platform_listing_drafts
  FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.is_admin())
  WITH CHECK (user_id = auth.uid() AND public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_listing_drafts TO authenticated;

COMMIT;
