BEGIN;

-- Orders are created by trusted server routes, never directly by customers.
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;

CREATE TABLE IF NOT EXISTS public.manual_payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL UNIQUE,
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  method TEXT NOT NULL CHECK (method IN ('mobile_money', 'binance')),
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL CHECK (currency IN ('RWF', 'USDT')),
  display_amount_minor INTEGER NOT NULL CHECK (display_amount_minor > 0),
  display_currency TEXT NOT NULL CHECK (display_currency IN ('USD', 'RWF', 'USDT')),
  original_amount_cents INTEGER NOT NULL CHECK (original_amount_cents > 0),
  original_currency TEXT NOT NULL CHECK (original_currency = 'USD'),
  exchange_rate NUMERIC(24, 12) NOT NULL CHECK (exchange_rate > 0),
  rate_source TEXT NOT NULL CHECK (rate_source IN ('ExchangeRate-API', 'CoinGecko')),
  rate_as_of TIMESTAMPTZ NOT NULL,
  quote_issued_at TIMESTAMPTZ NOT NULL,
  quote_expires_at TIMESTAMPTZ NOT NULL CHECK (quote_expires_at > quote_issued_at),
  full_name TEXT NOT NULL,
  sender_phone TEXT,
  customer_binance_id TEXT,
  transaction_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verifying', 'paid', 'rejected')),
  verification_started_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT manual_payment_method_currency_contact_check CHECK (
    (method = 'mobile_money' AND currency = 'RWF' AND sender_phone IS NOT NULL AND customer_binance_id IS NULL)
    OR
    (method = 'binance' AND currency = 'USDT' AND customer_binance_id IS NOT NULL AND sender_phone IS NULL)
  ),
  CONSTRAINT manual_payment_display_currency_check CHECK (
    (method = 'mobile_money' AND display_currency IN ('USD', 'RWF'))
    OR
    (method = 'binance' AND display_currency IN ('USD', 'USDT'))
  ),
  CONSTRAINT manual_payment_rate_source_check CHECK (
    (method = 'mobile_money' AND rate_source = 'ExchangeRate-API')
    OR
    (method = 'binance' AND rate_source = 'CoinGecko')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_manual_payment_requests_active_product
  ON public.manual_payment_requests (user_id, product_id)
  WHERE status IN ('pending', 'verifying');
CREATE INDEX IF NOT EXISTS idx_manual_payment_requests_status_created
  ON public.manual_payment_requests (status, created_at DESC);

ALTER TABLE public.manual_payment_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own manual payment requests" ON public.manual_payment_requests;
DROP POLICY IF EXISTS "Admins can view manual payment requests" ON public.manual_payment_requests;
CREATE POLICY "Users can view own manual payment requests" ON public.manual_payment_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Admins can view manual payment requests" ON public.manual_payment_requests
  FOR SELECT TO authenticated
  USING (public.is_admin());

GRANT SELECT ON public.manual_payment_requests TO authenticated;

DROP TRIGGER IF EXISTS manual_payment_requests_updated_at
  ON public.manual_payment_requests;
CREATE TRIGGER manual_payment_requests_updated_at
  BEFORE UPDATE ON public.manual_payment_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMIT;
