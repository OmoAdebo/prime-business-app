import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function BankingTransfers() {
  const { user } = useAuth();
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();
  const businessId = business?.id;

  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const { data: accounts = [] } = useQuery({
    queryKey: ["bank-accounts", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("bank_accounts").select("*").eq("business_id", businessId!).eq("is_active", true).order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const transfer = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(amount);
      if (!fromAccount || !toAccount || isNaN(amt) || amt <= 0) throw new Error("Invalid transfer details");
      if (fromAccount === toAccount) throw new Error("Cannot transfer to the same account");

      const from = accounts.find(a => a.id === fromAccount);
      const to = accounts.find(a => a.id === toAccount);
      if (!from || !to) throw new Error("Account not found");
      if (from.current_balance < amt) throw new Error("Insufficient balance");

      const ref = `TRF-${Date.now()}`;

      // Create debit transaction on source
      await supabase.from("bank_transactions").insert({
        bank_account_id: fromAccount, business_id: businessId!, type: "debit", amount: amt,
        description: description || `Transfer to ${to.account_name}`, reference: ref, category: "Transfer", created_by: user?.id,
      });
      // Create credit transaction on destination
      await supabase.from("bank_transactions").insert({
        bank_account_id: toAccount, business_id: businessId!, type: "credit", amount: amt,
        description: description || `Transfer from ${from.account_name}`, reference: ref, category: "Transfer", created_by: user?.id,
      });
      // Update balances
      await supabase.from("bank_accounts").update({ current_balance: from.current_balance - amt }).eq("id", fromAccount);
      await supabase.from("bank_accounts").update({ current_balance: to.current_balance + amt }).eq("id", toAccount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      setAmount(""); setDescription(""); setFromAccount(""); setToAccount("");
      toast.success("Transfer completed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Transfers</h2>
        <p className="text-sm text-muted-foreground">Transfer funds between your accounts</p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ArrowLeftRight className="h-5 w-5" />Inter-Account Transfer</CardTitle>
          <CardDescription>Move money between your bank accounts instantly</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>From Account</Label>
            <Select value={fromAccount} onValueChange={setFromAccount}>
              <SelectTrigger><SelectValue placeholder="Select source account" /></SelectTrigger>
              <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_name} (₦{a.current_balance.toLocaleString()})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>To Account</Label>
            <Select value={toAccount} onValueChange={setToAccount}>
              <SelectTrigger><SelectValue placeholder="Select destination account" /></SelectTrigger>
              <SelectContent>{accounts.filter(a => a.id !== fromAccount).map(a => <SelectItem key={a.id} value={a.id}>{a.account_name} (₦{a.current_balance.toLocaleString()})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Amount (₦)</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" /></div>
          <div><Label>Description (Optional)</Label><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Fund petty cash" /></div>
          <Button className="w-full" onClick={() => transfer.mutate()} disabled={transfer.isPending || !fromAccount || !toAccount || !amount}>
            {transfer.isPending ? "Transferring..." : "Transfer Funds"}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
