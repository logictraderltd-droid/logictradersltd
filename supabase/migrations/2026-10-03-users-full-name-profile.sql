BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS full_name TEXT;

UPDATE public.users AS user_row
SET full_name = COALESCE(
  NULLIF(BTRIM(auth_user.raw_user_meta_data->>'full_name'), ''),
  NULLIF(BTRIM(auth_user.raw_user_meta_data->>'name'), ''),
  NULLIF(BTRIM(CONCAT_WS(
    ' ',
    NULLIF(auth_user.raw_user_meta_data->>'first_name', ''),
    NULLIF(auth_user.raw_user_meta_data->>'last_name', '')
  )), '')
)
FROM auth.users AS auth_user
WHERE auth_user.id = user_row.id
  AND (user_row.full_name IS NULL OR BTRIM(user_row.full_name) = '');

CREATE OR REPLACE FUNCTION public.handle_auth_user_created()
RETURNS trigger AS $$
DECLARE
  resolved_full_name TEXT;
BEGIN
  resolved_full_name := COALESCE(
    NULLIF(BTRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(BTRIM(NEW.raw_user_meta_data->>'name'), ''),
    NULLIF(BTRIM(CONCAT_WS(
      ' ',
      NULLIF(NEW.raw_user_meta_data->>'first_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'last_name', '')
    )), '')
  );

  INSERT INTO public.users AS existing_user (id, email, role, full_name, created_at, updated_at)
  VALUES (NEW.id, NEW.email, 'customer', resolved_full_name, COALESCE(NEW.created_at, NOW()), NOW())
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = COALESCE(NULLIF(existing_user.full_name, ''), EXCLUDED.full_name),
      updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS auth_user_created ON auth.users;
CREATE TRIGGER auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_auth_user_created();

COMMIT;