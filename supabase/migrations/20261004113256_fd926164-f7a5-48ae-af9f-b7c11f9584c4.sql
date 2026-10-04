REVOKE EXECUTE ON FUNCTION public.audit_withdrawal_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_role_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_project_status() FROM PUBLIC, anon, authenticated;