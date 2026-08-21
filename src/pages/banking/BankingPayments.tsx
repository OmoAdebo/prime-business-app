import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BadgeCheck, CreditCard, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveTable } from "@/components/ui/responsive-table";
import { toast } from "sonner";

type Bank = { name: string; code: string; slug: string };

type PaymentAccount = {
  id: string;
  subaccount_code: string | null;
  business_display_name: string | null;
  settlement_bank_code: string | null;
  settlement_bank_name: string | null;
  settlement_account_number: string | null;
  settlement_account_name: string | null;
  percentage_charge: number | null;
  settlement_schedule: string | null;
  status: string;
  is_live: boolean;
  last_error: string | null;
};

const naira = (n: number) =>
  `₦${Number(n || 0).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function BankingPayments() {
  const { data: business } = useBusiness();
  const businessId = business?.id;
  const queryClient = useQueryClient();

  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const { data: banks = [], isLoading: banksLoading } = useQuery({
    queryKey: ["paystack-banks"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("paystack-banks");
      if (error) throw error;
      return (data?.banks ?? []) as Bank[];
    },
    staleTime: 1000 * 60 * 60,
  });

  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ["payment-account", businessId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payment_accounts")
        .select("*")
        .eq("business_id", businessId)
        .eq("provider", "paystack")
        .maybeSingle();
      if (error) throw error;
      return data as PaymentAccount | null;
    },
    enabled: !!businessId,
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["payment-transactions", businessId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payment_transactions")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!businessId,
  });

  const connected = !!account?.subaccount_code;
  const showForm = !connected || editing;

  useEffect(() => {
    if (account && !editing) {
      setBankCode(account.settlement_bank_code ?? "");
      setAccountNumber(account.settlement_account_number ?? "");
      setResolvedName(account.settlement_account_name ?? null);
    }
  }, [account, editing]);

  useEffect(() => {
    setResolvedName(null);
  }, [bankCode]);

  const bankName = useMemo(
    () => banks.find((b) => b.code === (account?.settlement_bank_code ?? bankCode))?.name,
    [banks, account, bankCode],
  );

  const resolve = async () => {
    if (!/^\d{10}$/.test(accountNumber) || !bankCode) {
      toast.error("Select a bank and enter a 10-digit account number");
      return;
    }
    setResolving(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-resolve-account", {
        body: { bank_code: bankCode, account_number: accountNumber },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResolvedName(data.account_name);
      toast.success(`Account verified: ${data.account_name}`);
    } catch (e: any) {
      setResolvedName(null);
      toast.error(e.message ?? "Could not verify this account");
    } finally {
      setResolving(false);
    }
  };

  const connect = async () => {
    if (!resolvedName) {
      toast.error("Verify the account name first");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("paystack-subaccount", {
        body: {
          bank_code: bankCode,
          account_number: accountNumber,
          business_name: business?.company_name,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Payout account connected");
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["payment-account", businessId] });
    } catch (e: any) {
      toast.error(e.message ?? "Could not connect the payout account");
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = () => {
    if (!account) return <Badge variant="secondary">Not connected</Badge>;
    if (account.status === "active") return <Badge className="bg-primary text-primary-foreground">Active</Badge>;
    if (account.status === "disabled") return <Badge variant="destructive">Disabled</Badge>;
    return <Badge variant="secondary">Pending</Badge>;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Payments</h2>
          <p className="text-sm text-muted-foreground">
            Connect your bank account to receive customer payments directly
          </p>
        </div>
        <div className="flex items-center gap-2">
          {statusBadge()}
          {account && !account.is_live && <Badge variant="outline">Test mode</Badge>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" /> Settlement account
            </CardTitle>
            <CardDescription>
              Payments made to your invoices and online store settle straight into this account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {accountLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : showForm ? (
              <>
                <div className="space-y-2">
                  <Label>Bank</Label>
                  <Select value={bankCode} onValueChange={setBankCode} disabled={banksLoading}>
                    <SelectTrigger className="min-h-11">
                      <SelectValue placeholder={banksLoading ? "Loading banks…" : "Select your bank"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {banks.map((b) => (
                        <SelectItem key={`${b.code}-${b.slug}`} value={b.code}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Account number</Label>
                  <div className="flex gap-2">
                    <Input
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="0123456789"
                      value={accountNumber}
                      onChange={(e) => {
                        setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10));
                        setResolvedName(null);
                      }}
                      className="min-h-11"
                    />
                    <Button variant="outline" onClick={resolve} disabled={resolving} className="min-h-11">
                      {resolving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                    </Button>
                  </div>
                </div>

                {resolvedName && (
                  <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
                    <BadgeCheck className="h-4 w-4 text-primary" />
                    <span className="font-medium">{resolvedName}</span>
                  </div>
                )}

                {account?.last_error && (
                  <p className="text-xs text-destructive">{account.last_error}</p>
                )}

                <div className="flex gap-2">
                  <Button onClick={connect} disabled={saving || !resolvedName} className="min-h-11">
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {connected ? "Update payout account" : "Connect payout account"}
                  </Button>
                  {connected && (
                    <Button variant="ghost" onClick={() => setEditing(false)} className="min-h-11">Cancel</Button>
                  )}
                </div>
              </>
            ) : (
              <>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Account name</dt>
                    <dd className="font-medium text-right">{account?.settlement_account_name ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Account number</dt>
                    <dd className="font-medium">{account?.settlement_account_number ?? "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Bank</dt>
                    <dd className="font-medium text-right">{account?.settlement_bank_name || bankName || "—"}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Settlement</dt>
                    <dd className="font-medium capitalize">{account?.settlement_schedule ?? "auto"}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Platform fee</dt>
                    <dd className="font-medium">{Number(account?.percentage_charge ?? 0)}%</dd>
                  </div>
                </dl>
                <Button variant="outline" onClick={() => setEditing(true)} className="min-h-11">
                  <RefreshCw className="mr-2 h-4 w-4" /> Change account
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4" /> How it works
            </CardTitle>
            <CardDescription>Money moves directly to your own bank account.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>1. Verify your business bank account above — we confirm the account name before saving.</p>
            <p>2. Send an invoice or publish your online store. Customers pay by card or transfer.</p>
            <p>3. Funds settle to your bank on Paystack's normal settlement cycle, minus the platform fee.</p>
            <p>4. Every successful payment is recorded automatically in Banking → Transactions and marks the invoice or order as paid.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent payments</CardTitle>
          <CardDescription>Latest customer payments processed through Paystack</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No payments yet. They will appear here as soon as a customer pays.
            </p>
          ) : (
            <ResponsiveTable>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p: any) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.reference}</TableCell>
                      <TableCell>{p.customer_name || p.customer_email || "—"}</TableCell>
                      <TableCell>{naira(p.amount)}</TableCell>
                      <TableCell className="capitalize">{p.channel ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === "success" ? "default" : p.status === "failed" ? "destructive" : "secondary"}>
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(p.paid_at ?? p.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ResponsiveTable>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
