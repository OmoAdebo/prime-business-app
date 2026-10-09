import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, subHours, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, CheckCircle2, AlertTriangle, Gauge } from "lucide-react";

interface SystemEvent {
  id: string;
  category: string;
  action: string;
  message: string | null;
  code: string | null;
  severity: string;
  email: string | null;
  path: string | null;
  resolved: boolean;
  created_at: string;
}

const RANGES = { "24h": () => subHours(new Date(), 24), "7d": () => subDays(new Date(), 7), "30d": () => subDays(new Date(), 30) };

export default function AdminMonitoring() {
  const qc = useQueryClient();
  const [range, setRange] = useState<keyof typeof RANGES>("24h");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");

  const { data = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["system-events", range],
    retry: false,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("system_events")
        .select("id, category, action, message, code, severity, email, path, resolved, created_at")
        .gte("created_at", RANGES[range]().toISOString())
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as SystemEvent[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return data.filter((e) =>
      (category === "all" || e.category === category) &&
      (!q || [e.action, e.message, e.email, e.code].some((v) => v?.toLowerCase().includes(q))));
  }, [data, category, search]);

  const stats = useMemo(() => {
    const open = data.filter((e) => !e.resolved);
    const by = (fn: (e: SystemEvent) => boolean) => open.filter(fn).length;
    const top = new Map<string, number>();
    open.forEach((e) => top.set(`${e.category} · ${e.action}`, (top.get(`${e.category} · ${e.action}`) ?? 0) + 1));
    return {
      total: open.length,
      auth: by((e) => e.category === "auth"),
      data: by((e) => e.category === "data"),
      errors: by((e) => e.severity === "error"),
      top: Array.from(top.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5),
    };
  }, [data]);

  const resolve = async (id: string) => {
    await (supabase as any).from("system_events").update({ resolved: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["system-events"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold font-display flex items-center gap-2"><Gauge className="h-7 w-7 text-primary" /> Monitoring</h1>
          <p className="text-muted-foreground mt-1">Failed sign-ins, password resets, data loads and saves across the app.</p>
        </div>
        <div className="flex gap-2">
          <Select value={range} onValueChange={(v) => setRange(v as keyof typeof RANGES)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">
          The monitoring table isn't set up yet. Run <code>db/system_events.sql</code> on the database, then refresh.
        </CardContent></Card>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Open issues", value: stats.total },
              { label: "Sign-in & reset", value: stats.auth },
              { label: "Data load / save", value: stats.data },
              { label: "Errors", value: stats.errors },
            ].map((c) => (
              <Card key={c.label}><CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-3xl font-bold">{isLoading ? "…" : c.value}</p>
              </CardContent></Card>
            ))}
          </div>

          {stats.top.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-display">Most frequent failures</CardTitle>
                <CardDescription>Unresolved, in the selected period</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats.top.map(([k, n]) => (
                  <div key={k} className="flex items-center justify-between text-sm">
                    <span className="font-mono text-xs">{k}</span>
                    <Badge variant="secondary">{n}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2 flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-lg font-display">Events</CardTitle>
              <div className="flex gap-2">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="auth">Sign-in & reset</SelectItem>
                    <SelectItem value="data">Data</SelectItem>
                    <SelectItem value="function">Functions</SelectItem>
                    <SelectItem value="payment">Payments</SelectItem>
                    <SelectItem value="client">App</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Search email, message…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {isLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : filtered.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-primary" /> No failures recorded in this period.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>What</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((e) => (
                      <TableRow key={e.id} className={e.resolved ? "opacity-50" : ""}>
                        <TableCell className="whitespace-nowrap text-xs">{formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {e.severity === "error" ? <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> : <AlertTriangle className="h-3.5 w-3.5 text-warning" />}
                            <span className="text-sm font-medium">{e.action}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">{e.category}{e.path ? ` · ${e.path}` : ""}</div>
                        </TableCell>
                        <TableCell className="max-w-sm">
                          <div className="text-sm truncate" title={e.message ?? ""}>{e.message}</div>
                          {e.code && <Badge variant="outline" className="mt-1 text-[10px]">{e.code}</Badge>}
                        </TableCell>
                        <TableCell className="text-xs">{e.email ?? "—"}</TableCell>
                        <TableCell>
                          {!e.resolved && <Button size="sm" variant="ghost" onClick={() => resolve(e.id)}>Resolve</Button>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
