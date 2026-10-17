BEGIN;

CREATE TABLE IF NOT EXISTS public.platform_listings (
  section_key TEXT NOT NULL CHECK (
    section_key IN ('cfd_blocker_content', 'pro_firm_listings', 'copy_trading_content')
  ),
  id TEXT NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  video_url TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  affiliate_url TEXT NOT NULL DEFAULT '',
  published BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (section_key, id)
);

CREATE INDEX IF NOT EXISTS idx_platform_listings_section_published_order
  ON public.platform_listings (section_key, published, sort_order);

INSERT INTO public.platform_listings (
  section_key,
  id,
  title,
  image_url,
  video_url,
  description,
  affiliate_url,
  published,
  sort_order
)
SELECT
  content.key,
  COALESCE(NULLIF(item->>'id', ''), gen_random_uuid()::TEXT),
  COALESCE(item->>'title', ''),
  COALESCE(item->>'image_url', ''),
  COALESCE(item->>'video_url', ''),
  COALESCE(item->>'description', ''),
  COALESCE(item->>'affiliate_url', ''),
  CASE LOWER(COALESCE(item->>'published', 'false'))
    WHEN 'true' THEN TRUE
    WHEN 'false' THEN FALSE
    ELSE FALSE
  END,
  CASE
    WHEN COALESCE(item->>'sort_order', '') ~ '^-?[0-9]+$' THEN (item->>'sort_order')::INTEGER
    ELSE 0
  END
FROM public.site_content AS content
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(content.value->'items') = 'array' THEN content.value->'items'
    ELSE '[]'::JSONB
  END
) AS item
WHERE content.key IN ('cfd_blocker_content', 'pro_firm_listings', 'copy_trading_content')
ON CONFLICT (section_key, id) DO NOTHING;

ALTER TABLE public.platform_listings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published platform listings" ON public.platform_listings;
CREATE POLICY "Public can view published platform listings"
  ON public.platform_listings
  FOR SELECT TO anon, authenticated
  USING (published = TRUE);

DROP POLICY IF EXISTS "Admins can manage platform listings" ON public.platform_listings;
CREATE POLICY "Admins can manage platform listings"
  ON public.platform_listings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT ON public.platform_listings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.platform_listings TO authenticated;

DROP TRIGGER IF EXISTS platform_listings_updated_at ON public.platform_listings;
CREATE TRIGGER platform_listings_updated_at
  BEFORE UPDATE ON public.platform_listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
