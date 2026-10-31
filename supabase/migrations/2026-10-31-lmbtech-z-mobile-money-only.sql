BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.lmbtech_payment_requests'::regclass
      AND conname = 'lmbtech_payment_requests_momo_only_check'
  ) THEN
    ALTER TABLE public.lmbtech_payment_requests
      ADD CONSTRAINT lmbtech_payment_requests_momo_only_check
      CHECK (payment_method = 'MTN_MOMO_RWA' OR status <> 'pending') NOT VALID;
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
