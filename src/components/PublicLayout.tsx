import { ReactNode } from "react";
import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";

interface PublicLayoutProps {
  children: ReactNode;
  /** Centered, compact main area for auth-style pages. */
  variant?: "default" | "centered";
}

export function PublicLayout({ children, variant = "default" }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicNavbar />
      <main className={
        variant === "centered"
          ? "flex-1 flex items-center justify-center px-4 py-12"
          : "flex-1"
      }>
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
