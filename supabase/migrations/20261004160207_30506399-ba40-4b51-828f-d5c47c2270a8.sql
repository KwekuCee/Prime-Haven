REVOKE ALL ON FUNCTION public.manage_talent_payout_method_service(uuid,text,uuid,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.request_talent_withdrawal_service(uuid,uuid,numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_withdrawal_for_payout_service(uuid,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalise_withdrawal_payout_service(uuid,uuid,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manage_talent_payout_method_service(uuid,text,uuid,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.request_talent_withdrawal_service(uuid,uuid,numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_withdrawal_for_payout_service(uuid,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalise_withdrawal_payout_service(uuid,uuid,text,text,text) TO service_role;