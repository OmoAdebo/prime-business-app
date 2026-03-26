import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Monitor, Users, Building2, ShieldCheck, Activity, TrendingUp, BarChart3, Search, RefreshCw } from "lucide-react";
import { format, subDays } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function SystemReview() {
  const { roles } = useAuth();
  const isSuperAdmin = roles.includes("super_admin");

  // Platform stats
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["system-stats"],
    queryFn: async () => {
      const [usersRes, businessesRes, rolesRes, activeRes] = await Promise.all([
        supabase.from("profiles").select("id, created_at, is_active"),
        supabase.from("businesses").select("id, verification_status, created_at"),
        supabase.from("user_roles").select("role"),
        supabase.from("profiles").select("id").eq("is_active", true),
      ]);
      const users = usersRes.data || [];
      const businesses = businessesRes.data || [];
      const rolesList = rolesRes.data || [];
      const activeUsers = activeRes.data || [];

      const roleCounts: Record<string, number> = {};
      rolesList.forEach((r: any) => {
        roleCounts[r.role] = (roleCounts[r.role] || 0) + 1;
      });

      const verificationCounts: Record<string, number> = {};
      businesses.forEach((b: any) => {
        verificationCounts[b.verification_status] = (verificationCounts[b.verification_status] || 0) + 1;
      });

      // Users registered per day (last 30 days)
      const last30 = subDays(new Date(), 30);
      const dailySignups: Record<string, number> = {};
      users.forEach((u: any) => {
        const d = format(new Date(u.created_at), "MMM dd");
        if (new Date(u.created_at) >= last30) {
          dailySignups[d] = (dailySignups[d] || 0) + 1;
        }
      });

      return {
        totalUsers: users.length,
        activeUsers: activeUsers.length,
        inactiveUsers: users.length - activeUsers.length,
        totalBusinesses: businesses.length,
        roleCounts,
        verificationCounts,
        dailySignups: Object.entries(dailySignups).map(([date, count]) => ({ date, count })),
      };
    },
    enabled: isSuperAdmin,
  });

  // Activity logs
  const [logFilter, setLogFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const { data: logs, refetch: refetchLogs } = useQuery({
    queryKey: ["activity-logs", logFilter, entityFilter],
    queryFn: async () => {
      let query = supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (entityFilter !== "all") query = query.eq("entity_type", entityFilter);
      if (logFilter) query = query.ilike("action", `%${logFilter}%`);
      const { data } = await query;
      return data || [];
    },
    enabled: isSuperAdmin,
  });

  // All users with roles
  const { data: allUsers } = useQuery({
    queryKey: ["all-users-admin"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_all_users_with_roles");
      return data || [];
    },
    enabled: isSuperAdmin,
  });

  // Module usage stats
  const { data: moduleStats } = useQuery({
    queryKey: ["module-stats"],
    queryFn: async () => {
      const [invoices, sales, products, transactions, payrolls, orders] = await Promise.all([
        supabase.from("invoices").select("id", { count: "exact", head: true }),
        supabase.from("sales").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("transactions").select("id", { count: "exact", head: true }),
        supabase.from("payroll_runs").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }),
      ]);
      return [
        { module: "Invoices", count: invoices.count || 0 },
        { module: "Sales", count: sales.count || 0 },
        { module: "Products", count: products.count || 0 },
        { module: "Transactions", count: transactions.count || 0 },
        { module: "Payroll Runs", count: payrolls.count || 0 },
        { module: "Orders", count: orders.count || 0 },
      ];
    },
    enabled: isSuperAdmin,
  });

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldCheck className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>This page is restricted to platform administrators.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const roleChartData = stats
    ? Object.entries(stats.roleCounts).map(([name, value]) => ({ name, value }))
    : [];

  const verificationChartData = stats
    ? Object.entries(stats.verificationCounts).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Review</h1>
          <p className="text-muted-foreground">Platform health, user activity, and system-wide analytics</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { refetchStats(); refetchLogs(); }}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeUsers || 0} active · {stats?.inactiveUsers || 0} inactive
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Businesses</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalBusinesses || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.verificationCounts?.verified || 0} verified
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Audit Logs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Last 100 actions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Platform Modules</CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {moduleStats?.reduce((sum, m) => sum + m.count, 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">Total records across modules</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="users">User Overview</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="modules">Module Usage</TabsTrigger>
        </TabsList>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">User Signups (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {stats?.dailySignups && stats.dailySignups.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.dailySignups}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                      <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">No signup data</div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Users by Role</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                {roleChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={roleChartData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {roleChartData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">No role data</div>
                )}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Business Verification Status</CardTitle>
            </CardHeader>
            <CardContent className="h-[250px]">
              {verificationChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={verificationChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">No data</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>All Platform Users</CardTitle>
              <CardDescription>Complete list of registered users and their roles</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(allUsers as any[])?.map((u: any) => (
                    <TableRow key={`${u.user_id}-${u.role}`}>
                      <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === "super_admin" ? "destructive" : u.role === "business_owner" ? "default" : "secondary"}>
                          {u.role?.replace("_", " ") || "none"}
                        </Badge>
                      </TableCell>
                      <TableCell>{u.company_name || "—"}</TableCell>
                      <TableCell>{u.created_at ? format(new Date(u.created_at), "MMM d, yyyy") : "—"}</TableCell>
                    </TableRow>
                  ))}
                  {(!allUsers || (allUsers as any[]).length === 0) && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No users found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Trail Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Audit Trail</CardTitle>
              <CardDescription>Track user actions across the platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search actions..." value={logFilter} onChange={(e) => setLogFilter(e.target.value)} className="pl-9" />
                </div>
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Entity type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="sale">Sale</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="payroll">Payroll</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(logs as any[])?.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">{format(new Date(log.created_at), "MMM d, HH:mm:ss")}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.action}</Badge>
                      </TableCell>
                      <TableCell className="capitalize">{log.entity_type}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                        {log.details ? JSON.stringify(log.details) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!logs || logs.length === 0) && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No activity logs yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Module Usage Tab */}
        <TabsContent value="modules">
          <Card>
            <CardHeader>
              <CardTitle>Module Usage</CardTitle>
              <CardDescription>Record counts across platform modules</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {moduleStats && moduleStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={moduleStats} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis type="category" dataKey="module" width={120} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">No module data</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
