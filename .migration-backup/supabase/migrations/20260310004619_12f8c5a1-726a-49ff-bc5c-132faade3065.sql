CREATE POLICY "Designers can view active job contracts"
ON public.job_contracts
FOR SELECT
TO authenticated
USING (status = 'active' OR status = 'in_progress');