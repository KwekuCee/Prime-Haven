-- Allow admins to delete profiles (cascades to designer_details and other related data)
CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Allow admins to delete designer_details
CREATE POLICY "Admins can delete designer details"
ON public.designer_details
FOR DELETE
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Allow admins to delete user_roles
CREATE POLICY "Admins can delete user roles"
ON public.user_roles
FOR DELETE
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Allow admins to delete submissions (for cleanup when deleting designers)
CREATE POLICY "Admins can delete any submission"
ON public.submissions
FOR DELETE
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Allow admins to delete payments
CREATE POLICY "Admins can delete payments"
ON public.payments
FOR DELETE
USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));