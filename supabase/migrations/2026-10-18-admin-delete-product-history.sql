BEGIN;

CREATE OR REPLACE FUNCTION public.admin_delete_product_and_history(target_product_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  deleted_product_id UUID;
BEGIN
  IF target_product_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF to_regclass('public.user_access') IS NOT NULL THEN
    DELETE FROM public.user_access WHERE product_id = target_product_id;
  END IF;

  IF to_regclass('public.subscriptions') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'product_id'
    ) THEN
      EXECUTE 'DELETE FROM public.subscriptions WHERE product_id = $1' USING target_product_id;
    END IF;
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'plan_id'
    ) THEN
      EXECUTE 'DELETE FROM public.subscriptions WHERE plan_id = $1' USING target_product_id;
    END IF;
  END IF;

  IF to_regclass('public.manual_payment_requests') IS NOT NULL THEN
    DELETE FROM public.manual_payment_requests WHERE product_id = target_product_id;
  END IF;

  IF to_regclass('public.orders') IS NOT NULL THEN
    DELETE FROM public.orders WHERE product_id = target_product_id;
  END IF;

  DELETE FROM public.products
  WHERE id = target_product_id
  RETURNING id INTO deleted_product_id;

  RETURN deleted_product_id IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_product_and_history(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_product_and_history(UUID) TO service_role;

COMMIT;
