INSERT INTO public.system_settings (key, value, description)
VALUES
  ('salaries_baseline_usd', '5200'::jsonb, 'Verified salaries paid to talent off-platform before in-app payout tracking began (USD).'),
  ('salaries_baseline_note', '"Includes verified payouts made to Prime Haven talent before in-app tracking began."'::jsonb, 'Public explanation shown with the Salaries Paid figure.')
ON CONFLICT (key) DO NOTHING;

DROP FUNCTION IF EXISTS public.public_total_salaries_paid();

CREATE OR REPLACE FUNCTION public.public_total_salaries_paid()
RETURNS TABLE(total_ghs numeric, payout_count integer, last_paid_at timestamptz, baseline_usd numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH all_payouts AS (
    SELECT amount, COALESCE(timestamp, created_at) AS paid_at
    FROM public.payments
    WHERE lower(COALESCE(status, '')) IN ('completed', 'success', 'successful', 'paid')
      AND lower(COALESCE(type, '')) IN ('salary', 'withdrawal', 'payout')
    UNION ALL
    SELECT amount, COALESCE(processed_at, updated_at, created_at)
    FROM public.withdrawals
    WHERE lower(COALESCE(status, '')) IN ('completed', 'success', 'successful', 'paid')
    UNION ALL
    SELECT amount, created_at
    FROM public.affiliate_payouts
    WHERE lower(COALESCE(status, '')) IN ('paid', 'completed', 'success', 'successful')
    UNION ALL
    SELECT amount, COALESCE(updated_at, created_at)
    FROM public.project_tips
    WHERE lower(COALESCE(status, '')) IN ('completed', 'paid', 'success', 'successful')
  )
  SELECT
    COALESCE(SUM(p.amount), 0)::numeric AS total_ghs,
    COUNT(*)::integer AS payout_count,
    MAX(p.paid_at) AS last_paid_at,
    COALESCE((SELECT (s.value #>> '{}')::numeric FROM public.system_settings s WHERE s.key = 'salaries_baseline_usd'), 0)::numeric AS baseline_usd
  FROM all_payouts p;
$$;

REVOKE ALL ON FUNCTION public.public_total_salaries_paid() FROM public;
GRANT EXECUTE ON FUNCTION public.public_total_salaries_paid() TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.public_total_salaries_paid() IS
  'Aggregate of completed payouts to talent (GHS) plus the verified off-platform baseline in USD. Safe for anonymous read on the marketing site.';