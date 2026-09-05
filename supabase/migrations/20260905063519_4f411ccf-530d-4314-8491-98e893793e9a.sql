DROP POLICY IF EXISTS "Project participants can insert messages" ON public.project_messages;
CREATE POLICY "Project participants can insert messages"
ON public.project_messages FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.client_orders
    WHERE client_orders.id = project_messages.order_id
      AND (client_orders.assigned_designer_id = auth.uid()
           OR has_role(auth.uid(), 'superadmin'::app_role)
           OR has_role(auth.uid(), 'masteradmin'::app_role))
  )
);