-- 1. Review flag for suspicious/legacy projects
ALTER TABLE public.client_projects
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false;

-- 2. Helper: find-or-create a client record by email
CREATE OR REPLACE FUNCTION public.find_or_create_client(
  p_email text, p_name text, p_whatsapp text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF p_email IS NULL OR btrim(p_email) = '' THEN RETURN NULL; END IF;

  SELECT id INTO v_id FROM public.clients
  WHERE lower(email) = lower(btrim(p_email))
  ORDER BY created_at ASC LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO public.clients (name, email, whatsapp, is_primary)
    VALUES (COALESCE(NULLIF(btrim(p_name), ''), split_part(btrim(p_email), '@', 1)),
            lower(btrim(p_email)), p_whatsapp, false)
    RETURNING id INTO v_id;
  ELSIF p_whatsapp IS NOT NULL THEN
    UPDATE public.clients SET whatsapp = COALESCE(whatsapp, p_whatsapp), updated_at = now()
    WHERE id = v_id;
  END IF;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.find_or_create_client(text, text, text) FROM anon, authenticated;

-- 3. Always attach a client record to a project
CREATE OR REPLACE FUNCTION public.link_project_client()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.client_id IS NULL AND NEW.client_email IS NOT NULL THEN
    NEW.client_id := public.find_or_create_client(NEW.client_email, NEW.client_name, NEW.client_whatsapp);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_link_project_client ON public.client_projects;
CREATE TRIGGER trg_link_project_client
BEFORE INSERT OR UPDATE OF client_email, client_id, paid_at ON public.client_projects
FOR EACH ROW EXECUTE FUNCTION public.link_project_client();

-- 4. Always register the client behind a completed order
CREATE OR REPLACE FUNCTION public.link_order_client()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.payment_status = 'completed' THEN
    PERFORM public.find_or_create_client(NEW.client_email, NEW.client_name, NEW.client_whatsapp);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_link_order_client ON public.client_orders;
CREATE TRIGGER trg_link_order_client
AFTER INSERT OR UPDATE OF payment_status ON public.client_orders
FOR EACH ROW EXECUTE FUNCTION public.link_order_client();

-- 5. Publish paid projects to job contracts (idempotent)
CREATE OR REPLACE FUNCTION public.publish_paid_project_contract()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.paid_at IS NULL THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.job_contracts WHERE client_project_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.job_contracts (
    title, description, category, deadline, budget, client_name,
    reference_files, status, target_professions, client_project_id, posted_by
  ) VALUES (
    NEW.title,
    COALESCE(NULLIF(btrim(NEW.description), ''), NEW.title),
    NEW.category,
    NEW.deadline,
    CASE WHEN NEW.price_ghs IS NOT NULL THEN 'GHS ' || NEW.price_ghs::text ELSE NEW.budget END,
    NEW.client_name,
    COALESCE(NEW.reference_images, '{}'),
    'open',
    NEW.required_professions,
    NEW.id,
    NEW.created_by
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_publish_paid_project_contract ON public.client_projects;
CREATE TRIGGER trg_publish_paid_project_contract
AFTER INSERT OR UPDATE OF paid_at ON public.client_projects
FOR EACH ROW EXECUTE FUNCTION public.publish_paid_project_contract();