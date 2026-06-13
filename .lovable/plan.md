# Visual-rich Homepage Revamp

Transform `src/pages/Index.tsx` from a text-card layout into an image-led, interactive showcase of Prime's industries and services — with before/after, sliders, auto-rotating media, and authentic human imagery.

## What gets added

### 1. Hero — dynamic split with rotating industry imagery
- Left: existing headline + CTAs (kept).
- Right: replace static mock card with an **auto-rotating image carousel** (embla, 4s autoplay) cycling through 4 hero images: pharmacist at counter, market trader on phone, farmer in field, designer at laptop. Each slide overlays the matching industry KPI mock card (Healthcare/Retail/Agriculture/Tech) so the dashboard appears to "retheme" live.
- Floating "Industry-tailored" badge stays.

### 2. NEW — Before / After Prime section
- Interactive **drag-to-reveal slider** (custom component, no new dep) comparing:
  - **Before**: messy paper ledger / sticky notes / WhatsApp screenshots photo
  - **After**: clean Prime dashboard screenshot
- Caption: "From scattered to sorted in one afternoon."
- Three stat chips below: "70% less admin time · 3× faster invoicing · ₦0 setup".

### 3. Industries — visual grid with photography
- Replace plain icon cards with **image-topped cards** (16:9 photo + icon badge + name + 1-liner + subcategory chips).
- 7 industry photos (pharmacy, retail stall, farm, tech office, bank desk, consultant meeting, factory floor).
- Hover: zoom image, reveal "Explore →".

### 4. Services — alternating zigzag with product screenshots
- Replace 9 uniform cards with a **zigzag/storytelling layout**: each of the 6 core modules (Bookkeeping, Inventory, Invoicing, POS, Payroll, Online Store) gets a row with screenshot mock on one side, copy + bullet benefits + icon on the other, alternating sides.
- Subtle framer-motion in-view animation.

### 5. NEW — Voice assistant demo strip
- Full-width band with looping silent **video** (or animated GIF fallback) of voice dictation filling an invoice form, captioned waveform animation, and 3 spoken-command examples.

### 6. NEW — Industry testimonial cards with faces
- Upgrade existing testimonials: add **avatar photos** (real-looking portraits), industry tag chip, business logo placeholder, and a small "metric won" stat per testimonial (e.g. "Cut stock-outs by 40%").

### 7. NEW — "Numbers that matter" counter band
- 4 animated counters (count-up on scroll): businesses onboarded, invoices generated, ₦ processed, states covered.

### 8. How it works — illustrated steps
- Add a **vector illustration** per step (sign-up, pick industry, run business) above each card.

### 9. CTA — keep, add ambient gradient mesh background image.

### 10. Footer/Navbar — unchanged (already reusable).

## Assets to generate (imagegen, src/assets/home/)
- `hero-pharmacy.jpg`, `hero-retail.jpg`, `hero-farm.jpg`, `hero-tech.jpg` (1600×1000, photographic)
- `ind-healthcare.jpg`, `ind-msmes.jpg`, `ind-agriculture.jpg`, `ind-technology.jpg`, `ind-finance.jpg`, `ind-consultant.jpg`, `ind-manufacturing.jpg` (1280×720)
- `before-paper.jpg`, `after-dashboard.jpg` (1600×1000)
- `service-bookkeeping.png` … `service-store.png` (6 product screenshots styled as Prime UI mocks, transparent or framed)
- `avatar-adebayo.jpg`, `avatar-chioma.jpg`, `avatar-ibrahim.jpg` (square portraits)
- `step-1.svg/png`, `step-2.png`, `step-3.png` (flat illustrations)
- `voice-demo.mp4` (skipped — instead an animated **CSS/framer waveform + typing demo** to avoid video weight)
- All photos: warm Nigerian context, emerald accent friendly.

## New components
- `src/components/home/BeforeAfterSlider.tsx` — pointer-drag reveal slider (zero deps, ~80 LOC).
- `src/components/home/HeroCarousel.tsx` — embla autoplay carousel with KPI overlay.
- `src/components/home/CountUp.tsx` — IntersectionObserver-driven animated number.
- `src/components/home/VoiceDemoStrip.tsx` — animated waveform + auto-typed command + form preview.

## Files
- **Edit**: `src/pages/Index.tsx` (full rebuild around new sections).
- **New**: 4 components above, ~17 generated images under `src/assets/home/`.
- **No** changes to navbar, footer, routing, backend, or other pages.

## Out of scope
- Real customer photos (using AI-generated representative imagery).
- Actual video file (replaced with motion graphics for performance).
- Translations, A/B variants, CMS-driven content.

Say **implement** to proceed, or tell me which sections to drop/swap (e.g. skip the voice strip, fewer images, etc.).