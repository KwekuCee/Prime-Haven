# Repository Review — fix plan

I checked each finding in the review against the live database and code.

## Checked against the live system
- **Finding 1 is real and still open.** Earlier today I locked the *older* version of the affiliate commission action. The newer version (the one the start-project pages actually use) can still be run by anyone. No fake referrals exist yet (0 rows).
- **2a is real.** After payment, the system marks the client's *most recent* project as paid instead of the project tied to that order.
- **2b is real.** Nothing in the database stops the same payment reference from being saved twice.
- **2c is real.** If no client account matches a payment, the system confirms receipt to the payment provider without recording the payment.
- **3 is real.** The "Salaries Paid" card shows the $5,200 starting figure under a "Live" badge.

## What I will do

1. **Stop fake affiliate commissions**
   - Lock the newer commission action so only the server can run it.
   - Remove the three places where the browser sends the commission amount (two on the client Start-a-project page, one on the public one).
   - Work out the commission on the server, from the amount the payment provider confirms: 15%, the same rate the site uses today. The free-order case records no commission.
   - Check how withdrawals are released. Only an admin or the affiliate can release referrals; I will confirm the payout approval stays admin-only.

2. **Fix the payment confirmation** (Paystack and Korapay)
   - Save the project's ID on the order at checkout, and mark exactly that project as paid.
   - Make it impossible to save the same payment reference twice. A retry is treated as "already recorded".
   - If a confirmed payment matches no client, save it anyway as "needs matching". It will appear in Payout Reconciliation and the Finance hub, so no money goes unrecorded.

3. **Check the payment records**
   - Look for duplicate references or paid orders with no payment record. I'll report what I find and change nothing without asking you.

4. **Make the Salaries Paid card honest**
   - Change the headline to read "incl. payouts made before platform tracking" while the starting figure is shown.
   - Show "Live" only once the tracked total passes the starting figure.

5. **Tidy the project files**
   - Delete the old duplicate backup folder (359 copied files).
   - Replace the boilerplate README with a short, accurate one.
   - Remove the outdated Replit notes.
   - Keep the current package setup, which the editor relies on.
   - Leave the settings file as is. It only holds public values and is managed automatically, so it can't be untracked from here.

6. **Final check**
   - Re-run the security scan and type check, and update the roadmap.

## Technical details
- Migration (part 1):
  - `REVOKE EXECUTE ON FUNCTION process_affiliate_commission(text,text,text,numeric,numeric,text) FROM PUBLIC, anon, authenticated; GRANT … TO service_role`.
- Migration (part 2):
  - Add `client_orders.client_project_id uuid` (references `client_projects`).
  - Remove existing duplicate references, then `CREATE UNIQUE INDEX payments_transaction_id_key ON payments(transaction_id) WHERE transaction_id IS NOT NULL`.
- `payment-webhook`:
  - Use `order.client_project_id`, falling back to the latest project only for older orders.
  - Insert the payment and treat error `23505` (duplicate) as already recorded.
  - With no matching client, insert a payment with `status='unmatched'`. `payments.user_id` is NOT NULL, so this record needs a nullable user field or a small `unmatched_payments` table. I'll use the table option.
  - Call `process_affiliate_commission` with the service role, passing the referral code stored on the order.
- `verify-payment` gets the same commission and project-ID changes.
- Checkout pages send the referral code and project ID into the order instead of calling the commission action.
- `StatsSection.tsx`: change the label and the conditions for showing "Live".
- Delete `.migration-backup/`, `replit.md` and `.replit*`. Rewrite `README.md`.
