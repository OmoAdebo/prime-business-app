import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { useAuth } from "@/contexts/AuthContext";
import { PiggyBank, Plus, TrendingUp, AlertCircle, CheckCircle, Clock, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Capital() {
  const { user } = useAuth();
  const { data: business } = useBusiness();
  const queryClient = useQueryClient();
  const [applyOpen, setApplyOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<any>(null);

  // Loan applications
  const { data: applications = [] } = useQuery({
    queryKey: ["loan-applications", business?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loan_applications")
        .select("*")
        .eq("business_id", business!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!business,
  });

  // Active loans
  const { data: loans = [] } = useQuery({
    queryKey: ["loans", business?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loans")
        .select("*, loan_repayments(*)")
        .eq("business_id", business!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!business,
  });

  // Business financials for risk assessment
  const { data: financials } = useQuery({
    queryKey: ["business-financials", business?.id],
    queryFn: async () => {
      const [txRes, recRes, payRes] = await Promise.all([
        supabase.from("transactions").select("amount, type").eq("business_id", business!.id),
        supabase.from("receivables").select("amount, amount_paid").eq("business_id", business!.id),
        supabase.from("payables").select("amount, amount_paid").eq("business_id", business!.id),
      ]);
      const income = (txRes.data || []).filter((t: any) => t.type === "income").reduce((s: number, t: any) => s + Number(t.amount), 0);
      const expenses = (txRes.data || []).filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + Number(t.amount), 0);
      const totalReceivable = (recRes.data || []).reduce((s: number, r: any) => s + Number(r.amount) - Number(r.amount_paid), 0);
      const totalPayable = (payRes.data || []).reduce((s: number, p: any) => s + Number(p.amount) - Number(p.amount_paid), 0);
      return { income, expenses, netProfit: income - expenses, totalReceivable, totalPayable };
    },
    enabled: !!business,
  });

  // Submit application with simple risk scoring
  const submitApplication = useMutation({
    mutationFn: async (formData: FormData) => {
      const requestedAmount = Number(formData.get("requested_amount"));
      const monthlyRevenue = financials?.income ? financials.income / 6 : Number(formData.get("monthly_revenue"));
      const existingDebt = financials?.totalPayable || Number(formData.get("existing_debt"));
      const termMonths = Number(formData.get("term_months"));

      // Simple risk score: 0-100
      let riskScore = 50;
      if (monthlyRevenue > 0) {
        const debtToIncome = existingDebt / (monthlyRevenue * 12);
        if (debtToIncome < 0.3) riskScore += 20;
        else if (debtToIncome > 0.6) riskScore -= 20;
        const loanToRevenue = requestedAmount / (monthlyRevenue * 12);
        if (loanToRevenue < 0.5) riskScore += 15;
        else if (loanToRevenue > 1) riskScore -= 15;
        if (financials?.netProfit && financials.netProfit > 0) riskScore += 15;
      }
      riskScore = Math.max(0, Math.min(100, riskScore));

      let assessment = "Medium Risk";
      let recommendation = "Application requires further review.";
      if (riskScore >= 70) {
        assessment = "Low Risk";
        recommendation = "Strong financial indicators. Recommended for approval.";
      } else if (riskScore < 40) {
        assessment = "High Risk";
        recommendation = "Financial indicators suggest high risk. Consider a smaller loan amount.";
      }

      const { error } = await supabase.from("loan_applications").insert({
        business_id: business!.id,
        requested_amount: requestedAmount,
        purpose: formData.get("purpose") as string,
        term_months: termMonths,
        monthly_revenue: monthlyRevenue,
        total_assets: Number(formData.get("total_assets")) || 0,
        existing_debt: existingDebt,
        risk_score: riskScore,
        risk_assessment: assessment,
        ai_recommendation: recommendation,
        status: "submitted",
        submitted_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loan-applications"] });
      setApplyOpen(false);
      toast({ title: "Application submitted", description: "Your loan application is being reviewed." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Record repayment
  const recordRepayment = useMutation({
    mutationFn: async (formData: FormData) => {
      const amount = Number(formData.get("amount"));
      const { error: repErr } = await supabase.from("loan_repayments").insert({
        loan_id: selectedLoan.id,
        amount,
        payment_method: formData.get("payment_method") as string || null,
        reference: formData.get("reference") as string || null,
      });
      if (repErr) throw repErr;

      const newRepaid = Number(selectedLoan.amount_repaid) + amount;
      const newBalance = Number(selectedLoan.total_repayable) - newRepaid;
      const { error: loanErr } = await supabase.from("loans").update({
        amount_repaid: newRepaid,
        outstanding_balance: Math.max(0, newBalance),
        status: newBalance <= 0 ? "completed" : "active",
      }).eq("id", selectedLoan.id);
      if (loanErr) throw loanErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      setPaymentOpen(false);
      setSelectedLoan(null);
      toast({ title: "Payment recorded" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (!business) {
    return <div className="p-6"><Card><CardContent className="p-12 text-center text-muted-foreground">Register your business to access capital.</CardContent></Card></div>;
  }

  const activeLoans = loans.filter((l: any) => l.status === "active");
  const totalOutstanding = activeLoans.reduce((s: number, l: any) => s + Number(l.outstanding_balance), 0);
  const totalBorrowed = loans.reduce((s: number, l: any) => s + Number(l.principal_amount), 0);

  const statusIcon = (s: string) => {
    if (s === "approved") return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (s === "rejected") return <AlertCircle className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Access to Capital</h1>
          <p className="text-muted-foreground">Business loans based on your financial health</p>
        </div>
        <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Apply for Loan</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Loan Application</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); submitApplication.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
              <div><Label>Amount Requested (₦)</Label><Input name="requested_amount" type="number" required min={10000} /></div>
              <div><Label>Purpose</Label><Textarea name="purpose" required rows={2} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Term (months)</Label><Input name="term_months" type="number" defaultValue={12} min={3} max={60} /></div>
                <div><Label>Monthly Revenue (₦)</Label><Input name="monthly_revenue" type="number" defaultValue={financials?.income ? Math.round(financials.income / 6) : ""} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Total Assets (₦)</Label><Input name="total_assets" type="number" defaultValue={0} /></div>
                <div><Label>Existing Debt (₦)</Label><Input name="existing_debt" type="number" defaultValue={financials?.totalPayable || 0} /></div>
              </div>
              {financials && (
                <Card className="bg-muted/50">
                  <CardContent className="p-3 text-sm space-y-1">
                    <p className="font-medium text-xs text-muted-foreground uppercase">Auto-detected from your books</p>
                    <div className="grid grid-cols-2 gap-2">
                      <p>Total Income: <span className="font-medium">₦{financials.income.toLocaleString()}</span></p>
                      <p>Net Profit: <span className="font-medium">₦{financials.netProfit.toLocaleString()}</span></p>
                      <p>Receivables: <span className="font-medium">₦{financials.totalReceivable.toLocaleString()}</span></p>
                      <p>Payables: <span className="font-medium">₦{financials.totalPayable.toLocaleString()}</span></p>
                    </div>
                  </CardContent>
                </Card>
              )}
              <Button type="submit" className="w-full" disabled={submitApplication.isPending}>Submit Application</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-2 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <PiggyBank className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Borrowed</p>
                <p className="text-2xl font-bold">₦{totalBorrowed.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                <p className="text-2xl font-bold">₦{totalOutstanding.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Active Loans</p>
                <p className="text-2xl font-bold">{activeLoans.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="applications">
        <div className="overflow-x-auto scrollbar-thin">
          <TabsList className="w-max sm:w-auto">
            <TabsTrigger value="applications" className="min-h-[44px]">Applications ({applications.length})</TabsTrigger>
            <TabsTrigger value="loans" className="min-h-[44px]">Active Loans ({activeLoans.length})</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="applications" className="space-y-4">
          {applications.map((app: any) => (
            <Card key={app.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {statusIcon(app.status)}
                      <span className="font-medium">₦{Number(app.requested_amount).toLocaleString()}</span>
                      <Badge variant={app.status === "approved" ? "default" : app.status === "rejected" ? "destructive" : "secondary"}>
                        {app.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{app.purpose}</p>
                    <p className="text-xs text-muted-foreground">{app.term_months} months • Applied {format(new Date(app.created_at), "MMM dd, yyyy")}</p>
                  </div>
                  {app.risk_score !== null && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Risk Score</p>
                      <p className={`text-lg font-bold ${app.risk_score >= 70 ? "text-green-600" : app.risk_score >= 40 ? "text-orange-500" : "text-destructive"}`}>
                        {app.risk_score}/100
                      </p>
                      <p className="text-xs">{app.risk_assessment}</p>
                    </div>
                  )}
                </div>
                {app.ai_recommendation && (
                  <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground">AI Recommendation</p>
                    <p className="text-sm">{app.ai_recommendation}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {applications.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No loan applications yet. Apply for capital to grow your business.</CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="loans" className="space-y-4">
          {loans.map((loan: any) => {
            const progress = Number(loan.total_repayable) > 0 ? (Number(loan.amount_repaid) / Number(loan.total_repayable)) * 100 : 0;
            return (
              <Card key={loan.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">₦{Number(loan.principal_amount).toLocaleString()} Loan</p>
                      <p className="text-sm text-muted-foreground">{loan.interest_rate}% interest • {loan.term_months} months</p>
                    </div>
                    <Badge variant={loan.status === "active" ? "default" : loan.status === "completed" ? "secondary" : "destructive"}>
                      {loan.status}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Repayment Progress</span>
                      <span>₦{Number(loan.amount_repaid).toLocaleString()} / ₦{Number(loan.total_repayable).toLocaleString()}</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div><p className="text-muted-foreground text-xs">Monthly Payment</p><p className="font-medium">₦{Number(loan.monthly_payment).toLocaleString()}</p></div>
                    <div><p className="text-muted-foreground text-xs">Outstanding</p><p className="font-medium">₦{Number(loan.outstanding_balance).toLocaleString()}</p></div>
                    <div><p className="text-muted-foreground text-xs">Start Date</p><p className="font-medium">{format(new Date(loan.start_date), "MMM dd, yyyy")}</p></div>
                  </div>
                  {/* Repayment history */}
                  {loan.loan_repayments?.length > 0 && (
                    <div className="border-t pt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Recent Payments</p>
                      {loan.loan_repayments.slice(0, 3).map((r: any) => (
                        <div key={r.id} className="flex justify-between text-sm py-1">
                          <span>{format(new Date(r.payment_date), "MMM dd, yyyy")}</span>
                          <span className="font-medium">₦{Number(r.amount).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {loan.status === "active" && (
                    <Dialog open={paymentOpen && selectedLoan?.id === loan.id} onOpenChange={(o) => { setPaymentOpen(o); if (!o) setSelectedLoan(null); }}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" onClick={() => setSelectedLoan(loan)}>Record Payment</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Record Repayment</DialogTitle></DialogHeader>
                        <form onSubmit={(e) => { e.preventDefault(); recordRepayment.mutate(new FormData(e.currentTarget)); }} className="space-y-4">
                          <div><Label>Amount (₦)</Label><Input name="amount" type="number" required defaultValue={Number(loan.monthly_payment)} /></div>
                          <div><Label>Payment Method</Label><Input name="payment_method" placeholder="Bank Transfer" /></div>
                          <div><Label>Reference</Label><Input name="reference" /></div>
                          <Button type="submit" className="w-full" disabled={recordRepayment.isPending}>Record Payment</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardContent>
              </Card>
            );
          })}
          {loans.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No active loans. Apply for capital to get started.</CardContent></Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
