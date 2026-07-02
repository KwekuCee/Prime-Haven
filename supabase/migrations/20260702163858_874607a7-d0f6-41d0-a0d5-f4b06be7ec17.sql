
-- 1) client_support_tickets: require authenticated insert
DROP POLICY IF EXISTS "Clients can create tickets" ON public.client_support_tickets;
CREATE POLICY "Clients can create tickets"
ON public.client_support_tickets
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (auth.jwt() ->> 'email') = client_email
);

-- 2) project_revisions: require authenticated + submission belongs to a project owned by user's email
DROP POLICY IF EXISTS "Clients can create revisions" ON public.project_revisions;
CREATE POLICY "Clients can create revisions"
ON public.project_revisions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (auth.jwt() ->> 'email') = client_email
  AND EXISTS (
    SELECT 1
    FROM public.submissions s
    JOIN public.client_projects cp ON cp.id = s.client_project_id
    WHERE s.id = project_revisions.submission_id
      AND cp.client_email = (auth.jwt() ->> 'email')
  )
);

-- 3) promo_codes: restrict SELECT to authenticated users
DROP POLICY IF EXISTS "Anyone can check active promo codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Public can view active promo codes" ON public.promo_codes;
CREATE POLICY "Authenticated users can view active promo codes"
ON public.promo_codes
FOR SELECT
TO authenticated
USING (is_active = true);

-- 4) withdrawals: remove all user-facing INSERT policies (edge function uses service_role)
DROP POLICY IF EXISTS "Users can insert own withdrawals" ON public.withdrawals;
DROP POLICY IF EXISTS "designers can request withdrawals" ON public.withdrawals;

-- 5) realtime.messages: scope channel access to authenticated users whose uid is in the topic
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own topic messages" ON realtime.messages;
CREATE POLICY "Users can read own topic messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    realtime.topic() LIKE '%' || auth.uid()::text || '%'
    OR public.has_role(auth.uid(), 'superadmin'::app_role)
    OR public.has_role(auth.uid(), 'masteradmin'::app_role)
  )
);

DROP POLICY IF EXISTS "Users can send own topic messages" ON realtime.messages;
CREATE POLICY "Users can send own topic messages"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    realtime.topic() LIKE '%' || auth.uid()::text || '%'
    OR public.has_role(auth.uid(), 'superadmin'::app_role)
    OR public.has_role(auth.uid(), 'masteradmin'::app_role)
  )
);
