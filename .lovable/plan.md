# Testing Feedback — Implementation Plan

## 1. Bookkeeping

**Category filtering by type**
- Split the existing `CATEGORIES` constant into `INCOME_CATEGORIES` and `EXPENSE_CATEGORIES` in `src/pages/Bookkeeping.tsx`.
- In the Record Transaction modal, render the list based on `txForm.type` (income vs. expense). Reset `category` when the type changes.

**Auto-generated Ref number**
- On modal open, prefill `reference_number` with `TXN-YYYYMMDD-XXXX` (random 4-char). Keep the field editable but read-only-looking with a "Regenerate" icon.

**Custom categories + Category management**
- New table `transaction_categories` (business_id, name, type [income|expense], is_default, created_by). Seed defaults on first read via a hook.
- Replace the Select with a combobox that lists DB categories filtered by type and includes an "+ Add new category" inline action which inserts into `transaction_categories`.
- Add a small "Manage categories" link/button next to the field opening a `CategoryManagerDialog` (list, rename, delete, add) scoped to the current business and the active type.

## 2. Banking

- Add a "Download Statement" button on `/banking/transactions` and account detail header. Generates a PDF/CSV/Excel of filtered transactions client-side now (server/Paystack integration later). A tooltip notes "Bank-issued statement available after Paystack integration" for the official statement option.

## 3. Universal Export (CSV / Excel / PDF)

- Extend `src/components/ImportExportButtons.tsx` (or create `ExportMenu.tsx`) to expose a single split-button with three formats:
  - CSV (existing util)
  - Excel via `xlsx` (already in deps if present, else add)
  - PDF via `jspdf` + `jspdf-autotable`
- Wire it into: Bookkeeping transactions, Banking transactions, Invoicing list, Invoicing per-row, Customers, Inventory, Payroll, Reports.

## 4. Invoicing

- Per-invoice export: add a row action menu (CSV / Excel / PDF) on `/invoicing` that exports just that invoice (header + line items + totals).
- Confirm the existing "add customer name when generating invoice" still works (already resolved per user).
- Fix Voice agent (see section 7).

## 5. Customers

- Add Edit action on each row in `/customers` opening a dialog (reuse Create form). Update via Supabase `customers` row matching `business_id`.

## 6. Business Owner Dashboard Revamp

- Add "Add Transaction" to Quick Actions on `/dashboard` (opens the same Record Transaction modal via a shared component extracted from Bookkeeping). For industries where bookkeeping is not the primary flow (e.g. retail/POS), substitute "New Sale" or "New Invoice" using `industry-config.ts`.
- Tighten the Quick Actions grid with industry-aware labels and icons; surface zero-data CTAs.
- Polish hero KPIs, add a "Recent Activity" mini-feed and a "This Week" chart strip.

## 7. Voice Agent — global active state

- Move the `VoiceCaptureProvider` mount to the top of `AppLayout` (currently scoped lower), so every `/dashboard/**` page shares one provider instance.
- Audit pages whose dialogs/forms don't currently call `useVoiceForm`: Invoicing create-invoice dialog, Customers, Inventory product, POS, Payroll runs, Banking transfer. Wire `useVoiceForm({ enabled: open, ... })` on each.
- Fix Invoicing controls: `FloatingVoiceButton` mic/on/off buttons not firing — verify event handlers receive the `autoListen` state from context and re-render. Ensure z-index sits above Sheet/Dialog overlays.
- Add a persistent toggle in `AppLayout` header so the on/off state is always reachable, mirroring the floating control.

## 8. Settings persistence bug (fundhillmfb@gmail.com)

- Audit the Business tab save handler in `src/pages/Settings.tsx`: confirm it updates `businesses` (not just `business_settings`) and that `useBusiness()` invalidates its query on success.
- Add a verification gate fix: `OnboardingGuard` likely checks specific required fields (CAC/TIN/state/LGA). Add logging and ensure the form writes every required column. If certain fields are saved to `business_settings` instead of `businesses`, migrate them.
- Add a post-save `queryClient.invalidateQueries(['business'])` so other modules don't see stale data.

## 9. Admin Dashboard

- Stop showing UUIDs in `/admin/activity` and elsewhere. Join `activity_logs.user_id → profiles + auth.users.email`; show `email` (or full name) plus a human label for `entity_type` (e.g. "Invoice #INV-00012") by looking up the entity name where feasible.
- Expand admin activity logging: add a server-side trigger or explicit `log_activity` calls for admin actions (subscription grant/disable, user enable/disable, role change, announcement post). Add filters (actor, action, date range) and search by email.
- Add the public site's reusable Navbar + Footer (`PublicNavbar`, `PublicFooter`) to `AdminLayout` so admins can jump back to marketing pages. Keep the admin sidebar.

## Technical notes

- New migration: `transaction_categories` (+ RLS using `user_belongs_to_business`, GRANTs to authenticated/service_role). Seed defaults via client-side upsert on first load.
- New deps if missing: `xlsx`, `jspdf`, `jspdf-autotable`.
- Shared component: `RecordTransactionDialog` extracted from Bookkeeping for reuse in dashboard Quick Actions.
- Voice fix likely a context scoping bug; verify with console logs after moving provider.
- No changes to `src/integrations/supabase/client.ts` or auto-generated types.

## Out of scope (deferred)

- Real Paystack statement-of-account API (waiting on Paystack integration).
- Offline/PWA work (separate approved track).
