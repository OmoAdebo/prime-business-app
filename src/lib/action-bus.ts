// Lightweight typed action bus for cross-component commands
// (e.g., voice agent → page actions, with prefilled payloads).
export type AppAction =
  | { type: 'open-create-invoice'; payload?: { customer_name?: string; amount?: number; description?: string; due_date?: string; quantity?: number; product_name?: string; unit_price?: number } }
  | { type: 'open-add-product'; payload?: { name?: string; price?: number; sku?: string; quantity?: number; unit?: string; category?: string } }
  | { type: 'open-record-expense'; payload?: { amount?: number; description?: string; category?: string; date?: string } }
  | { type: 'open-record-transaction'; payload?: { type?: 'income' | 'expense'; amount?: number; description?: string; category?: string; date?: string } }
  | { type: 'open-add-customer'; payload?: { name?: string; email?: string; phone?: string; address?: string } }
  | { type: 'open-new-transfer'; payload?: { amount?: number; recipient?: string; account_number?: string; bank?: string; note?: string } }
  | { type: 'open-add-supplier'; payload?: { name?: string; email?: string; phone?: string; address?: string } }
  | { type: 'open-stock-movement'; payload?: { product_name?: string; quantity?: number; movement_type?: 'in' | 'out' | 'adjust'; note?: string } }
  | { type: 'open-journal-entry'; payload?: { description?: string; amount?: number; debit_account?: string; credit_account?: string } }
  | { type: 'open-payroll-run'; payload?: { period?: string; employee_name?: string; amount?: number } }
  | { type: 'open-create-order'; payload?: { customer_name?: string; product_name?: string; quantity?: number; total?: number } }
  | { type: 'voice-fill-fields'; payload?: { form_id: string; values: Record<string, any> } };

const target = new EventTarget();

export function dispatchAction(action: AppAction) {
  target.dispatchEvent(new CustomEvent(action.type, { detail: action.payload }));
}

export function onAction<T extends AppAction['type']>(
  type: T,
  handler: (payload: Extract<AppAction, { type: T }>['payload']) => void,
) {
  const fn = (e: Event) => handler((e as CustomEvent).detail);
  target.addEventListener(type, fn);
  return () => target.removeEventListener(type, fn);
}
