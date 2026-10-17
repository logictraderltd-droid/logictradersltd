BEGIN;

ALTER TABLE public.bot_delivery_requests
  DROP CONSTRAINT IF EXISTS bot_delivery_requests_status_check;

ALTER TABLE public.bot_delivery_requests
  ADD CONSTRAINT bot_delivery_requests_status_check
  CHECK (status IN (
    'pending_payment',
    'payment_failed',
    'pending_delivery',
    'delivered',
    'received'
  ));

NOTIFY pgrst, 'reload schema';

COMMIT;
