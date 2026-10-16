-- Forward-only migration for the existing LOGICTRADERSLTD Supabase schema.
-- This assumes the supplied products.product_type / products.price_cents schema
-- and the existing users, products, orders, subscriptions, user_access,
-- signal_plans, signals, bot_links, course_videos, and site_content tables.
-- Do not run supabase/schema.sql against an existing project.

BEGIN;

-- The application records successful Stripe orders as "completed".
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE public.payment_status ADD VALUE IF NOT EXISTS 'failed';

-- Product catalog compatibility.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';

-- Orders are created by the server after authenticating the customer. Payment
-- fulfillment uses these persisted values and a verified Stripe webhook.
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
      WHERE amount_cents IS NULL
    ';
  END IF;
END;
$$;

UPDATE public.orders AS orders
SET product_type = products.product_type
FROM public.products AS products
WHERE orders.product_id = products.id
  AND orders.product_type IS NULL;

ALTER TABLE public.orders
  ALTER COLUMN product_type SET NOT NULL,
  ALTER COLUMN amount_cents SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_user_id
  ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status
  ON public.orders (status);

-- Signal plans are one-time purchases with access expiry, not recurring Stripe
-- subscriptions. Keep the duration on the plan and the actual expiry per user.
ALTER TABLE public.signal_plans
  ADD COLUMN IF NOT EXISTS duration_days INTEGER NOT NULL DEFAULT 30;

UPDATE public.signal_plans AS plans
SET duration_days = (products.metadata->>'duration_days')::INTEGER
FROM public.products
WHERE products.id = plans.product_id
  AND products.metadata->>'duration_days' IN ('30', '365');

ALTER TABLE public.signal_plans
  DROP CONSTRAINT IF EXISTS signal_plans_duration_days_check;
ALTER TABLE public.signal_plans
  ADD CONSTRAINT signal_plans_duration_days_check
  CHECK (duration_days IN (30, 365));

ALTER TABLE public.signals
  ADD COLUMN IF NOT EXISTS plan_id UUID
    REFERENCES public.products(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_signals_plan_id
  ON public.signals (plan_id);

ALTER TABLE public.user_access
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX IF NOT EXISTS idx_user_access_user_product_active
  ON public.user_access (user_id, product_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_access_expires_at
  ON public.user_access (expires_at);

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS order_id UUID
    REFERENCES public.orders(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_order_id
  ON public.subscriptions (order_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status_ends_at
  ON public.subscriptions (user_id, status, ends_at);

-- Old bot entries may have delivery values in product metadata. Move them into
-- bot_links, whose rows can be protected independently by RLS.
ALTER TABLE public.bot_links
  ALTER COLUMN link_url DROP NOT NULL;

UPDATE public.bot_links AS links
SET link_url = COALESCE(
      links.link_url,
      NULLIF(products.metadata->>'visit_url', ''),
      NULLIF(products.metadata->>'download_url', '')
    ),
    download_url = COALESCE(
      links.download_url,
      NULLIF(products.metadata->>'download_url', '')
    ),
    instructions = COALESCE(
      links.instructions,
      NULLIF(products.metadata->>'instructions', '')
    )
FROM public.products
WHERE products.id = links.product_id
  AND products.product_type = 'bot';

INSERT INTO public.bot_links (product_id, link_url, download_url, instructions)
SELECT products.id,
       COALESCE(
         NULLIF(products.metadata->>'visit_url', ''),
         NULLIF(products.metadata->>'download_url', '')
       ),
       NULLIF(products.metadata->>'download_url', ''),
       NULLIF(products.metadata->>'instructions', '')
FROM public.products
WHERE products.product_type = 'bot'
  AND (
    NULLIF(products.metadata->>'visit_url', '') IS NOT NULL
    OR NULLIF(products.metadata->>'download_url', '') IS NOT NULL
    OR NULLIF(products.metadata->>'instructions', '') IS NOT NULL
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.bot_links
    WHERE bot_links.product_id = products.id
  );

UPDATE public.products
SET metadata = COALESCE(metadata, '{}'::jsonb)
  - 'visit_url'
  - 'download_url'
  - 'instructions'
WHERE product_type = 'bot'
  AND COALESCE(metadata, '{}'::jsonb)
      ?| ARRAY['visit_url', 'download_url', 'instructions'];

-- Private VIP Telegram destination. Public/community Telegram URL remains in
-- site_content under signal_community_settings.
CREATE TABLE IF NOT EXISTS public.platform_private_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.platform_private_settings (key, value)
SELECT 'signal_vip_telegram', jsonb_build_object('url', value->>'vip_url')
FROM public.site_content
WHERE key = 'signal_community_settings'
  AND NULLIF(value->>'vip_url', '') IS NOT NULL
ON CONFLICT (key) DO NOTHING;

UPDATE public.site_content
SET value = value - 'vip_url'
WHERE key = 'signal_community_settings'
  AND value ? 'vip_url';

-- Stripe webhook idempotency and audit records.
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

-- Manual bot delivery requests are collected at checkout and become deliverable
-- only when the Stripe webhook confirms payment.
CREATE TABLE IF NOT EXISTS public.bot_delivery_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  mt5_account_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'payment_failed', 'pending_delivery', 'delivered')),
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bot_delivery_requests
  DROP CONSTRAINT IF EXISTS bot_delivery_requests_status_check;
ALTER TABLE public.bot_delivery_requests
  ADD CONSTRAINT bot_delivery_requests_status_check
  CHECK (status IN ('pending_payment', 'payment_failed', 'pending_delivery', 'delivered'));

CREATE INDEX IF NOT EXISTS idx_bot_delivery_requests_status
  ON public.bot_delivery_requests (status, created_at DESC);

-- SECURITY DEFINER avoids recursive RLS when policies check the admin role.
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

-- Catalog is readable publicly only for active products; write access belongs
-- exclusively to authenticated admins.
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Admin can manage products" ON public.products;
DROP POLICY IF EXISTS "Admins can view all products" ON public.products;
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Anyone can view active products" ON public.products
  FOR SELECT TO anon, authenticated
  USING (is_active = TRUE);
CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin-only product child writes; customers receive only content protected by
-- their authenticated, active entitlement.
ALTER TABLE public.signal_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view active signal plans" ON public.signal_plans;
DROP POLICY IF EXISTS "Admins can manage signal plans" ON public.signal_plans;
CREATE POLICY "Public can view active signal plans" ON public.signal_plans
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.products
      WHERE products.id = signal_plans.product_id
        AND products.is_active = TRUE
    )
  );
CREATE POLICY "Admins can manage signal plans" ON public.signal_plans
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Subscribers can view signals" ON public.signals;
DROP POLICY IF EXISTS "Signal subscribers can view signals" ON public.signals;
DROP POLICY IF EXISTS "Admins can manage signals" ON public.signals;
DROP POLICY IF EXISTS "Admin can manage signals" ON public.signals;
CREATE POLICY "Signal subscribers can view signals" ON public.signals
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.user_access
      WHERE user_access.user_id = auth.uid()
        AND user_access.product_id = signals.plan_id
        AND user_access.is_active = TRUE
        AND (user_access.expires_at IS NULL OR user_access.expires_at > NOW())
    )
  );
CREATE POLICY "Admins can manage signals" ON public.signals
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

ALTER TABLE public.user_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own access" ON public.user_access;
DROP POLICY IF EXISTS "Admin can manage access" ON public.user_access;
DROP POLICY IF EXISTS "Users can view own user access" ON public.user_access;
DROP POLICY IF EXISTS "Admins can manage user access" ON public.user_access;
CREATE POLICY "Users can view own user access" ON public.user_access
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Admins can manage user access" ON public.user_access
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admin can view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Admins can manage subscriptions" ON public.subscriptions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

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

ALTER TABLE public.course_videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage course videos" ON public.course_videos;
DROP POLICY IF EXISTS "Enrolled users can view course videos" ON public.course_videos;
CREATE POLICY "Admins can manage course videos" ON public.course_videos
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY "Enrolled users can view course videos" ON public.course_videos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.products
      WHERE products.id = course_videos.product_id
        AND products.is_active = TRUE
        AND products.product_type = 'course'
        AND products.metadata->>'is_free' = 'true'
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_access
      WHERE user_access.user_id = auth.uid()
        AND user_access.product_id = course_videos.product_id
        AND user_access.is_active = TRUE
        AND (user_access.expires_at IS NULL OR user_access.expires_at > NOW())
    )
  );

ALTER TABLE public.bot_links
  ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage bot links" ON public.bot_links;
DROP POLICY IF EXISTS "Users with bot access can view bot links" ON public.bot_links;
CREATE POLICY "Admins can manage bot links" ON public.bot_links
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
CREATE POLICY "Users with bot access can view bot links" ON public.bot_links
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_access
      WHERE user_access.user_id = auth.uid()
        AND user_access.product_id = bot_links.product_id
        AND user_access.is_active = TRUE
        AND (user_access.expires_at IS NULL OR user_access.expires_at > NOW())
    )
  );

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read site content" ON public.site_content;
DROP POLICY IF EXISTS "Admin can manage site content" ON public.site_content;
DROP POLICY IF EXISTS "Admins can manage site content" ON public.site_content;
CREATE POLICY "Public can read site content" ON public.site_content
  FOR SELECT TO anon, authenticated
  USING (TRUE);
CREATE POLICY "Admins can manage site content" ON public.site_content
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

ALTER TABLE public.platform_private_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage private platform settings" ON public.platform_private_settings;
CREATE POLICY "Admins can manage private platform settings" ON public.platform_private_settings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

ALTER TABLE public.platform_payment_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view payment transactions" ON public.platform_payment_transactions;
CREATE POLICY "Admins can view payment transactions" ON public.platform_payment_transactions
  FOR SELECT TO authenticated
  USING (public.is_admin());

ALTER TABLE public.bot_delivery_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own bot delivery requests" ON public.bot_delivery_requests;
DROP POLICY IF EXISTS "Admins can manage bot delivery requests" ON public.bot_delivery_requests;
DROP POLICY IF EXISTS "Users can create own bot delivery requests" ON public.bot_delivery_requests;
CREATE POLICY "Users can view own bot delivery requests" ON public.bot_delivery_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Admins can manage bot delivery requests" ON public.bot_delivery_requests
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Supabase table grants complement the RLS policies above.
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT ON public.signal_plans TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.signal_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.signals TO authenticated;
GRANT SELECT ON public.user_access TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_access TO authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT SELECT ON public.orders TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_videos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_links TO authenticated;
GRANT SELECT ON public.site_content TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_content TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_private_settings TO authenticated;
GRANT SELECT ON public.platform_payment_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_delivery_requests TO authenticated;

DROP TRIGGER IF EXISTS platform_payment_transactions_updated_at
  ON public.platform_payment_transactions;
CREATE TRIGGER platform_payment_transactions_updated_at
  BEFORE UPDATE ON public.platform_payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS bot_delivery_requests_updated_at
  ON public.bot_delivery_requests;
CREATE TRIGGER bot_delivery_requests_updated_at
  BEFORE UPDATE ON public.bot_delivery_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
