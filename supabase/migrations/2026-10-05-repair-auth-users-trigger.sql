BEGIN;

-- Remove stale auth triggers whose function still writes to a profiles table.
DO $$
DECLARE
  stale_trigger RECORD;
BEGIN
  FOR stale_trigger IN
    SELECT trigger_row.tgname
    FROM pg_trigger AS trigger_row
    JOIN pg_proc AS trigger_function ON trigger_function.oid = trigger_row.tgfoid
    WHERE trigger_row.tgrelid = 'auth.users'::regclass
      AND NOT trigger_row.tgisinternal
      AND POSITION('profiles' IN LOWER(trigger_function.prosrc)) > 0
  LOOP
    EXECUTE FORMAT('DROP TRIGGER %I ON auth.users', stale_trigger.tgname);
  END LOOP;
END;
$$;

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