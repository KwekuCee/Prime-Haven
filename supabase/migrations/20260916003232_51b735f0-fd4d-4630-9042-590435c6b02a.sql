
-- 1) current_user_email() now only returns the email when the account's email is confirmed,
--    and reads it from auth.users (source of truth) instead of trusting the raw JWT claim.
CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT lower(u.email)
  FROM auth.users u
  WHERE u.id = auth.uid()
    AND u.email_confirmed_at IS NOT NULL
$function$;

-- 2) Rewrite every policy that matched on the raw JWT email claim to use the hardened function.

-- client_support_tickets
DROP POLICY IF EXISTS "Clients can view their own tickets" ON public.client_support_tickets;
CREATE POLICY "Clients can view their own tickets" ON public.client_support_tickets
  FOR SELECT TO authenticated
  USING (current_user_email() <> '' AND lower(client_email) = current_user_email());

DROP POLICY IF EXISTS "Clients can create tickets" ON public.client_support_tickets;
CREATE POLICY "Clients can create tickets" ON public.client_support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (current_user_email() <> '' AND lower(client_email) = current_user_email());

-- project_revisions
DROP POLICY IF EXISTS "Clients can view their own revisions" ON public.project_revisions;
CREATE POLICY "Clients can view their own revisions" ON public.project_revisions
  FOR SELECT TO authenticated
  USING (current_user_email() <> '' AND lower(client_email) = current_user_email());

DROP POLICY IF EXISTS "Clients can create revisions" ON public.project_revisions;
CREATE POLICY "Clients can create revisions" ON public.project_revisions
  FOR INSERT TO authenticated
  WITH CHECK (
    current_user_email() <> ''
    AND lower(client_email) = current_user_email()
    AND EXISTS (
      SELECT 1 FROM submissions s
      JOIN client_projects cp ON cp.id = s.client_project_id
      WHERE s.id = project_revisions.submission_id
        AND lower(cp.client_email) = current_user_email()
    )
  );

-- submissions (client_ref + client_project lookups)
DROP POLICY IF EXISTS "Clients can view their submitted deliverables" ON public.submissions;
CREATE POLICY "Clients can view their submitted deliverables" ON public.submissions
  FOR SELECT TO authenticated
  USING (
    current_user_email() <> ''
    AND client_ref IN (
      SELECT id::text FROM client_orders
      WHERE lower(client_orders.client_email) = current_user_email()
    )
  );

DROP POLICY IF EXISTS "Clients can accept and revise deliverables" ON public.submissions;
CREATE POLICY "Clients can accept and revise deliverables" ON public.submissions
  FOR UPDATE TO authenticated
  USING (
    current_user_email() <> ''
    AND client_ref IN (
      SELECT id::text FROM client_orders
      WHERE lower(client_orders.client_email) = current_user_email()
    )
  );

DROP POLICY IF EXISTS "Clients can view deliverables for their projects" ON public.submissions;
CREATE POLICY "Clients can view deliverables for their projects" ON public.submissions
  FOR SELECT TO authenticated
  USING (
    client_project_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM client_projects cp
      WHERE cp.id = submissions.client_project_id
        AND (
          (current_user_email() <> '' AND lower(cp.client_email) = current_user_email())
          OR cp.created_by = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "Clients can review deliverables for their projects" ON public.submissions;
CREATE POLICY "Clients can review deliverables for their projects" ON public.submissions
  FOR UPDATE TO authenticated
  USING (
    client_project_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM client_projects cp
      WHERE cp.id = submissions.client_project_id
        AND (
          (current_user_email() <> '' AND lower(cp.client_email) = current_user_email())
          OR cp.created_by = auth.uid()
        )
    )
  )
  WITH CHECK (
    client_project_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM client_projects cp
      WHERE cp.id = submissions.client_project_id
        AND (
          (current_user_email() <> '' AND lower(cp.client_email) = current_user_email())
          OR cp.created_by = auth.uid()
        )
    )
  );
