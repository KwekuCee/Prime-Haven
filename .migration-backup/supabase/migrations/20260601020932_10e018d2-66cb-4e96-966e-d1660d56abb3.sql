DROP POLICY IF EXISTS "Authenticated can view badges earned" ON public.user_badges;

CREATE POLICY "Users can view their own badges"
ON public.user_badges
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);