-- Add server-side release function for job contract claims
CREATE OR REPLACE FUNCTION public.release_job_contract_claim(p_contract_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_removed_ids uuid[];
BEGIN
  DELETE FROM public.job_contract_claims
  WHERE contract_id = p_contract_id
    AND designer_id = auth.uid()
    AND status = 'active';

  SELECT array_remove(active_designer_ids, auth.uid())
  INTO v_removed_ids
  FROM public.job_contracts
  WHERE id = p_contract_id;

  UPDATE public.job_contracts
  SET
    active_designer_ids = COALESCE(v_removed_ids, '{}'),
    active_designers_count = COALESCE(array_length(v_removed_ids, 1), 0)
  WHERE id = p_contract_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_job_contract_claim(uuid) TO authenticated;
