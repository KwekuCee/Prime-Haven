REVOKE EXECUTE ON FUNCTION public.approve_project_submission(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.release_expired_project_claims() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.claim_project(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.release_project_claim(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.approve_project_submission(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_project(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_project_claim(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_expired_project_claims() TO service_role;

ALTER FUNCTION public.start_job_contract_work(uuid) SET search_path TO 'public';
ALTER FUNCTION public.submit_job_contract_work(uuid) SET search_path TO 'public';
ALTER FUNCTION public.update_site_promos_updated_at() SET search_path TO 'public';