import { Lock, TrendingUp, Shield, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Loans() {
  return (
    <div className="relative min-h-[70vh]">
      {/* Blurred background content */}
      <div className="filter blur-sm pointer-events-none select-none opacity-60 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Active Loans", value: "₦0.00" },
            { label: "Total Repaid", value: "₦0.00" },
            { label: "Credit Score", value: "---" },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="text-2xl font-bold">{item.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="pt-6 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted rounded-lg" />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <Card className="max-w-md w-full shadow-xl border-2">
          <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4 text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
            <h2 className="text-xl font-bold">Business Loans & Credit</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Access affordable business loans with AI-powered credit assessment. 
              Apply, track repayments, and manage your credit — all in one place.
            </p>
            <div className="grid grid-cols-3 gap-3 mt-2 w-full">
              {[
                { icon: TrendingUp, label: "Smart Rates" },
                { icon: Shield, label: "AI Assessment" },
                { icon: Clock, label: "Fast Approval" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/50">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
