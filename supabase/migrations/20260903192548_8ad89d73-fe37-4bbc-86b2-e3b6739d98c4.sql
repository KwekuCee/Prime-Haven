REVOKE ALL ON FUNCTION public.admin_archive_ledger(boolean) FROM anon;
REVOKE ALL ON FUNCTION public.check_withdrawal_already_paid(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.admin_remove_withdrawal_request(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_archive_ledger(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_withdrawal_already_paid(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_remove_withdrawal_request(uuid, text) TO authenticated;