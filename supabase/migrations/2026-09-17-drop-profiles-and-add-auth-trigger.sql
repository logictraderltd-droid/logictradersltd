-- Migration: Drop legacy public.profiles and ensure new auth users create rows in public.users
-- Run this in your Supabase project's SQL editor (production DB).

BEGIN;

-- 1) Drop legacy profiles table and all its content
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2) Create a security-definer function to insert auth users into public.users
--    This ensures future signups (via Supabase Auth) create a public.users row
--    with role = 'customer' (non-admin).
CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS trigger AS $$
BEGIN
  -- Insert into public.users only if a row for this id doesn't already exist
  INSERT INTO public.users (id, email, role, created_at, updated_at)
  VALUES (NEW.id, NEW.email, 'customer', COALESCE(NEW.created_at, NOW()), NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) Attach trigger to auth.users (safe to re-create with IF EXISTS/IF NOT EXISTS semantics)
DROP TRIGGER IF EXISTS auth_user_created ON auth.users;
CREATE TRIGGER auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_auth_user_created();

COMMIT;
