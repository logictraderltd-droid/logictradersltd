BEGIN;

CREATE TABLE IF NOT EXISTS public.platform_listings (
  section_key TEXT NOT NULL
    CHECK (section_key IN ('cfd_blocker_content', 'pro_firm_listings', 'copy_trading_content')),
  id TEXT NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  video_url TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  affiliate_url TEXT NOT NULL DEFAULT '',
  published BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (section_key, id)
);

CREATE INDEX IF NOT EXISTS idx_platform_listings_public_order
  ON public.platform_listings (section_key, published, sort_order, created_at DESC);

ALTER TABLE public.platform_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published platform listings" ON public.platform_listings;
CREATE POLICY "Public can view published platform listings" ON public.platform_listings
  FOR SELECT TO anon, authenticated
  USING (published = TRUE);

DROP POLICY IF EXISTS "Admins can view all platform listings" ON public.platform_listings;
CREATE POLICY "Admins can view all platform listings" ON public.platform_listings
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage platform listings" ON public.platform_listings;
CREATE POLICY "Admins can manage platform listings" ON public.platform_listings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT ON public.platform_listings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.platform_listings TO authenticated;

INSERT INTO public.platform_listings (
  section_key,
  id,
  title,
  image_url,
  video_url,
  description,
  affiliate_url,
  published,
  sort_order,
  created_at,
  updated_at
)
SELECT
  content.key,
  COALESCE(NULLIF(listing.item->>'id', ''), gen_random_uuid()::TEXT),
  COALESCE(NULLIF(listing.item->>'title', ''), 'Untitled listing'),
  COALESCE(listing.item->>'image_url', ''),
  COALESCE(listing.item->>'video_url', ''),
  COALESCE(listing.item->>'description', ''),
  COALESCE(listing.item->>'affiliate_url', ''),
  CASE
    WHEN LOWER(listing.item->>'published') IN ('true', 'false')
      THEN (listing.item->>'published')::BOOLEAN
    ELSE TRUE
  END,
  CASE
    WHEN COALESCE(listing.item->>'sort_order', '') ~ '^-?[0-9]{1,9}$'
      THEN (listing.item->>'sort_order')::INTEGER
    ELSE listing.ordinal::INTEGER - 1
  END,
  COALESCE(content.updated_at, NOW()),
  COALESCE(content.updated_at, NOW())
FROM public.site_content AS content
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(content.value->'items') = 'array' THEN content.value->'items'
    ELSE '[]'::JSONB
  END
) WITH ORDINALITY AS listing(item, ordinal)
WHERE content.key IN ('cfd_blocker_content', 'pro_firm_listings', 'copy_trading_content')
  AND jsonb_typeof(listing.item) = 'object'
ON CONFLICT (section_key, id) DO UPDATE
SET title = EXCLUDED.title,
    image_url = EXCLUDED.image_url,
    video_url = EXCLUDED.video_url,
    description = EXCLUDED.description,
    affiliate_url = EXCLUDED.affiliate_url,
    published = EXCLUDED.published,
    sort_order = EXCLUDED.sort_order,
    updated_at = EXCLUDED.updated_at;

COMMIT;
