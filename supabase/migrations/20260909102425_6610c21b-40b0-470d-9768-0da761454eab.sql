CREATE OR REPLACE FUNCTION public.admin_ph_approve_submission(p_submission_id uuid, p_points integer, p_dept_label text DEFAULT 'Dept')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub public.submissions;
  v_points integer;
BEGIN
  IF NOT (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'masteradmin'::app_role)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT * INTO v_sub FROM public.submissions WHERE id = p_submission_id FOR UPDATE;
  IF v_sub.id IS NULL THEN RAISE EXCEPTION 'submission_not_found'; END IF;
  IF v_sub.ph_approved THEN RAISE EXCEPTION 'already_approved'; END IF;

  v_points := CASE WHEN v_sub.parent_submission_id IS NOT NULL THEN 0 ELSE GREATEST(COALESCE(p_points, 0), 0) END;

  UPDATE public.submissions
     SET ph_approved = true,
         ph_approved_at = now(),
         ph_approved_by = auth.uid(),
         points_awarded = COALESCE(points_awarded, 0) + v_points,
         status = 'ph_approved',
         updated_at = now()
   WHERE id = p_submission_id;

  IF v_points > 0 THEN
    UPDATE public.designer_details
       SET total_points = COALESCE(total_points, 0) + v_points,
           monthly_points = COALESCE(monthly_points, 0) + v_points,
           updated_at = now()
     WHERE user_id = v_sub.designer_id;
  END IF;

  INSERT INTO public.system_logs (action_type, admin_id, description)
  VALUES ('ph_approval', auth.uid(), format('[%s] Approved: %s (+%s pts)', p_dept_label, v_sub.project_name, v_points));

  RETURN jsonb_build_object('success', true, 'points', v_points);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_client_accept_submission(p_submission_id uuid, p_points integer, p_dept_label text DEFAULT 'Dept')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub public.submissions;
  v_points integer;
BEGIN
  IF NOT (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'masteradmin'::app_role)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT * INTO v_sub FROM public.submissions WHERE id = p_submission_id FOR UPDATE;
  IF v_sub.id IS NULL THEN RAISE EXCEPTION 'submission_not_found'; END IF;
  IF v_sub.client_accepted THEN RAISE EXCEPTION 'already_accepted'; END IF;

  v_points := GREATEST(COALESCE(p_points, 0), 0);

  UPDATE public.submissions
     SET client_accepted = true,
         client_accepted_at = now(),
         client_accepted_by = auth.uid(),
         points_awarded = COALESCE(points_awarded, 0) + v_points,
         status = 'approved',
         final_approval_date = now(),
         updated_at = now()
   WHERE id = p_submission_id;

  IF v_points > 0 THEN
    UPDATE public.designer_details
       SET total_points = COALESCE(total_points, 0) + v_points,
           monthly_points = COALESCE(monthly_points, 0) + v_points,
           updated_at = now()
     WHERE user_id = v_sub.designer_id;
  END IF;

  INSERT INTO public.system_logs (action_type, admin_id, description)
  VALUES ('client_acceptance', auth.uid(), format('[%s] Client accepted: %s (+%s pts)', p_dept_label, v_sub.project_name, v_points));

  RETURN jsonb_build_object('success', true, 'points', v_points);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_submission(p_submission_id uuid, p_dept_label text DEFAULT 'Dept')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub public.submissions;
  v_points integer;
BEGIN
  IF NOT (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'masteradmin'::app_role)) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  SELECT * INTO v_sub FROM public.submissions WHERE id = p_submission_id FOR UPDATE;
  IF v_sub.id IS NULL THEN RAISE EXCEPTION 'submission_not_found'; END IF;

  v_points := GREATEST(COALESCE(v_sub.points_awarded, 0), 0);

  UPDATE public.submissions
     SET status = 'rejected',
         points_awarded = 0,
         rejection_reason = 'Submission revoked',
         updated_at = now()
   WHERE id = p_submission_id;

  IF v_points > 0 THEN
    UPDATE public.designer_details
       SET total_points = GREATEST(COALESCE(total_points, 0) - v_points, 0),
           monthly_points = GREATEST(COALESCE(monthly_points, 0) - v_points, 0),
           updated_at = now()
     WHERE user_id = v_sub.designer_id;
  END IF;

  INSERT INTO public.system_logs (action_type, admin_id, description)
  VALUES ('submission_revoked', auth.uid(), format('[%s] Revoked: %s (-%s pts)', p_dept_label, v_sub.project_name, v_points));

  RETURN jsonb_build_object('success', true, 'points_revoked', v_points);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_ph_approve_submission(uuid, integer, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.admin_client_accept_submission(uuid, integer, text) FROM public, anon;
REVOKE ALL ON FUNCTION public.admin_revoke_submission(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_ph_approve_submission(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_client_accept_submission(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_submission(uuid, text) TO authenticated;