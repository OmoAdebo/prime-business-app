import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/hooks/use-business";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen, Plus, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, Receipt
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";

const INCOME_CATEGORIES = [
  "Sales Revenue", "Service Revenue", "Interest Income", "Rental Income",
  "Commission", "Refunds Received", "Other Income",
];
const EXPENSE_CATEGORIES = [
  "Rent", "Utilities", "Salaries", "Office Supplies", "Marketing",
  "Transportation", "Maintenance", "Insurance", "Professional Fees",
  "Inventory Purchase", "Equipment", "Bank Charges", "Taxes", "Miscellaneous",
];
function genRef() {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `TXN-${ymd}-${Math.floor(1000 + Math.random() * 9000)}`;
}
const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Card", "Mobile Money", "Cheque"];

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

export default function BookkeepingOverview() {
  const { user } = useAuth();
  const { data: business, isLoading: bizLoading } = useBusiness();
  const queryClient = useQueryClient();
  const [showAddTx, setShowAddTx] = useState(false);
  const [txForm, setTxForm] = useState({
    type: "expense", category: "", description: "", amount: "",
    transaction_date: format(new Date(), "yyyy-MM-dd"),
    payment_method: "", reference_number: "", notes: "", include_vat: false,
  });

  const businessId = business?.id;

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ["transactions", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("business_id", businessId!)
        .order("transaction_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const addTxMutation = useMutation({
    mutationFn: async (formData: typeof txForm) => {
      const amount = parseFloat(formData.amount);
      const vatAmount = formData.include_vat ? amount * 0.075 : 0;
      const { error } = await supabase.from("transactions").insert({
        business_id: businessId!, type: formData.type, category: formData.category,
        description: formData.description, amount, transaction_date: formData.transaction_date,
        payment_method: formData.payment_method || null, reference_number: formData.reference_number || null,
        notes: formData.notes || null, vat_amount: vatAmount, vat_rate: formData.include_vat ? 7.5 : 0,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setShowAddTx(false);
      setTxForm({ type: "expense", category: "", description: "", amount: "", transaction_date: format(new Date(), "yyyy-MM-dd"), payment_method: "", reference_number: "", notes: "", include_vat: false });
      toast({ title: "Transaction recorded", description: "Your transaction has been saved." });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const netProfit = totalIncome - totalExpenses;
  const totalVat = transactions.reduce((s, t) => s + Number(t.vat_amount || 0), 0);
  const recentTx = transactions.slice(0, 5);

  if (bizLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  if (!business) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <BookOpen className="h-16 w-16 text-muted-foreground/30 mb-4" />
      <h2 className="text-xl font-semibold text-foreground">No Business Found</h2>
      <p className="text-muted-foreground mt-2">Please register your business in Settings first.</p>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Bookkeeping Overview</h1>
          <p className="text-muted-foreground mt-1">Track income, expenses, and financial health.</p>
        </div>
        <Dialog open={showAddTx} onOpenChange={setShowAddTx}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Record Transaction</Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Record Transaction</DialogTitle>
              <DialogDescription>Add a new income or expense entry.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Type</Label>
                  <Select value={txForm.type} onValueChange={v => setTxForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="income">Income</SelectItem><SelectItem value="expense">Expense</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Date</Label><Input type="date" value={txForm.transaction_date} onChange={e => setTxForm(p => ({ ...p, transaction_date: e.target.value }))} /></div>
              </div>
              <div><Label>Category</Label>
                <Select value={txForm.category} onValueChange={v => setTxForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {(txForm.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Description</Label><Input value={txForm.description} onChange={e => setTxForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Amount (₦)</Label><Input type="number" min="0" step="0.01" value={txForm.amount} onChange={e => setTxForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" /></div>
                <div><Label>Payment Method</Label>
                  <Select value={txForm.payment_method} onValueChange={v => setTxForm(p => ({ ...p, payment_method: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="vat" checked={txForm.include_vat} onChange={e => setTxForm(p => ({ ...p, include_vat: e.target.checked }))} className="rounded border-input" />
                <Label htmlFor="vat" className="text-sm">Include VAT (7.5%)</Label>
                {txForm.include_vat && txForm.amount && <span className="text-xs text-muted-foreground ml-auto">VAT: {formatNaira(parseFloat(txForm.amount) * 0.075)}</span>}
              </div>
              <div>
                <Label>Reference Number (auto-generated)</Label>
                <div className="flex gap-2">
                  <Input value={txForm.reference_number} onChange={e => setTxForm(p => ({ ...p, reference_number: e.target.value }))} placeholder="TXN-…" />
                  <Button type="button" variant="outline" size="sm" onClick={() => setTxForm(p => ({ ...p, reference_number: genRef() }))}>Regen</Button>
                </div>
              </div>
              <div><Label>Notes (optional)</Label><Textarea value={txForm.notes} onChange={e => setTxForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddTx(false)}>Cancel</Button>
              <Button onClick={() => addTxMutation.mutate(txForm)} disabled={!txForm.amount || !txForm.category || addTxMutation.isPending}>
                {addTxMutation.isPending ? "Saving..." : "Save Transaction"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { title: "Total Income", value: totalIncome, icon: ArrowUpRight, color: "text-emerald-600" },
          { title: "Total Expenses", value: totalExpenses, icon: ArrowDownRight, color: "text-red-500" },
          { title: "Net Profit", value: netProfit, icon: netProfit >= 0 ? TrendingUp : TrendingDown, color: netProfit >= 0 ? "text-emerald-600" : "text-red-500" },
          { title: "VAT Collected", value: totalVat, icon: Receipt, color: "text-primary" },
        ].map(kpi => (
          <Card key={kpi.title}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{kpi.title}</p>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <p className="text-2xl font-bold mt-2">{formatNaira(kpi.value)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest 5 entries</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {txLoading ? (
            <div className="p-8 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : recentTx.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <BookOpen className="h-12 w-12 mb-3 text-muted-foreground/30" />
              <p className="font-medium">No transactions recorded yet</p>
              <p className="text-sm mt-1">Click "Record Transaction" to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTx.map(tx => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm">{format(new Date(tx.transaction_date), "dd MMM yyyy")}</TableCell>
                    <TableCell className="font-medium">{tx.description || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{tx.category || "Uncategorized"}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={tx.type === "income" ? "default" : "secondary"} className={tx.type === "income" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}>
                        {tx.type === "income" ? "Income" : "Expense"}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${tx.type === "income" ? "text-emerald-600" : "text-red-500"}`}>
                      {tx.type === "income" ? "+" : "-"}{formatNaira(Number(tx.amount))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Expense Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Breakdown</CardTitle>
          <CardDescription>By category</CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            const expenses = transactions.filter(t => t.type === "expense");
            const byCategory = expenses.reduce<Record<string, number>>((acc, t) => {
              const cat = t.category || "Uncategorized";
              acc[cat] = (acc[cat] || 0) + Number(t.amount);
              return acc;
            }, {});
            const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
            if (sorted.length === 0) return <p className="text-sm text-muted-foreground text-center py-8">No expenses recorded yet.</p>;
            return (
              <div className="space-y-3">
                {sorted.map(([cat, amt]) => (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{cat}</span>
                      <span className="font-medium">{formatNaira(amt)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary/70" style={{ width: `${(amt / totalExpenses) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </motion.div>
  );
}
