import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingDown, TrendingUp, Package, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

export default function InventoryReports() {
  const { data: business } = useBusiness();
  const businessId = business?.id;

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("business_id", businessId!).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const { data: stockLevels = [] } = useQuery({
    queryKey: ["stock_levels", businessId],
    queryFn: async () => {
      const ids = products.map(p => p.id);
      if (!ids.length) return [];
      const { data, error } = await supabase.from("stock_levels").select("*, inventory_locations(name)").in("product_id", ids);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId && products.length > 0,
  });

  const { data: movements = [] } = useQuery({
    queryKey: ["stock_movements_all", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("stock_movements").select("*, products(name)").eq("business_id", businessId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;

  // Stock valuation
  const valuationData = products.map(p => {
    const qty = stockLevels.filter(sl => sl.product_id === p.id).reduce((q: number, sl: any) => q + sl.quantity, 0);
    return { ...p, totalQty: qty, costValue: qty * Number(p.cost_price), retailValue: qty * Number(p.unit_price) };
  }).sort((a, b) => b.costValue - a.costValue);

  const totalCostValue = valuationData.reduce((s, v) => s + v.costValue, 0);
  const totalRetailValue = valuationData.reduce((s, v) => s + v.retailValue, 0);

  // Low stock report
  const lowStock = valuationData.filter(v => v.totalQty <= (v.low_stock_threshold || 10) && v.totalQty >= 0);

  // Movement summary
  const receipts = movements.filter((m: any) => m.movement_type === "receipt");
  const sales = movements.filter((m: any) => m.movement_type === "sale");
  const totalIn = receipts.reduce((s: number, m: any) => s + m.quantity, 0);
  const totalOut = sales.reduce((s: number, m: any) => s + m.quantity, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Inventory Reports</h1>
        <p className="text-muted-foreground mt-1">Stock valuation, movement analysis, and alerts.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-5"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Cost Value</p><TrendingDown className="h-4 w-4 text-primary" /></div><p className="text-2xl font-bold mt-2">{formatNaira(totalCostValue)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Retail Value</p><TrendingUp className="h-4 w-4 text-primary" /></div><p className="text-2xl font-bold mt-2">{formatNaira(totalRetailValue)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Stock In (Total)</p><Package className="h-4 w-4 text-emerald-500" /></div><p className="text-2xl font-bold mt-2">{totalIn} units</p></CardContent></Card>
        <Card><CardContent className="p-5"><div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Stock Out (Total)</p><Package className="h-4 w-4 text-red-500" /></div><p className="text-2xl font-bold mt-2">{totalOut} units</p></CardContent></Card>
      </div>

      <Tabs defaultValue="valuation">
        <TabsList><TabsTrigger value="valuation">Stock Valuation</TabsTrigger><TabsTrigger value="low-stock">Low Stock Report</TabsTrigger></TabsList>

        <TabsContent value="valuation" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Stock Valuation Report</CardTitle></CardHeader>
            <CardContent className="p-0">
              {valuationData.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No products to report on.</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Cost Value</TableHead><TableHead className="text-right">Retail Value</TableHead><TableHead className="text-right">Margin</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {valuationData.map(v => {
                      const margin = v.retailValue > 0 ? ((v.retailValue - v.costValue) / v.retailValue * 100) : 0;
                      return (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">{v.name}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{v.category || "—"}</Badge></TableCell>
                          <TableCell className="text-right font-mono">{v.totalQty}</TableCell>
                          <TableCell className="text-right">{formatNaira(v.costValue)}</TableCell>
                          <TableCell className="text-right">{formatNaira(v.retailValue)}</TableCell>
                          <TableCell className="text-right"><Badge variant="secondary">{margin.toFixed(1)}%</Badge></TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="font-bold bg-muted/50">
                      <TableCell colSpan={3}>Total</TableCell>
                      <TableCell className="text-right">{formatNaira(totalCostValue)}</TableCell>
                      <TableCell className="text-right">{formatNaira(totalRetailValue)}</TableCell>
                      <TableCell className="text-right"><Badge variant="secondary">{totalRetailValue > 0 ? ((totalRetailValue - totalCostValue) / totalRetailValue * 100).toFixed(1) : 0}%</Badge></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="low-stock" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Low Stock Report</CardTitle></CardHeader>
            <CardContent className="p-0">
              {lowStock.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">All products are well-stocked. 🎉</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>SKU</TableHead><TableHead className="text-right">Current Stock</TableHead><TableHead className="text-right">Threshold</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {lowStock.map(v => (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{v.name}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">{v.sku || "—"}</TableCell>
                        <TableCell className="text-right font-mono">{v.totalQty}</TableCell>
                        <TableCell className="text-right font-mono">{v.low_stock_threshold || 10}</TableCell>
                        <TableCell><Badge variant={v.totalQty === 0 ? "destructive" : "outline"} className={v.totalQty > 0 ? "text-amber-600 border-amber-200" : ""}>{v.totalQty === 0 ? "Out of Stock" : "Low Stock"}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
