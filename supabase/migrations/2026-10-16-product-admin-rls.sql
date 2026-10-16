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

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
CREATE POLICY "Anyone can view active products" ON public.products
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

ALTER TABLE public.signal_plans
  ADD COLUMN IF NOT EXISTS duration_days INTEGER NOT NULL DEFAULT 30;
ALTER TABLE public.signal_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage signal plans" ON public.signal_plans;
CREATE POLICY "Admins can manage signal plans" ON public.signal_plans
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin can manage products" ON public.products;
CREATE POLICY "Admin can manage products" ON public.products
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DO $$
DECLARE
  target RECORD;
BEGIN
  FOR target IN
    SELECT *
    FROM (VALUES
      ('trading_bots', 'Admins can manage trading bots'),
      ('bot_links', 'Admins can manage bot links'),
      ('course_videos', 'Admins can manage course videos')
    ) AS targets(table_name, policy_name)
  LOOP
    IF to_regclass('public.' || target.table_name) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target.table_name);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', target.policy_name, target.table_name);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())',
        target.policy_name,
        target.table_name
      );
    END IF;
  END LOOP;
END;
$$;

COMMIT;
