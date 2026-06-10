# Always-Ready Voice Assistant for CRUD Operations

## Goal
Whenever a Create/Edit/Delete modal or form opens anywhere in the dashboard, the Prime voice assistant should automatically wake up, start listening, and fill the form's fields by voice — instead of sitting idle in the corner until clicked.

## Approach

### 1. Global "modal-open" detector (new `src/contexts/VoiceCaptureContext.tsx`)
Create a lightweight context + event bus:
- `notifyModalOpen(formId, schema)` — any Dialog/Sheet calls this on open with the form context (e.g. `"create-invoice"`, fields: `due_date, customer_name, line_items, notes`).
- `notifyModalClose(formId)` — called on close.
- Internally maintains a stack of active forms (last opened wins).

### 2. Auto-listen behavior in `FloatingVoiceButton.tsx`
- Subscribe to the context. When a modal opens:
  - Animate the floating button into an **"active listening"** state (pulse ring + mic icon + tooltip "Listening — dictate field values").
  - Auto-start `SpeechRecognition` (no need to open the sheet).
  - Show a compact inline **voice strip** docked above the modal (transcript + stop button) instead of forcing the full sheet open.
- When the modal closes, stop listening and return to idle.
- Respect user preference: a small toggle "Auto-listen on forms" (stored in localStorage) so a user can disable it.

### 3. Field-level dictation
- Extend `voice-agent` edge function with a new tool `fill_form_fields(form_id, fields)` that returns a map of field-name → value, given the open form's schema and the transcript.
- On result, dispatch a new action `voice-fill-fields` via `action-bus.ts`. Each open modal registers an `onAction("voice-fill-fields")` listener filtered by its `formId` and writes values into its local form state.
- Falls back to existing tool routing (`open_create_invoice`, etc.) when the user speaks a command instead of dictating values.

### 4. Wire up every CRUD modal
Add a tiny hook `useVoiceForm(formId, schema, applyFn)` and call it inside each existing Dialog/Sheet on open. Coverage:
- Invoicing: Create Invoice, Record Payment
- Customers: Add/Edit Customer
- Inventory: Add Product, Add Supplier, Stock Movement, Purchase Order, Category
- Bookkeeping: Journal Entry, Account, Tax record
- Banking: New Transfer, Add Beneficiary, Add Account, Schedule Payment
- Payroll & HR: Add Employee, Payroll Run, Leave Request, Attendance
- POS: New Sale (cart add by voice)
- Online Store: Create Order, Add Storefront Product
- Debt & Credit: Add Receivable / Payable
- Budgeting: Create Budget, Add Budget Item
- Store Management: Add Location, Assign Staff
- Settings: profile/business updates

(One hook call per modal — small edits, no behavior change beyond enabling voice.)

### 5. Visual cues
- Floating button gains 3 states: **idle** (sparkle), **armed** (mic outline, appears whenever a CRUD modal is open), **listening** (red pulse).
- Inline mini-strip above the open modal shows live transcript and a "Done" button.
- Toast feedback after each filled field ("Set due date to 2026-06-15").

### 6. Out of scope
- No changes to data model or RLS.
- Read-only/list views won't auto-activate (only modals/forms).
- Voice still requires browser SpeechRecognition support; fallback message unchanged.

## Files
**New**: `src/contexts/VoiceCaptureContext.tsx`, `src/hooks/use-voice-form.ts`, `src/components/VoiceFormStrip.tsx`
**Edited**: `src/components/FloatingVoiceButton.tsx`, `src/components/AppLayout.tsx` (wrap with provider), `src/lib/action-bus.ts` (add `voice-fill-fields`), `supabase/functions/voice-agent/index.ts` (add `fill_form_fields` tool + form-schema context), plus one-line `useVoiceForm()` calls inside each CRUD Dialog across the pages listed above.

## Acceptance
- Opening any Create/Edit modal arms the mic automatically; a visible "listening" strip appears.
- Speaking "Due date June 15, customer John Doe, amount fifty thousand" fills the corresponding fields in the open Create Invoice dialog without leaving the modal.
- Closing the modal stops listening.
- A toggle lets the user disable auto-listen if they find it intrusive.

Say **implement** to proceed, or tell me to scope it down (e.g., start with Invoicing + Inventory only).