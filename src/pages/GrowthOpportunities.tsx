import { useNavigate } from "react-router-dom";
import { TrendingUp, ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useInsights, naira } from "@/hooks/use-insights";
import { FeatureGate } from "@/components/FeatureGate";

const sevStyle = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-warning/15 text-warning",
  low: "bg-primary/10 text-primary",
} as const;
const sevLabel = { high: "Act now", medium: "Worth doing", low: "Nice to have" } as const;

export default function GrowthOpportunities() {
  const navigate = useNavigate();
  const ins = useInsights();
  const totalImpact = ins.opportunities.reduce((s, o) => s + (o.impact ?? 0), 0);

  return (
    <FeatureGate feature="insights.growth">
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" /> Growth Opportunities
          </h1>
          <p className="text-muted-foreground mt-1">
            Ranked actions found in your sales, stock, invoices and spending over recent months.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Opportunities found</p>
            <p className="text-2xl font-bold">{ins.opportunities.length}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Estimated value</p>
            <p className="text-2xl font-bold">{naira(totalImpact)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Income last 30 days</p>
            <p className="text-2xl font-bold">{naira(ins.health.income30)}</p>
          </CardContent></Card>
        </div>

        {ins.isLoading ? (
          <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
        ) : ins.opportunities.length === 0 ? (
          <Card>
            <CardContent className="py-12 flex flex-col items-center text-center gap-3">
              <Sparkles className="h-10 w-10 text-muted-foreground/40" />
              <p className="font-medium">No opportunities yet</p>
              <p className="text-sm text-muted-foreground max-w-md">
                Add products with cost and selling prices, record income and expenses, and send invoices.
                We'll surface growth opportunities as your data builds up.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button variant="outline" onClick={() => navigate("/inventory/products")}>Add products</Button>
                <Button variant="outline" onClick={() => navigate("/bookkeeping")}>Record a transaction</Button>
                <Button onClick={() => navigate("/invoicing")}>Create an invoice</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {ins.opportunities.map((o, idx) => (
              <Card key={o.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">#{idx + 1}</span>
                    <Badge variant="secondary" className={sevStyle[o.severity]}>{sevLabel[o.severity]}</Badge>
                    {o.impact ? (
                      <span className="ml-auto text-sm font-semibold text-primary">≈ {naira(o.impact)}</span>
                    ) : null}
                  </div>
                  <CardTitle className="text-lg font-display">{o.title}</CardTitle>
                  <CardDescription>{o.detail}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="min-h-[44px]" onClick={() => navigate(o.actionPath)}>
                    {o.actionLabel} <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </FeatureGate>
  );
}
