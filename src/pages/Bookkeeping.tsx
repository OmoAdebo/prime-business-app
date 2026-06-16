import { useState, useEffect, useMemo } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen, Plus, ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown,
  Receipt, FileText, Calculator, Search, Filter, RefreshCw, Settings2, Trash2
} from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { onAction } from "@/lib/action-bus";
import { ExportMenu } from "@/components/ExportMenu";

const INCOME_CATEGORIES = [
  "Sales Revenue", "Service Revenue", "Interest Income", "Commission", "Refunds Received", "Other Income"
];
const EXPENSE_CATEGORIES = [
  "Rent", "Utilities", "Salaries", "Office Supplies", "Marketing", "Transportation",
  "Maintenance", "Insurance", "Professional Fees", "Inventory Purchase", "Equipment", "Miscellaneous"
];

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Card", "Mobile Money", "Cheque"];

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

function generateRef() {
  const d = format(new Date(), "yyyyMMdd");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TXN-${d}-${rand}`;
}

function loadCustomCategories(businessId: string, type: "income" | "expense"): string[] {
  try {
    const raw = localStorage.getItem(`tx-cat:${businessId}:${type}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveCustomCategories(businessId: string, type: "income" | "expense", list: string[]) {
  try { localStorage.setItem(`tx-cat:${businessId}:${type}`, JSON.stringify(list)); } catch {}
}

export default function Bookkeeping() {
  const { user } = useAuth();
  const { data: business, isLoading: bizLoading } = useBusiness();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("transactions");
  const [showAddTx, setShowAddTx] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [showManageCats, setShowManageCats] = useState(false);
  const [newCatInput, setNewCatInput] = useState("");
  const [customIncomeCats, setCustomIncomeCats] = useState<string[]>([]);
  const [customExpenseCats, setCustomExpenseCats] = useState<string[]>([]);

  // Form state
  const [txForm, setTxForm] = useState({
    type: "expense" as "income" | "expense",
    category: "",
    description: "",
    amount: "",
    transaction_date: format(new Date(), "yyyy-MM-dd"),
    payment_method: "",
    reference_number: generateRef(),
    notes: "",
    include_vat: false,
  });


  const businessId = business?.id;

  // Fetch transactions
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

  // Fetch accounts
  const { data: accounts = [], isLoading: accLoading } = useQuery({
    queryKey: ["accounts", businessId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("*")
        .eq("business_id", businessId!)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  // Add transaction
  const addTxMutation = useMutation({
    mutationFn: async (formData: typeof txForm) => {
      const amount = parseFloat(formData.amount);
      const vatAmount = formData.include_vat ? amount * 0.075 : 0;
      const { error } = await supabase.from("transactions").insert({
        business_id: businessId!,
        type: formData.type,
        category: formData.category,
        description: formData.description,
        amount,
        transaction_date: formData.transaction_date,
        payment_method: formData.payment_method || null,
        reference_number: formData.reference_number || null,
        notes: formData.notes || null,
        vat_amount: vatAmount,
        vat_rate: formData.include_vat ? 7.5 : 0,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setShowAddTx(false);
      resetForm();
      toast({ title: "Transaction recorded", description: "Your transaction has been saved." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Delete transaction
  const deleteTxMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast({ title: "Transaction deleted" });
    },
  });

  function resetForm() {
    setTxForm({
      type: "expense", category: "", description: "", amount: "",
      transaction_date: format(new Date(), "yyyy-MM-dd"),
      payment_method: "", reference_number: "", notes: "", include_vat: false,
    });
  }

  // Calculations
  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const netProfit = totalIncome - totalExpenses;
  const totalVat = transactions.reduce((s, t) => s + Number(t.vat_amount || 0), 0);

  // Filtered transactions
  const filteredTx = transactions.filter(t => {
    const matchSearch = !searchTerm || t.description?.toLowerCase().includes(searchTerm.toLowerCase()) || t.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === "all" || t.type === filterType;
    return matchSearch && matchType;
  });

  if (bizLoading) {
    return <div className="space-y-4 max-w-7xl"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!business) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BookOpen className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold text-foreground">No Business Found</h2>
        <p className="text-muted-foreground mt-2">Please register your business in Settings first.</p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Bookkeeping</h1>
          <p className="text-muted-foreground mt-1">Track income, expenses, and financial health.</p>
        </div>
        <Dialog open={showAddTx} onOpenChange={setShowAddTx}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Record Transaction</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Record Transaction</DialogTitle>
              <DialogDescription>Add a new income or expense entry.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Type</Label>
                  <Select value={txForm.type} onValueChange={v => setTxForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={txForm.transaction_date} onChange={e => setTxForm(p => ({ ...p, transaction_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={txForm.category} onValueChange={v => setTxForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Description</Label>
                <Input value={txForm.description} onChange={e => setTxForm(p => ({ ...p, description: e.target.value }))} placeholder="Brief description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Amount (₦)</Label>
                  <Input type="number" min="0" step="0.01" value={txForm.amount} onChange={e => setTxForm(p => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
                </div>
                <div>
                  <Label>Payment Method</Label>
                  <Select value={txForm.payment_method} onValueChange={v => setTxForm(p => ({ ...p, payment_method: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="vat" checked={txForm.include_vat} onChange={e => setTxForm(p => ({ ...p, include_vat: e.target.checked }))} className="rounded border-input" />
                <Label htmlFor="vat" className="text-sm">Include VAT (7.5%)</Label>
                {txForm.include_vat && txForm.amount && (
                  <span className="text-xs text-muted-foreground ml-auto">VAT: {formatNaira(parseFloat(txForm.amount) * 0.075)}</span>
                )}
              </div>
              <div>
                <Label>Reference Number (optional)</Label>
                <Input value={txForm.reference_number} onChange={e => setTxForm(p => ({ ...p, reference_number: e.target.value }))} placeholder="INV-001" />
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Textarea value={txForm.notes} onChange={e => setTxForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
              </div>
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

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="statements">Financial Statements</TabsTrigger>
          <TabsTrigger value="accounts">Chart of Accounts</TabsTrigger>
        </TabsList>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search transactions..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[140px]"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              {txLoading ? (
                <div className="p-8 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : filteredTx.length === 0 ? (
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
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">VAT</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTx.map(tx => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-sm">{format(new Date(tx.transaction_date), "dd MMM yyyy")}</TableCell>
                        <TableCell className="font-medium">{tx.description || "—"}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{tx.category || "Uncategorized"}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={tx.type === "income" ? "default" : "secondary"} className={tx.type === "income" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}>
                            {tx.type === "income" ? "Income" : "Expense"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{tx.payment_method || "—"}</TableCell>
                        <TableCell className={`text-right font-semibold ${tx.type === "income" ? "text-emerald-600" : "text-red-500"}`}>
                          {tx.type === "income" ? "+" : "-"}{formatNaira(Number(tx.amount))}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">{Number(tx.vat_amount) > 0 ? formatNaira(Number(tx.vat_amount)) : "—"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteTxMutation.mutate(tx.id)}>Delete</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Statements */}
        <TabsContent value="statements" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profit & Loss */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Profit & Loss</CardTitle>
                <CardDescription>Summary of income and expenses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Revenue</span><span className="font-semibold text-emerald-600">{formatNaira(totalIncome)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Expenses</span><span className="font-semibold text-red-500">({formatNaira(totalExpenses)})</span></div>
                  <hr className="border-border" />
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Gross Profit</span><span className={`font-bold ${netProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>{formatNaira(netProfit)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">VAT Liability</span><span className="font-semibold">{formatNaira(totalVat)}</span></div>
                  <hr className="border-border" />
                  <div className="flex justify-between"><span className="font-semibold">Net Profit</span><span className={`font-bold text-lg ${netProfit - totalVat >= 0 ? "text-emerald-600" : "text-red-500"}`}>{formatNaira(netProfit - totalVat)}</span></div>
                </div>
              </CardContent>
            </Card>

            {/* Expense Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5 text-primary" /> Expense Breakdown</CardTitle>
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
          </div>
        </TabsContent>

        {/* Chart of Accounts */}
        <TabsContent value="accounts" className="space-y-4">
          <AccountsManager businessId={businessId!} accounts={accounts} isLoading={accLoading} />
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

// Chart of Accounts sub-component
function AccountsManager({ businessId, accounts, isLoading }: { businessId: string; accounts: any[]; isLoading: boolean }) {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", type: "expense" });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("accounts").insert({ business_id: businessId, name: form.name, code: form.code || null, type: form.type });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      setShowAdd(false);
      setForm({ name: "", code: "", type: "expense" });
      toast({ title: "Account created" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <>
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">Manage your chart of accounts for organized financial tracking.</p>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Account</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Account</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
              <div><Label>Account Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Office Rent" /></div>
              <div><Label>Account Code (optional)</Label><Input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} placeholder="e.g. 5001" /></div>
              <div>
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["asset","liability","equity","income","expense"].map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => addMutation.mutate()} disabled={!form.name || addMutation.isPending}>
                {addMutation.isPending ? "Saving..." : "Create Account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : accounts.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-muted-foreground">
              <p className="font-medium">No accounts created yet</p>
              <p className="text-sm mt-1">Add your first account to organize transactions.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map(acc => (
                  <TableRow key={acc.id}>
                    <TableCell className="font-mono text-sm">{acc.code || "—"}</TableCell>
                    <TableCell className="font-medium">{acc.name}</TableCell>
                    <TableCell><Badge variant="outline">{acc.type}</Badge></TableCell>
                    <TableCell><Badge variant={acc.is_active ? "default" : "secondary"}>{acc.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  );
}
