CREATE TABLE public.talent_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL CHECK (char_length(action_type) BETWEEN 3 AND 80),
  entity_type text CHECK (entity_type IS NULL OR char_length(entity_type) <= 80),
  entity_id uuid,
  summary text NOT NULL CHECK (char_length(summary) BETWEEN 1 AND 240),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.talent_activity_logs TO authenticated;
GRANT ALL ON public.talent_activity_logs TO service_role;
ALTER TABLE public.talent_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Talents view own activity" ON public.talent_activity_logs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins view talent activity" ON public.talent_activity_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'masteradmin'));
CREATE INDEX talent_activity_user_created_idx ON public.talent_activity_logs (user_id, created_at DESC);
CREATE INDEX talent_activity_type_created_idx ON public.talent_activity_logs (action_type, created_at DESC);

ALTER TABLE public.user_payout_methods
  ADD COLUMN IF NOT EXISTS withdrawal_available_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.manage_talent_payout_method(
  p_action text,
  p_method_id uuid DEFAULT NULL,
  p_provider text DEFAULT NULL,
  p_phone_number text DEFAULT NULL,
  p_account_name text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_method public.user_payout_methods%ROWTYPE;
  v_phone text;
  v_name text;
  v_provider text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;

  IF p_action = 'create' THEN
    v_provider := lower(trim(coalesce(p_provider, '')));
    v_phone := regexp_replace(coalesce(p_phone_number, ''), '[^0-9+]', '', 'g');
    v_name := trim(coalesce(p_account_name, ''));
    IF v_provider NOT IN ('mtn', 'vodafone', 'airteltigo') THEN RAISE EXCEPTION 'Unsupported payout provider'; END IF;
    IF v_phone !~ '^(\+233|0)[0-9]{9}$' THEN RAISE EXCEPTION 'Enter a valid Ghana mobile number'; END IF;
    IF char_length(v_name) < 2 OR char_length(v_name) > 100 THEN RAISE EXCEPTION 'Account name must be between 2 and 100 characters'; END IF;

    INSERT INTO public.user_payout_methods (user_id, provider, phone_number, account_name, is_default, withdrawal_available_at)
    VALUES (v_user, v_provider, v_phone, v_name, NOT EXISTS (SELECT 1 FROM public.user_payout_methods WHERE user_id = v_user), now() + interval '24 hours')
    RETURNING * INTO v_method;

    INSERT INTO public.talent_activity_logs (user_id, action_type, entity_type, entity_id, summary, metadata)
    VALUES (v_user, 'payout_method_added', 'payout_method', v_method.id, 'Added a payout destination', jsonb_build_object('provider', v_provider, 'phone_last4', right(v_phone, 4)));
    INSERT INTO public.system_logs (admin_id, action_type, description, new_value)
    VALUES (v_user, 'talent_payout_method_added', 'Talent added a payout destination', jsonb_build_object('method_id', v_method.id, 'provider', v_provider, 'phone_last4', right(v_phone, 4)));
    RETURN jsonb_build_object('success', true, 'id', v_method.id, 'available_at', v_method.withdrawal_available_at);
  ELSIF p_action = 'delete' THEN
    IF p_method_id IS NULL THEN RAISE EXCEPTION 'Payout method is required'; END IF;
    SELECT * INTO v_method FROM public.user_payout_methods WHERE id = p_method_id AND user_id = v_user FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Payout method not found'; END IF;
    IF EXISTS (SELECT 1 FROM public.withdrawals WHERE payout_method_id = p_method_id AND status IN ('pending','processing')) THEN
      RAISE EXCEPTION 'This payout method has an active withdrawal';
    END IF;
    DELETE FROM public.user_payout_methods WHERE id = p_method_id AND user_id = v_user;
    INSERT INTO public.talent_activity_logs (user_id, action_type, entity_type, entity_id, summary, metadata)
    VALUES (v_user, 'payout_method_removed', 'payout_method', p_method_id, 'Removed a payout destination', jsonb_build_object('provider', v_method.provider, 'phone_last4', right(v_method.phone_number, 4)));
    INSERT INTO public.system_logs (admin_id, action_type, description, old_value)
    VALUES (v_user, 'talent_payout_method_removed', 'Talent removed a payout destination', jsonb_build_object('method_id', p_method_id, 'provider', v_method.provider, 'phone_last4', right(v_method.phone_number, 4)));
    RETURN jsonb_build_object('success', true);
  END IF;
  RAISE EXCEPTION 'Unsupported payout method action';
END;
$$;
REVOKE ALL ON FUNCTION public.manage_talent_payout_method(text, uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_talent_payout_method(text, uuid, text, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.audit_talent_submission() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.talent_activity_logs (user_id, action_type, entity_type, entity_id, summary, metadata)
  VALUES (NEW.designer_id, CASE WHEN NEW.parent_submission_id IS NULL THEN 'work_submitted' ELSE 'correction_submitted' END,
    'submission', NEW.id, CASE WHEN NEW.parent_submission_id IS NULL THEN 'Submitted work for client review' ELSE 'Submitted a requested correction' END,
    jsonb_build_object('project_name', left(NEW.project_name, 120), 'service_type', left(NEW.service_type, 80), 'status', NEW.status));
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.audit_talent_submission() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER audit_talent_submission_after_insert AFTER INSERT ON public.submissions FOR EACH ROW EXECUTE FUNCTION public.audit_talent_submission();

CREATE OR REPLACE FUNCTION public.audit_talent_message() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.talent_activity_logs (user_id, action_type, entity_type, entity_id, summary, metadata)
  VALUES (NEW.sender_id, 'message_sent', 'message', NEW.id, 'Sent a private message', jsonb_build_object('receiver_id', NEW.receiver_id));
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.audit_talent_message() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER audit_talent_message_after_insert AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.audit_talent_message();

CREATE OR REPLACE FUNCTION public.audit_talent_withdrawal() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.talent_activity_logs (user_id, action_type, entity_type, entity_id, summary, metadata)
    VALUES (NEW.user_id, 'withdrawal_requested', 'withdrawal', NEW.id, 'Requested an earnings withdrawal', jsonb_build_object('amount', NEW.amount, 'currency', NEW.currency, 'status', NEW.status));
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.talent_activity_logs (user_id, action_type, entity_type, entity_id, summary, metadata)
    VALUES (NEW.user_id, 'withdrawal_status_changed', 'withdrawal', NEW.id, 'Withdrawal status changed', jsonb_build_object('from', OLD.status, 'to', NEW.status, 'amount', NEW.amount, 'currency', NEW.currency));
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.audit_talent_withdrawal() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER audit_talent_withdrawal_after_change AFTER INSERT OR UPDATE OF status ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.audit_talent_withdrawal();

CREATE OR REPLACE FUNCTION public.audit_talent_assignment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid; v_status text; v_entity uuid;
BEGIN
  v_user := coalesce(NEW.designer_id, OLD.designer_id);
  v_status := coalesce(NEW.status, OLD.status);
  v_entity := coalesce(NEW.project_id, OLD.project_id);
  INSERT INTO public.talent_activity_logs (user_id, action_type, entity_type, entity_id, summary, metadata)
  VALUES (v_user, 'project_' || coalesce(v_status, lower(TG_OP)), 'project', v_entity, 'Project assignment changed', jsonb_build_object('status', v_status));
  RETURN coalesce(NEW, OLD);
END;
$$;
REVOKE ALL ON FUNCTION public.audit_talent_assignment() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER audit_talent_assignment_after_change AFTER INSERT OR UPDATE OF status OR DELETE ON public.project_assignments FOR EACH ROW EXECUTE FUNCTION public.audit_talent_assignment();

CREATE OR REPLACE FUNCTION public.audit_talent_contract_claim() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user uuid; v_status text; v_entity uuid;
BEGIN
  v_user := coalesce(NEW.designer_id, OLD.designer_id);
  v_status := coalesce(NEW.status, OLD.status);
  v_entity := coalesce(NEW.contract_id, OLD.contract_id);
  INSERT INTO public.talent_activity_logs (user_id, action_type, entity_type, entity_id, summary, metadata)
  VALUES (v_user, 'contract_' || coalesce(v_status, lower(TG_OP)), 'contract', v_entity, 'Contract claim changed', jsonb_build_object('status', v_status));
  RETURN coalesce(NEW, OLD);
END;
$$;
REVOKE ALL ON FUNCTION public.audit_talent_contract_claim() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER audit_talent_contract_claim_after_change AFTER INSERT OR UPDATE OF status OR DELETE ON public.job_contract_claims FOR EACH ROW EXECUTE FUNCTION public.audit_talent_contract_claim();