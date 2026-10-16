BEGIN;

CREATE OR REPLACE FUNCTION public.manage_platform_listing(
  p_key TEXT,
  p_listing JSONB,
  p_delete BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
SET lock_timeout = '5s'
SET statement_timeout = '15s'
AS $$
DECLARE
  current_items JSONB;
  next_items JSONB;
  listing_id TEXT;
  listing_exists BOOLEAN;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator access required'
      USING ERRCODE = '42501';
  END IF;

  IF p_key IS NULL OR p_key NOT IN ('cfd_blocker_content', 'pro_firm_listings', 'copy_trading_content') THEN
    RAISE EXCEPTION 'Unsupported platform content section'
      USING ERRCODE = '22023';
  END IF;

  IF p_listing IS NULL OR jsonb_typeof(p_listing) <> 'object' THEN
    RAISE EXCEPTION 'Listing data must be a JSON object'
      USING ERRCODE = '22023';
  END IF;

  listing_id := NULLIF(p_listing->>'id', '');
  IF listing_id IS NULL THEN
    RAISE EXCEPTION 'Listing ID is required'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_key, 0));

  INSERT INTO public.site_content (key, value)
  VALUES (p_key, jsonb_build_object('items', '[]'::JSONB))
  ON CONFLICT (key) DO NOTHING;

  SELECT CASE
      WHEN jsonb_typeof(value->'items') = 'array' THEN value->'items'
      ELSE '[]'::JSONB
    END
  INTO current_items
  FROM public.site_content
  WHERE key = p_key
  FOR UPDATE;

  SELECT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(current_items) AS listing(item)
    WHERE item->>'id' = listing_id
  )
  INTO listing_exists;

  IF p_delete THEN
    SELECT COALESCE(
      jsonb_agg(
        jsonb_set(ordered.item, '{sort_order}', to_jsonb(ordered.position - 1), TRUE)
        ORDER BY ordered.position
      ),
      '[]'::JSONB
    )
    INTO next_items
    FROM (
      SELECT item, ROW_NUMBER() OVER (ORDER BY ordinal) AS position
      FROM jsonb_array_elements(current_items) WITH ORDINALITY AS listing(item, ordinal)
      WHERE item->>'id' IS DISTINCT FROM listing_id
    ) AS ordered;
  ELSIF listing_exists THEN
    SELECT COALESCE(
      jsonb_agg(
        jsonb_set(
          ordered.item,
          '{sort_order}',
          to_jsonb(ordered.position - 1),
          TRUE
        )
        ORDER BY ordered.position
      ),
      '[]'::JSONB
    )
    INTO next_items
    FROM (
      SELECT
        replacement.item,
        ROW_NUMBER() OVER (ORDER BY sort_value.requested_order, listing.ordinal) AS position
      FROM jsonb_array_elements(current_items) WITH ORDINALITY AS listing(item, ordinal)
      CROSS JOIN LATERAL (
        SELECT CASE
          WHEN listing.item->>'id' = listing_id
            AND COALESCE(p_listing->>'sort_order', '') ~ '^-?[0-9]{1,9}$'
            THEN (p_listing->>'sort_order')::INTEGER
          WHEN COALESCE(listing.item->>'sort_order', '') ~ '^-?[0-9]{1,9}$'
            THEN (listing.item->>'sort_order')::INTEGER
          ELSE listing.ordinal::INTEGER - 1
        END AS requested_order
      ) AS sort_value
      CROSS JOIN LATERAL (
        SELECT CASE WHEN listing.item->>'id' = listing_id THEN p_listing ELSE listing.item END AS item
      ) AS replacement
    ) AS ordered;
  ELSE
    SELECT
      jsonb_build_array(jsonb_set(p_listing, '{sort_order}', '0'::JSONB, TRUE))
      || COALESCE(
        jsonb_agg(
          jsonb_set(item, '{sort_order}', to_jsonb(ordinal), TRUE)
          ORDER BY ordinal
        ),
        '[]'::JSONB
      )
    INTO next_items
    FROM jsonb_array_elements(current_items) WITH ORDINALITY AS listing(item, ordinal);
  END IF;

  UPDATE public.site_content
  SET value = jsonb_set(COALESCE(value, '{}'::JSONB), '{items}', next_items, TRUE),
      updated_at = NOW()
  WHERE key = p_key;

  RETURN next_items;
END;
$$;

REVOKE ALL ON FUNCTION public.manage_platform_listing(TEXT, JSONB, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_platform_listing(TEXT, JSONB, BOOLEAN) TO authenticated;

COMMIT;
