-- Trigger-only functions: never callable directly
REVOKE EXECUTE ON FUNCTION public.guard_clients_self_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_designer_details_sensitive() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_profiles_sensitive() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_submissions_workflow() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_assignment_submitted() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_designer_on_ph_approval() FROM PUBLIC, anon, authenticated;
-- Server-only money functions (could create fake commissions)
REVOKE EXECUTE ON FUNCTION public.process_affiliate_commission(text, text, text, numeric) FROM PUBLIC, anon, authenticated;
-- Signed-in only actions: remove visitor access, keep signed-in users/admins working
REVOKE EXECUTE ON FUNCTION public.admin_archive_ledger(boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_remove_withdrawal_request(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.check_withdrawal_already_paid(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_affiliate_payout_paid(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.release_referrals_for_withdrawal(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_job_contract(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.release_job_contract(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.release_job_contract_claim(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.start_job_contract_work(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.start_project_work(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_job_contract_work(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_user_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_archive_ledger(boolean), public.admin_remove_withdrawal_request(uuid, text),
  public.check_withdrawal_already_paid(uuid), public.mark_affiliate_payout_paid(uuid), public.release_referrals_for_withdrawal(uuid),
  public.claim_job_contract(uuid), public.release_job_contract(uuid), public.release_job_contract_claim(uuid),
  public.start_job_contract_work(uuid), public.start_project_work(uuid), public.submit_job_contract_work(uuid),
  public.current_user_email() TO authenticated;