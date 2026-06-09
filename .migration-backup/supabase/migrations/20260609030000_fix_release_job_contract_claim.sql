-- Fix release_job_contract_claim to avoid assigning NULL to active_designer_ids
CREATE OR REPLACE FUNCTION public.release_job_contract_claim(p_contract_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_removed_ids uuid[];
  v_safe_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  -- Remove the claim record for the current authenticated user
  DELETE FROM public.job_contract_claims
  WHERE contract_id = p_contract_id
    AND designer_id = auth.uid()
    AND status = 'active';

  -- Compute the new active_designer_ids by removing the current user from the array
  SELECT array_remove(active_designer_ids, auth.uid())
  INTO v_removed_ids
  FROM public.job_contracts
  WHERE id = p_contract_id;

  -- Ensure we never assign NULL to the column by using a typed empty array fallback
  IF v_removed_ids IS NULL THEN
    v_removed_ids := v_safe_ids;
  END IF;

  UPDATE public.job_contracts
  SET
    active_designer_ids = v_removed_ids,
    active_designers_count = COALESCE(array_length(v_removed_ids, 1), 0)
  WHERE id = p_contract_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_job_contract_claim(uuid) TO authenticated;
