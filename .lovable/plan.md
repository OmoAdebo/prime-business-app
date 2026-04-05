

# Mobile & Tablet Responsiveness — Comprehensive Plan

This plan covers a full responsive audit and fix across the entire application, organized into implementation batches.

---

## Current State

The app has a reasonable desktop layout but several areas need mobile/tablet fixes:
- **Tables** throughout banking, bookkeeping, inventory, invoicing, and POS use `<Table>` without horizontal scroll wrappers — they overflow on small screens
- **Settings page** (1031 lines) has dense tab lists and form layouts that don't adapt well to narrow viewports
- **POS page** uses a `lg:grid-cols-5` split that stacks on mobile but the cart loses sticky behavior and product grid tap targets are tight
- **Dialog forms** across banking, inventory, and store management use fixed widths that clip on mobile
- **ModuleLayout** mobile tabs work but lack scroll indicators and active-tab auto-scroll
- **AppLayout header** search bar is hidden on mobile with no alternative
- **Footer** grid collapses awkwardly on small screens
- **KPI cards / charts** in banking analytics, bookkeeping, and dashboard need consistent 1-col → 2-col → 4-col breakpoints

---

## Batch 1: Global Foundation & Utilities

**Files**: `src/index.css`, `src/lib/utils.ts`, `src/components/ModuleLayout.tsx`, `src/components/AppLayout.tsx`

Changes:
- Add a reusable `ResponsiveTable` wrapper component (`src/components/ui/responsive-table.tsx`) that wraps `<Table>` in a horizontal `overflow-x-auto` container with fade-edge indicators
- Update `ModuleLayout.tsx`: add auto-scroll-into-view for the active tab on mobile; add subtle gradient fade on scroll edges
- Update `AppLayout.tsx` header: add a mobile search icon that expands into a full-width search overlay; reduce header gap on small screens
- Add safe-area padding for notched devices in `index.css` (`env(safe-area-inset-*)`)

---

## Batch 2: Tables & Data-Heavy Pages

**Files**: All pages with `<Table>` — approximately 15 files across banking, bookkeeping, inventory, invoicing, POS, store management, employees

For each table in the app:
- Wrap in `ResponsiveTable` (horizontal scroll on overflow)
- Hide low-priority columns on mobile using `hidden sm:table-cell` or `hidden md:table-cell` (e.g., reference numbers, dates, categories become hidden on small screens)
- Add a card-based alternative view for mobile on key pages (transactions, invoices, sales history) — show a stacked card layout below `sm:` breakpoint instead of the table
- Ensure `Badge`, status indicators, and action buttons remain visible and tappable (min 44px touch targets)

Key files:
- `src/pages/banking/BankingTransactions.tsx` — hide ref/category columns on mobile
- `src/pages/banking/BankingBeneficiaries.tsx`, `BankingScheduled.tsx`, `BankingAdmin.tsx`
- `src/pages/bookkeeping/GeneralLedger.tsx`, `JournalEntries.tsx`, `Reconciliation.tsx`
- `src/pages/inventory/InventoryProducts.tsx`, `InventoryStock.tsx`, `InventoryPurchaseOrders.tsx`, `InventorySuppliers.tsx`
- `src/pages/Invoicing.tsx` — responsive invoice table + create dialog
- `src/pages/StoreManagement.tsx` — staff table and store cards
- `src/pages/POS.tsx` — sales history and shifts tables

---

## Batch 3: POS Mobile-First Redesign

**File**: `src/pages/POS.tsx`

The POS is the most touch-critical interface:
- Change layout to mobile-first: product grid full-width with a slide-up cart drawer (sheet) on mobile instead of side-by-side
- Increase product card tap targets to min 48px height
- Make checkout dialog full-screen on mobile (`DialogContent` with `sm:max-w-lg` and mobile `w-full h-full` override)
- Add floating cart badge/FAB button on mobile showing item count, tapping opens the cart sheet
- Ensure receipt dialog is scrollable and fits mobile screens
- Tab triggers (`POS / Sales History / Shifts`) should be full-width and horizontally scrollable on narrow screens

---

## Batch 4: Settings Page Responsive Overhaul

**File**: `src/pages/Settings.tsx`

- Make `TabsList` horizontally scrollable on mobile (wrap in `overflow-x-auto` with `flex-nowrap`)
- Profile tab: stack form fields vertically on mobile (already `grid-cols-1 md:grid-cols-2` — verify)
- Security tab: ensure password strength meter and criteria list fit narrow screens
- Business Verification tab: state/LGA selects should be full-width on mobile
- Branding tab: color pickers and font selector stack vertically on mobile
- Team Management tab: member table → card layout on mobile
- All dialogs (invite, etc.): responsive width with `max-w-full sm:max-w-md`

---

## Batch 5: Dashboard & KPI Cards

**Files**: `src/pages/Dashboard.tsx`, `src/pages/banking/BankingOverview.tsx`, `src/pages/bookkeeping/BookkeepingOverview.tsx`, `src/pages/inventory/InventoryOverview.tsx`

- Standardize KPI grid: `grid-cols-2` on mobile, `sm:grid-cols-2`, `lg:grid-cols-4`
- Ensure chart containers have `min-h-[200px]` on mobile and responsive `ResponsiveContainer` widths
- Empty state illustrations should scale down on mobile
- Card headers: allow text wrapping, reduce font size on mobile for long titles

---

## Batch 6: Public Pages & Auth Pages

**Files**: `src/pages/Index.tsx`, `src/pages/Login.tsx`, `src/pages/Signup.tsx`, `src/pages/Pricing.tsx`, `src/pages/About.tsx`, `src/pages/Contact.tsx`, `src/components/PublicNavbar.tsx`

- Landing page hero: reduce heading size on mobile (`text-3xl` instead of `text-4xl sm:text-5xl lg:text-6xl` — verify)
- Feature cards: ensure single column on mobile, 2-col on tablet
- Footer: 1-col stack on mobile, 2-col on tablet, 4-col on desktop
- Login/Signup cards: add `max-w-sm w-full mx-auto` with proper padding; ensure they center on all viewports
- PublicNavbar mobile menu: add close-on-route-change (already present) and smooth transition

---

## Batch 7: Dialogs, Modals & Forms

**Cross-cutting across all pages with `<Dialog>`**

- Set all `DialogContent` to `max-w-[95vw] sm:max-w-md md:max-w-lg` to prevent clipping
- Add `max-h-[85vh] overflow-y-auto` to dialog bodies for scrollability on short screens
- Form inputs inside dialogs: full-width on mobile, remove any fixed widths
- Select dropdowns: ensure `SelectContent` doesn't overflow viewport (Radix handles this but verify z-index)

---

## Batch 8: Sidebar & Navigation Polish

**Files**: `src/components/AppSidebar.tsx`, `src/components/ui/sidebar.tsx`

- Verify sidebar collapses to offcanvas on mobile (< 768px) and icon-strip on tablet
- Ensure `SidebarTrigger` remains visible and tappable at all breakpoints
- Add swipe-to-open gesture support on mobile (CSS-based or touch event)
- Sidebar footer items (Settings, Help, Sign Out): ensure they don't get cut off on short screens — add scroll if needed

---

## Batch 9: Remaining Module Pages

**Files**: `src/pages/Customers.tsx`, `src/pages/Payroll.tsx`, `src/pages/Budgeting.tsx`, `src/pages/Capital.tsx`, `src/pages/Reports.tsx`, `src/pages/OnlineStore.tsx`, `src/pages/Loans.tsx`, `src/pages/DebtCredit.tsx`

- Apply same table responsiveness pattern (ResponsiveTable wrapper)
- Verify card grids use responsive breakpoints
- Ensure tab interfaces are scrollable on mobile
- Loans "Coming Soon" overlay: ensure blur and content centers on all screen sizes

---

## Technical Details

**Breakpoint strategy** (consistent with Tailwind defaults):
- Mobile: < 640px (`sm:`)
- Tablet: 640px–1023px (`md:`)
- Desktop: >= 1024px (`lg:`)

**Touch targets**: All interactive elements (buttons, links, table rows with actions) minimum 44x44px on mobile

**New component**: `src/components/ui/responsive-table.tsx` — thin wrapper:
```text
<div className="overflow-x-auto -mx-3 sm:mx-0">
  <div className="min-w-[600px] sm:min-w-0">
    {children}
  </div>
</div>
```

**Estimated scope**: ~25-30 files modified, 1 new component created. No database changes needed.

---

## Implementation Order

1. Batch 1 (foundation) — must come first
2. Batch 3 (POS) — highest user-facing impact
3. Batch 2 (tables) — widest coverage
4. Batch 4 (settings) — complex single file
5. Batches 5-9 in any order

