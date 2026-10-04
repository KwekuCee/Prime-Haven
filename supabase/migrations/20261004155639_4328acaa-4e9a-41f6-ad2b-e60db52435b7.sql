DROP POLICY IF EXISTS "Users manage their own payout methods" ON public.user_payout_methods;
DROP POLICY IF EXISTS "users can manage own payout methods" ON public.user_payout_methods;
CREATE POLICY "Talents view own payout methods" ON public.user_payout_methods FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage payout methods" ON public.user_payout_methods FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'masteradmin')) WITH CHECK (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'masteradmin'));
REVOKE INSERT, UPDATE, DELETE ON public.user_payout_methods FROM authenticated;
GRANT SELECT ON public.user_payout_methods TO authenticated;
GRANT ALL ON public.user_payout_methods TO service_role;