ALTER TABLE public.bot_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage bot links" ON public.bot_links;
DROP POLICY IF EXISTS "Users with bot access can view bot links" ON public.bot_links;
DROP POLICY IF EXISTS "Admins can manage signals" ON public.signals;
DROP POLICY IF EXISTS "Signal subscribers can view signals" ON public.signals;

CREATE POLICY "Admins can manage bot links" ON public.bot_links
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users with bot access can view bot links" ON public.bot_links
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_access
      JOIN public.products ON products.id = user_access.product_id
      WHERE user_access.user_id = auth.uid()
        AND user_access.product_id = bot_links.product_id
        AND products.product_type = 'bot'
        AND user_access.is_active = true
        AND (user_access.expires_at IS NULL OR user_access.expires_at > NOW())
    )
  );

CREATE POLICY "Admins can manage signals" ON public.signals
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Signal subscribers can view signals" ON public.signals
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.user_access
      JOIN public.products ON products.id = user_access.product_id
      WHERE user_access.user_id = auth.uid()
        AND products.product_type = 'signal'
        AND user_access.is_active = true
        AND (user_access.expires_at IS NULL OR user_access.expires_at > NOW())
    )
  );