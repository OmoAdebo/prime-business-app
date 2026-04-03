import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/hooks/use-business";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, Plus, Search } from "lucide-react";
import { motion } from "framer-motion";

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  ordered: "bg-blue-100 text-blue-700 border-blue-200",
  received: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-red-100 text-red-600 border-red-200",
};

export default function InventoryPurchaseOrders() {
  const { user } = useAuth();
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();
  const businessId = business?.id;
  const [showAdd, setShowAdd] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState({ supplier_id: "", expected_delivery: "", notes: "", total_amount: "" });

  const { data: purchaseOrders = [], isLoading } = useQuery({
    queryKey: ["purchase_orders", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("purchase_orders").select("*, suppliers(name)").eq("business_id", businessId!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").eq("business_id", businessId!).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("purchase_orders").insert({
        business_id: businessId!, supplier_id: form.supplier_id || null,
        expected_delivery: form.expected_delivery || null, notes: form.notes || null,
        total_amount: parseFloat(form.total_amount) || 0, created_by: user!.id, status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
      setShowAdd(false);
      setForm({ supplier_id: "", expected_delivery: "", notes: "", total_amount: "" });
      toast({ title: "Purchase order created" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("purchase_orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
      toast({ title: "Status updated" });
    },
  });

  const filtered = purchaseOrders.filter((po: any) => {
    const matchStatus = statusFilter === "all" || po.status === statusFilter;
    const matchSearch = !searchTerm || po.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) || po.suppliers?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Purchase Orders</h1>
          <p className="text-muted-foreground mt-1">Create and track orders from suppliers.</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> New Purchase Order</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Purchase Order</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div>
                <Label>Supplier</Label>
                <Select value={form.supplier_id} onValueChange={v => setForm(p => ({ ...p, supplier_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Total Amount (₦)</Label><Input type="number" value={form.total_amount} onChange={e => setForm(p => ({ ...p, total_amount: e.target.value }))} /></div>
              <div><Label>Expected Delivery</Label><Input type="date" value={form.expected_delivery} onChange={e => setForm(p => ({ ...p, expected_delivery: e.target.value }))} /></div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
            </div>
            <DialogFooter><Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>{createMutation.isPending ? "Creating..." : "Create Order"}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search orders..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {["pending","ordered","received","cancelled","draft"].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="p-8"><Skeleton className="h-32 w-full" /></div> : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mb-3 text-muted-foreground/30" />
              <p className="font-medium">No purchase orders</p>
              <p className="text-sm mt-1">Create your first purchase order.</p>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Order #</TableHead><TableHead>Supplier</TableHead><TableHead>Date</TableHead><TableHead>Delivery</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.map((po: any) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-mono text-sm">{po.order_number || po.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-medium">{po.suppliers?.name || "—"}</TableCell>
                    <TableCell className="text-sm">{new Date(po.order_date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{po.expected_delivery ? new Date(po.expected_delivery).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatNaira(Number(po.total_amount))}</TableCell>
                    <TableCell><Badge variant="outline" className={statusColors[po.status] || ""}>{po.status}</Badge></TableCell>
                    <TableCell>
                      {po.status === "pending" && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatusMutation.mutate({ id: po.id, status: "ordered" })}>Mark Ordered</Button>
                          <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive" onClick={() => updateStatusMutation.mutate({ id: po.id, status: "cancelled" })}>Cancel</Button>
                        </div>
                      )}
                      {po.status === "ordered" && (
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => updateStatusMutation.mutate({ id: po.id, status: "received" })}>Mark Received</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
