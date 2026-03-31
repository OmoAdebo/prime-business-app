import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface PlaceholderSubPageProps {
  title: string;
  description?: string;
}

export function PlaceholderSubPage({ title, description }: PlaceholderSubPageProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="max-w-md w-full text-center">
        <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Construction className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {description || "This section is under development and will be available soon."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
