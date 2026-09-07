# Growth Opportunities, Financial Health & Admin-controlled Plan Features

## 1. Two new pages for business owners

**Growth Opportunities** (`/growth`)
Analyses the owner's real data from the last 90 days and lists concrete, ranked opportunities, each with a short reason and a button that jumps to the right place in the app:
- Top-selling products/services and slow movers (from sales/order items)
- Customers who used to buy but have gone quiet (re-engagement list)
- Unpaid invoices worth chasing, ranked by amount and age
- Categories where spend is rising faster than income
- Pricing headroom: items with the thinnest margin (cost vs unit price)
- Stock that keeps running out (repeat low-stock signals)
Each opportunity shows an estimated value in Naira where it can be calculated. Empty state explains what to record to unlock each insight.

**Financial Health** (`/financial-health`)
A single score (0-100) with a colour band and the numbers behind it:
- Cash position (bank + register balances)
- Profit trend over the last 6 months (income vs expenses chart)
- Money owed to you vs money you owe, with ageing
- Expense ratio and gross margin
- Runway estimate (months of cover at current burn)
Each metric shows a status pill (healthy / watch / act now) plus a plain-language tip and a link to the relevant module (Bookkeeping, Debt & Credit, Banking).

Both pages sit under the existing app layout, are role-gated to owner / accountant / store manager (health is finance-only: owner + accountant), and appear in the sidebar's Insights group.

## 2. Dashboard home preview

Add a compact three-card strip on the dashboard, matching the reference style (coloured left edge, icon chip, one-line dynamic summary, outline button):
- Growth Opportunities → "We found N growth opportunities" → View Opportunities
- Inventory Alerts → "N products are running low" → View Alerts (goes to Inventory stock)
- Financial Health → one-line verdict from the score → View Report

Copy and counts are computed from live data, not hardcoded; when there is no data the card invites the owner to record their first entry instead of showing a fake number.

## 3. Admin-controlled plan features

Replace hardcoded free/pro assumptions with a feature registry the admin edits.

- New table `plan_features`: feature key, label, description, group, and a per-plan toggle (starter / growth / business), plus display order and an "enabled globally" switch. Seeded with every gateable module and section (each sidebar module, Growth Opportunities, Financial Health, exports, voice commands, payments/settlement, multi-location, etc.).
- New admin page **Admin → Plan Features**: a matrix of features by plan with switches, search, grouping, and a save action. Admins can also add a new feature key so future features are controlled without a code change.
- New `FeatureAccessProvider` + `useFeature(key)` hook: loads the matrix once, combines it with the business's current plan, and returns allow/deny. A `<FeatureGate feature="...">` wrapper renders either the section or a subtle upgrade prompt linking to /pricing.
- Sidebar, dashboard cards and the two new pages read from this registry, so what a plan shows is set by admins at any time.
- Admin and staff roles bypass the gate, as they do today.

## Technical notes

- Backend is your external Supabase project, so the SQL for `plan_features` (table, GRANTs, RLS: read for authenticated, write for admin roles only) and its seed rows will be delivered as a migration file in `db/` for you to run — this chat cannot execute it against that project.
- Insight calculations run client-side from existing tables (transactions, invoices, receivables/payables, products, stock_levels, sales, customers) with React Query caching; no new data pipeline.
- New files: `src/pages/GrowthOpportunities.tsx`, `src/pages/FinancialHealth.tsx`, `src/components/InsightCards.tsx`, `src/contexts/FeatureAccessContext.tsx`, `src/components/FeatureGate.tsx`, `src/pages/admin/AdminPlanFeatures.tsx`, `db/plan_features.sql`. Edits: `App.tsx` routes, `AppSidebar.tsx`, `Dashboard.tsx`, `AdminLayout.tsx`.
