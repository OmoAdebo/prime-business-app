import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BadgeCheck, Copy, CreditCard, Link2, Loader2, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

  const [reqOpen, setReqOpen] = useState(false);
  const [reqName, setReqName] = useState("");
  const [reqEmail, setReqEmail] = useState("");
  const [reqAmount, setReqAmount] = useState("");
  const [reqLink, setReqLink] = useState<string | null>(null);
  const [reqLoading, setReqLoading] = useState(false);

  const { data: banks = [], isLoading: banksLoading } = useQuery({
    queryKey: ["paystack-banks"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("paystack-banks");
      if (error) throw error;
      return (data?.banks ?? []) as Bank[];
    },
    staleTime: 1000 * 60 * 60,
  });

  const {
    data: account,
    isLoading: accountLoading,
    error: accountError,
  } = useQuery({
    queryKey: ["payment-account", businessId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("payment_accounts")
        .select("*")
        .eq("business_id", businessId)
        .eq("provider", "paystack")
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as PaymentAccount | null;
    },
    enabled: !!businessId,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000,
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
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000,
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
            ) : accountError ? (
              <p className="text-sm text-muted-foreground">
                We couldn't load your settlement account right now. Please refresh the page and try again.
              </p>
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
          <CardTitle className="text-base">Step-by-step guide: getting paid with Prime</CardTitle>
          <CardDescription>Everything you need, from connecting your bank account to seeing the money land</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {[
            {
              title: "Step 1 — Connect your payout account",
              body: "On this page, pick your bank, type your 10-digit account number and tap Verify. We show the account name registered with your bank. If it is correct, tap Connect payout account. Use a business account in your business name where possible.",
            },
            {
              title: "Step 2 — Confirm your details are live",
              body: "Once connected, the badge at the top of this page turns Active. Test mode means payments are simulated for practice; Live mode means real money. You can tap Change account at any time to switch banks — new payments settle to the new account.",
            },
            {
              title: "Step 3 — Ask a customer to pay",
              body: "Create an invoice in Invoicing and send it, or list your products in Online Store and share your store link. Your customer pays by card, bank transfer or USSD on a secure Paystack page — they never see your bank details.",
            },
            {
              title: "Step 4 — Watch the payment come in",
              body: "Successful payments appear under Recent payments below within seconds, with the reference, customer, amount and channel. The matching invoice or order is marked paid automatically, and a matching entry is added in Banking → Transactions.",
            },
            {
              title: "Step 5 — Receive your settlement",
              body: "Paystack pays out to your connected bank account on its normal settlement cycle (usually the next working day), minus the platform fee shown on this page. Your bank alert is the final confirmation.",
            },
            {
              title: "Step 6 — Reconcile and report",
              body: "Use Banking → Transactions with the Source filter set to Payments to review card and transfer income, then export from Reports for your accountant or tax filing.",
            },
          ].map((s) => (
            <div key={s.title} className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm font-semibold">{s.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 md:col-span-2">
            <p className="text-sm font-semibold">Good to know</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Only the business owner can add or change the payout account.</li>
              <li>If verification fails, check the account number and that the bank matches — Paystack must recognise the pair.</li>
              <li>Failed or abandoned payments also show below, so you can follow up with the customer.</li>
              <li>Refunds and disputes are handled through Paystack support; the record here stays for your books.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

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
