import {
  DollarSign, TrendingUp, ShoppingCart, Users, BarChart3,
  FileText, Package, ArrowRight, ArrowUpRight, ArrowDownRight, Sparkles,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { useAuth } from "@/contexts/AuthContext";
import { useIndustry } from "@/contexts/IndustryContext";
import { dispatchAction, type AppAction } from "@/lib/action-bus";

const KPI_ICONS: Record<string, any> = {
  revenue: DollarSign, orders: ShoppingCart, sales: ShoppingCart,
  customers: Users, clients: Users, patients: Users, buyers: Users,
  inventory: Package, stock: Package, warehouse: Package, produce: Package,
  dispenses: TrendingUp, production: TrendingUp,
  invoices: FileText, outstanding: FileText, hours: BarChart3,
  loans: DollarSign, transactions: BarChart3, churn: TrendingUp,
};

function naira(n: number) {
  return `₦${(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: business } = useBusiness();
  const { config, terms, category } = useIndustry();
  const businessId = business?.id;

  const { data: transactions = [] } = useQuery({
    queryKey: ["dashboard-tx", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const since = subDays(new Date(), 30).toISOString();
      const { data, error } = await supabase
        .from("transactions")
        .select("type, amount, transaction_date, category, description, created_at")
        .eq("business_id", businessId!)
        .gte("transaction_date", since.slice(0, 10))
        .order("transaction_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const totals = useMemo(() => {
    const income = transactions.filter((t: any) => t.type === "income").reduce((s, t: any) => s + Number(t.amount), 0);
    const expense = transactions.filter((t: any) => t.type === "expense").reduce((s, t: any) => s + Number(t.amount), 0);
    return { income, expense, profit: income - expense };
  }, [transactions]);

  const chartData = useMemo(() => {
    const map = new Map<string, { date: string; income: number; expense: number }>();
    for (let i = 13; i >= 0; i--) {
      const d = format(subDays(startOfDay(new Date()), i), "MMM dd");
      map.set(d, { date: d, income: 0, expense: 0 });
    }
    transactions.forEach((t: any) => {
      const d = format(new Date(t.transaction_date), "MMM dd");
      const row = map.get(d);
      if (!row) return;
      if (t.type === "income") row.income += Number(t.amount);
      else if (t.type === "expense") row.expense += Number(t.amount);
    });
    return Array.from(map.values());
  }, [transactions]);

  const weeklyData = useMemo(() => {
    const out: { day: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = subDays(new Date(), i);
      const key = format(day, "EEE");
      const value = transactions
        .filter((t: any) => format(new Date(t.transaction_date), "yyyy-MM-dd") === format(day, "yyyy-MM-dd") && t.type === "income")
        .reduce((s, t: any) => s + Number(t.amount), 0);
      out.push({ day: key, value });
    }
    return out;
  }, [transactions]);

  const recent = transactions.slice(0, 5);

  const kpiCards = config.kpis.map((k) => {
    const isRevenue = k.key === "revenue";
    return {
      title: k.label,
      value: isRevenue ? naira(totals.income) : k.key === "transactions" ? String(transactions.length) : "0",
      icon: KPI_ICONS[k.key] || BarChart3,
      desc: k.helper,
    };
  });

  const quickActions = config.quickActions.map((a) => ({
    label: a.label,
    icon:
      a.action === "open-create-invoice" ? FileText :
      a.action === "open-add-product" ? Package :
      a.action === "open-add-customer" ? Users :
      a.action === "open-new-transfer" ? DollarSign :
      a.action === "open-record-expense" ? BarChart3 :
      a.action === "open-record-transaction" ? DollarSign : ShoppingCart,
    onClick: () => {
      if (a.route) navigate(a.route);
      setTimeout(() => dispatchAction({ type: a.action as AppAction['type'], payload: {} } as AppAction), 120);
    },
  }));

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();
  const firstName = (user?.user_metadata as any)?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Hero */}
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary via-primary to-primary/70 text-primary-foreground">
        <CardContent className="p-6 sm:p-8 relative">
          <div className="absolute right-4 top-4 hidden sm:block opacity-20">
            <Sparkles className="h-24 w-24" />
          </div>
          <div className="relative">
            <p className="text-sm opacity-80">{greeting}, {firstName}</p>
            <h2 className="text-2xl sm:text-3xl font-bold font-display mt-1">
              {business?.company_name ?? "Your business"} dashboard
            </h2>
            <p className="text-sm opacity-90 mt-1">Tailored for {category || "MSMEs"} — last 30 days at a glance.</p>
            <div className="grid grid-cols-3 gap-4 mt-5 max-w-xl">
              <div>
                <p className="text-xs opacity-80">Income</p>
                <p className="text-lg sm:text-xl font-bold">{naira(totals.income)}</p>
              </div>
              <div>
                <p className="text-xs opacity-80">Expenses</p>
                <p className="text-lg sm:text-xl font-bold">{naira(totals.expense)}</p>
              </div>
              <div>
                <p className="text-xs opacity-80">Net Profit</p>
                <p className="text-lg sm:text-xl font-bold">{naira(totals.profit)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title} className="group hover:shadow-md transition-shadow">
            <CardContent className="p-3 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-primary/10">
                  <kpi.icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xs text-muted-foreground">{kpi.title}</p>
                <p className="text-lg sm:text-2xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{kpi.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-display">Quick Actions</CardTitle>
          <CardDescription>Shortcuts tailored to {category || "your industry"}.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                className="h-auto flex-col gap-2 py-4 hover:border-primary/40"
                onClick={action.onClick}
              >
                <action.icon className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display">Revenue & Expenses</CardTitle>
            <CardDescription>Last 14 days</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground">
                <BarChart3 className="h-10 w-10 mb-3 text-muted-foreground/30" />
                <p className="text-sm font-medium">No financial data yet</p>
                <Button variant="link" size="sm" onClick={() => navigate("/bookkeeping")}>
                  Go to Bookkeeping <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => naira(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Area type="monotone" dataKey="income" stroke="hsl(var(--primary))" fill="url(#gIncome)" strokeWidth={2} />
                  <Area type="monotone" dataKey="expense" stroke="hsl(var(--destructive))" fill="url(#gExpense)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display">Weekly {terms.sales}</CardTitle>
            <CardDescription>This week's income</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground">
                <ShoppingCart className="h-10 w-10 mb-3 text-muted-foreground/30" />
                <p className="text-sm font-medium">No {terms.sale.toLowerCase()} data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                  <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => naira(v)} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-display">Recent Activity</CardTitle>
          <CardDescription>Latest transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <p className="text-sm font-medium">No recent activity</p>
              <p className="text-xs mt-1">Record a transaction to see it here.</p>
            </div>
          ) : (
            <div className="divide-y">
              {recent.map((t: any, i) => (
                <div key={i} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center ${t.type === "income" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                      {t.type === "income" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.description || t.category || "Transaction"}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(t.transaction_date), "dd MMM yyyy")} · {t.category || "Uncategorized"}</p>
                    </div>
                  </div>
                  <p className={`text-sm font-semibold ${t.type === "income" ? "text-primary" : "text-destructive"}`}>
                    {t.type === "income" ? "+" : "-"}{naira(Number(t.amount))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
