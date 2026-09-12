-- Run this in Supabase SQL Editor.
-- The SQL editor can see the row, but the browser cannot because of RLS.

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Admin can view all users" ON public.users;
DROP POLICY IF EXISTS "Admin can manage all users" ON public.users;

CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admin can view all users" ON public.users
  FOR SELECT
  USING (public.is_admin_user());

CREATE POLICY "Admin can manage all users" ON public.users
  FOR ALL
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- Verify the policies and the current admin row.
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'users';

SELECT id, email, role
FROM public.users
WHERE email = 'hackerityearone@gmail.com';
