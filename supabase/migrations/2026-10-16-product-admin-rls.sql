BEGIN;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

ALTER TABLE public.signal_plans
  ADD COLUMN IF NOT EXISTS duration_days INTEGER NOT NULL DEFAULT 30;

DROP POLICY IF EXISTS "Admin can manage products" ON public.products;
CREATE POLICY "Admin can manage products" ON public.products
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

DO $$
BEGIN
  IF to_regclass('public.trading_bots') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admin can manage trading bots" ON public.trading_bots';
    EXECUTE 'CREATE POLICY "Admin can manage trading bots" ON public.trading_bots
      FOR ALL USING (public.is_admin())
      WITH CHECK (public.is_admin())';
  END IF;
END;
$$;

COMMIT;
