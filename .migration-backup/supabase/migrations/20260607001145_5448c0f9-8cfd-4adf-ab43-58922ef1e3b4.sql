
-- ============ client_orders: tighten anon insert ============
DROP POLICY IF EXISTS "Public can create orders" ON public.client_orders;

CREATE POLICY "Public can create orders"
ON public.client_orders
FOR INSERT
TO anon
WITH CHECK (
  client_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND char_length(client_email) BETWEEN 5 AND 254
  AND client_name IS NOT NULL
  AND char_length(client_name) BETWEEN 1 AND 200
  AND (client_whatsapp IS NULL OR char_length(client_whatsapp) <= 32)
  AND COALESCE(payment_status, 'pending') = 'pending'
  AND COALESCE(price, 0) >= 0
  AND COALESCE(price, 0) <= 1000000
  AND (description IS NULL OR char_length(description) <= 5000)
);

CREATE POLICY "Authenticated users can create orders"
ON public.client_orders
FOR INSERT
TO authenticated
WITH CHECK (
  client_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  AND char_length(client_email) BETWEEN 5 AND 254
  AND client_name IS NOT NULL
  AND char_length(client_name) BETWEEN 1 AND 200
);

-- ============ client_projects: tighten anon insert ============
DROP POLICY IF EXISTS "Public can create client projects" ON public.client_projects;

CREATE POLICY "Public can create client projects"
ON public.client_projects
FOR INSERT
TO anon
WITH CHECK (
  created_by IS NULL
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
);

-- ============ project_milestones: client + designer SELECT ============
CREATE POLICY "Clients view milestones for their projects"
ON public.project_milestones
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_projects cp
    WHERE cp.id = project_milestones.project_id AND cp.created_by = auth.uid()
  )
);

CREATE POLICY "Designers view milestones for their assigned projects"
ON public.project_milestones
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_projects cp
    WHERE cp.id = project_milestones.project_id AND cp.accepted_designer_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.project_assignments pa
    WHERE pa.project_id = project_milestones.project_id AND pa.designer_id = auth.uid()
  )
);

-- ============ project_deliverables: client + designer SELECT ============
CREATE POLICY "Clients view deliverables for their projects"
ON public.project_deliverables
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_projects cp
    WHERE cp.id = project_deliverables.project_id AND cp.created_by = auth.uid()
  )
);

CREATE POLICY "Designers view deliverables for their assigned projects"
ON public.project_deliverables
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_projects cp
    WHERE cp.id = project_deliverables.project_id AND cp.accepted_designer_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.project_assignments pa
    WHERE pa.project_id = project_deliverables.project_id AND pa.designer_id = auth.uid()
  )
);
