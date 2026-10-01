import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Save, Search, Trash2 } from "lucide-react";
import type { PlanFeature } from "@/contexts/FeatureAccessContext";

type Toggle = "enabled" | "starter" | "growth" | "business";
const PLANS: { key: Toggle; label: string }[] = [
  { key: "starter", label: "Starter (free)" },
  { key: "growth", label: "Growth" },
  { key: "business", label: "Business" },
];

export default function AdminPlanFeatures() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<PlanFeature[]>([]);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [draft, setDraft] = useState({ feature_key: "", label: "", description: "", feature_group: "General" });

  const { data, isLoading, error } = useQuery({
    queryKey: ["plan-features"],
    retry: false,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("plan_features").select("*").order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PlanFeature[];
    },
  });

  useEffect(() => { if (data) { setRows(data); setDirty(new Set()); } }, [data]);

  const groups = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = rows.filter((r) =>
      !q || r.label.toLowerCase().includes(q) || r.feature_key.toLowerCase().includes(q));
    const m = new Map<string, PlanFeature[]>();
    filtered.forEach((r) => m.set(r.feature_group, [...(m.get(r.feature_group) ?? []), r]));
    return Array.from(m.entries());
  }, [rows, search]);

  const toggle = (id: string, key: Toggle, value: boolean) => {
    setRows((rs) => rs.map((r) => {
      if (r.id !== id) return r;
      if (key === "enabled") return { ...r, enabled: value };
      if (key === "starter") return { ...r, starter: value };
      if (key === "growth") return { ...r, growth: value };
      return { ...r, business: value };
    }));
    setDirty((d) => new Set(d).add(id));
  };

  const save = async () => {
    setSaving(true);
    const changed = rows.filter((r) => dirty.has(r.id));
    for (const r of changed) {
      const { error } = await (supabase as any).from("plan_features").update({
        enabled: r.enabled, starter: r.starter, growth: r.growth, business: r.business,
      }).eq("id", r.id);
      if (error) {
        setSaving(false);
        toast({ title: "Could not save", description: error.message, variant: "destructive" });
        return;
      }
    }
    setSaving(false);
    toast({ title: "Plan features saved", description: `${changed.length} feature(s) updated.` });
    qc.invalidateQueries({ queryKey: ["plan-features"] });
  };

  const addFeature = async () => {
    if (!draft.feature_key.trim() || !draft.label.trim()) return;
    const { error } = await (supabase as any).from("plan_features").insert({
      feature_key: draft.feature_key.trim(),
      label: draft.label.trim(),
      description: draft.description.trim() || null,
      feature_group: draft.feature_group.trim() || "General",
      display_order: (rows.at(-1)?.display_order ?? 0) + 10,
    });
    if (error) {
      toast({ title: "Could not add", description: error.message, variant: "destructive" });
      return;
    }
    setAddOpen(false);
    setDraft({ feature_key: "", label: "", description: "", feature_group: "General" });
    qc.invalidateQueries({ queryKey: ["plan-features"] });
  };

  const remove = async (r: PlanFeature) => {
    if (!confirm(`Remove "${r.label}" from the registry? It will become visible to every plan.`)) return;
    const { error } = await (supabase as any).from("plan_features").delete().eq("id", r.id);
    if (error) toast({ title: "Could not remove", description: error.message, variant: "destructive" });
    else qc.invalidateQueries({ queryKey: ["plan-features"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold font-display">Plan Features</h1>
          <p className="text-muted-foreground mt-1">
            Choose which modules and sections each plan can see. Changes apply across the app immediately.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAddOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-2" /> Add feature
          </Button>
          <Button onClick={save} disabled={!dirty.size || saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save {dirty.size ? `(${dirty.size})` : ""}
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search features" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {error ? (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">
          The plan features table isn't set up yet. Run <code>db/plan_features.sql</code> on the database, then reload.
          Until then every feature stays visible to all plans.
        </CardContent></Card>
      ) : isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        groups.map(([group, items]) => (
          <Card key={group}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-display">{group}</CardTitle>
              <CardDescription>{items.length} feature(s)</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature</TableHead>
                    <TableHead className="text-center">On</TableHead>
                    {PLANS.map((p) => <TableHead key={p.key} className="text-center">{p.label}</TableHead>)}
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.label}</div>
                        <div className="text-xs text-muted-foreground">{r.description || r.feature_key}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch checked={r.enabled} onCheckedChange={(v) => toggle(r.id, "enabled", v)} />
                      </TableCell>
                      {PLANS.map((p) => (
                        <TableCell key={p.key} className="text-center">
                          <Switch
                            disabled={!r.enabled}
                            checked={Boolean(r[p.key as keyof PlanFeature])}
                            onCheckedChange={(v) => toggle(r.id, p.key, v)}
                          />
                        </TableCell>
                      ))}
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => remove(r)} aria-label="Remove feature">
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add feature</DialogTitle>
            <DialogDescription>Register a new feature key so it can be switched per plan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Key</Label><Input placeholder="e.g. tools.ai-assistant" value={draft.feature_key} onChange={(e) => setDraft({ ...draft, feature_key: e.target.value })} /></div>
            <div><Label>Name</Label><Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} /></div>
            <div><Label>Description</Label><Input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
            <div><Label>Group</Label><Input value={draft.feature_group} onChange={(e) => setDraft({ ...draft, feature_group: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addFeature}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
