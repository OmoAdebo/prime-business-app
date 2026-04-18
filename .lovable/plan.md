

# Multi-Feature Update + Deployment Sync Plan

## 1. Vercel Deployment Sync (Investigation)

The Vercel deployment shows commit `1c4c277 "Auto-close mobile sidebar on nav"` as latest — this is from several messages ago. Recent Lovable changes (FloatingVoiceButton, landing page voice section, Settings fix, Dashboard empty states) are not on the Vercel-hosted main branch.

**Likely cause**: Lovable commits to its own branch (e.g. `lovable-dev`) and not directly to `main`. Vercel only auto-deploys from `main`. The user needs to either:
- Merge Lovable's branch into `main` via GitHub PR, OR
- Configure Vercel to deploy from the Lovable branch, OR
- Use Lovable's GitHub integration setting that pushes directly to `main`

**Action**: I'll flag this in the response — it's a GitHub/Vercel config issue, not a code issue. User should check **GitHub → Lovable integration settings** and ensure "Push directly to main branch" is enabled, or merge the Lovable branch PR.

---

## 2. Banking Transfers — Inter/Intra Bank

**File: `src/pages/banking/BankingTransfers.tsx`**

Add a tabbed interface:
- **Intra-Account** (existing) — between user's own accounts
- **Inter-Bank** — to external bank account (beneficiary or new recipient): bank name, account number, account name, amount, narration. Creates a debit transaction on source + records to `bank_transactions` with type `external_transfer`. Pulls from `beneficiaries` table for quick selection.
- **Same-Bank Transfer** — to another account within the same bank (different user/customer): account number lookup, narration.

All three create proper bank_transactions entries. Inter-bank transfers will be marked `pending` (real settlement requires payment provider integration — out of scope for MVP, will show "Pending settlement" status).

---

## 3. Branding Scoped to Dashboard Only

**File: `src/contexts/BrandingContext.tsx`**

Currently `applyTheme` writes CSS vars to `document.documentElement` globally — this leaks branding to public pages (Index, About, Pricing, etc.) when a logged-in business owner visits them.

**Fix**: 
- Track current pathname in BrandingProvider via `useLocation`
- Define public routes: `/`, `/about`, `/pricing`, `/contact`, `/login`, `/signup`, `/reset-password`, `/admin-register`, `/accept-invite`
- Only call `applyTheme` when pathname is NOT public
- When navigating to public route, call `applyTheme(DEFAULTS)` to reset

This ensures Prime's official Oreon emerald theme always shows on marketing pages, while custom branding only applies inside the dashboard shell.

---

## 4. Remove Lovable Placeholders + Set Prime Favicon

**Files**: `index.html`, `public/placeholder.svg`, `public/favicon.ico` (delete), `public/og-image.png` (if Lovable default)

- Update `<title>`, meta description, OG tags in `index.html` to Prime Business branding
- Remove/replace any "Lovable" mentions
- Need to **create a Prime "P" favicon** — I'll generate a simple SVG-based "P" icon in emerald (#22c55e) and reference it as `/favicon.svg`
- Delete `public/favicon.ico` and `public/placeholder.svg` if unused

**Question**: Should I generate a clean SVG "P" favicon programmatically, or does the user want to upload an official Prime logo? — I'll proceed with generating a clean SVG "P" mark in the brand emerald, and the user can swap later.

---

## 5. /#features Anchor Routing

**File**: `src/components/PublicNavbar.tsx` and `src/pages/Index.tsx`

- The Features link likely points to `/#features` but if user is on `/about` it won't scroll
- Add `id="features"` to the features section in `Index.tsx` (verify it exists)
- Update PublicNavbar Features link to use `<Link to="/#features">` and add a small effect that scrolls to the hash on mount
- Same treatment for `#pricing`, `#contact` if used

---

## 6. Inventory Products — Add Quantity Field + Merge Stock Management

**File: `src/pages/inventory/InventoryProducts.tsx`**

Update the Add/Edit Product modal:
- Add **Initial Stock Quantity** field (number input, default 0) next to Unit of Measure
- Add **Location** dropdown (optional, defaults to primary location)
- On submit: create product AND create initial `stock_movement` of type `receipt` for the entered quantity
- For Edit mode: show current stock as read-only with a button "Adjust Stock" that opens a quick adjustment dialog

This unifies product info + stock entry in one place. The separate `/inventory/stock` page remains for ongoing movements (sales, transfers, adjustments) but is no longer needed for initial creation.

Add a small banner on `/inventory/stock`: "Tip: New products can be added with initial stock from the Products page."

---

## 7. Activity Log for Business Owner Dashboard

**New file: `src/pages/dashboard/ActivityLog.tsx`** (or add a section to `RoleDashboard.tsx`)

**Database**: Need a new `activity_logs` table:
```
id, business_id, user_id, action_type, entity_type, entity_id, 
description, metadata (jsonb), created_at
```
With RLS: business owners can read all logs for their business; team members can only read their own.

**Triggers**: Add Postgres triggers on key tables (invoices, products, stock_movements, bank_transactions, journal_entries, payroll_runs) that insert into `activity_logs` on INSERT/UPDATE/DELETE.

**UI**: Activity feed on dashboard with:
- Filter by team member, action type, date range
- Avatar + name + action + entity link + timestamp
- Real-time updates via Supabase Realtime
- "Load more" pagination (20 per page)

This is the largest sub-task — gives owners full visibility into who did what.

---

## Files Summary

**Modified**: `src/contexts/BrandingContext.tsx`, `src/pages/banking/BankingTransfers.tsx`, `src/pages/inventory/InventoryProducts.tsx`, `src/pages/inventory/InventoryStock.tsx`, `src/components/PublicNavbar.tsx`, `src/pages/Index.tsx`, `src/components/RoleDashboard.tsx`, `index.html`

**Created**: `public/favicon.svg` (Prime P mark), `src/components/ActivityFeed.tsx`

**Deleted**: `public/favicon.ico`, `public/placeholder.svg` (if confirmed unused)

**Database**: New `activity_logs` table + RLS + triggers on 5-6 core tables

**No new dependencies.**

---

## Order of Execution

1. Branding scope fix (quickest, high impact)
2. Favicon + meta cleanup
3. Features anchor routing
4. Inventory product+stock merge
5. Banking inter/intra transfers
6. Activity log (DB migration + UI)
7. Note to user about Vercel/GitHub branch sync

