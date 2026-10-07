/** Units of measure offered for products. `value` is stored on the product. */
export const UNITS: { value: string; label: string; plural: string }[] = [
  { value: "pcs", label: "Piece", plural: "pcs" },
  { value: "bag", label: "Bag", plural: "bags" },
  { value: "sack", label: "Sack", plural: "sacks" },
  { value: "carton", label: "Carton", plural: "cartons" },
  { value: "crate", label: "Crate", plural: "crates" },
  { value: "box", label: "Box", plural: "boxes" },
  { value: "pack", label: "Pack", plural: "packs" },
  { value: "bottle", label: "Bottle", plural: "bottles" },
  { value: "kg", label: "Kilogram", plural: "kg" },
  { value: "g", label: "Gram", plural: "g" },
  { value: "litre", label: "Litre", plural: "litres" },
  { value: "metre", label: "Metre", plural: "metres" },
  { value: "dozen", label: "Dozen", plural: "dozen" },
];

const LEGACY: Record<string, string> = {
  litres: "litre", meters: "metre", boxes: "box", packs: "pack", cartons: "carton",
  bags: "bag", sacks: "sack", crates: "crate", bottles: "bottle",
};

export function normalizeUnit(u?: string | null) {
  if (!u) return "pcs";
  const k = u.toLowerCase().trim();
  return LEGACY[k] ?? k;
}

/** "20 bags", "1 bag", "5 kg" */
export function formatQty(qty: number, unit?: string | null) {
  const n = normalizeUnit(unit);
  const u = UNITS.find((x) => x.value === n);
  if (!u) return `${qty} ${unit ?? ""}`.trim();
  if (u.plural === u.value && ["pcs", "kg", "g", "dozen"].includes(u.value)) return `${qty} ${u.value}`;
  return `${qty} ${Math.abs(qty) === 1 ? u.label.toLowerCase() : u.plural}`;
}

export const PRODUCT_CATEGORIES = [
  "Grains & Foodstuff", "Bags", "Food & Beverages", "Electronics", "Clothing",
  "Health & Beauty", "Home & Garden", "Office Supplies", "Raw Materials",
  "Packaging", "Agro Produce", "Building Materials", "Other",
];
