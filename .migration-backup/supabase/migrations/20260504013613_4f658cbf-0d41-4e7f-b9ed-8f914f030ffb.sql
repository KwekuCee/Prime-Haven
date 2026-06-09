
-- Restrict user_badges INSERT/UPDATE/DELETE to admins only
CREATE POLICY "Only admins can insert user badges"
ON public.user_badges FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Only admins can update user badges"
ON public.user_badges FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Only admins can delete user badges"
ON public.user_badges FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));
