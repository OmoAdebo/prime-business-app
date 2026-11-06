# Prime Business — Read-Only Product Audit

## Objective
Deliver an independent, evidence-based assessment of production readiness without modifying application code, database schema/data, settings, deployments, or user records.

## Audit approach
1. Map product purpose, roles, onboarding, authentication, navigation, dashboards, subscription rules, and industry tailoring from the actual routes and implementation.
2. Trace key business workflows across UI, queries, writes, database relationships, RLS/grants, and Edge Functions—especially financial, inventory, subscription, and payment flows. Inspect the source schema and migration history without executing SQL or changing data.
3. Review integrations, email, storage, monitoring, offline behavior, accessibility, responsive layouts, performance/scalability, testing, and code quality. Use safe browser-only checks on public pages and non-mutating responsive inspection; do not submit forms that send mail, create records, or trigger payments.
4. Separate verified source/runtime findings, potential risks, recommendations, and areas not tested. Do not treat source migrations as proof of the live database or deployed function configuration.
5. Produce a detailed Markdown report with all ten requested sections: executive assessment; module matrix; UI/mobile/accessibility; architecture/data integrity; severity-ranked security findings; integrations; performance/scalability; QA evidence; prioritized 30/60/90-day roadmap; and final verdict with a transparent readiness score.

## Evidence limitations to state
- Public production pages can be inspected without a user session, but authenticated workflows and live business data cannot be verified without a designated safe test account/environment.
- Repository SQL and function source do not establish current production schema, grants, RLS, secrets, SMTP, payment configuration, or deployed versions; no production mutations or external payment/email tests will be performed.
- Any score will reflect the evidence actually obtained and reduce confidence where core workflows or live controls remain unverified.

## Deliverable
Save the completed audit as a readable Markdown report for the user. No application changes are in scope.