DROP POLICY IF EXISTS "Authenticated users can insert project messages" ON public.project_chat_messages;

CREATE POLICY "Project participants can insert chat messages"
ON public.project_chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND (
    public.has_role(auth.uid(), 'superadmin')
    OR public.has_role(auth.uid(), 'masteradmin')
    OR EXISTS (
      SELECT 1 FROM public.client_projects cp
      WHERE cp.id = project_chat_messages.project_id
        AND (
          cp.claimed_by = auth.uid()
          OR cp.accepted_designer_id = auth.uid()
          OR lower(cp.client_email) = lower(public.current_user_email())
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.client_orders co
      WHERE co.id = project_chat_messages.project_id
        AND (
          co.assigned_designer_id = auth.uid()
          OR lower(co.client_email) = lower(public.current_user_email())
        )
    )
  )
);