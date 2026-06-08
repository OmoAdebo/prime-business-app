# Plan: Industry-Focused Tailoring & Global Voice Data Entry

## 1. New Business Category system

Replace the current free-form industry list (Onboarding + Settings → Business) with **7 curated categories**, each with a hint and optional subcategories:

| Category | Hint | Subcategories |
|---|---|---|
| MSMEs | Micro, small & medium businesses — retail, wholesale, services | Retail, Wholesale, Food & Beverage, Services, Logistics |
| Healthcare | Clinics, pharmacies, hospitals, medical suppliers | Clinic, Pharmacy, Hospital, Diagnostics, Medical Supplies |
| Agriculture | Farming, agro-processing, livestock, agri-inputs | Crop Farming, Livestock, Agro-Processing, Agri-Inputs |
| Technology | Software, IT services, hardware, digital products | Software, IT Services, Hardware, SaaS |
| Finance | Fintech, microfinance, advisory, insurance | Microfinance, Fintech, Insurance, Advisory |
| Consultant | Professional services & advisory firms | Business, Legal, HR, Marketing, Engineering |
| Manufacturing | Production, assembly, industrial goods | Food Processing, Textiles, Industrial Goods, FMCG |

- Industry becomes **required** in onboarding (cannot skip step 2 without it).
- Subcategory shown as a second select once category is chosen.

## 2. Industry-tailored experience

Create a single source of truth in `src/lib/industry-config.ts` keyed by category that defines:

- **Terminology** (e.g., Healthcare: "Patient" instead of "Customer", "Prescription" instead of "Invoice line"; Agriculture: "Harvest", "Yield"; MSME Retail: standard "Customer/Sale").
- **Units of measurement** defaults (Healthcare: mg/ml/tablets/boxes; Agriculture: kg/tonnes/bags/hectares; Manufacturing: units/pallets; MSME: pcs/cartons).
- **Dashboard widgets shown/hidden** per category (e.g., Healthcare shows Prescriptions & Patient Visits; Agriculture shows Harvest Cycles & Input Costs; Consultant shows Billable Hours & Projects).
- **Quick Actions** tailored per category.
- **POS/Inventory field labels** swapped via a `useIndustryTerms()` hook.

Persist `business_category` and `business_subcategory` on the `businesses` table (migration). Expose them through `useBusiness()` and a new `IndustryProvider` context that wraps `AppLayout` so every page reads tailored labels/units.

`RoleDashboard` for `business_owner` reads `industryConfig[category].dashboardSections` to render the matching widget set.

## 3. Global Voice Command (data entry everywhere)

Today `FloatingVoiceButton` only fires a small set of navigation/open-modal actions. Expand it so users can dictate full records from any page:

- Extend `src/lib/action-bus.ts` with **prefilled-create** actions for: invoice, expense, customer, product, transfer, journal entry, payroll entry, stock movement, supplier, order.
- Upgrade `supabase/functions/voice-agent/index.ts` to use Lovable AI Gateway with tool-calling: it parses natural speech into one of the above structured actions (e.g., "Add a new patient John Doe, phone 080…" → `open-add-customer` with payload; "Record sale of 5 paracetamol at 200 naira" → `open-create-invoice` prefilled).
- The floating button stays mounted globally inside `AppLayout` (already is) but gains a **"dictation mode"** that, on any open modal/form, fills fields via the action bus dispatch.
- Each list page (Customers, Products, Invoicing, Expenses, Journal Entries, Transfers, Payroll, Stock) registers an `onAction` listener that opens its create dialog and prefills fields from the voice payload.
- Industry context is sent to the voice agent so terminology matches (e.g., "patient" maps to customer for Healthcare).

## Technical Details

- **DB migration**: add `business_category text` and `business_subcategory text` to `public.businesses`.
- **New files**:
  - `src/lib/industry-config.ts` — category → { hint, subcategories, terms, units, dashboard, quickActions }.
  - `src/contexts/IndustryContext.tsx` + `useIndustry()` / `useIndustryTerms()` hooks.
- **Edits**:
  - `src/pages/Onboarding.tsx` — replace `INDUSTRIES` with new category + subcategory selects, hint text, make required.
  - `src/pages/Settings.tsx` (Business tab) — same category/subcategory selectors with hints.
  - `src/components/AppLayout.tsx` — wrap with `IndustryProvider`.
  - `src/components/RoleDashboard.tsx` — render industry-specific widget set for business owners.
  - `src/lib/action-bus.ts` — add new action types with payload fields.
  - `src/components/FloatingVoiceButton.tsx` — pass industry context, handle expanded action types.
  - `supabase/functions/voice-agent/index.ts` — Lovable AI tool-calling with structured output for all action types.
  - List pages (Customers, Invoicing, InventoryProducts, BankingTransfers, JournalEntries, Payroll, InventoryStock, InventorySuppliers) — register `onAction` listeners to open dialogs prefilled from voice payload.
- Terminology applied via `useIndustryTerms()` in headers/labels of POS, Inventory, Invoicing, Customers, Reports.

## Out of scope (ask before adding)
- Reworking the entire data model per industry (we relabel & filter, not fork schemas).
- Adding new modules (e.g., dedicated EHR) — only tailored views over existing data.

Say **implement** to proceed, or tell me what to adjust (e.g., different category list, more subcategories, or scope down voice to specific forms only).