import { useState } from "react";
import { Plus, Search, ArrowUpRight, ArrowDownRight, CheckCircle2, Download } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function BankingTransactions() {
  const { user } = useAuth();
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();
  const businessId = business?.id;

  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterReconciled, setFilterReconciled] = useState("all");
  const [txnAccountId, setTxnAccountId] = useState("");
  const [txnType, setTxnType] = useState("debit");
  const [txnAmount, setTxnAmount] = useState("");
  const [txnDescription, setTxnDescription] = useState("");
  const [txnRef, setTxnRef] = useState("");
  const [txnCategory, setTxnCategory] = useState("");

  const { data: accounts = [] } = useQuery({
    queryKey: ["bank-accounts", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("bank_accounts").select("*").eq("business_id", businessId!).order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["bank-transactions", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("bank_transactions").select("*, bank_accounts(account_name, bank_name)").eq("business_id", businessId!).order("transaction_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const createTransaction = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(txnAmount);
      if (!txnAccountId || isNaN(amount)) throw new Error("Invalid transaction");
      const { error } = await supabase.from("bank_transactions").insert({
        bank_account_id: txnAccountId,
        business_id: businessId!,
        type: txnType,
        amount,
        description: txnDescription || null,
        reference: txnRef || null,
        category: txnCategory || null,
        created_by: user?.id,
      });
      if (error) throw error;

      const account = accounts.find(a => a.id === txnAccountId);
      if (account) {
        const newBalance = txnType === "credit" ? account.current_balance + amount : account.current_balance - amount;
        await supabase.from("bank_accounts").update({ current_balance: newBalance }).eq("id", txnAccountId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      setOpen(false);
      setTxnAmount(""); setTxnDescription(""); setTxnRef(""); setTxnCategory("");
      toast.success("Transaction recorded");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reconcile = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bank_transactions").update({ is_reconciled: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      toast.success("Transaction reconciled");
    },
  });

  const filtered = transactions.filter(t => {
    if (searchTerm && !t.description?.toLowerCase().includes(searchTerm.toLowerCase()) && !t.reference?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterType !== "all" && t.type !== filterType) return false;
    if (filterReconciled === "reconciled" && !t.is_reconciled) return false;
    if (filterReconciled === "pending" && t.is_reconciled) return false;
    return true;
  });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold">Transactions</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} transaction(s)</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Record Transaction</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Record Transaction</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Account</Label>
                <Select value={txnAccountId} onValueChange={setTxnAccountId}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_name} — {a.bank_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={txnType} onValueChange={setTxnType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">Credit (Money In)</SelectItem>
                    <SelectItem value="debit">Debit (Money Out)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Amount (₦)</Label><Input type="number" value={txnAmount} onChange={e => setTxnAmount(e.target.value)} /></div>
              <div><Label>Description</Label><Input value={txnDescription} onChange={e => setTxnDescription(e.target.value)} /></div>
              <div><Label>Reference</Label><Input value={txnRef} onChange={e => setTxnRef(e.target.value)} /></div>
              <div><Label>Category</Label><Input value={txnCategory} onChange={e => setTxnCategory(e.target.value)} placeholder="e.g. Supplies, Rent" /></div>
              <Button className="w-full" onClick={() => createTransaction.mutate()} disabled={createTransaction.isPending || !txnAccountId || !txnAmount}>
                {createTransaction.isPending ? "Recording..." : "Record Transaction"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search description or reference..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="credit">Credit</SelectItem>
            <SelectItem value="debit">Debit</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterReconciled} onValueChange={setFilterReconciled}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="reconciled">Reconciled</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No transactions found</TableCell></TableRow>
              ) : (
                filtered.map(t => (
                  <TableRow key={t.id}>
                    <TableCell>{new Date(t.transaction_date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-sm">{(t as any).bank_accounts?.account_name}</TableCell>
                    <TableCell>{t.description || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{t.category || "—"}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {t.type === "credit" ? <ArrowDownRight className="h-4 w-4 text-green-600" /> : <ArrowUpRight className="h-4 w-4 text-destructive" />}
                        <span className="capitalize">{t.type}</span>
                      </div>
                    </TableCell>
                    <TableCell className={t.type === "credit" ? "text-green-600 font-medium" : "text-destructive font-medium"}>
                      {t.type === "credit" ? "+" : "-"}₦{t.amount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.is_reconciled ? "default" : "outline"}>{t.is_reconciled ? "Reconciled" : "Pending"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {!t.is_reconciled && (
                        <Button variant="ghost" size="icon" onClick={() => reconcile.mutate(t.id)} title="Reconcile">
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  );
}
