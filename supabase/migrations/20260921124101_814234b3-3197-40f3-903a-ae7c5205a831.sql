CREATE INDEX IF NOT EXISTS idx_rate_limit_hits_action_identifier_created_at
ON public.rate_limit_hits (action, identifier, created_at DESC);

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_action text, p_identifier text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_action text := lower(coalesce(nullif(trim(p_action), ''), 'default'));
  v_identifier text := lower(left(coalesce(nullif(trim(p_identifier), ''), 'anonymous'), 200));
  v_limit integer;
  v_window integer;
  v_count integer;
  v_oldest timestamptz;
  v_retry integer;
BEGIN
  CASE v_action
    WHEN 'newsletter_subscribe' THEN v_limit := 5;  v_window := 3600;
    WHEN 'consultation_booking' THEN v_limit := 3;  v_window := 3600;
    WHEN 'support_ticket'       THEN v_limit := 5;  v_window := 3600;
    WHEN 'project_inquiry'      THEN v_limit := 3;  v_window := 3600;
    WHEN 'promo_email'          THEN v_limit := 3;  v_window := 3600;
    WHEN 'visitor_chat'         THEN v_limit := 30; v_window := 3600;
    WHEN 'client_lead'          THEN v_limit := 6;  v_window := 3600;
    WHEN 'client_order'         THEN v_limit := 6;  v_window := 3600;
    WHEN 'registration'         THEN v_limit := 5;  v_window := 3600;
    WHEN 'auth_signin'          THEN v_limit := 10; v_window := 900;
    WHEN 'admin_login'          THEN v_limit := 5;  v_window := 900;
    WHEN 'verification_resend'  THEN v_limit := 3;  v_window := 3600;
    WHEN 'password_reset'       THEN v_limit := 3;  v_window := 3600;
    WHEN 'project_message'      THEN v_limit := 40; v_window := 3600;
    WHEN 'project_tracking'     THEN v_limit := 120; v_window := 3600;
    WHEN 'tip_payment'          THEN v_limit := 6;  v_window := 3600;
    WHEN 'payment_verify'       THEN v_limit := 8;  v_window := 3600;
    WHEN 'withdrawal_request'   THEN v_limit := 5;  v_window := 3600;
    WHEN 'work_submission'      THEN v_limit := 20; v_window := 3600;
    WHEN 'talent_application'   THEN v_limit := 3;  v_window := 86400;
    WHEN 'applicant_upload'     THEN v_limit := 12; v_window := 3600;
    WHEN 'assessment_start'     THEN v_limit := 8;  v_window := 3600;
    WHEN 'assessment_submit'    THEN v_limit := 5;  v_window := 3600;
    WHEN 'applicant_integrity'  THEN v_limit := 12; v_window := 3600;
    WHEN 'applicant_portal'     THEN v_limit := 120; v_window := 3600;
    WHEN 'applicant_payment'    THEN v_limit := 8;  v_window := 3600;
    WHEN 'hire_request'         THEN v_limit := 4;  v_window := 3600;
    ELSE v_limit := 10; v_window := 3600;
  END CASE;

  DELETE FROM public.rate_limit_hits
  WHERE created_at < now() - interval '2 days';

  SELECT count(*), min(created_at)
  INTO v_count, v_oldest
  FROM public.rate_limit_hits
  WHERE action = v_action
    AND identifier = v_identifier
    AND created_at > now() - make_interval(secs => v_window);

  IF v_count >= v_limit THEN
    v_retry := greatest(1, ceil(extract(epoch from (v_oldest + make_interval(secs => v_window)) - now()))::integer);
    RETURN jsonb_build_object(
      'allowed', false,
      'limit', v_limit,
      'remaining', 0,
      'retry_after_seconds', v_retry
    );
  END IF;

  INSERT INTO public.rate_limit_hits (action, identifier) VALUES (v_action, v_identifier);

  RETURN jsonb_build_object(
    'allowed', true,
    'limit', v_limit,
    'remaining', greatest(0, v_limit - v_count - 1),
    'retry_after_seconds', 0
  );
END;
$function$;