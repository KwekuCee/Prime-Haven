-- Drop the overly permissive public SELECT policy on system_settings
DROP POLICY IF EXISTS "Anyone can view system settings" ON public.system_settings;

-- Create a new policy that only allows authenticated admins to view system settings
CREATE POLICY "Only admins can view system settings" 
ON public.system_settings 
FOR SELECT 
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));