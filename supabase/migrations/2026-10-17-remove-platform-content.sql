-- Remove Platform Content storage only. Other site content, including
-- products, marketing, orders, payments, and signal settings, is preserved.

BEGIN;

DROP FUNCTION IF EXISTS public.manage_platform_listing(TEXT, JSONB, BOOLEAN);

DROP TABLE IF EXISTS public.platform_listing_drafts;
DROP TABLE IF EXISTS public.platform_listings;

DELETE FROM public.site_content
WHERE key IN ('cfd_blocker_content', 'pro_firm_listings', 'copy_trading_content');

COMMIT;
