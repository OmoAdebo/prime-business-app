import { useNavigate } from "react-router-dom";
import { BarChart3, ArrowRight } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useInsights, naira } from "@/hooks/use-insights";
import { FeatureGate } from "@/components/FeatureGate";

type Status = "healthy" | "watch" | "act";
const pill: Record<Status, string> = {
  healthy: "bg-primary/10 text-primary",
  watch: "bg-warning/15 text-warning",
  act: "bg-destructive/10 text-destructive",
};
const pillLabel: Record<Status, string> = { healthy: "Healthy", watch: "Watch", act: "Act now" };

export default function FinancialHealth() {
  const navigate = useNavigate();
  const { health: h, monthly, overdueInvoices, isLoading } = useInsights();

  const metrics: { label: string; value: string; status: Status; tip: string; path: string; cta: string }[] = [
    {
      label: "Cash position",
      value: naira(h.cash),
      status: h.cash <= 0 ? "act" : h.runway !== null && h.runway < 2 ? "watch" : "healthy",
      tip: h.cash <= 0 ? "Add your bank accounts so we can track cash." : "Combined balance across your active bank accounts.",
      path: "/banking", cta: "Open banking",
    },
    {
      label: "Profit margin (90 days)",
      value: `${(h.margin * 100).toFixed(1)}%`,
      status: h.margin >= 0.2 ? "healthy" : h.margin >= 0.05 ? "watch" : "act",
      tip: `Profit of ${naira(h.profit90)} on income of ${naira(h.income90)}.`,
      path: "/bookkeeping/financial-statements", cta: "View statements",
    },
    {
      label: "Expense ratio",
      value: `${(h.expenseRatio * 100).toFixed(0)}%`,
      status: h.expenseRatio <= 0.7 ? "healthy" : h.expenseRatio <= 0.95 ? "watch" : "act",
      tip: "Share of income spent on expenses. Below 70% is comfortable.",
      path: "/bookkeeping", cta: "Review expenses",
    },
    {
      label: "Runway",
      value: h.runway === null ? "—" : `${h.runway.toFixed(1)} months`,
      status: h.runway === null ? "watch" : h.runway >= 3 ? "healthy" : h.runway >= 1 ? "watch" : "act",
      tip: "How long your cash covers your average monthly spending.",
      path: "/banking", cta: "Open banking",
    },
    {
      label: "Owed to you",
      value: naira(h.owedToYou),
      status: overdueInvoices.length === 0 ? "healthy" : overdueInvoices.length <= 3 ? "watch" : "act",
      tip: `${overdueInvoices.length} invoice(s) overdue.`,
      path: "/debt-credit", cta: "Manage debts",
    },
    {
      label: "You owe",
      value: naira(h.youOwe),
      status: h.youOwe <= h.cash ? "healthy" : h.youOwe <= h.cash * 2 ? "watch" : "act",
      tip: "Unpaid supplier bills compared with the cash you hold.",
      path: "/debt-credit", cta: "Manage payables",
    },
  ];

  return (
    <FeatureGate feature="insights.financial-health">
      <div className="space-y-6 max-w-6xl">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> Financial Health
          </h1>
          <p className="text-muted-foreground mt-1">A live check-up of your cash, profit and obligations.</p>
        </div>

        <Card>
          <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="text-center sm:text-left">
              <p className="text-xs text-muted-foreground">Health score</p>
              <p className="text-5xl font-bold font-display text-foreground">{isLoading ? "…" : h.score}</p>
              <Badge variant="secondary" className={`mt-2 ${pill[h.band]}`}>{pillLabel[h.band]}</Badge>
            </div>
            <div className="flex-1 space-y-2">
              <Progress value={h.score} className="h-3" />
              <p className="text-sm text-muted-foreground">{h.verdict}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {metrics.map((m) => (
            <Card key={m.label}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <Badge variant="secondary" className={pill[m.status]}>{pillLabel[m.status]}</Badge>
                </div>
                <p className="text-2xl font-bold">{m.value}</p>
                <p className="text-xs text-muted-foreground">{m.tip}</p>
                <Button variant="link" size="sm" className="px-0" onClick={() => navigate(m.path)}>
                  {m.cta} <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display">Income vs expenses</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => naira(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="income" name="Income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </FeatureGate>
  );
}
