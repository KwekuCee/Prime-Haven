CREATE OR REPLACE FUNCTION public.record_pending_job_earning()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_project RECORD;
  v_share numeric;
BEGIN
  IF NEW.client_project_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_project FROM public.client_projects WHERE id = NEW.client_project_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  SELECT COALESCE((value #>> '{}')::numeric, 70) INTO v_share
  FROM public.system_settings WHERE key = 'revenue_share_percentage';
  v_share := COALESCE(v_share, 70);

  IF EXISTS (
    SELECT 1 FROM public.job_earnings
    WHERE project_id = NEW.client_project_id
      AND designer_id = NEW.designer_id
      AND status IN ('pending', 'earned')
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.job_earnings (designer_id, project_id, submission_id, job_price, share_percent, amount, status)
  VALUES (
    NEW.designer_id,
    NEW.client_project_id,
    NEW.id,
    COALESCE(v_project.price_ghs, 0),
    v_share,
    ROUND(COALESCE(v_project.price_ghs, 0) * v_share / 100.0, 2),
    'pending'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_pending_job_earning ON public.submissions;
CREATE TRIGGER trg_record_pending_job_earning
AFTER INSERT ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.record_pending_job_earning();

CREATE OR REPLACE FUNCTION public.settle_job_earning_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    UPDATE public.job_earnings
    SET status = 'earned', updated_at = now()
    WHERE project_id = NEW.client_project_id
      AND designer_id = NEW.designer_id
      AND status = 'pending';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_settle_job_earning ON public.submissions;
CREATE TRIGGER trg_settle_job_earning
AFTER UPDATE ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.settle_job_earning_on_approval();