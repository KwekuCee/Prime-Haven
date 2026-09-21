DROP POLICY IF EXISTS "Authenticated clients can post jobs" ON public.client_projects;

CREATE POLICY "Authenticated clients can post jobs"
ON public.client_projects
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND client_email IS NOT NULL
  AND client_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND char_length(client_email) BETWEEN 5 AND 254
  AND client_name IS NOT NULL
  AND char_length(client_name) BETWEEN 1 AND 200
  AND title IS NOT NULL
  AND char_length(title) BETWEEN 1 AND 300
  AND (description IS NULL OR char_length(description) <= 5000)
  AND (client_whatsapp IS NULL OR char_length(client_whatsapp) <= 32)
  AND COALESCE(status, 'pending') = 'pending'
  AND accepted_designer_id IS NULL
  AND claimed_by IS NULL
  AND claimed_at IS NULL
  AND paid_at IS NULL
  AND COALESCE(price_ghs, 0) = 0
  AND COALESCE(price_usd, 0) = 0
  AND COALESCE(tip_total, 0) = 0
  AND COALESCE(progress_percentage, 0) = 0
  AND COALESCE(needs_review, false) = false
  AND COALESCE(max_assignees, 1) BETWEEN 1 AND 5
  AND (required_professions IS NULL OR COALESCE(array_length(required_professions, 1), 0) <= 5)
);