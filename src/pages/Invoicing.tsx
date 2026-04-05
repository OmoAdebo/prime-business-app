import { useState } from "react";
import { FileText, Plus, Send, Eye, Trash2, CreditCard, Search, Filter } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { motion } from "framer-motion";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  overdue: "bg-destructive/10 text-destructive",
  partial: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  cancelled: "bg-muted text-muted-foreground line-through",
};

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export default function Invoicing() {
  const { user } = useAuth();
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("Payment due within 30 days.");
  const [items, setItems] = useState<InvoiceItem[]>([{ description: "", quantity: 1, unit_price: 0 }]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentRef, setPaymentRef] = useState("");

  const businessId = business?.id;

  // Fetch invoices
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("business_id", businessId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  // Fetch customers for linking
  const { data: customers = [] } = useQuery({
    queryKey: ["customers", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name")
        .eq("business_id", businessId!)
        .eq("is_active", true);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  // Fetch payments for selected invoice
  const { data: payments = [] } = useQuery({
    queryKey: ["invoice-payments", selectedInvoice],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoice_payments")
        .select("*")
        .eq("invoice_id", selectedInvoice!)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedInvoice,
  });

  const generateInvoiceNumber = () => {
    const prefix = "INV";
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}-${timestamp}`;
  };

  // Create invoice
  const createInvoice = useMutation({
    mutationFn: async () => {
      const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
      const vatAmount = subtotal * 0.075;
      const totalAmount = subtotal + vatAmount;

      const { data: invoice, error } = await supabase
        .from("invoices")
        .insert({
          business_id: businessId!,
          invoice_number: generateInvoiceNumber(),
          subtotal,
          vat_amount: vatAmount,
          total_amount: totalAmount,
          due_date: dueDate || null,
          notes: notes || null,
          terms: terms || null,
          created_by: user?.id,
        })
        .select()
        .single();
      if (error) throw error;

      const invoiceItems = items.filter(i => i.description).map(item => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
      }));

      if (invoiceItems.length > 0) {
        const { error: itemsError } = await supabase.from("invoice_items").insert(invoiceItems);
        if (itemsError) throw itemsError;
      }

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setCreateOpen(false);
      resetForm();
      toast.success("Invoice created successfully");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Update invoice status
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("invoices").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice status updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Record payment
  const recordPayment = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(paymentAmount);
      if (!selectedInvoice || isNaN(amount) || amount <= 0) throw new Error("Invalid payment");

      const { error } = await supabase.from("invoice_payments").insert({
        invoice_id: selectedInvoice,
        amount,
        payment_method: paymentMethod,
        reference: paymentRef || null,
        created_by: user?.id,
      });
      if (error) throw error;

      // Update amount_paid on invoice
      const invoice = invoices.find(i => i.id === selectedInvoice);
      if (invoice) {
        const newPaid = (invoice.amount_paid || 0) + amount;
        const newStatus = newPaid >= invoice.total_amount ? "paid" : "partial";
        await supabase.from("invoices").update({ amount_paid: newPaid, status: newStatus }).eq("id", selectedInvoice);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-payments"] });
      setPaymentOpen(false);
      setPaymentAmount("");
      setPaymentRef("");
      toast.success("Payment recorded");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Delete invoice
  const deleteInvoice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resetForm = () => {
    setCustomerName("");
    setDueDate("");
    setNotes("");
    setTerms("Payment due within 30 days.");
    setItems([{ description: "", quantity: 1, unit_price: 0 }]);
  };

  const addItem = () => setItems([...items, { description: "", quantity: 1, unit_price: 0 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: keyof InvoiceItem, value: string | number) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;
    setItems(updated);
  };

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const vatAmount = subtotal * 0.075;
  const total = subtotal + vatAmount;

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = !searchTerm || inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalRevenue = invoices.filter(i => i.status === "paid").reduce((s, i) => s + i.total_amount, 0);
  const totalOutstanding = invoices.filter(i => ["sent", "partial", "overdue"].includes(i.status)).reduce((s, i) => s + (i.total_amount - i.amount_paid), 0);
  const totalOverdue = invoices.filter(i => i.status === "overdue").reduce((s, i) => s + (i.total_amount - i.amount_paid), 0);

  if (!business) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Please set up your business profile first.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 p-3 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Invoicing</h1>
          <p className="text-muted-foreground">Create, send, and track invoices</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Invoice</Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Invoice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Due Date</Label>
                  <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
                <div>
                  <Label>Customer (Optional)</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent>
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Line Items</Label>
                <div className="space-y-2 mt-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-end">
                      <div className="flex-1">
                        <Input placeholder="Description" value={item.description} onChange={e => updateItem(idx, "description", e.target.value)} />
                      </div>
                      <div className="w-20">
                        <Input type="number" placeholder="Qty" value={item.quantity} onChange={e => updateItem(idx, "quantity", parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="w-28">
                        <Input type="number" placeholder="Price (₦)" value={item.unit_price} onChange={e => updateItem(idx, "unit_price", parseFloat(e.target.value) || 0)} />
                      </div>
                      <div className="w-24 text-sm text-right font-medium pt-2">
                        ₦{(item.quantity * item.unit_price).toLocaleString()}
                      </div>
                      {items.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Add Item</Button>
                </div>
              </div>

              <div className="border-t pt-3 space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span>₦{subtotal.toLocaleString()}</span></div>
                <div className="flex justify-between"><span>VAT (7.5%)</span><span>₦{vatAmount.toLocaleString()}</span></div>
                <div className="flex justify-between font-bold text-base"><span>Total</span><span>₦{total.toLocaleString()}</span></div>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Additional notes..." />
              </div>
              <div>
                <Label>Payment Terms</Label>
                <Input value={terms} onChange={e => setTerms(e.target.value)} />
              </div>

              <Button className="w-full" onClick={() => createInvoice.mutate()} disabled={createInvoice.isPending || items.every(i => !i.description)}>
                {createInvoice.isPending ? "Creating..." : "Create Invoice"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Total Invoices</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold">{invoices.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Revenue Collected</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">₦{totalRevenue.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Outstanding</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold text-yellow-600">₦{totalOutstanding.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Overdue</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold text-destructive">₦{totalOverdue.toLocaleString()}</p></CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search invoices..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoice Table */}
      <Card>
        <CardContent className="p-0">
          <ResponsiveTable>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="hidden md:table-cell">Due Date</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="hidden sm:table-cell">Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : filteredInvoices.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No invoices found</TableCell></TableRow>
                ) : (
                  filteredInvoices.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                      <TableCell className="hidden sm:table-cell">{new Date(inv.issue_date).toLocaleDateString()}</TableCell>
                      <TableCell className="hidden md:table-cell">{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>₦{inv.total_amount.toLocaleString()}</TableCell>
                      <TableCell className="hidden sm:table-cell">₦{inv.amount_paid.toLocaleString()}</TableCell>
                      <TableCell><Badge className={statusColors[inv.status] || ""}>{inv.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          {inv.status === "draft" && (
                            <Button variant="ghost" size="icon" className="h-10 w-10 min-h-[44px]" onClick={() => updateStatus.mutate({ id: inv.id, status: "sent" })} title="Mark as Sent">
                              <Send className="h-4 w-4" />
                            </Button>
                          )}
                          {["sent", "partial", "overdue"].includes(inv.status) && (
                            <Button variant="ghost" size="icon" className="h-10 w-10 min-h-[44px]" onClick={() => { setSelectedInvoice(inv.id); setPaymentOpen(true); }} title="Record Payment">
                              <CreditCard className="h-4 w-4" />
                            </Button>
                          )}
                          {inv.status === "draft" && (
                            <Button variant="ghost" size="icon" className="h-10 w-10 min-h-[44px]" onClick={() => deleteInvoice.mutate(inv.id)} title="Delete">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ResponsiveTable>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {selectedInvoice && (() => {
              const inv = invoices.find(i => i.id === selectedInvoice);
              return inv ? (
                <div className="text-sm text-muted-foreground">
                  Invoice {inv.invoice_number} — Outstanding: ₦{(inv.total_amount - inv.amount_paid).toLocaleString()}
                </div>
              ) : null;
            })()}
            <div><Label>Amount (₦)</Label><Input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} /></div>
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Reference</Label><Input value={paymentRef} onChange={e => setPaymentRef(e.target.value)} placeholder="Transaction reference" /></div>
            <Button className="w-full" onClick={() => recordPayment.mutate()} disabled={recordPayment.isPending}>
              {recordPayment.isPending ? "Recording..." : "Record Payment"}
            </Button>

            {payments.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Payment History</h4>
                <div className="space-y-1">
                  {payments.map(p => (
                    <div key={p.id} className="flex justify-between text-sm border-b pb-1">
                      <span>{new Date(p.payment_date).toLocaleDateString()} — {p.payment_method}</span>
                      <span className="font-medium">₦{p.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
