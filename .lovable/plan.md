# Fixes: products & stock, invoices & revenue, locations, transfers

## What's wrong today (confirmed in the code)

- **Stock doesn't update when you create a product.** Opening stock is only saved if a location is picked. If you have no locations yet, or skip that field, the quantity is quietly thrown away.
- **Paid invoices don't add to revenue.** The dashboard counts income from your bookkeeping records. Marking an invoice paid, or recording a payment, only changes the invoice, so nothing reaches the books.
- **No way to sell in bags.** Units are a short fixed list (pcs, kg…), with no Bag, Sack, Carton or Crate.
- **Invoice download is thin.** The PDF only shows basic lines and status. There's no business or customer details, no proper table, no dates, and no way to preview or edit before sending.
- **Locations are a dead end.** The inventory pages ask for a location, but you can only create one under Store Management. When none exist, the list is just empty.
- **Two transfer tabs that do the same thing:** Intra-Account and Same-Bank.

## 1. Products and stock, in one place

- The **Products page becomes the single home** for a product: add, edit, delete, see current stock per location, and adjust stock ("Add stock / Remove stock") without leaving it.
- On create, stock is always saved. If the business has no location yet, a **"Main Store"** is created automatically and the stock goes there. If there are several, you pick one (the first is selected by default).
- Editing stock records a proper adjustment, both up and down, so the history stays accurate.
- The Stock page stays as a read-only overview and history. Its "Record movement" uses the same logic, so the two can't disagree.
- Low-stock status uses each product's own threshold everywhere: the Stock page, the dashboard alert card and Growth Opportunities.

## 2. Bags and pack units

- Unit choices become: Piece, Bag, Sack, Carton, Crate, Box, Pack, Bottle, Kg, Gram, Litre, Metre, Dozen, plus "Other" for your own.
- Stock, invoices, sales and exports show the unit, for example "20 bags".
- Add **Bags** (and Grains & Foodstuff) to the default product categories.

## 3. Invoicing: a full review of the workflow

Workflow: **Draft → Sent → Partially paid / Paid → (Overdue automatically when past due) / Cancelled.**

- **Create and edit:** pick an existing customer or create one inline, which fills in their email, phone and address. Pick products from inventory, which fills in price and unit, or type a free line. 7.5% VAT toggle, discount, notes and terms. Invoice numbers are generated automatically.
- **Preview and edit:** a full on-screen preview that looks exactly like the PDF. Drafts can be edited. Sent invoices can be edited with a warning, but paid ones are locked.
- **Payments:** "Record payment" (full or partial) and a "Mark as paid" shortcut. Every payment:
  - adds an **income entry in Bookkeeping**, so dashboard revenue, Financial Health and Reports update straight away;
  - updates the invoice balance and status;
  - shows in the invoice's payment history.
- **Stock:** when an invoice is sent or paid, the products on it reduce stock once, with no double-counting.
- **Overdue:** invoices past their due date that aren't fully paid show as Overdue automatically.
- **Cancel and delete:** cancelling keeps the record. Delete is only allowed for drafts.
- **Summary cards** show Paid this month, Outstanding and Overdue, worked out from actual payments.
- **Send:** email the invoice to the customer or copy a pay link, using the existing payments setup.

## 4. Professional invoice PDF

- A header with your logo, business name, address, phone, email, TIN and CAC number.
- A **Bill To** block with the customer's name, company, address, phone and email.
- Invoice details: number, issue date, due date, status, and the date and time it was generated.
- An item table with columns for #, Description, Qty, Unit, Unit price, VAT and Amount.
- Totals: subtotal, discount, VAT 7.5%, total, amount paid and balance due.
- Payment instructions (settlement account and pay link), notes, terms, and a footer with page numbers.
- The same layout is used for both the preview and the download.

## 5. Locations linked to Store Management

- Every location picker in Inventory gets a **"+ New location"** option. It opens a quick form (name, type, address) that saves to the same list Store Management uses, then selects the new location straight away.
- When no locations exist, a helpful note links to Store Management.
- Locations show by name everywhere, including exports, instead of internal IDs.

## 6. Banking transfers

- Intra-Account and Same-Bank are merged into **one "Between accounts" tab**. You pick a source account, then choose either one of your own accounts or a new recipient at the same bank. Other Bank stays separate.

## Technical notes

- No new tables are needed. Invoice payments write to the existing `transactions` table (type income, category "Sales", reference set to the invoice number) to stay compatible with the dashboard and the insights.
- If an invoice gets paid through the payment provider, the webhook also inserts the same income entry, guarded so it isn't added twice. That needs the Edge Functions redeployed (`bash scripts/deploy-functions.sh`).
- Shared helpers: `src/lib/stock.ts` (adjust stock, ensure a default location), `src/lib/units.ts`, `src/lib/invoice-pdf.ts` (jsPDF + autotable), and a `LocationSelect` component with inline create.
- Main files edited: `InventoryProducts.tsx`, `InventoryStock.tsx`, `InventoryCategories.tsx`, `Invoicing.tsx`, `BankingTransfers.tsx`, `paystack-webhook/index.ts`.
