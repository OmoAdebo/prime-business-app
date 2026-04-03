import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Plus, Search, Edit, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

const PRODUCT_CATEGORIES = [
  "Electronics", "Food & Beverages", "Clothing", "Health & Beauty",
  "Home & Garden", "Office Supplies", "Raw Materials", "Packaging", "Other"
];

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

const emptyForm = { name: "", sku: "", category: "", description: "", unit_price: "", cost_price: "", unit_of_measure: "pcs", low_stock_threshold: "10", barcode: "" };

export default function InventoryProducts() {
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();
  const businessId = business?.id;
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

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

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        business_id: businessId!,
        name: form.name,
        sku: form.sku || null,
        category: form.category || null,
        description: form.description || null,
        unit_price: parseFloat(form.unit_price) || 0,
        cost_price: parseFloat(form.cost_price) || 0,
        unit_of_measure: form.unit_of_measure,
        low_stock_threshold: parseInt(form.low_stock_threshold) || 10,
        barcode: form.barcode || null,
      };
      if (editId) {
        const { error } = await supabase.from("products").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setShowAdd(false);
      setEditId(null);
      setForm(emptyForm);
      toast({ title: editId ? "Product updated" : "Product added" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Product deleted" });
    },
  });

  const openEdit = (p: any) => {
    setEditId(p.id);
    setForm({
      name: p.name, sku: p.sku || "", category: p.category || "",
      description: p.description || "", unit_price: String(p.unit_price),
      cost_price: String(p.cost_price), unit_of_measure: p.unit_of_measure || "pcs",
      low_stock_threshold: String(p.low_stock_threshold || 10), barcode: p.barcode || "",
    });
    setShowAdd(true);
  };

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const filtered = products.filter(p => {
    const matchSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoryFilter === "all" || p.category === categoryFilter;
    return matchSearch && matchCat;
  });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground mt-1">Manage your product catalog.</p>
        </div>
        <Dialog open={showAdd} onOpenChange={(o) => { setShowAdd(o); if (!o) { setEditId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Add Product</Button></DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>{editId ? "Edit Product" : "Add Product"}</DialogTitle><DialogDescription>Fill in product details.</DialogDescription></DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Product Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div><Label>SKU</Label><Input value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))} placeholder="e.g. PRD-001" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>{PRODUCT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Barcode</Label><Input value={form.barcode} onChange={e => setForm(p => ({ ...p, barcode: e.target.value }))} placeholder="e.g. 1234567890" /></div>
              </div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><Label>Selling Price (₦)</Label><Input type="number" value={form.unit_price} onChange={e => setForm(p => ({ ...p, unit_price: e.target.value }))} /></div>
                <div><Label>Cost Price (₦)</Label><Input type="number" value={form.cost_price} onChange={e => setForm(p => ({ ...p, cost_price: e.target.value }))} /></div>
                <div><Label>Low Stock Alert</Label><Input type="number" value={form.low_stock_threshold} onChange={e => setForm(p => ({ ...p, low_stock_threshold: e.target.value }))} /></div>
              </div>
              <div>
                <Label>Unit of Measure</Label>
                <Select value={form.unit_of_measure} onValueChange={v => setForm(p => ({ ...p, unit_of_measure: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["pcs","kg","litres","meters","boxes","packs","cartons","dozen"].map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowAdd(false); setEditId(null); setForm(emptyForm); }}>Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : editId ? "Update" : "Add Product"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or SKU..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(c => <SelectItem key={c!} value={c!}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <Package className="h-12 w-12 mb-3 text-muted-foreground/30" />
              <p className="font-medium">No products found</p>
              <p className="text-sm mt-1">{searchTerm || categoryFilter !== "all" ? "Try adjusting your filters." : "Add your first product."}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p: any) => {
                  const qty = stockLevels.filter((sl: any) => sl.product_id === p.id).reduce((q: number, sl: any) => q + sl.quantity, 0);
                  const isLow = qty <= (p.low_stock_threshold || 10);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{p.sku || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{p.category || "—"}</Badge></TableCell>
                      <TableCell className="text-right text-sm">{formatNaira(Number(p.cost_price))}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatNaira(Number(p.unit_price))}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={isLow ? "destructive" : "secondary"}>
                          {qty} {p.unit_of_measure}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Edit className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
