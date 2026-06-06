// Lightweight typed action bus for cross-component commands (e.g., voice agent → page actions)
export type AppAction =
  | { type: 'open-create-invoice'; payload?: { customer_name?: string; amount?: number; description?: string; due_date?: string } }
  | { type: 'open-add-product'; payload?: { name?: string; price?: number; sku?: string } }
  | { type: 'open-record-expense'; payload?: { amount?: number; description?: string; category?: string } }
  | { type: 'open-add-customer'; payload?: { name?: string; email?: string; phone?: string } }
  | { type: 'open-new-transfer'; payload?: { amount?: number; recipient?: string } };

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
