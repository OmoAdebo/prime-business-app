import { NavLink, Outlet, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LucideIcon } from "lucide-react";

export interface ModuleNavItem {
  title: string;
  path: string;
  icon: LucideIcon;
}

interface ModuleLayoutProps {
  title: string;
  icon: LucideIcon;
  navItems: ModuleNavItem[];
}

export function ModuleLayout({ title, icon: Icon, navItems }: ModuleLayoutProps) {
  const location = useLocation();

  return (
    <div className="flex h-full gap-0 -m-3 sm:-m-4 md:-m-6">
      {/* Sub-navigation sidebar */}
      <aside className="w-56 shrink-0 border-r bg-muted/30 hidden md:flex flex-col">
        <div className="px-4 py-4 border-b">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-sm text-foreground">{title}</h2>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <nav className="flex flex-col gap-0.5 p-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.title}</span>
                </NavLink>
              );
            })}
          </nav>
        </ScrollArea>
      </aside>

      {/* Mobile sub-nav — horizontal scrollable tabs */}
      <div className="md:hidden w-full flex flex-col">
        <div className="relative border-b bg-muted/30">
          <div className="overflow-x-auto scrollbar-thin">
            <div className="flex items-center gap-1 px-3 py-2 min-w-max">
              <Icon className="h-4 w-4 text-primary mr-1 shrink-0" />
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    ref={(el) => {
                      if (isActive && el) {
                        el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                      }
                    }}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors min-h-[44px]",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{item.title}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-muted/30 to-transparent" />
        </div>
        <div className="flex-1 overflow-auto p-3 sm:p-4">
          <Outlet />
        </div>
      </div>

      {/* Desktop content area */}
      <div className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 hidden md:block">
        <Outlet />
      </div>
    </div>
  );
}
