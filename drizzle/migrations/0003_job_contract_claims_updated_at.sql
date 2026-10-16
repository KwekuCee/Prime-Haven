ALTER TABLE public.job_contract_claims ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
DROP TRIGGER IF EXISTS update_job_contract_claims_updated_at ON public.job_contract_claims;
CREATE TRIGGER update_job_contract_claims_updated_at BEFORE UPDATE ON public.job_contract_claims FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();