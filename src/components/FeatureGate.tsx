import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFeatureAccess } from "@/contexts/FeatureAccessContext";

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  /** Render nothing instead of an upgrade prompt */
  silent?: boolean;
  title?: string;
}

export function FeatureGate({ feature, children, silent, title }: FeatureGateProps) {
  const { isEnabled, getFeature, loading } = useFeatureAccess();

  if (loading) return null;
  if (isEnabled(feature)) return <>{children}</>;
  if (silent) return null;

  const meta = getFeature(feature);

  return (
    <Card className="border-dashed">
      <CardContent className="p-6 flex flex-col items-center text-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium text-foreground">
            {title || meta?.label || "Not included in your plan"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {meta?.description || "Upgrade your plan to unlock this."}
          </p>
        </div>
        <Button size="sm" asChild>
          <Link to="/pricing">View plans</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
