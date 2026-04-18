import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, FilePlus2, Pencil, Trash2, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

interface LogRow {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  details: any;
}

const ENTITY_LABELS: Record<string, string> = {
  invoices: "invoice",
  products: "product",
  bank_transactions: "bank transaction",
  journal_entries: "journal entry",
  payroll_runs: "payroll run",
  customers: "customer",
  bank_accounts: "bank account",
};

const ENTITY_LINKS: Record<string, string> = {
  invoices: "/invoicing",
  products: "/inventory/products",
  bank_transactions: "/banking/transactions",
  journal_entries: "/bookkeeping/journal-entries",
  payroll_runs: "/payroll",
  customers: "/customers",
  bank_accounts: "/banking/accounts",
};

function actionIcon(action: string) {
  if (action === "created") return <FilePlus2 className="h-3.5 w-3.5" />;
  if (action === "updated") return <Pencil className="h-3.5 w-3.5" />;
  if (action === "deleted") return <Trash2 className="h-3.5 w-3.5" />;
  return <Activity className="h-3.5 w-3.5" />;
}

function actionVariant(action: string): "default" | "secondary" | "destructive" | "outline" {
  if (action === "created") return "default";
  if (action === "updated") return "secondary";
  if (action === "deleted") return "destructive";
  return "outline";
}

export function ActivityFeed() {
  const { data: business } = useBusiness();
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { full_name: string | null }>>({});
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(20);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");

  useEffect(() => {
    if (!business?.id) return;

    const load = async () => {
      setLoading(true);
      let q = supabase.from("activity_logs").select("*")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (actionFilter !== "all") q = q.eq("action", actionFilter);
      if (entityFilter !== "all") q = q.eq("entity_type", entityFilter);

      const { data, error } = await q;
      if (!error && data) {
        setLogs(data as LogRow[]);
        const userIds = [...new Set(data.map(d => d.user_id))];
        if (userIds.length) {
          const { data: profs } = await supabase.from("profiles")
            .select("id, full_name").in("id", userIds);
          if (profs) {
            const map: Record<string, { full_name: string | null }> = {};
            profs.forEach(p => { map[p.id] = { full_name: p.full_name }; });
            setProfiles(map);
          }
        }
      }
      setLoading(false);
    };

    load();

    // Realtime subscription
    const ch = supabase.channel(`activity_logs_${business.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "activity_logs",
        filter: `business_id=eq.${business.id}`,
      }, () => load())
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [business?.id, limit, actionFilter, entityFilter]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" /> Team Activity
            </CardTitle>
            <CardDescription>Recent actions by you and your team</CardDescription>
          </div>
          <div className="flex gap-2">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                <SelectItem value="created">Created</SelectItem>
                <SelectItem value="updated">Updated</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {Object.entries(ENTITY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading && logs.length === 0 ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : logs.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
            No activity yet. Actions like creating invoices, adding products, and recording transactions will appear here.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {logs.map(log => {
              const name = profiles[log.user_id]?.full_name || "A team member";
              const entityLabel = ENTITY_LABELS[log.entity_type] || log.entity_type;
              const link = ENTITY_LINKS[log.entity_type];
              return (
                <li key={log.id} className="py-3 flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                    {name.substring(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{name}</span>
                      <Badge variant={actionVariant(log.action)} className="text-[10px] gap-1 px-1.5 py-0">
                        {actionIcon(log.action)} {log.action}
                      </Badge>
                      <span className="text-xs text-muted-foreground">a {entityLabel}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {link && (
                    <Button asChild variant="ghost" size="sm" className="h-7 px-2 shrink-0">
                      <Link to={link}><ArrowRight className="h-3.5 w-3.5" /></Link>
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {logs.length >= limit && (
          <div className="pt-4 text-center">
            <Button variant="outline" size="sm" onClick={() => setLimit(l => l + 20)}>Load more</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
