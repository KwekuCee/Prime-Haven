-- ======================================================================
-- CRITICAL FIX: CONVERT RESTRICTIVE POLICIES TO PERMISSIVE
-- FOR PROFILES, DESIGNER_DETAILS, JOB_CONTRACTS, CLIENT_PROJECTS, AND CLIENT_ORDERS
-- ======================================================================

-- 1. FIX PROFILES TABLE
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles for leaderboard" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Admins can delete profiles" ON public.profiles AS PERMISSIVE FOR DELETE TO authenticated USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can update any profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can view all profiles" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Allow insert for authenticated users" ON public.profiles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));
CREATE POLICY "Authenticated users can view all profiles for leaderboard" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));
CREATE POLICY "Users can view their own profile" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = id));

-- 2. FIX DESIGNER_DETAILS TABLE
DROP POLICY IF EXISTS "Admins can delete designer details" ON public.designer_details;
DROP POLICY IF EXISTS "Admins can update any designer details" ON public.designer_details;
DROP POLICY IF EXISTS "Admins can view all designer details" ON public.designer_details;
DROP POLICY IF EXISTS "Allow insert for authenticated designers" ON public.designer_details;
DROP POLICY IF EXISTS "Authenticated users can view all designer details for leaderboa" ON public.designer_details;
DROP POLICY IF EXISTS "Designers can update their own details" ON public.designer_details;
DROP POLICY IF EXISTS "Designers can view their own details" ON public.designer_details;

CREATE POLICY "Admins can delete designer details" ON public.designer_details AS PERMISSIVE FOR DELETE TO authenticated USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can update any designer details" ON public.designer_details AS PERMISSIVE FOR UPDATE TO authenticated USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can view all designer details" ON public.designer_details AS PERMISSIVE FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Allow insert for authenticated designers" ON public.designer_details AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Authenticated users can view all designer details for leaderboa" ON public.designer_details AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "Designers can update their own details" ON public.designer_details AS PERMISSIVE FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));
CREATE POLICY "Designers can view their own details" ON public.designer_details AS PERMISSIVE FOR SELECT TO authenticated USING ((auth.uid() = user_id));

-- 3. FIX JOB_CONTRACTS TABLE
DROP POLICY IF EXISTS "Admins can create job contracts" ON public.job_contracts;
DROP POLICY IF EXISTS "Admins can delete job contracts" ON public.job_contracts;
DROP POLICY IF EXISTS "Admins can update job contracts" ON public.job_contracts;
DROP POLICY IF EXISTS "Admins can view all job contracts" ON public.job_contracts;
DROP POLICY IF EXISTS "Designers can view active job contracts" ON public.job_contracts;

CREATE POLICY "Admins can create job contracts" ON public.job_contracts AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can delete job contracts" ON public.job_contracts AS PERMISSIVE FOR DELETE TO authenticated USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can update job contracts" ON public.job_contracts AS PERMISSIVE FOR UPDATE TO authenticated USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can view all job contracts" ON public.job_contracts AS PERMISSIVE FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Designers can view active job contracts" ON public.job_contracts AS PERMISSIVE FOR SELECT TO authenticated USING (((status = 'active'::text) OR (status = 'in_progress'::text)));

-- 4. FIX CLIENT_PROJECTS TABLE
DROP POLICY IF EXISTS "Admins can manage client projects" ON public.client_projects;
CREATE POLICY "Admins can manage client projects" ON public.client_projects AS PERMISSIVE FOR ALL TO authenticated USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Designers can view pending projects" ON public.client_projects AS PERMISSIVE FOR SELECT TO authenticated USING (status = 'pending');

-- 5. FIX CLIENT_ORDERS TABLE
DROP POLICY IF EXISTS "Admins can update orders" ON public.client_orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.client_orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON public.client_orders;
DROP POLICY IF EXISTS "Authenticated can create orders" ON public.client_orders;

CREATE POLICY "Admins can update orders" ON public.client_orders AS PERMISSIVE FOR UPDATE TO authenticated USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Admins can view all orders" ON public.client_orders AS PERMISSIVE FOR SELECT TO authenticated USING ((has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role)));
CREATE POLICY "Designers can view unassigned paid orders" ON public.client_orders AS PERMISSIVE FOR SELECT TO authenticated USING (payment_status = 'paid' AND project_status = 'unassigned');
CREATE POLICY "Designers can claim orders" ON public.client_orders AS PERMISSIVE FOR UPDATE TO authenticated USING (payment_status = 'paid' AND project_status = 'unassigned');

-- Ensure all designers can see these tables for the marketplace/leaderboard
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.designer_details FORCE ROW LEVEL SECURITY;
ALTER TABLE public.job_contracts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.client_projects FORCE ROW LEVEL SECURITY;
ALTER TABLE public.client_orders FORCE ROW LEVEL SECURITY;
