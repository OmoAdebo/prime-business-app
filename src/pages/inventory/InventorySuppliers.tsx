import { useState, useEffect } from "react";
import { onAction } from "@/lib/action-bus";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Truck, Plus, Search, Edit, Trash2, Mail, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { ImportExportButtons } from "@/components/ImportExportButtons";
import { useVoiceForm } from "@/hooks/use-voice-form";

const emptyForm = { name: "", email: "", phone: "", address: "", contact_person: "" };

export default function InventorySuppliers() {
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();
  const businessId = business?.id;
  const [searchTerm, setSearchTerm] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  useVoiceForm({
    enabled: showAdd,
    formId: "add-supplier",
    title: editId ? "Edit Supplier" : "Add Supplier",
    fields: [
      { name: "name", type: "string", description: "Supplier / vendor company name" },
      { name: "contact_person", type: "string" },
      { name: "email", type: "string" },
      { name: "phone", type: "string" },
      { name: "address", type: "string" },
    ],
    apply: (v) => setForm((f) => ({
      ...f,
      name: v.name !== undefined ? String(v.name) : f.name,
      contact_person: v.contact_person !== undefined ? String(v.contact_person) : f.contact_person,
      email: v.email !== undefined ? String(v.email) : f.email,
      phone: v.phone !== undefined ? String(v.phone) : f.phone,
      address: v.address !== undefined ? String(v.address) : f.address,
    })),
  });

  useEffect(() => {
    return onAction("open-add-supplier", (p) => {
      setForm({
        name: p?.name || "",
        email: p?.email || "",
        phone: p?.phone || "",
        address: p?.address || "",
        contact_person: "",
      });
      setEditId(null);
      setShowAdd(true);
    });
  }, []);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").eq("business_id", businessId!).order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["purchase_orders", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("purchase_orders").select("id, supplier_id, total_amount, status").eq("business_id", businessId!);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        business_id: businessId!, name: form.name,
        email: form.email || null, phone: form.phone || null,
        address: form.address || null, contact_person: form.contact_person || null,
      };
      if (editId) {
        const { error } = await supabase.from("suppliers").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("suppliers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setShowAdd(false); setEditId(null); setForm(emptyForm);
      toast({ title: editId ? "Supplier updated" : "Supplier added" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast({ title: "Supplier deleted" });
    },
  });

  const openEdit = (s: any) => {
    setEditId(s.id);
    setForm({ name: s.name, email: s.email || "", phone: s.phone || "", address: s.address || "", contact_person: s.contact_person || "" });
    setShowAdd(true);
  };

  const filtered = suppliers.filter(s =>
    !searchTerm || s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Suppliers</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage your supplier directory.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ImportExportButtons
            filename="suppliers"
            rows={suppliers.map((s: any) => ({
              name: s.name, contact_person: s.contact_person || "",
              email: s.email || "", phone: s.phone || "", address: s.address || "",
            }))}
            onImport={async (rows) => {
              if (!businessId) return;
              const payload = rows.filter(r => r.name).map(r => ({
                business_id: businessId,
                name: r.name,
                contact_person: r.contact_person || null,
                email: r.email || null,
                phone: r.phone || null,
                address: r.address || null,
              }));
              if (!payload.length) { toast({ title: "No valid rows", variant: "destructive" }); return; }
              const { error } = await supabase.from("suppliers").insert(payload);
              if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
              toast({ title: `Imported ${payload.length} suppliers` });
              queryClient.invalidateQueries({ queryKey: ["suppliers"] });
            }}
          />
          <Dialog open={showAdd} onOpenChange={(o) => { setShowAdd(o); if (!o) { setEditId(null); setForm(emptyForm); } }}>
            <DialogTrigger asChild><Button className="gap-2 h-10 min-h-[44px]"><Plus className="h-4 w-4" /> Add Supplier</Button></DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md">
              <DialogHeader><DialogTitle>{editId ? "Edit Supplier" : "Add Supplier"}</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-2">
                <div><Label>Company Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                <div><Label>Contact Person</Label><Input value={form.contact_person} onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))} /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
                  <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
                </div>
                <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
              </div>
              <DialogFooter><Button onClick={() => saveMutation.mutate()} disabled={!form.name || saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : editId ? "Update" : "Add Supplier"}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search suppliers..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? <div className="p-8"><Skeleton className="h-32 w-full" /></div> : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <Truck className="h-12 w-12 mb-3 text-muted-foreground/30" />
              <p className="font-medium">No suppliers yet</p>
              <p className="text-sm mt-1">Add suppliers to manage your supply chain.</p>
            </div>
          ) : (
            <ResponsiveTable>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead className="hidden sm:table-cell">Contact</TableHead>
                  <TableHead className="hidden md:table-cell">Email / Phone</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.map((s: any) => {
                    const orderCount = purchaseOrders.filter(po => po.supplier_id === s.id).length;
                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="font-medium">{s.name}</div>
                          {s.address && <div className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{s.address}</div>}
                        </TableCell>
                        <TableCell className="text-sm hidden sm:table-cell">{s.contact_person || "—"}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
                            {s.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{s.email}</span>}
                            {s.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{s.phone}</span>}
                            {!s.email && !s.phone && "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right"><Badge variant="outline">{orderCount} POs</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-10 w-10 min-h-[44px]" onClick={() => openEdit(s)}><Edit className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-10 w-10 min-h-[44px] text-destructive" onClick={() => deleteMutation.mutate(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ResponsiveTable>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
