import { useNavigate } from "react-router-dom";
import { TrendingUp, AlertTriangle, BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useInsights } from "@/hooks/use-insights";
import { useFeatureAccess } from "@/contexts/FeatureAccessContext";
import { cn } from "@/lib/utils";

export function InsightCards() {
  const navigate = useNavigate();
  const ins = useInsights();
  const { isEnabled } = useFeatureAccess();

  const cards = [
    {
      key: "insights.growth",
      title: "Growth Opportunities",
      icon: TrendingUp,
      edge: "border-l-primary",
      chip: "bg-primary/10 text-primary",
      text: !ins.hasData
        ? "Record sales, products or invoices and we'll spot opportunities for you."
        : ins.opportunities.length
        ? `Based on your business data, we've identified ${ins.opportunities.length} growth opportunit${ins.opportunities.length === 1 ? "y" : "ies"}.`
        : "No new opportunities right now — keep recording to get fresh insights.",
      cta: "View Opportunities",
      path: "/growth",
    },
    {
      key: "insights.inventory-alerts",
      title: "Inventory Alerts",
      icon: AlertTriangle,
      edge: "border-l-warning",
      chip: "bg-warning/15 text-warning",
      text: ins.lowStock.length
        ? `${ins.lowStock.length} product${ins.lowStock.length > 1 ? "s are" : " is"} running low on stock and need${ins.lowStock.length > 1 ? "" : "s"} your attention.`
        : "All stock levels look good.",
      cta: "View Alerts",
      path: "/inventory/stock",
    },
    {
      key: "insights.financial-health",
      title: "Financial Health",
      icon: BarChart3,
      edge: ins.health.band === "act" ? "border-l-destructive" : ins.health.band === "watch" ? "border-l-warning" : "border-l-primary",
      chip: "bg-primary/10 text-primary",
      text: ins.health.verdict,
      cta: "View Report",
      path: "/financial-health",
    },
  ].filter((c) => isEnabled(c.key));

  if (!cards.length) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
      {cards.map((c) => (
        <Card key={c.title} className={cn("border-l-4", c.edge)}>
          <CardContent className="p-5 flex flex-col gap-3 h-full">
            <div className="flex items-center gap-3">
              <div className={cn("h-9 w-9 rounded-full flex items-center justify-center", c.chip)}>
                <c.icon className="h-4 w-4" />
              </div>
              <h3 className="font-semibold text-foreground">{c.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground flex-1">
              {ins.isLoading ? "Analysing your data…" : c.text}
            </p>
            <Button variant="outline" className="w-full min-h-[44px]" onClick={() => navigate(c.path)}>
              {c.cta}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
