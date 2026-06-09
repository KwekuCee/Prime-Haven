ALTER TABLE public.withdrawals REPLICA IDENTITY FULL;
ALTER TABLE public.designer_details REPLICA IDENTITY FULL;
ALTER TABLE public.user_payout_methods REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawals; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.designer_details; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_payout_methods; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;