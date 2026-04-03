import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tags, Package, Search } from "lucide-react";
import { motion } from "framer-motion";

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

export default function InventoryCategories() {
  const { data: business } = useBusiness();
  const businessId = business?.id;
  const [searchTerm, setSearchTerm] = useState("");

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
      const { data, error } = await supabase.from("stock_levels").select("*").in("product_id", ids);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId && products.length > 0,
  });

  // Group products by category
  const categoryMap = new Map<string, typeof products>();
  products.forEach(p => {
    const cat = p.category || "Uncategorized";
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);
    categoryMap.get(cat)!.push(p);
  });

  const categories = Array.from(categoryMap.entries())
    .map(([name, prods]) => {
      const totalStock = prods.reduce((s, p) => {
        const qty = stockLevels.filter(sl => sl.product_id === p.id).reduce((q: number, sl: any) => q + sl.quantity, 0);
        return s + qty;
      }, 0);
      const totalValue = prods.reduce((s, p) => {
        const qty = stockLevels.filter(sl => sl.product_id === p.id).reduce((q: number, sl: any) => q + sl.quantity, 0);
        return s + qty * Number(p.cost_price);
      }, 0);
      return { name, products: prods, totalStock, totalValue };
    })
    .filter(c => !searchTerm || c.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Categories</h1>
        <p className="text-muted-foreground mt-1">Product categories and their inventory breakdown.</p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search categories..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-muted-foreground">
            <Tags className="h-12 w-12 mb-3 text-muted-foreground/30" />
            <p className="font-medium">No categories found</p>
            <p className="text-sm mt-1">Categories are derived from your products.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => (
            <Card key={cat.name} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Tags className="h-4 w-4 text-primary" />
                    {cat.name}
                  </CardTitle>
                  <Badge variant="secondary">{cat.products.length} products</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Stock</span>
                  <span className="font-medium">{cat.totalStock} units</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Stock Value</span>
                  <span className="font-medium">{formatNaira(cat.totalValue)}</span>
                </div>
                <div className="border-t pt-3 space-y-1.5">
                  {cat.products.slice(0, 4).map(p => (
                    <div key={p.id} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 truncate">
                        <Package className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{p.name}</span>
                      </span>
                      <span className="text-muted-foreground font-mono">{p.sku || "—"}</span>
                    </div>
                  ))}
                  {cat.products.length > 4 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">+{cat.products.length - 4} more</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}
