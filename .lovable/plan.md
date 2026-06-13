## 1. Industry-tailored experience — make it real across the app

**Problem:** `useIndustry()` / `useIndustryTerms()` exist but only Customers, Invoicing, Onboarding and Settings read them. Switching a business to Healthcare changes almost nothing visible. Also: changing industry on an existing account should not be a casual setting.

**Changes:**
- **Lock industry post-onboarding.** In `src/pages/Settings.tsx`, render Industry/Sector + Subcategory as **read-only** (badge + "Set during onboarding — contact support to change") for accounts that already completed onboarding. Keep editable only when `businesses.business_category` is null. Remove the free-change Select.
- **Require category on onboarding.** Already required in Step 2 — also block "Finish" if missing and add a one-line hint under the field describing what changes (terminology, units, dashboard widgets, quick actions).
- **Expand `src/lib/industry-config.ts`** with richer per-industry payload used app-wide:
  - `nav`: sidebar item overrides (e.g. Healthcare → "Patients" replaces "Customers", "Prescriptions" replaces "Invoicing"; Agriculture → "Produce", "Harvests"; Consultant → "Engagements", "Time & Billing"; Manufacturing → "Production", "Warehouse")
  - `hiddenModules`: modules to hide per industry (e.g. Consultant hides Inventory/POS by default; Finance hides POS; Healthcare keeps Inventory but renamed "Stock")
  - `kpis`: dashboard KPI definitions (label, source query key, icon, formatter)
  - `quickActions`: already exists — surface on the role dashboard
  - `productFields`: extra fields shown in Add Product modal (Healthcare → dosage, expiry; Agriculture → batch, harvest date; Manufacturing → SKU code, lot)
  - `customerFields`: extra fields (Healthcare → DOB, allergies; Finance → KYC tier)
- **Wire `AppSidebar.tsx`** to read `useIndustry()` and rename/hide nav items based on `nav` + `hiddenModules`.
- **Wire `RoleDashboard.tsx` / `Dashboard.tsx`** to render industry-specific KPI cards, headings ("Patients" vs "Customers"), and `quickActions` from the config.
- **Wire page headers** on Customers, Inventory, Invoicing, POS, Reports to call `useIndustryTerms()` for titles, breadcrumbs, empty states, and table column labels.
- **Units of measurement** — Inventory Products & Stock modals read `config.units` for the unit dropdown and default to `config.defaultUnit`.
- **No DB change required** — everything keys off existing `business_category` / `business_subcategory`.

## 2. Admin login redirect + dashboard cleanup

**Problem:** Admins land on `/dashboard` after login and see admin-only widgets ("Welcome, Oreon Admin", "All Users / Business Verifications").

**Changes:**
- In `src/pages/Login.tsx` (and Signup post-confirm flow): after auth, read roles and redirect: admins (`super_admin | admin | support_admin`) → `/admin`; everyone else → `/dashboard` (or `/onboarding` if pending).
- Add an `AdminRedirect` guard in `AppLayout` so any admin who lands on `/dashboard` is auto-routed to `/admin`.
- **Remove admin-only blocks from the BO dashboard** (`RoleDashboard.tsx` super_admin branch + any "All Users / Business Verifications" tabs currently rendered there). Move that content into `src/pages/admin/AdminOverview.tsx` so admins see Total Users / Business Owners / Super Admins / Pending Verifications stat cards and the All Users + Business Verifications tabbed table.

## 3. Domain rebrand to getprime.app

- Replace every `*.lovable.app` / `lovableproject.com` reference with `https://www.getprime.app/`. Files: `src/main.tsx` (PWA gating — keep host detection but stop hard-coding lovable hostnames in user-facing strings), `index.html` (canonical, OG, twitter URLs), `public/manifest.json` (start_url, scope), `public/robots.txt` (sitemap), email templates in edge functions, README, any "powered by" footer text.
- Add a single `SITE_URL` constant in `src/lib/site.ts` so future links use one source.

## 4. Onboarding refinements

- **Rename "Business category"** label → **"Industry / Sector"** (Step 2) to match Settings.
- **Dynamic LGA select.** Add a `NIGERIA_LGAS: Record<State, string[]>` map (new file `src/lib/nigeria-lgas.ts` with all 36 states + FCT LGAs). Change the LGA `<Input>` in Step 3 to a `<Select>` populated from `NIGERIA_LGAS[state]`; disable until a state is chosen; reset LGA when state changes.
- **Make onboarding fields mirror Settings tabs.** Re-organize the 4 onboarding steps to map 1:1 onto Settings tabs (Business Profile, Industry & Operations, Address & Contact, Branding/Preferences) — same field names, same validation, same Select options — so what a user fills during onboarding is exactly what appears (pre-filled) in Settings later.

## 5. Home page revamp (`src/pages/Index.tsx`)

Total rebuild to feel authentic and human:
- **Hero**: real headline + sub, primary CTA → Sign up, secondary → Watch demo. Subtle Nigerian-market illustration or photo (generate with `imagegen` — diverse Nigerian SME owners using a phone/POS).
- **"Built for your industry" section**: 7 cards, one per category (MSMEs, Healthcare, Agriculture, Technology, Finance, Consultant, Manufacturing), each with a lucide icon, 1-line hint from `INDUSTRY_CONFIG[c].hint`, and a "See what's tailored" link → `/signup?industry=Healthcare` (prefills onboarding).
- **Services grid**: Invoicing, Bookkeeping, Inventory, POS, Banking, Payroll & HR, Online Store, Capital Access, Voice Assistant — each as a card with icon, blurb, and "Learn more".
- **Social proof**: testimonial trio (generated portraits or initials avatars), logos strip ("Trusted by 1,200+ Nigerian businesses").
- **How-it-works**: 3-step (Sign up → Pick your industry → Run your business) with iconography.
- **Final CTA band** + footer.
- Use the existing emerald brand tokens; add subtle gradients & framer-motion fades consistent with `mem://style/visual-identity-oreon`.

## 6. Reusable navbar + footer + apply to /login

- Promote `src/components/PublicNavbar.tsx` (already exists) and create `src/components/PublicFooter.tsx` (sitemap links, contact, social, copyright, getprime.app branding).
- Create a `PublicLayout` wrapper `<PublicNavbar /> <main>{children}</main> <PublicFooter />` and use it on `/`, `/about`, `/contact`, `/pricing`, `/login`, `/signup`, `/reset-password`, `/accept-invite/:token`.
- Login page keeps centered card but inside `PublicLayout` so navbar/footer surround it.

## Technical notes

- **Files touched:**
  - New: `src/lib/site.ts`, `src/lib/nigeria-lgas.ts`, `src/components/PublicLayout.tsx`, `src/components/PublicFooter.tsx`.
  - Edited: `src/lib/industry-config.ts`, `src/components/AppSidebar.tsx`, `src/components/RoleDashboard.tsx`, `src/pages/Dashboard.tsx`, `src/pages/admin/AdminOverview.tsx`, `src/pages/Login.tsx`, `src/pages/Signup.tsx`, `src/pages/Onboarding.tsx`, `src/pages/Settings.tsx`, `src/pages/Index.tsx`, `src/pages/Customers.tsx`, `src/pages/Invoicing.tsx`, `src/pages/inventory/InventoryProducts.tsx`, `src/pages/inventory/InventoryStock.tsx`, `src/pages/POS.tsx`, `src/pages/Reports.tsx`, `index.html`, `public/manifest.json`, `public/robots.txt`, `src/main.tsx`, `README.md`.
- **No schema changes** — uses existing `businesses.business_category` / `business_subcategory`.
- **No breaking RLS work.**
- **Out of scope:** payment provider, voice agent changes, role permissions overhaul.

Reply **implement** to proceed, or tell me which sections to drop/shrink.