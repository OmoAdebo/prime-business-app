import { useState } from "react";
import { Plus, Wallet, MoreHorizontal, Power } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function BankingAccounts() {
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();
  const businessId = business?.id;

  const [open, setOpen] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountType, setAccountType] = useState("current");

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["bank-accounts", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("bank_accounts").select("*").eq("business_id", businessId!).order("created_at");
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
      setOpen(false);
      setAccountName(""); setBankName(""); setAccountNumber(""); setAccountType("current");
      toast.success("Bank account added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("bank_accounts").update({ is_active: !is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success("Account updated");
    },
  });

  const totalBalance = accounts.reduce((s, a) => s + a.current_balance, 0);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Accounts</h2>
          <p className="text-sm text-muted-foreground">Manage bank accounts and wallets</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Add Account</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Bank Account</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Account Name</Label><Input value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="e.g. Business Savings" /></div>
              <div><Label>Bank Name</Label><Input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. GTBank" /></div>
              <div><Label>Account Number</Label><Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="10-digit number" maxLength={10} /></div>
              <div>
                <Label>Account Type</Label>
                <Select value={accountType} onValueChange={setAccountType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Current</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="domiciliary">Domiciliary</SelectItem>
                    <SelectItem value="fixed_deposit">Fixed Deposit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => createAccount.mutate()} disabled={createAccount.isPending || !accountName || !bankName}>
                {createAccount.isPending ? "Adding..." : "Add Account"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Balance Across All Accounts</p>
              <p className="text-3xl font-bold text-primary">₦{totalBalance.toLocaleString()}</p>
            </div>
            <Wallet className="h-10 w-10 text-primary/40" />
          </div>
        </CardContent>
      </Card>

      {/* Account Cards */}
      {isLoading ? (
        <p className="text-muted-foreground text-center py-8">Loading accounts...</p>
      ) : accounts.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No accounts yet. Click "Add Account" to get started.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(a => (
            <Card key={a.id} className={!a.is_active ? "opacity-60" : ""}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-base">{a.account_name}</CardTitle>
                  <CardDescription>{a.bank_name}{a.account_number ? ` • ****${a.account_number.slice(-4)}` : ""}</CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => toggleActive.mutate({ id: a.id, is_active: a.is_active })}>
                      <Power className="h-4 w-4 mr-2" />{a.is_active ? "Deactivate" : "Activate"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">₦{a.current_balance.toLocaleString()}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs capitalize">{a.account_type}</Badge>
                  <Badge variant={a.is_active ? "default" : "secondary"} className="text-xs">{a.is_active ? "Active" : "Inactive"}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{a.currency}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}
