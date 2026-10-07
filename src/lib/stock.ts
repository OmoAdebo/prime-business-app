import { supabase } from "@/integrations/supabase/client";

/** Returns the first active location, creating "Main Store" if none exists. */
export async function ensureDefaultLocation(businessId: string): Promise<string> {
  const { data: existing } = await supabase
    .from("inventory_locations")
    .select("id")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from("inventory_locations")
    .insert({ business_id: businessId, name: "Main Store", type: "store", is_active: true })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export interface StockChange {
  businessId: string;
  productId: string;
  locationId?: string | null;
  /** positive = stock in, negative = stock out */
  delta: number;
  movementType: "receipt" | "sale" | "adjustment" | "transfer" | "issue";
  notes?: string | null;
  reference?: string | null;
  userId?: string | null;
}

/** Records a movement and updates the stock level at the location. */
export async function adjustStock(c: StockChange) {
  if (!c.delta) return;
  const locationId = c.locationId || (await ensureDefaultLocation(c.businessId));
  const inbound = c.delta > 0;

  const { error: mvErr } = await supabase.from("stock_movements").insert({
    business_id: c.businessId,
    product_id: c.productId,
    to_location_id: inbound ? locationId : null,
    from_location_id: inbound ? null : locationId,
    quantity: Math.abs(c.delta),
    movement_type: c.movementType,
    notes: c.notes ?? null,
    reference: c.reference ?? null,
    created_by: c.userId ?? null,
  });
  if (mvErr) throw mvErr;

  const { data: level, error: lvErr } = await supabase
    .from("stock_levels")
    .select("id, quantity")
    .eq("product_id", c.productId)
    .eq("location_id", locationId)
    .maybeSingle();
  if (lvErr) throw lvErr;

  if (level) {
    const { error } = await supabase
      .from("stock_levels")
      .update({ quantity: Math.max(0, Number(level.quantity) + c.delta) })
      .eq("id", level.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("stock_levels")
      .insert({ product_id: c.productId, location_id: locationId, quantity: Math.max(0, c.delta) });
    if (error) throw error;
  }
}

/** Total stock for a product across locations. */
export function totalFor(levels: { product_id: string; quantity: number }[], productId: string) {
  return levels.filter((l) => l.product_id === productId).reduce((s, l) => s + Number(l.quantity), 0);
}
