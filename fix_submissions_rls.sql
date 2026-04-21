-- ======================================================================
-- CRITICAL FIX: CONVERT RESTRICTIVE POLICIES TO PERMISSIVE ON SUBMISSIONS
-- ======================================================================
-- The database previously had "RESTRICTIVE" policies on the submissions table.
-- A restrictive policy means ALL policies must evaluate to true. 
-- So a client couldn't see submissions because they weren't an admin.
-- This script drops those broken policies and recreates them correctly as PERMISSIVE.

-- 1. Drop existing broken restrictive policies
DROP POLICY IF EXISTS "Admins can delete any submission" ON public.submissions;
DROP POLICY IF EXISTS "Admins can update any submission" ON public.submissions;
DROP POLICY IF EXISTS "Admins can view all submissions" ON public.submissions;
DROP POLICY IF EXISTS "Designers can create their own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Designers can delete their own pending submissions" ON public.submissions;
DROP POLICY IF EXISTS "Designers can update their own pending submissions" ON public.submissions;
DROP POLICY IF EXISTS "Designers can view their own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Clients can view their submitted deliverables" ON public.submissions;
DROP POLICY IF EXISTS "Clients can accept deliverables" ON public.submissions;

-- 2. Recreate original policies as PERMISSIVE
CREATE POLICY "Admins can delete any submission" ON public.submissions AS PERMISSIVE FOR DELETE TO public USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can update any submission" ON public.submissions AS PERMISSIVE FOR UPDATE TO authenticated USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can view all submissions" ON public.submissions AS PERMISSIVE FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Designers can create their own submissions" ON public.submissions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = designer_id));
CREATE POLICY "Designers can delete their own pending submissions" ON public.submissions AS PERMISSIVE FOR DELETE TO authenticated USING (((auth.uid() = designer_id) AND (status = 'pending'::text)));
CREATE POLICY "Designers can update their own pending submissions" ON public.submissions AS PERMISSIVE FOR UPDATE TO authenticated USING (((auth.uid() = designer_id) AND (status = 'pending'::text))) WITH CHECK ((auth.uid() = designer_id));
CREATE POLICY "Designers can view their own submissions" ON public.submissions AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = designer_id));

-- 3. Add the CLIENT policies correctly as PERMISSIVE
CREATE POLICY "Clients can view their submitted deliverables" 
ON public.submissions 
AS PERMISSIVE
FOR SELECT 
TO authenticated
USING (
  client_ref IN (SELECT id::text FROM public.client_orders WHERE client_email = (auth.jwt() ->> 'email'))
);

CREATE POLICY "Clients can accept and revise deliverables" 
ON public.submissions 
AS PERMISSIVE
FOR UPDATE 
TO authenticated
USING (
  client_ref IN (SELECT id::text FROM public.client_orders WHERE client_email = (auth.jwt() ->> 'email'))
)
WITH CHECK (
  client_ref IN (SELECT id::text FROM public.client_orders WHERE client_email = (auth.jwt() ->> 'email'))
);
