-- Allow superadmin to view system_logs (in addition to masteradmin)
DROP POLICY IF EXISTS "Only masteradmin can view system logs" ON public.system_logs;
DROP POLICY IF EXISTS "Admins can view system logs" ON public.system_logs;
CREATE POLICY "Admins can view system logs"
ON public.system_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));