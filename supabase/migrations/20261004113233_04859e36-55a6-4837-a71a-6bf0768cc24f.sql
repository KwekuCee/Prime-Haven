-- 1. Keep a history of every client change request
CREATE OR REPLACE FUNCTION public.request_project_revision(p_submission_id uuid, p_feedback text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_sub RECORD;
  v_allowed boolean;
  v_feedback text := NULLIF(btrim(COALESCE(p_feedback, '')), '');
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated.'; END IF;
  IF v_feedback IS NULL OR length(v_feedback) < 5 THEN
    RAISE EXCEPTION 'Please describe the changes you need.';
  END IF;
  IF length(v_feedback) > 4000 THEN RAISE EXCEPTION 'Feedback is too long.'; END IF;

  SELECT s.*, cp.client_email, cp.created_by, cp.id AS project_id
  INTO v_sub FROM public.submissions s
  JOIN public.client_projects cp ON cp.id = s.client_project_id
  WHERE s.id = p_submission_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deliverable not found for a project you own.'; END IF;

  v_allowed := v_sub.client_email = (auth.jwt() ->> 'email')
            OR v_sub.created_by = auth.uid()
            OR public.has_role(auth.uid(), 'superadmin'::app_role)
            OR public.has_role(auth.uid(), 'masteradmin'::app_role);
  IF NOT v_allowed THEN RAISE EXCEPTION 'You cannot review this deliverable.'; END IF;
  IF v_sub.status = 'approved' THEN RAISE EXCEPTION 'This deliverable is already approved.'; END IF;

  UPDATE public.submissions
  SET status = 'revision', revisions_count = COALESCE(revisions_count, 0) + 1,
      rejection_reason = v_feedback, updated_at = now()
  WHERE id = p_submission_id;

  UPDATE public.client_projects SET status = 'correction', updated_at = now() WHERE id = v_sub.project_id;

  INSERT INTO public.project_revisions (submission_id, client_email, feedback)
  VALUES (p_submission_id, COALESCE(auth.jwt() ->> 'email', v_sub.client_email, ''), v_feedback);

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (v_sub.designer_id, 'Correction requested', 'The client asked for changes: ' || v_feedback, 'warning', '/submit-work');

  INSERT INTO public.system_logs (admin_id, action_type, description, new_value)
  VALUES (auth.uid(), 'correction_requested', 'Client requested changes on "' || v_sub.project_name || '"',
          jsonb_build_object('submission_id', p_submission_id, 'project_id', v_sub.project_id));

  RETURN jsonb_build_object('success', true, 'message', 'Revision requested.');
END;
$function$;

-- 2. Automatic activity log entries for money, roles and project status
CREATE OR REPLACE FUNCTION public.audit_withdrawal_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  INSERT INTO public.system_logs (admin_id, action_type, description, old_value, new_value)
  VALUES (auth.uid(), 'withdrawal_' || NEW.status,
          'Withdrawal of ' || NEW.amount || ' ' || NEW.currency || ' is now ' || NEW.status,
          CASE WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('status', OLD.status) END,
          jsonb_build_object('withdrawal_id', NEW.id, 'user_id', NEW.user_id, 'status', NEW.status, 'amount', NEW.amount));
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_audit_withdrawal ON public.withdrawals;
CREATE TRIGGER trg_audit_withdrawal AFTER INSERT OR UPDATE ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.audit_withdrawal_change();

CREATE OR REPLACE FUNCTION public.audit_role_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r RECORD;
BEGIN
  r := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  INSERT INTO public.system_logs (admin_id, action_type, description, new_value)
  VALUES (auth.uid(), CASE WHEN TG_OP = 'DELETE' THEN 'role_removed' ELSE 'role_granted' END,
          'Role ' || r.role || CASE WHEN TG_OP = 'DELETE' THEN ' removed' ELSE ' granted' END,
          jsonb_build_object('user_id', r.user_id, 'role', r.role));
  RETURN r;
END $$;
DROP TRIGGER IF EXISTS trg_audit_role ON public.user_roles;
CREATE TRIGGER trg_audit_role AFTER INSERT OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_role_change();

CREATE OR REPLACE FUNCTION public.audit_project_status() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.system_logs (admin_id, action_type, description, old_value, new_value)
    VALUES (auth.uid(), 'project_status_changed',
            '"' || NEW.title || '" moved from ' || COALESCE(OLD.status, '-') || ' to ' || NEW.status,
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('project_id', NEW.id, 'status', NEW.status));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_audit_project_status ON public.client_projects;
CREATE TRIGGER trg_audit_project_status AFTER UPDATE OF status ON public.client_projects
FOR EACH ROW EXECUTE FUNCTION public.audit_project_status();