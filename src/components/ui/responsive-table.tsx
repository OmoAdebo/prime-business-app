import * as React from "react";
import { cn } from "@/lib/utils";

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
  minWidth?: string;
}

export function ResponsiveTable({ children, className, minWidth = "600px" }: ResponsiveTableProps) {
  return (
    <div className={cn("relative w-full", className)}>
      <div className="overflow-x-auto -mx-3 sm:mx-0 scrollbar-thin">
        <div className={cn("sm:min-w-0")} style={{ minWidth }}>
          {children}
        </div>
      </div>
    </div>
  );
}
