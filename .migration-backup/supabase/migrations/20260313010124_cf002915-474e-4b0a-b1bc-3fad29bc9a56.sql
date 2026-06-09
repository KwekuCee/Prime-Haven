CREATE POLICY "Authenticated users can insert system logs"
ON public.system_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = admin_id);