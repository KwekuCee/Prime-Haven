CREATE OR REPLACE FUNCTION public.public_total_salaries_paid()
RETURNS TABLE(total_ghs numeric, payout_count integer, last_paid_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH salary_payments AS (
    SELECT amount, COALESCE(timestamp, created_at) AS paid_at
    FROM public.payments
    WHERE status = 'completed'
      AND lower(type) IN ('salary', 'withdrawal', 'payout')
  ),
  salary_withdrawals AS (
    SELECT amount, COALESCE(processed_at, updated_at, created_at) AS paid_at
    FROM public.withdrawals
    WHERE lower(status) IN ('completed', 'success', 'successful', 'paid')
  ),
  all_payouts AS (
    SELECT * FROM salary_payments
    UNION ALL
    SELECT * FROM salary_withdrawals
  )
  SELECT
    COALESCE(SUM(amount), 0)::numeric AS total_ghs,
    COUNT(*)::integer AS payout_count,
    MAX(paid_at) AS last_paid_at
  FROM all_payouts;
$$;

GRANT EXECUTE ON FUNCTION public.public_total_salaries_paid() TO anon, authenticated, service_role;