# End-to-end client walkthrough (registration → project → payment → dashboard)

Goal: prove that a brand-new client can create an account, submit a project, complete checkout, and see the resulting order in their own dashboard — using a 100% promo code so no money moves, then removing the test data.

## Walkthrough steps

1. **Prepare a promo code**
   - Confirm an active 100% discount code exists (create one temporarily if not) so checkout completes without a real charge.

2. **Client sign-up + project submission**
   - Drive the public `/start-project` flow in a headless browser with a fresh test identity (name, unique test email, WhatsApp, business name, password).
   - Select a service and tier, add a description, optionally attach a reference image, and set the client's account password in the checkout step.

3. **Checkout**
   - Apply the 100% promo code, confirm the summary shows $0 due, and submit the order.
   - Capture what the app shows on success (confirmation screen / redirect).

4. **Verify backend side effects**
   - Order row created with completed payment status.
   - Client record created in the client database with name, email, WhatsApp, company.
   - Auth user created for the client.
   - Linked project created and published, plus the mirrored job contract entry so professionals can claim it.

5. **Client login + dashboard**
   - Sign in at `/client/login` with the credentials from step 2.
   - Confirm the client dashboard shows their profile details, the spend/project summary stats, and the new order row (service, tier, amount, payment status, project status, date).
   - Confirm the client sees only their own data.

6. **Cleanup**
   - Delete the test order, project, job contract, client record and auth user so no test data remains.

## Deliverable

A short report of each step with pass/fail, screenshots of the checkout confirmation and the client dashboard, and a list of anything broken along the way (with the specific cause) — no fixes applied until you approve them.

## Technical notes

- Browser automation via Playwright against the local dev server; database checks via read-only queries.
- The only write outside the normal user flow is the temporary promo code (if one must be created) and the cleanup deletions.
- If a step fails (e.g. account creation or dashboard visibility), the walkthrough stops there, the failure is diagnosed, and the findings are reported rather than silently patched.
