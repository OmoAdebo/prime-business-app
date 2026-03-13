import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export function PlaceholderPage({ title, description, icon: Icon }: PlaceholderPageProps) {
  return (
    <div className="max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-foreground">{title}</h1>
        <p className="text-muted-foreground mt-1">{description}</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground font-display">{title}</h2>
          <p className="text-sm text-muted-foreground mt-1 text-center max-w-md">
            This module is coming soon. We're building it with care to help streamline your business operations.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
