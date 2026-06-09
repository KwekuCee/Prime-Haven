-- Migration: Allow authenticated users to insert their own pending withdrawals
ALTER TABLE IF EXISTS public.withdrawals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'Users can insert own withdrawals'
      AND polrelid = 'public.withdrawals'::regclass
  ) THEN
    CREATE POLICY "Users can insert own withdrawals"
      ON public.withdrawals FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy
    WHERE polname = 'Users view their own withdrawals'
      AND polrelid = 'public.withdrawals'::regclass
  ) THEN
    CREATE POLICY "Users view their own withdrawals"
      ON public.withdrawals FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END$$;

GRANT SELECT, INSERT ON public.withdrawals TO authenticated;
GRANT ALL ON public.withdrawals TO service_role;
