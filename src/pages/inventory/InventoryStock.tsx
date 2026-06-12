import { useState, useEffect } from "react";
import { onAction } from "@/lib/action-bus";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/hooks/use-business";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Layers, Plus, ArrowRightLeft, Search } from "lucide-react";
import { useVoiceForm } from "@/hooks/use-voice-form";
import { motion } from "framer-motion";

export default function InventoryStock() {
  const { user } = useAuth();
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();
  const businessId = business?.id;
  const [searchTerm, setSearchTerm] = useState("");
  const [showRecord, setShowRecord] = useState(false);
  const [form, setForm] = useState({ product_id: "", to_location_id: "", quantity: "", movement_type: "receipt", notes: "" });

  useVoiceForm({
    enabled: showRecord,
    formId: "stock-movement",
    title: "Record Stock Movement",
    fields: [
      { name: "quantity", type: "number" },
      { name: "movement_type", type: "string", description: "receipt, issue, or adjustment" },
      { name: "notes", type: "string" },
    ],
    apply: (v) => setForm((f) => ({
      ...f,
      quantity: v.quantity !== undefined ? String(v.quantity) : f.quantity,
      movement_type: v.movement_type !== undefined ? String(v.movement_type) : f.movement_type,
      notes: v.notes !== undefined ? String(v.notes) : f.notes,
    })),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("business_id", businessId!).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  useEffect(() => {
    return onAction("open-stock-movement", (p) => {
      const matched = p?.product_name
        ? (products as any[]).find(pr => pr.name?.toLowerCase().includes(p.product_name!.toLowerCase()))
        : null;
      const typeMap: Record<string, string> = { in: "receipt", out: "issue", adjust: "adjustment" };
      setForm({
        product_id: matched?.id || "",
        to_location_id: "",
        quantity: p?.quantity ? String(p.quantity) : "",
        movement_type: p?.movement_type ? (typeMap[p.movement_type] || "receipt") : "receipt",
        notes: p?.note || "",
      });
      setShowRecord(true);
    });
  }, [products]);

  const { data: locations = [] } = useQuery({
    queryKey: ["inventory_locations", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("inventory_locations").select("*").eq("business_id", businessId!).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const { data: stockLevels = [], isLoading } = useQuery({
    queryKey: ["stock_levels", businessId],
    queryFn: async () => {
      const ids = products.map(p => p.id);
      if (!ids.length) return [];
      const { data, error } = await supabase.from("stock_levels").select("*, products(name, sku, unit_of_measure, low_stock_threshold), inventory_locations(name)").in("product_id", ids);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId && products.length > 0,
  });

  const { data: movements = [] } = useQuery({
    queryKey: ["stock_movements", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("stock_movements").select("*, products(name)").eq("business_id", businessId!).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const recordMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("stock_movements").insert({
        business_id: businessId!, product_id: form.product_id,
        to_location_id: form.to_location_id || null,
        quantity: parseInt(form.quantity), movement_type: form.movement_type,
        notes: form.notes || null, created_by: user!.id,
      });
      if (error) throw error;

      if (form.to_location_id) {
        const qty = parseInt(form.quantity);
        const adj = form.movement_type === "receipt" ? qty : form.movement_type === "sale" ? -qty : qty;
        const { data: existing } = await supabase.from("stock_levels").select("*").eq("product_id", form.product_id).eq("location_id", form.to_location_id).maybeSingle();
        if (existing) {
          await supabase.from("stock_levels").update({ quantity: existing.quantity + adj }).eq("id", existing.id);
        } else {
          await supabase.from("stock_levels").insert({ product_id: form.product_id, location_id: form.to_location_id, quantity: Math.max(0, adj) });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock_movements"] });
      queryClient.invalidateQueries({ queryKey: ["stock_levels"] });
      setShowRecord(false);
      setForm({ product_id: "", to_location_id: "", quantity: "", movement_type: "receipt", notes: "" });
      toast({ title: "Stock movement recorded" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const filteredLevels = stockLevels.filter((sl: any) =>
    !searchTerm || sl.products?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Stock Management</h1>
          <p className="text-muted-foreground mt-1 text-sm">Track levels, movements, and adjustments. <span className="text-primary">Tip: New products can be added with initial stock from the Products page.</span></p>
        </div>
        <Dialog open={showRecord} onOpenChange={setShowRecord}>
          <DialogTrigger asChild><Button className="gap-2 h-10 min-h-[44px]"><Plus className="h-4 w-4" /> Record Movement</Button></DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader><DialogTitle>Record Stock Movement</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div>
                <Label>Movement Type</Label>
                <Select value={form.movement_type} onValueChange={v => setForm(p => ({ ...p, movement_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receipt">Receipt (Stock In)</SelectItem>
                    <SelectItem value="sale">Sale (Stock Out)</SelectItem>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Product *</Label>
                <Select value={form.product_id} onValueChange={v => setForm(p => ({ ...p, product_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>{products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Location</Label>
                <Select value={form.to_location_id} onValueChange={v => setForm(p => ({ ...p, to_location_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>{locations.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Quantity *</Label><Input type="number" min="1" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
            </div>
            <DialogFooter><Button onClick={() => recordMutation.mutate()} disabled={!form.product_id || !form.quantity || recordMutation.isPending}>{recordMutation.isPending ? "Saving..." : "Record"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="levels">
        <TabsList className="w-full sm:w-auto overflow-x-auto"><TabsTrigger value="levels">Stock Levels</TabsTrigger><TabsTrigger value="movements">Movements History</TabsTrigger></TabsList>

        <TabsContent value="levels" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search product..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <Card>
            <CardContent className="p-0">
              {isLoading ? <div className="p-8"><Skeleton className="h-32 w-full" /></div> : filteredLevels.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-muted-foreground">
                  <Layers className="h-12 w-12 mb-3 text-muted-foreground/30" />
                  <p className="font-medium">No stock levels recorded</p>
                  <p className="text-sm mt-1">Record a stock movement to start tracking.</p>
                </div>
              ) : (
                <ResponsiveTable>
                  <Table>
                    <TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="hidden sm:table-cell">Location</TableHead><TableHead className="text-right">Quantity</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {filteredLevels.map((sl: any) => {
                        const isLow = sl.quantity <= (sl.products?.low_stock_threshold || 10);
                        return (
                          <TableRow key={sl.id}>
                            <TableCell className="font-medium">{sl.products?.name || "—"}</TableCell>
                            <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{sl.inventory_locations?.name || "—"}</TableCell>
                            <TableCell className="text-right font-mono">{sl.quantity} {sl.products?.unit_of_measure || ""}</TableCell>
                            <TableCell><Badge variant={isLow ? "destructive" : "secondary"}>{isLow ? "Low Stock" : "In Stock"}</Badge></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ResponsiveTable>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {movements.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-muted-foreground">
                  <ArrowRightLeft className="h-12 w-12 mb-3 text-muted-foreground/30" />
                  <p className="font-medium">No movements yet</p>
                </div>
              ) : (
                <ResponsiveTable>
                  <Table>
                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Product</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="hidden sm:table-cell">Notes</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {movements.map((m: any) => (
                        <TableRow key={m.id}>
                          <TableCell className="text-sm whitespace-nowrap">{new Date(m.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium">{m.products?.name || "—"}</TableCell>
                          <TableCell><Badge variant="outline" className={m.movement_type === "receipt" ? "text-emerald-600 border-emerald-200" : m.movement_type === "sale" ? "text-red-500 border-red-200" : ""}>{m.movement_type}</Badge></TableCell>
                          <TableCell className="text-right font-medium">{m.quantity}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate hidden sm:table-cell">{m.notes || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ResponsiveTable>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
