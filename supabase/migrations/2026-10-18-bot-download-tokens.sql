BEGIN;

CREATE TABLE IF NOT EXISTS public.download_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  download_count INTEGER NOT NULL DEFAULT 0,
  max_downloads INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT download_tokens_download_limits_check
    CHECK (download_count >= 0 AND max_downloads > 0)
);

ALTER TABLE public.download_tokens
  ADD COLUMN IF NOT EXISTS token TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS download_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_downloads INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.download_tokens
SET token = gen_random_uuid()::TEXT
WHERE token IS NULL;

ALTER TABLE public.download_tokens
  ALTER COLUMN token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_download_tokens_token
  ON public.download_tokens (token);
CREATE INDEX IF NOT EXISTS idx_download_tokens_user_product
  ON public.download_tokens (user_id, product_id);
CREATE INDEX IF NOT EXISTS idx_download_tokens_expires_at
  ON public.download_tokens (expires_at);

ALTER TABLE public.download_tokens ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.download_tokens TO service_role;

COMMIT;
