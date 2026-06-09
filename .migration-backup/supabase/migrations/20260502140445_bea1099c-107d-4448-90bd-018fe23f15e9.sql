
-- 1. Extend client_projects
ALTER TABLE public.client_projects
  ADD COLUMN IF NOT EXISTS accepted_designer_id uuid,
  ADD COLUMN IF NOT EXISTS tip_total numeric NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_client_projects_accepted_designer
  ON public.client_projects(accepted_designer_id);

-- 2. project_tips table
CREATE TABLE IF NOT EXISTS public.project_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  designer_id uuid,
  client_email text,
  client_name text,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'GHS',
  transaction_id text UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create a tip"
  ON public.project_tips FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view tip by id"
  ON public.project_tips FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admins manage all tips"
  ON public.project_tips FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'masteradmin'::app_role) OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE TRIGGER trg_project_tips_updated
  BEFORE UPDATE ON public.project_tips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. designer_details: extra profession flag
ALTER TABLE public.designer_details
  ADD COLUMN IF NOT EXISTS extra_profession_paid boolean NOT NULL DEFAULT false;

-- 4. Trigger: auto-stamp accepted_designer_id when a submission becomes approved
CREATE OR REPLACE FUNCTION public.stamp_accepted_designer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
BEGIN
  IF NEW.status = 'approved'
     AND (OLD.status IS DISTINCT FROM 'approved')
     AND NEW.client_ref IS NOT NULL THEN

    BEGIN
      v_project_id := NEW.client_ref::uuid;
    EXCEPTION WHEN others THEN
      RETURN NEW;
    END;

    UPDATE public.client_projects
       SET accepted_designer_id = NEW.designer_id,
           updated_at = now()
     WHERE id = v_project_id
       AND accepted_designer_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_stamp_accepted_designer ON public.submissions;
CREATE TRIGGER trg_stamp_accepted_designer
  AFTER INSERT OR UPDATE OF status ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public.stamp_accepted_designer();
