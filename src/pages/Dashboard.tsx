import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  Users,
  BarChart3,
  FileText,
  Package,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useIndustry } from "@/contexts/IndustryContext";
import { emit } from "@/lib/action-bus";

const KPI_ICONS: Record<string, any> = {
  revenue: DollarSign,
  orders: ShoppingCart,
  sales: ShoppingCart,
  customers: Users,
  clients: Users,
  patients: Users,
  buyers: Users,
  inventory: Package,
  stock: Package,
  warehouse: Package,
  produce: Package,
  dispenses: TrendingUp,
  production: TrendingUp,
  invoices: FileText,
  outstanding: FileText,
  hours: BarChart3,
  loans: DollarSign,
  transactions: BarChart3,
  churn: TrendingUp,
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { config, terms, category } = useIndustry();

  const kpiCards = config.kpis.map((k) => ({
    title: k.label,
    value: k.key === "revenue" ? "₦0.00" : "0",
    icon: KPI_ICONS[k.key] || BarChart3,
    desc: k.helper,
  }));

  const quickActions = config.quickActions.map((a) => ({
    label: a.label,
    icon:
      a.action === "open-create-invoice" ? FileText :
      a.action === "open-add-product" ? Package :
      a.action === "open-add-customer" ? Users :
      a.action === "open-new-transfer" ? DollarSign :
      a.action === "open-record-expense" ? BarChart3 : ShoppingCart,
    onClick: () => {
      if (a.route) navigate(a.route);
      // give the page a tick to mount, then trigger its open-modal action
      setTimeout(() => emit(a.action as any, {}), 120);
    },
  }));

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold font-display text-foreground">Business Overview</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Tailored for <span className="font-medium text-foreground">{category || "your industry"}</span> — terminology, units &amp; KPIs adapt automatically.
          </p>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
          {category || "MSMEs"} workspace
        </span>
      </div>

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

      {/* Quick Actions — industry-tailored */}
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg font-display">Revenue & Expenses</CardTitle>
              <CardDescription>Monthly financial overview</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground">
              <BarChart3 className="h-10 w-10 mb-3 text-muted-foreground/30" />
              <p className="text-sm font-medium">No financial data yet</p>
              <p className="text-xs mt-1 text-center max-w-xs">Revenue and expense charts will appear once you start recording transactions.</p>
              <Button variant="link" size="sm" className="mt-2" onClick={() => navigate("/bookkeeping")}>
                Go to Bookkeeping <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display">Weekly {terms.sales}</CardTitle>
            <CardDescription>This week's {terms.sale.toLowerCase()} count</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground">
              <ShoppingCart className="h-10 w-10 mb-3 text-muted-foreground/30" />
              <p className="text-sm font-medium">No {terms.sale.toLowerCase()} data yet</p>
              <p className="text-xs mt-1 text-center">Record your first {terms.sale.toLowerCase()} to see trends.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg font-display">Recent Activity</CardTitle>
            <CardDescription>Latest transactions and events</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <p className="text-sm font-medium">No recent activity</p>
            <p className="text-xs mt-1">Your latest transactions and events will show up here.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
