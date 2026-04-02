import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { FileBarChart, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { motion } from "framer-motion";

function formatNaira(amount: number) {
  return `₦${amount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}`;
}

export default function FinancialStatements() {
  const { data: business } = useBusiness();
  const businessId = business?.id;

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions").select("*").eq("business_id", businessId!);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts", businessId],
    queryFn: async () => {
      const { data, error } = await supabase.from("accounts").select("*").eq("business_id", businessId!);
      if (error) throw error;
      return data;
    },
    enabled: !!businessId,
  });

  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const grossProfit = totalIncome - totalExpenses;
  const totalVat = transactions.reduce((s, t) => s + Number(t.vat_amount || 0), 0);
  const netProfit = grossProfit - totalVat;

  // Group expenses by category
  const expensesByCategory = transactions.filter(t => t.type === "expense").reduce<Record<string, number>>((acc, t) => {
    const cat = t.category || "Uncategorized";
    acc[cat] = (acc[cat] || 0) + Number(t.amount);
    return acc;
  }, {});

  const incomeByCategory = transactions.filter(t => t.type === "income").reduce<Record<string, number>>((acc, t) => {
    const cat = t.category || "Uncategorized";
    acc[cat] = (acc[cat] || 0) + Number(t.amount);
    return acc;
  }, {});

  // Simple balance sheet from accounts
  const assetAccounts = accounts.filter(a => a.type === "asset");
  const liabilityAccounts = accounts.filter(a => a.type === "liability");
  const equityAccounts = accounts.filter(a => a.type === "equity");

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 w-full" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">Financial Statements</h1>
        <p className="text-muted-foreground mt-1">Profit & Loss, Balance Sheet, and Cash Flow reports.</p>
      </div>

      <Tabs defaultValue="pnl">
        <TabsList>
          <TabsTrigger value="pnl">Profit & Loss</TabsTrigger>
          <TabsTrigger value="balance">Balance Sheet</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
        </TabsList>

        {/* Profit & Loss */}
        <TabsContent value="pnl" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-emerald-600" /> Revenue</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(incomeByCategory).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No income recorded</p>
                ) : (
                  <>
                    {Object.entries(incomeByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                      <div key={cat} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{cat}</span>
                        <span className="font-medium text-emerald-600">{formatNaira(amt)}</span>
                      </div>
                    ))}
                    <hr className="border-border" />
                    <div className="flex justify-between font-semibold">
                      <span>Total Revenue</span>
                      <span className="text-emerald-600">{formatNaira(totalIncome)}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingDown className="h-5 w-5 text-red-500" /> Expenses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(expensesByCategory).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No expenses recorded</p>
                ) : (
                  <>
                    {Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                      <div key={cat} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{cat}</span>
                        <span className="font-medium text-red-500">({formatNaira(amt)})</span>
                      </div>
                    ))}
                    <hr className="border-border" />
                    <div className="flex justify-between font-semibold">
                      <span>Total Expenses</span>
                      <span className="text-red-500">({formatNaira(totalExpenses)})</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <Card>
            <CardContent className="p-6 space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Revenue</span><span className="font-semibold text-emerald-600">{formatNaira(totalIncome)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Expenses</span><span className="font-semibold text-red-500">({formatNaira(totalExpenses)})</span></div>
              <hr className="border-border" />
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Gross Profit</span><span className={`font-bold ${grossProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>{formatNaira(grossProfit)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">VAT Liability (7.5%)</span><span className="font-semibold">{formatNaira(totalVat)}</span></div>
              <hr className="border-border" />
              <div className="flex justify-between"><span className="font-semibold text-lg">Net Profit</span><span className={`font-bold text-xl ${netProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>{formatNaira(netProfit)}</span></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Balance Sheet */}
        <TabsContent value="balance" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Assets</CardTitle><CardDescription>{assetAccounts.length} accounts</CardDescription></CardHeader>
              <CardContent className="space-y-2">
                {assetAccounts.length === 0 ? <p className="text-sm text-muted-foreground">No asset accounts</p> : (
                  assetAccounts.map(a => (
                    <div key={a.id} className="flex justify-between text-sm">
                      <span>{a.code ? `${a.code} - ` : ""}{a.name}</span>
                      <span className="font-mono">—</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Liabilities</CardTitle><CardDescription>{liabilityAccounts.length} accounts</CardDescription></CardHeader>
              <CardContent className="space-y-2">
                {liabilityAccounts.length === 0 ? <p className="text-sm text-muted-foreground">No liability accounts</p> : (
                  liabilityAccounts.map(a => (
                    <div key={a.id} className="flex justify-between text-sm">
                      <span>{a.code ? `${a.code} - ` : ""}{a.name}</span>
                      <span className="font-mono">—</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Equity</CardTitle><CardDescription>{equityAccounts.length} accounts</CardDescription></CardHeader>
              <CardContent className="space-y-2">
                {equityAccounts.length === 0 ? <p className="text-sm text-muted-foreground">No equity accounts</p> : (
                  equityAccounts.map(a => (
                    <div key={a.id} className="flex justify-between text-sm">
                      <span>{a.code ? `${a.code} - ` : ""}{a.name}</span>
                      <span className="font-mono">—</span>
                    </div>
                  ))
                )}
                <hr className="border-border" />
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Retained Earnings</span>
                  <span className={`font-semibold ${netProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>{formatNaira(netProfit)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Cash Flow */}
        <TabsContent value="cashflow" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" /> Cash Flow Statement</CardTitle>
              <CardDescription>Summary of cash inflows and outflows</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-2">Operating Activities</h4>
                <div className="space-y-2 pl-4">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Cash received from sales</span><span className="text-emerald-600">{formatNaira(totalIncome)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Cash paid for expenses</span><span className="text-red-500">({formatNaira(totalExpenses)})</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">VAT payments</span><span className="text-red-500">({formatNaira(totalVat)})</span></div>
                  <hr className="border-border" />
                  <div className="flex justify-between font-semibold text-sm"><span>Net Operating Cash Flow</span><span className={netProfit >= 0 ? "text-emerald-600" : "text-red-500"}>{formatNaira(netProfit)}</span></div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">Investing Activities</h4>
                <p className="text-sm text-muted-foreground pl-4">No investing activities recorded</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">Financing Activities</h4>
                <p className="text-sm text-muted-foreground pl-4">No financing activities recorded</p>
              </div>
              <hr className="border-border" />
              <div className="flex justify-between"><span className="font-semibold text-lg">Net Cash Change</span><span className={`font-bold text-xl ${netProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>{formatNaira(netProfit)}</span></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
