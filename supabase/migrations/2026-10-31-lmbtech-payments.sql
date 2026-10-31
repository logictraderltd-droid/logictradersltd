BEGIN;

CREATE TABLE IF NOT EXISTS public.lmbtech_payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id TEXT NOT NULL UNIQUE,
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('MTN_MOMO_RWA', 'card')),
  amount_rwf INTEGER NOT NULL CHECK (amount_rwf > 0),
  original_amount_cents INTEGER NOT NULL CHECK (original_amount_cents > 0),
  exchange_rate NUMERIC(24, 12) NOT NULL CHECK (exchange_rate > 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed', 'cancelled')),
  gateway_transaction_id TEXT,
  redirect_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_lmbtech_payment_requests_active_product
  ON public.lmbtech_payment_requests (user_id, product_id)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_lmbtech_payment_requests_status_created
  ON public.lmbtech_payment_requests (status, created_at DESC);

ALTER TABLE public.lmbtech_payment_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own LMBTech payment requests"
  ON public.lmbtech_payment_requests;
CREATE POLICY "Users can view own LMBTech payment requests"
  ON public.lmbtech_payment_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Admins can view LMBTech payment requests"
  ON public.lmbtech_payment_requests;
CREATE POLICY "Admins can view LMBTech payment requests"
  ON public.lmbtech_payment_requests
  FOR SELECT TO authenticated
  USING (public.is_admin());
GRANT SELECT ON public.lmbtech_payment_requests TO authenticated;

DROP TRIGGER IF EXISTS lmbtech_payment_requests_updated_at
  ON public.lmbtech_payment_requests;
CREATE TRIGGER lmbtech_payment_requests_updated_at
  BEFORE UPDATE ON public.lmbtech_payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.lmbtech_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id TEXT NOT NULL UNIQUE,
  initiated_by UUID NOT NULL REFERENCES auth.users(id),
  recipient_email TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  payer_phone TEXT NOT NULL,
  amount_rwf INTEGER NOT NULL CHECK (amount_rwf > 0),
  service_paid TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'success', 'failed', 'cancelled')),
  gateway_transaction_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lmbtech_payouts_status_created
  ON public.lmbtech_payouts (status, created_at DESC);
ALTER TABLE public.lmbtech_payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view LMBTech payouts" ON public.lmbtech_payouts;
CREATE POLICY "Admins can view LMBTech payouts"
  ON public.lmbtech_payouts
  FOR SELECT TO authenticated
  USING (public.is_admin());
GRANT SELECT ON public.lmbtech_payouts TO authenticated;

DROP TRIGGER IF EXISTS lmbtech_payouts_updated_at ON public.lmbtech_payouts;
CREATE TRIGGER lmbtech_payouts_updated_at
  BEFORE UPDATE ON public.lmbtech_payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

NOTIFY pgrst, 'reload schema';

COMMIT;
