# Salaries Paid card: verified baseline that goes live

The homepage "Salaries Paid" card currently reads from live data only, and the live total is genuinely 0 right now, so the card shows $0. We will seed a verified historical baseline of $5,200 (money already paid to talent off-platform) and let the card switch to the real cumulative total the moment tracked payouts pass that mark.

## What qualifies as a salary payout

A payout counts toward the total only when money has actually left Prime Haven and reached a professional. Four sources qualify:

1. Completed talent withdrawals (Korapay/MoMo) — status completed/success/paid.
2. Manual salary payments recorded by an admin in the Finance Hub — payment type salary/payout, status completed.
3. Affiliate/referral commissions actually paid out — affiliate payouts marked paid.
4. Client tips forwarded to the professional — tips with a completed/paid status.

Pending, requested, processing, failed or reversed records never count. Each record counts once, on the date it was marked paid, so the total only ever moves up.

## How the number is displayed

- The card shows the greater of the $5,200 verified baseline and the live tracked total.
- The value is rounded down to the nearest $100 and suffixed with "+" — so $5,200+ today, and $6,400+ once real payouts reach $6,437. Rounding down means the claim is never overstated.
- Amounts are stored in Ghana cedis and converted to USD at the live rate; the baseline itself is held in USD.
- The card keeps its "Live" badge, the 60-second refresh, and the realtime update when a new payout lands.
- The click-through detail panel explains the figure honestly: total paid, number of tracked payouts, last payout date, the FX rate, and a line noting that the figure includes verified payouts made before in-app tracking began.

## Technical notes

- Add a `system_settings` row `salaries_baseline_usd` = `5200` (editable later by a masteradmin), plus `salaries_baseline_note` describing it as verified off-platform payouts.
- Rewrite `public.public_total_salaries_paid()` (security definer, anon-executable) to:
  - union completed rows from `payments` (type salary/payout/withdrawal), `withdrawals`, `affiliate_payouts` (status paid), and `project_tips` (status completed/paid);
  - return `total_ghs`, `payout_count`, `last_paid_at`, and the new `baseline_usd` read from `system_settings` (the client cannot read that table directly, so the RPC surfaces it).
- Update `StatsSection.tsx` to compute `displayUsd = max(baseline_usd, total_ghs / rate)`, floor to the nearest 100, and render with a `+`. Keep the existing `AnimatedCounter`, badge and drill-down structure; adjust the drill-down copy and the "across N payouts" line so it reads correctly while the baseline is still the larger number.
- No change to how payouts are created or approved — this is display and aggregation only.
