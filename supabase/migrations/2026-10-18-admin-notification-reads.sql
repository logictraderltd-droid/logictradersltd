BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_notification_reads (
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  activity_key TEXT NOT NULL,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, activity_key)
);

ALTER TABLE public.admin_notification_reads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_notification_reads FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.admin_notification_reads TO service_role;

COMMIT;
