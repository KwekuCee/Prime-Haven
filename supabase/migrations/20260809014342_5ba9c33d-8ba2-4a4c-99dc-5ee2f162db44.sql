-- 1. Verification token policies: restrict to authenticated role only
DROP POLICY IF EXISTS "Users can view their own tokens" ON public.email_verification_tokens;
DROP POLICY IF EXISTS "Users can create their own tokens" ON public.email_verification_tokens;
DROP POLICY IF EXISTS "Users can delete their own tokens" ON public.email_verification_tokens;

CREATE POLICY "Users can view their own tokens"
  ON public.email_verification_tokens FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tokens"
  ON public.email_verification_tokens FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tokens"
  ON public.email_verification_tokens FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 2. job_contracts: designers only see contracts they have claimed
DROP POLICY IF EXISTS "Designers can view active job contracts" ON public.job_contracts;

CREATE POLICY "Designers can view their claimed job contracts"
  ON public.job_contracts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.job_contract_claims jcc
      WHERE jcc.contract_id = job_contracts.id
        AND jcc.designer_id = auth.uid()
    )
  );

-- Sanitized open job board for designers (no client_name, reference_files,
-- special_instructions or discord identifiers)
CREATE OR REPLACE FUNCTION public.get_open_job_contracts()
RETURNS TABLE(
  id uuid,
  title text,
  category text,
  description text,
  budget text,
  requirements text,
  deadline timestamp with time zone,
  status text,
  target_professions text[],
  active_designers_count integer,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.id, c.title, c.category, c.description, c.budget, c.requirements,
         c.deadline, c.status, c.target_professions, c.active_designers_count, c.created_at
  FROM public.job_contracts c
  WHERE c.status IN ('active', 'in_progress')
    AND (
      public.has_role(auth.uid(), 'superadmin'::app_role)
      OR public.has_role(auth.uid(), 'masteradmin'::app_role)
      OR (
        public.has_role(auth.uid(), 'designer'::app_role)
        AND (
          c.target_professions IS NULL
          OR array_length(c.target_professions, 1) IS NULL
          OR EXISTS (
            SELECT 1 FROM public.designer_details d
            WHERE d.user_id = auth.uid()
              AND d.professions && c.target_professions
          )
        )
      )
    )
  ORDER BY c.created_at DESC
$$;

REVOKE ALL ON FUNCTION public.get_open_job_contracts() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_open_job_contracts() TO authenticated;