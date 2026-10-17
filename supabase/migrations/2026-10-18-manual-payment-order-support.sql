BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS amount_cents INTEGER,
  ADD COLUMN IF NOT EXISTS product_type public.product_type,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'amount'
  ) THEN
    EXECUTE '
      UPDATE public.orders
      SET amount_cents = ROUND(amount * 100)::INTEGER
      WHERE amount_cents IS NULL AND amount IS NOT NULL
    ';
  END IF;
END;
$$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS amount NUMERIC(10, 2);

UPDATE public.orders
SET amount = amount_cents::NUMERIC / 100
WHERE amount IS NULL
  AND amount_cents IS NOT NULL;

UPDATE public.orders AS orders
SET product_type = products.product_type
FROM public.products AS products
WHERE products.id = orders.product_id
  AND orders.product_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_user_id
  ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status
  ON public.orders (status);

ALTER TABLE public.user_access
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_access'
      AND column_name = 'access_expires_at'
  ) THEN
    EXECUTE '
      UPDATE public.user_access
      SET expires_at = access_expires_at
      WHERE expires_at IS NULL
    ';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_access_user_product
  ON public.user_access (user_id, product_id);

CREATE TABLE IF NOT EXISTS public.platform_payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  provider_payment_id TEXT NOT NULL,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT platform_payment_transactions_provider_payment_key
    UNIQUE (provider, provider_payment_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_payment_transactions_order
  ON public.platform_payment_transactions (order_id);

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

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Admin can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Admins can manage orders" ON public.orders
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;

ALTER TABLE public.platform_payment_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view payment transactions"
  ON public.platform_payment_transactions;
CREATE POLICY "Admins can view payment transactions"
  ON public.platform_payment_transactions
  FOR SELECT TO authenticated
  USING (public.is_admin());

GRANT SELECT ON public.platform_payment_transactions TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
