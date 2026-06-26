## Scope

Eight fixes from the 24 June review, grouped by area.

---

### 1. Team invitations actually send email

`src/pages/Settings.tsx` inserts into `team_invitations` but never calls the `send-email` edge function, so no email goes out.

- After successful insert, get back the row's `token`, build an accept URL (`${SITE_URL}/accept-invite?token=...`), and invoke `send-email` with a branded HTML template (company name, inviter name, role, CTA button, 7‑day expiry note).
- Surface failures distinctly: "Invitation saved but email failed — copy this link" with a copy button as a fallback.
- Quick check on the `send-email` function: confirm it returns a structured `{ ok, id, error }` and surfaces Resend errors. Add minimal logging.

### 2. Inline "create new" routing for foreign-key dropdowns

Pattern: every dropdown that picks a related record gets a `+ Create new …` item at the bottom. Choosing it navigates to the origin tab/page with a `?returnTo=…&prefill=…` query, and after the new record is created the user is bounced back with the new id pre-selected (via `sessionStorage` handoff so we don't refetch state).

Identified instances to wire up:

| Form / modal | Field | Origin |
|---|---|---|
| Payroll → Add Employee | Department | `/payroll` → Departments tab |
| Payroll → Add Employee | Job title | `/payroll` → Jobs tab |
| Invoicing → New Invoice | Customer | `/customers` |
| Invoicing → New Invoice | Product (line item) | `/inventory/products` |
| POS → cart add | Product | `/inventory/products` |
| Inventory → Products | Category | `/inventory/categories` |
| Inventory → Products | Supplier | `/inventory/suppliers` |
| Inventory → Products | Location | `/inventory/stock` (locations) |
| Inventory → Purchase Orders | Supplier | `/inventory/suppliers` |
| Inventory → Stock movement | Location | `/inventory/stock` |
| Bookkeeping → Journal Entry | Account | `/bookkeeping/chart-of-accounts` |
| Banking → Transfer / Scheduled | Beneficiary | `/banking/beneficiaries` |
| Banking → Transfer | From account | `/banking/accounts` |
| Budgeting → New Budget Item | Category/Account | `/bookkeeping/chart-of-accounts` |
| Debt/Credit → New Receivable | Customer | `/customers` |
| Debt/Credit → New Payable | Supplier | `/inventory/suppliers` |
| Store Management → assign staff | Employee | `/payroll` → Employees |

Build one small reusable `<EntitySelect>` wrapper around the existing `Select` so we don't duplicate the routing/return logic per form.

### 3. Inventory import/export on all sub-pages

Currently only `/inventory/products` has `ImportExportButtons`. Add to:

- `InventoryCategories` (CSV import/export)
- `InventorySuppliers` (CSV/Excel import, PDF export)
- `InventoryStock` (CSV import for stock adjustments, PDF stock report)
- `InventoryPurchaseOrders` (CSV import, PDF export per PO + list)
- `InventoryReports` (PDF export of each report)
- `InventoryOverview` (PDF summary export)

Reuse `ImportExportButtons` / `ExportMenu`; add per-table column maps and validators.

### 4. Admin activity log revamp (`/admin/activity`)

Tabbed view backed by the existing `activity_logs` table plus new filters:

- Tabs: **Authentication** (sign-in/sign-up/password reset/role changes), **User Activity** (CRUD on business data), **Admin Operations** (subscription grant/disable, announcements, role assignments), **System** (errors, edge function failures).
- Filters: date range, user (search by email), role, action type, entity type, business.
- Backfill: add a small migration to record auth events via a trigger on `auth.users` → `activity_logs` (sign-up only; sign-in via client-side log on `AuthContext`).
- Keep showing email instead of UUID (already done) and add CSV export of the filtered view.

### 5. Mobile "install / suggestion" prompt cleanup

Investigate which prompt is showing on `getprime.app` mobile (likely the PWA install banner from `public/manifest.json` + `sw.js`, or a leftover toast). Either gate it behind an explicit dismiss-remembered flag or remove it from public marketing pages and only show inside the app shell after login.

### 6. Consolidate `/admin/businesses` into `/admin/users`

- Delete `AdminBusinesses.tsx` route and sidebar entry.
- Extend `AdminUsers.tsx`:
  - Show **Name** as the business owner's full name (already in payload) — confirm column reads `full_name`, fall back to email.
  - Add filter chips: **All / Business Owners / Individuals / Team Members / Admins**.
  - Add a secondary column "Business" (company_name) and a search across name/email/company.
  - Row click → side panel with the business details that used to live on `/admin/businesses` (industry, CAC, TIN, address, plan, created_at).

### 7. Footer copyright

`src/components/PublicFooter.tsx` line ~50: replace `© {year} {SITE_NAME}. All rights reserved.` with `© {year} Oreone Inc. All rights reserved.` Keep `SITE_NAME` for branding elsewhere. Audit for the same string in `AppLayout`, emails, and PDFs and update consistently.

### 8. Onboarding industry/subcategory mismatch

Reported: user picks **Agriculture → Agro Processing** but dashboard shows harvest/farming widgets — meaning we read `business_category` (Agriculture) and ignore `business_subcategory`.

- Audit `IndustryContext` and `INDUSTRY_CONFIG` lookups: today they key only on `BusinessCategory`. Extend to consider `business_subcategory` for terminology, quick actions, KPIs, and hidden modules where it materially changes the workflow (Agro Processing vs Crop Farming vs Livestock, Pharmacy vs Hospital, Fintech vs Traditional Banking, etc.).
- Add a `subcategoryConfig?: Partial<IndustryConfig>` map per category and deep-merge over the base category config when a subcategory is set.
- Verify `Onboarding.tsx` actually persists `business_subcategory` (it does in the payload — confirm DB column exists; if not, migration to add it).
- Add a "Change industry" action in Settings → Business so users can correct a wrong pick.

---

## Technical notes

- **Edge function**: `send-email` already exists with `getprime.app` sender; we just need to call it from the invite flow and from any future server-side notifications.
- **Activity backfill**: use a single SECURITY DEFINER trigger on `auth.users` insert; sign-ins logged from `AuthContext.onAuthStateChange` via `log_activity` RPC.
- **EntitySelect**: lives at `src/components/EntitySelect.tsx`, generic over `{id,label}`; supports `createRoute`, `createLabel`, optional `prefill`.
- **Return-trip handoff**: `sessionStorage` key `pendingEntity:<kind>` set by origin page on create, consumed by `EntitySelect` on mount.

## Out of scope (call out, don't build)

- Re-architecting industry config into a full rules engine — we'll only deep-merge subcategory overrides for now.
- Per-user push notifications for the mobile prompt.