import { useState } from "react";
import { ArrowLeftRight, Building2, Send } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";

const NIGERIAN_BANKS = [
  "Access Bank", "Citibank", "Ecobank", "Fidelity Bank", "First Bank of Nigeria",
  "First City Monument Bank (FCMB)", "Globus Bank", "Guaranty Trust Bank (GTBank)",
  "Heritage Bank", "Keystone Bank", "Kuda Bank", "Opay", "Palmpay", "Polaris Bank",
  "Providus Bank", "Stanbic IBTC Bank", "Standard Chartered Bank", "Sterling Bank",
  "SunTrust Bank", "Titan Trust Bank", "Union Bank", "United Bank for Africa (UBA)",
  "Unity Bank", "Wema Bank", "Zenith Bank",
];

export default function BankingTransfers() {
  const { user } = useAuth();
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();
  const businessId = business?.id;

  // Intra-account
  const [fromAccount, setFromAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  // Same-bank transfer (different account at same bank)
  const [sbFromAccount, setSbFromAccount] = useState("");
  const [sbToAccountNumber, setSbToAccountNumber] = useState("");
  const [sbToAccountName, setSbToAccountName] = useState("");
  const [sbAmount, setSbAmount] = useState("");
  const [sbNarration, setSbNarration] = useState("");

  // Inter-bank transfer (external)
  const [ibFromAccount, setIbFromAccount] = useState("");
  const [ibBankName, setIbBankName] = useState("");
  const [ibAccountNumber, setIbAccountNumber] = useState("");
  const [ibAccountName, setIbAccountName] = useState("");
  const [ibAmount, setIbAmount] = useState("");
  const [ibNarration, setIbNarration] = useState("");
  const [ibBeneficiaryId, setIbBeneficiaryId] = useState("");

  const { data: accounts = [] } = useQuery({
    queryKey: ["bank-accounts", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("bank_accounts").select("*").eq("business_id", businessId!).eq("is_active", true).order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  // Try to load beneficiaries (table may not exist — guard via try/catch in queryFn)
  const { data: beneficiaries = [] } = useQuery({
    queryKey: ["beneficiaries", businessId],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any).from("beneficiaries")
          .select("*").eq("business_id", businessId!).order("name");
        if (error) return [];
        return data || [];
      } catch { return []; }
    },
    enabled: !!businessId,
  });

  // Intra-account transfer
  const intraTransfer = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(amount);
      if (!fromAccount || !toAccount || isNaN(amt) || amt <= 0) throw new Error("Invalid transfer details");
      if (fromAccount === toAccount) throw new Error("Cannot transfer to the same account");
      const from = accounts.find(a => a.id === fromAccount);
      const to = accounts.find(a => a.id === toAccount);
      if (!from || !to) throw new Error("Account not found");
      if (from.current_balance < amt) throw new Error("Insufficient balance");

      const ref = `TRF-${Date.now()}`;
      await supabase.from("bank_transactions").insert({
        bank_account_id: fromAccount, business_id: businessId!, type: "debit", amount: amt,
        description: description || `Transfer to ${to.account_name}`, reference: ref, category: "Transfer", created_by: user?.id,
      });
      await supabase.from("bank_transactions").insert({
        bank_account_id: toAccount, business_id: businessId!, type: "credit", amount: amt,
        description: description || `Transfer from ${from.account_name}`, reference: ref, category: "Transfer", created_by: user?.id,
      });
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

  // Same-bank transfer (debit own account, mark as external recipient)
  const sameBankTransfer = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(sbAmount);
      if (!sbFromAccount || !sbToAccountNumber || !sbToAccountName || isNaN(amt) || amt <= 0) {
        throw new Error("Please fill all required fields");
      }
      const from = accounts.find(a => a.id === sbFromAccount);
      if (!from) throw new Error("Source account not found");
      if (from.current_balance < amt) throw new Error("Insufficient balance");

      const ref = `SBT-${Date.now()}`;
      await supabase.from("bank_transactions").insert({
        bank_account_id: sbFromAccount, business_id: businessId!, type: "debit", amount: amt,
        description: sbNarration || `Transfer to ${sbToAccountName} (${sbToAccountNumber}) — ${from.bank_name}`,
        reference: ref, category: "Same-Bank Transfer", created_by: user?.id,
      });
      await supabase.from("bank_accounts").update({ current_balance: from.current_balance - amt }).eq("id", sbFromAccount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      setSbAmount(""); setSbNarration(""); setSbToAccountName(""); setSbToAccountNumber(""); setSbFromAccount("");
      toast.success("Same-bank transfer initiated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Inter-bank transfer (external)
  const interBankTransfer = useMutation({
    mutationFn: async () => {
      const amt = parseFloat(ibAmount);
      if (!ibFromAccount || !ibBankName || !ibAccountNumber || !ibAccountName || isNaN(amt) || amt <= 0) {
        throw new Error("Please fill all required fields");
      }
      const from = accounts.find(a => a.id === ibFromAccount);
      if (!from) throw new Error("Source account not found");
      if (from.current_balance < amt) throw new Error("Insufficient balance");

      const ref = `IBT-${Date.now()}`;
      await supabase.from("bank_transactions").insert({
        bank_account_id: ibFromAccount, business_id: businessId!, type: "debit", amount: amt,
        description: ibNarration || `Inter-bank transfer to ${ibAccountName} — ${ibBankName} (${ibAccountNumber})`,
        reference: ref, category: "Inter-Bank Transfer", created_by: user?.id,
      });
      await supabase.from("bank_accounts").update({ current_balance: from.current_balance - amt }).eq("id", ibFromAccount);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-transactions"] });
      setIbAmount(""); setIbNarration(""); setIbAccountName(""); setIbAccountNumber(""); setIbBankName(""); setIbFromAccount(""); setIbBeneficiaryId("");
      toast.success("Inter-bank transfer initiated", { description: "Pending settlement with recipient bank" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onPickBeneficiary = (id: string) => {
    setIbBeneficiaryId(id);
    const b = beneficiaries.find((x: any) => x.id === id);
    if (b) {
      setIbBankName(b.bank_name || "");
      setIbAccountNumber(b.account_number || "");
      setIbAccountName(b.account_name || b.name || "");
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Transfers</h2>
        <p className="text-sm text-muted-foreground">Move money between your accounts or send to other banks</p>
      </div>

      <Tabs defaultValue="intra" className="max-w-2xl">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="intra" className="gap-1.5"><ArrowLeftRight className="h-4 w-4" /><span className="hidden sm:inline">Intra-Account</span><span className="sm:hidden">Own</span></TabsTrigger>
          <TabsTrigger value="same" className="gap-1.5"><Building2 className="h-4 w-4" /><span className="hidden sm:inline">Same Bank</span><span className="sm:hidden">Same</span></TabsTrigger>
          <TabsTrigger value="inter" className="gap-1.5"><Send className="h-4 w-4" /><span className="hidden sm:inline">Inter-Bank</span><span className="sm:hidden">Other</span></TabsTrigger>
        </TabsList>

        {/* INTRA-ACCOUNT */}
        <TabsContent value="intra">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ArrowLeftRight className="h-5 w-5" />Between Your Accounts</CardTitle>
              <CardDescription>Move money instantly between your own bank accounts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>From Account</Label>
                <Select value={fromAccount} onValueChange={setFromAccount}>
                  <SelectTrigger><SelectValue placeholder="Select source account" /></SelectTrigger>
                  <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_name} ({a.bank_name}) — ₦{a.current_balance.toLocaleString()}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>To Account</Label>
                <Select value={toAccount} onValueChange={setToAccount}>
                  <SelectTrigger><SelectValue placeholder="Select destination account" /></SelectTrigger>
                  <SelectContent>{accounts.filter(a => a.id !== fromAccount).map(a => <SelectItem key={a.id} value={a.id}>{a.account_name} ({a.bank_name}) — ₦{a.current_balance.toLocaleString()}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Amount (₦)</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" /></div>
              <div><Label>Description (Optional)</Label><Input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Fund petty cash" /></div>
              <Button className="w-full" onClick={() => intraTransfer.mutate()} disabled={intraTransfer.isPending || !fromAccount || !toAccount || !amount}>
                {intraTransfer.isPending ? "Transferring..." : "Transfer Funds"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SAME BANK */}
        <TabsContent value="same">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Same-Bank Transfer</CardTitle>
              <CardDescription>Send to another account within the same bank as your source account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>From Account</Label>
                <Select value={sbFromAccount} onValueChange={setSbFromAccount}>
                  <SelectTrigger><SelectValue placeholder="Select source account" /></SelectTrigger>
                  <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_name} ({a.bank_name}) — ₦{a.current_balance.toLocaleString()}</SelectItem>)}</SelectContent>
                </Select>
                {sbFromAccount && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Recipient must be at <span className="font-medium text-foreground">{accounts.find(a => a.id === sbFromAccount)?.bank_name}</span>
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Recipient Account Number *</Label><Input value={sbToAccountNumber} onChange={e => setSbToAccountNumber(e.target.value)} placeholder="10 digits" maxLength={10} /></div>
                <div><Label>Recipient Account Name *</Label><Input value={sbToAccountName} onChange={e => setSbToAccountName(e.target.value)} placeholder="Account holder" /></div>
              </div>
              <div><Label>Amount (₦) *</Label><Input type="number" value={sbAmount} onChange={e => setSbAmount(e.target.value)} placeholder="0.00" /></div>
              <div><Label>Narration</Label><Input value={sbNarration} onChange={e => setSbNarration(e.target.value)} placeholder="Payment description" /></div>
              <Button className="w-full" onClick={() => sameBankTransfer.mutate()} disabled={sameBankTransfer.isPending || !sbFromAccount || !sbToAccountNumber || !sbToAccountName || !sbAmount}>
                {sameBankTransfer.isPending ? "Sending..." : "Send Transfer"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* INTER BANK */}
        <TabsContent value="inter">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" />Inter-Bank Transfer</CardTitle>
              <CardDescription>Send money to an account at a different bank <Badge variant="outline" className="ml-2 text-[10px]">Pending settlement</Badge></CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>From Account</Label>
                <Select value={ibFromAccount} onValueChange={setIbFromAccount}>
                  <SelectTrigger><SelectValue placeholder="Select source account" /></SelectTrigger>
                  <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_name} ({a.bank_name}) — ₦{a.current_balance.toLocaleString()}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {beneficiaries.length > 0 && (
                <div>
                  <Label>Quick-pick from saved beneficiaries</Label>
                  <Select value={ibBeneficiaryId} onValueChange={onPickBeneficiary}>
                    <SelectTrigger><SelectValue placeholder="Choose a beneficiary (optional)" /></SelectTrigger>
                    <SelectContent>{beneficiaries.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>{b.name || b.account_name} — {b.bank_name}</SelectItem>
                    ))}</SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Recipient Bank *</Label>
                <Select value={ibBankName} onValueChange={setIbBankName}>
                  <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {NIGERIAN_BANKS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Account Number *</Label><Input value={ibAccountNumber} onChange={e => setIbAccountNumber(e.target.value)} placeholder="10 digits" maxLength={10} /></div>
                <div><Label>Account Name *</Label><Input value={ibAccountName} onChange={e => setIbAccountName(e.target.value)} placeholder="Account holder" /></div>
              </div>
              <div><Label>Amount (₦) *</Label><Input type="number" value={ibAmount} onChange={e => setIbAmount(e.target.value)} placeholder="0.00" /></div>
              <div><Label>Narration</Label><Input value={ibNarration} onChange={e => setIbNarration(e.target.value)} placeholder="Payment description" /></div>
              <Button className="w-full" onClick={() => interBankTransfer.mutate()} disabled={interBankTransfer.isPending || !ibFromAccount || !ibBankName || !ibAccountNumber || !ibAccountName || !ibAmount}>
                {interBankTransfer.isPending ? "Sending..." : "Send Transfer"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Inter-bank transfers debit your account immediately and settle with the recipient bank within 1 business day.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
