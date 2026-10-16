BEGIN;

ALTER FUNCTION public.manage_platform_listing(TEXT, JSONB, BOOLEAN)
  SET lock_timeout = '5s';

ALTER FUNCTION public.manage_platform_listing(TEXT, JSONB, BOOLEAN)
  SET statement_timeout = '15s';

COMMIT;
