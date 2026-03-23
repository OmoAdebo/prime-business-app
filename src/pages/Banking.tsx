import { useState } from "react";
import { Landmark, Plus, ArrowUpRight, ArrowDownRight, Search, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Banking() {
  const { user } = useAuth();
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();
  const businessId = business?.id;

  const [accountOpen, setAccountOpen] = useState(false);
  const [txnOpen, setTxnOpen] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState("current");
  const [txnAccountId, setTxnAccountId] = useState("");
  const [txnType, setTxnType] = useState("debit");
  const [txnAmount, setTxnAmount] = useState("");
  const [txnDescription, setTxnDescription] = useState("");
  const [txnRef, setTxnRef] = useState("");
  const [txnCategory, setTxnCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: accounts = [] } = useQuery({
    queryKey: ["bank-accounts", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("bank_accounts").select("*").eq("business_id", businessId!).order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const { data: transactions = [], isLoading: txnLoading } = useQuery({
    queryKey: ["bank-transactions", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("bank_transactions").select("*, bank_accounts(account_name, bank_name)").eq("business_id", businessId!).order("transaction_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const createAccount = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("bank_accounts").insert({
        business_id: businessId!,
        account_name: accountName,
        bank_name: bankName,
        account_number: accountNumber || null,
        account_type: accountType,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      setAccountOpen(false);
      setAccountName(""); setBankName(""); setAccountNumber("");
      toast.success("Bank account added");
    },
    onError: (e: Error) => toast.error(e.message),
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

      // Update balance
      const account = accounts.find(a => a.id === txnAccountId);
      if (account) {
        const newBalance = txnType === "credit"
          ? account.current_balance + amount
          : account.current_balance - amount;
        await supabase.from("bank_accounts").update({ current_balance: newBalance }).eq("id", txnAccountId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      setTxnOpen(false);
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

  const totalBalance = accounts.reduce((s, a) => s + a.current_balance, 0);
  const filteredTxns = transactions.filter(t =>
    !searchTerm || t.description?.toLowerCase().includes(searchTerm.toLowerCase()) || t.reference?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!business) {
    return <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">Please set up your business profile first.</p></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Banking</h1>
          <p className="text-muted-foreground">Manage accounts and transactions</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={accountOpen} onOpenChange={setAccountOpen}>
            <DialogTrigger asChild><Button variant="outline"><Plus className="h-4 w-4 mr-2" />Add Account</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Bank Account</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Account Name</Label><Input value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="e.g. Business Savings" /></div>
                <div><Label>Bank Name</Label><Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. GTBank" /></div>
                <div><Label>Account Number</Label><Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} /></div>
                <div>
                  <Label>Account Type</Label>
                  <Select value={accountType} onValueChange={setAccountType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">Current</SelectItem>
                      <SelectItem value="savings">Savings</SelectItem>
                      <SelectItem value="domiciliary">Domiciliary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={() => createAccount.mutate()} disabled={createAccount.isPending || !accountName || !bankName}>
                  {createAccount.isPending ? "Adding..." : "Add Account"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={txnOpen} onOpenChange={setTxnOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Record Transaction</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record Transaction</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Account</Label>
                  <Select value={txnAccountId} onValueChange={setTxnAccountId}>
                    <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_name} — {a.bank_name}</SelectItem>)}
                    </SelectContent>
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
      </div>

      {/* Account Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-1 bg-primary/5 border-primary/20">
          <CardHeader className="pb-2"><CardDescription>Total Balance</CardDescription></CardHeader>
          <CardContent><p className="text-2xl font-bold text-primary">₦{totalBalance.toLocaleString()}</p><p className="text-xs text-muted-foreground">{accounts.length} account(s)</p></CardContent>
        </Card>
        {accounts.slice(0, 3).map(a => (
          <Card key={a.id}>
            <CardHeader className="pb-2"><CardDescription>{a.bank_name}</CardDescription><CardTitle className="text-sm">{a.account_name}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xl font-bold">₦{a.current_balance.toLocaleString()}</p>
              <Badge variant="outline" className="text-xs mt-1">{a.account_type}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {txnLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filteredTxns.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No transactions yet</TableCell></TableRow>
              ) : (
                filteredTxns.map(t => (
                  <TableRow key={t.id}>
                    <TableCell>{new Date(t.transaction_date).toLocaleDateString()}</TableCell>
                    <TableCell className="text-sm">{(t as any).bank_accounts?.account_name}</TableCell>
                    <TableCell>{t.description || "—"}</TableCell>
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
                      <Badge variant={t.is_reconciled ? "default" : "outline"}>
                        {t.is_reconciled ? "Reconciled" : "Pending"}
                      </Badge>
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
