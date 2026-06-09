
CREATE TABLE IF NOT EXISTS public.project_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('client','designer','admin')),
  sender_name text,
  sender_id uuid,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_chat_messages_project ON public.project_chat_messages(project_id, created_at);

ALTER TABLE public.project_chat_messages ENABLE ROW LEVEL SECURITY;

-- Designers can view messages on projects where they are the accepted designer
CREATE POLICY "Designer can view their project chat"
  ON public.project_chat_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.client_projects cp
    WHERE cp.id = project_chat_messages.project_id
      AND cp.accepted_designer_id = auth.uid()
  ));

-- Designers can post as themselves
CREATE POLICY "Designer can post on their project chat"
  ON public.project_chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_role = 'designer'
    AND sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.client_projects cp
      WHERE cp.id = project_chat_messages.project_id
        AND cp.accepted_designer_id = auth.uid()
    )
  );

-- Admins manage everything
CREATE POLICY "Admins manage project chat"
  ON public.project_chat_messages FOR ALL TO authenticated
  USING (has_role(auth.uid(),'masteradmin'::app_role) OR has_role(auth.uid(),'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(),'masteradmin'::app_role) OR has_role(auth.uid(),'superadmin'::app_role));
