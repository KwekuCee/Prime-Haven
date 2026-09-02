-- Public, aggregate-only view of the total salaries Prime Haven has paid out.
-- Exposed as an RPC so the homepage "Our Impact" section can show a live figure
-- without granting anonymous users row-level access to the payments table.
--
-- Counts every completed payout to talent: manual salary payments recorded by
-- Finance ("salary") and approved mobile-money withdrawals ("withdrawal").
-- Amounts in `payments` are stored in GHS; the client converts to USD.

create or replace function public.public_total_salaries_paid()
returns table (
  total_ghs numeric,
  payout_count bigint,
  last_paid_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(sum(p.amount), 0)::numeric        as total_ghs,
    count(*)::bigint                           as payout_count,
    max(coalesce(p.timestamp, p.created_at))   as last_paid_at
  from public.payments p
  where p.type in ('salary', 'withdrawal')
    and coalesce(p.status, '') in ('completed', 'paid', 'success', 'successful');
$$;

revoke all on function public.public_total_salaries_paid() from public;
grant execute on function public.public_total_salaries_paid() to anon, authenticated;

comment on function public.public_total_salaries_paid() is
  'Aggregate total of completed salary/withdrawal payouts (GHS). Safe for anonymous read on the marketing site.';
