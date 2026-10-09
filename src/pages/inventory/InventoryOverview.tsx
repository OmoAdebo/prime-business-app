import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, BarChart3, AlertTriangle, Users, MapPin, ArrowRightLeft, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

export default function InventoryOverview() {
  const { data: business, isLoading: bizLoading } = useBusiness();
  const businessId = business?.id;

  const { data: products = [] } = useQuery({
    queryKey: ["products", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("business_id", businessId!).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["inventory_locations", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventory_locations").select("*").eq("business_id", businessId!);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const { data: stockLevels = [] } = useQuery({
    queryKey: ["stock_levels", businessId],
    queryFn: async () => {
      const prodIds = products.map(p => p.id);
      if (!prodIds.length) return [];
      const { data, error } = await supabase.from("stock_levels").select("*").in("product_id", prodIds);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId && products.length > 0,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").eq("business_id", businessId!);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const { data: movements = [] } = useQuery({
    queryKey: ["stock_movements", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("stock_movements").select("*, products(name)").eq("business_id", businessId!).order("created_at", { ascending: false }).limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["purchase_orders", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("purchase_orders").select("*").eq("business_id", businessId!);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  if (bizLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Package className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold">No Business Found</h2>
        <p className="text-muted-foreground mt-2">Register your business in Settings first.</p>
      </div>
    );
  }

  const totalProducts = products.length;
  const totalStockValue = products.reduce((s, p) => {
    const qty = stockLevels.filter(sl => sl.product_id === p.id).reduce((q: number, sl: any) => q + sl.quantity, 0);
    return s + qty * Number(p.cost_price);
  }, 0);
  const retailValue = products.reduce((s, p) => {
    const qty = stockLevels.filter(sl => sl.product_id === p.id).reduce((q: number, sl: any) => q + sl.quantity, 0);
    return s + qty * Number(p.unit_price);
  }, 0);
  const lowStockProducts = products.filter(p => {
    const qty = stockLevels.filter(sl => sl.product_id === p.id).reduce((q: number, sl: any) => q + sl.quantity, 0);
    return qty <= (p.low_stock_threshold || 10);
  });
  const pendingPOs = purchaseOrders.filter(po => po.status === "pending" || po.status === "ordered");

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inventory Overview</h1>
        <p className="text-muted-foreground mt-1">Summary of your inventory status.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { title: "Total Products", value: totalProducts.toString(), icon: Package, sub: `${locations.length} locations`, color: "text-primary" },
          { title: "Stock Value (Cost)", value: formatNaira(totalStockValue), icon: TrendingDown, sub: `Retail: ${formatNaira(retailValue)}`, color: "text-primary" },
          { title: "Low Stock Alerts", value: lowStockProducts.length.toString(), icon: AlertTriangle, sub: "Need restocking", color: lowStockProducts.length > 0 ? "text-amber-500" : "text-primary", alert: lowStockProducts.length > 0 },
          { title: "Active Suppliers", value: suppliers.length.toString(), icon: Users, sub: `${pendingPOs.length} pending POs`, color: "text-primary" },
        ].map(kpi => (
          <Card key={kpi.title} className={kpi.alert ? "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20" : ""}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{kpi.title}</p>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <p className="text-2xl font-bold mt-2">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">Low Stock Alert</p>
              <p className="text-sm text-muted-foreground mt-1">
                {lowStockProducts.slice(0, 5).map(p => p.name).join(", ")}
                {lowStockProducts.length > 5 && ` and ${lowStockProducts.length - 5} more`}
                {" — "}{lowStockProducts.length === 1 ? "needs" : "need"} restocking.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Movements */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><ArrowRightLeft className="h-4 w-4" /> Recent Stock Movements</CardTitle></CardHeader>
          <CardContent>
            {movements.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No stock movements recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {movements.slice(0, 8).map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                    <div className="flex items-center gap-2">
                      {m.movement_type === "receipt" ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> : <TrendingDown className="h-3.5 w-3.5 text-red-500" />}
                      <span className="font-medium">{m.products?.name || "Unknown"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{m.movement_type}</Badge>
                      <span className="font-mono text-xs">{m.quantity}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location Summary */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" /> Locations</CardTitle></CardHeader>
          <CardContent>
            {locations.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">No locations added yet. <a href="/store-management" className="text-primary underline">Add one in Store Management</a> — or add a product and a "Main Store" is created for you.</div>
            ) : (
              <div className="space-y-3">
                {locations.map((loc: any) => {
                  const locStock = stockLevels.filter((sl: any) => sl.location_id === loc.id);
                  const totalItems = locStock.reduce((s: number, sl: any) => s + sl.quantity, 0);
                  return (
                    <div key={loc.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                      <div>
                        <span className="font-medium">{loc.name}</span>
                        <span className="text-muted-foreground ml-2 text-xs">({loc.type})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{locStock.length} products</span>
                        <Badge variant="outline">{totalItems} units</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
