# Prime Haven talent command center redesign

## Goal
Rebuild the entire talent portal as one cohesive Prime Haven command center using the established Ink & Signal palette, Sora headings, Manrope body text, and consistent interaction patterns. Improve security, auditability, reliability, responsiveness, accessibility, performance, and type safety without changing the approved 70% earning model or client-only approval workflow.

## Confirmed baseline
- The talent experience spans Dashboard, Marketplace, contracts/workspaces, submissions and corrections, messages, payments and withdrawals, profile/portfolio, settings, affiliate tools, and the specialized SMM workspace.
- The current dashboard is a long all-in-one screen with duplicated data loading and profession/category mapping, inconsistent status colors, very small labels, and several different card/loading patterns.
- Talent pages still bypass the shared query cache, use broad `any` casts, and repeat overlapping reads.
- Started-work UI state is partly stored in the browser instead of being derived fully from server-backed assignments and contract statuses.
- Payout details are currently updated directly from the browser without a dedicated validated, auditable server action.
- Some claim/start/release/submission paths contain direct-write fallbacks after protected actions fail; these can show false success and weaken auditability.
- Existing audit infrastructure records admin, withdrawal, role, project, and some submission events, but it does not provide talents with a complete personal activity history.
- The current persisted security scan reports no active findings, but its database result is stale; the dependency scan is blocked by the root workspace lockfile format.

## Phase 1 — Shared talent foundation
- Establish a single talent design system layer using semantic Prime Haven tokens: typography scale, surfaces, borders, status roles, spacing, focus states, skeletons, empty states, and motion presets.
- Consolidate profession names, service/category mappings, status labels, payout copy, and shared talent types into authoritative modules.
- Create reusable page headers, command cards, status badges, data panels, action bars, error states, and mobile navigation primitives.
- Keep components module-level and split oversized pages into focused feature components.

## Phase 2 — Command center and navigation
- Redesign the desktop sidebar, top bar, and mobile bottom navigation as one data-driven navigation model with correct active states, badges, labels, touch targets, and keyboard behavior.
- Rebuild `/dashboard` around immediate decisions: identity and availability, action-required queue, active work/deadlines, earnings snapshot, suitable marketplace opportunities, recent activity, and concise growth indicators.
- Move secondary material such as portfolio previews, achievements, leaderboard, goals, and detailed history into clearly separated views or progressive sections so the command center remains scannable.
- Replace browser-only “started project” truth with live assignment/contract state.

## Phase 3 — Work lifecycle redesign
- Redesign Marketplace, My Contracts, project workspace/chat, Submit Work, and correction flows as one continuous lifecycle.
- Present only profession-matched paid work, accurate deadlines, the 70% talent share, claim state, required actions, submission history, and client feedback.
- Remove unsafe or misleading direct-write fallbacks; protected claim, start, release, and submit operations will use server-enforced actions and show real failure states.
- Preserve first-come-first-served single claims, automatic deadline release, and client-only approval.

## Phase 4 — Earnings and payouts
- Redesign Payments as a clear earnings ledger: pending, available, withdrawn, tips/commissions where applicable, transaction history, payout methods, and withdrawal status.
- Replace conflicting payout schedules/minimums/currencies with one authoritative configuration and consistent copy.
- Move payout-detail changes behind a validated server action; validate each method, redact sensitive values in logs, notify the talent of changes, and prevent a new destination from being used silently after an account takeover.
- Keep all balances and withdrawable amounts server-derived; the browser will never determine entitlement.

## Phase 5 — Profile, portfolio, settings, affiliate, and SMM
- Unify Edit Profile, portfolio management/public preview, account settings, privacy, notifications, and account-support actions inside the same command-center shell.
- Restyle the affiliate area with the same navigation, typography, cards, loading states, and responsive behavior while retaining its distinct referral workflow.
- Break the oversized SMM workspace into focused campaign, content, connections, analytics, and schedule views while replacing its separate palette with semantic Prime Haven tokens.
- Standardize useful empty, loading, disconnected, unauthorized, and recoverable-error states across every talent route.

## Phase 6 — Talent activity and admin audit visibility
- Add immutable talent activity records for sign-in/security events, profile and payout changes, claims, starts, releases, submissions/corrections, messages sent, withdrawal requests, and important account changes.
- Give each talent a private Activity view containing only their own readable event history.
- Extend the admin Activity Log with a Talent filter and actor/entity context so authorized admins can investigate the full timeline.
- Never store passwords, tokens, full payout details, private file contents, or message bodies in audit metadata.

## Phase 7 — Security hardening
- Review every talent-facing table policy, grant, RPC, Edge Function, upload path, and browser mutation together; keep ownership and role checks server-side.
- Verify sender identity and valid participant relationships for direct and project messages; prevent spoofed senders and unrelated-account messaging.
- Validate and bound submission text, correction notes, profile fields, URLs, identifiers, payment references, and upload type/size on both client and server.
- Recheck profession-upgrade payment amount, currency, idempotency, ownership, and audit logging against the gateway response.
- Restrict privileged functions to the minimum roles, retain fixed search paths, and keep service credentials server-only.
- Run a fresh security scan after implementation and resolve only confirmed findings tied to talent flows or their shared security boundaries; unrelated public/admin findings remain untouched.

## Phase 8 — Data, performance, and type quality
- Move talent reads to the shared query cache with stable keys, targeted invalidation, retry/error states, and filtered realtime updates instead of full refetches for every change.
- Consolidate marketplace aggregation behind one typed server read so three legacy sources cannot drift in the browser.
- Lazy-load heavy charts, SMM scheduling/analytics tools, portfolio media, and route-specific dialogs.
- Replace `any` casts with generated database types and focused talent-domain types; type nullable database fields correctly.
- Repair or regenerate the workspace text lockfile safely so dependency scanning can run, then address confirmed production dependency vulnerabilities within this scope.

## Validation and release gates
- Run TypeScript checks, the project test suite, production build, database lint/security scan, and dependency scan with no unresolved errors introduced by this work.
- Test as a real talent account: sign in, edit profile, browse and claim work, start/release, message the correct participant, submit work/correction, view earnings, change payout method, request withdrawal, and review the personal activity timeline.
- Verify corresponding admin audit entries without exposing sensitive values.
- Test desktop and phone layouts for every talent route, including keyboard navigation, reduced motion, overflow, focus visibility, loading/empty/error states, and console/network errors.
- Implement in the phases above, validating each phase before continuing; database changes use migrations with explicit grants and row-level policies.

## Technical boundaries
- No PH approval will be reintroduced.
- The 70% talent share, $15 joining fee, client-only approval, and current client/payment business rules remain unchanged.
- No unrelated public-site or admin redesign is included, except the admin Talent Activity filter needed for audit visibility.
- Structural decisions introduced during implementation will be recorded in the project architecture rules.
