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

const kpiCards = [
  {
    title: "Total Revenue",
    value: "₦0.00",
    icon: DollarSign,
    desc: "No transactions yet",
  },
  {
    title: "Net Profit",
    value: "₦0.00",
    icon: TrendingUp,
    desc: "No data yet",
  },
  {
    title: "Total Orders",
    value: "0",
    icon: ShoppingCart,
    desc: "No orders yet",
  },
  {
    title: "Active Clients",
    value: "0",
    icon: Users,
    desc: "No clients yet",
  },
];

const quickActions = [
  { label: "Create Invoice", icon: FileText, href: "/invoicing", color: "text-primary" },
  { label: "Add Product", icon: Package, href: "/inventory", color: "text-primary" },
  { label: "View Reports", icon: BarChart3, href: "/reports", color: "text-primary" },
  { label: "Manage Customers", icon: Users, href: "/customers", color: "text-primary" },
];

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome — here's your business overview.</p>
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
                <p className="text-lg sm:text-2xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{kpi.desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-display">Quick Actions</CardTitle>
          <CardDescription>Get started by setting up your business</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.label}
                variant="outline"
                className="h-auto flex-col gap-2 py-4 hover:border-primary/40"
                onClick={() => navigate(action.href)}
              >
                <action.icon className={`h-5 w-5 ${action.color}`} />
                <span className="text-xs font-medium">{action.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Revenue Chart */}
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

        {/* Weekly Sales */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-display">Weekly Sales</CardTitle>
            <CardDescription>This week's order count</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground">
              <ShoppingCart className="h-10 w-10 mb-3 text-muted-foreground/30" />
              <p className="text-sm font-medium">No sales data yet</p>
              <p className="text-xs mt-1 text-center">Process your first order in POS or Online Store.</p>
              <Button variant="link" size="sm" className="mt-2" onClick={() => navigate("/pos")}>
                Open POS <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
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
