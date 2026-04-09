

# Voice Command — Action Execution Plan

## Problem
The voice command page captures speech correctly but only displays text responses. It never actually navigates, opens dialogs, or performs operations. For SME business owners, voice should be a hands-free shortcut to real actions.

## Solution
Rewrite `processCommand` to use `useNavigate` for navigation commands and `toast` for confirmations. Add more command patterns covering all major app sections. After matching, auto-navigate with a short delay so the user sees feedback before being taken to the page.

## Command Map

| Voice Pattern | Action |
|---|---|
| "go to dashboard" / "open dashboard" / "home" | Navigate to `/dashboard` |
| "show sales" / "today's sales" / "sales report" | Navigate to `/reports` |
| "create invoice" / "new invoice" / "make invoice" | Navigate to `/invoicing` |
| "add expense" / "record expense" | Navigate to `/bookkeeping/journal-entries` |
| "check balance" / "my balance" / "account balance" | Navigate to `/banking` |
| "open inventory" / "check stock" / "stock levels" | Navigate to `/inventory/stock` |
| "add product" / "new product" | Navigate to `/inventory/products` |
| "open pos" / "point of sale" / "sell" | Navigate to `/pos` |
| "payroll" / "pay staff" / "salaries" | Navigate to `/payroll` |
| "customers" / "client list" / "manage customers" | Navigate to `/customers` |
| "open store" / "online store" | Navigate to `/store` |
| "settings" / "open settings" | Navigate to `/settings` |
| "budgeting" / "budget" | Navigate to `/budgeting` |
| "reports" / "view reports" | Navigate to `/reports` |
| "help" / "support" | Navigate to `/help` |
| "banking transfers" / "send money" | Navigate to `/banking/transfers` |
| "purchase orders" | Navigate to `/inventory/purchase-orders` |
| "suppliers" | Navigate to `/inventory/suppliers` |

## Implementation Details

**File: `src/pages/VoiceCommand.tsx`**

1. Add `useNavigate` from react-router-dom
2. Replace the `processCommand` function with a command routing table that maps keyword patterns to `{ path, responseText, actionType }`
3. On match, show the response text, then after a 1.5s timeout call `navigate(path)` with a toast confirmation like "Navigating to Banking..."
4. For "add expense of X naira", navigate to `/bookkeeping/journal-entries` with a toast showing the amount
5. Add a "Navigating..." visual indicator in the response area (a small spinner + destination label)
6. Expand the "Try saying" badges to include the new commands
7. Make command matching fuzzy — trim filler words like "please", "can you", "I want to" before matching

No new files or database changes needed. Single file edit to `src/pages/VoiceCommand.tsx`.

