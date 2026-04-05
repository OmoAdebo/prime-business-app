import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { Outlet, useNavigate } from "react-router-dom";
import { Search, Settings, LogOut, ChevronDown, Menu, Home, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotificationBell } from "@/components/NotificationBell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getInitials(name: string | null | undefined): string {
  if (!name) return "U";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AppLayout() {
  const { profile, roles, user, signOut } = useAuth();
  const navigate = useNavigate();
  const primaryRole = roles[0] || "employee";
  const initials = getInitials(profile?.full_name);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <BrandingProvider>
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card px-2 sm:px-4 gap-2 sm:gap-4">
            {mobileSearchOpen ? (
              <div className="flex items-center gap-2 flex-1 sm:hidden">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    className="w-full pl-9 h-10 bg-muted/50 border-0 focus-visible:ring-1"
                    autoFocus
                  />
                </div>
                <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" onClick={() => setMobileSearchOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <SidebarTrigger className="text-muted-foreground h-10 w-10 min-h-[44px] min-w-[44px]" />
                  <Button variant="ghost" size="icon" className="sm:hidden h-10 w-10" onClick={() => setMobileSearchOpen(true)}>
                    <Search className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <div className="relative hidden sm:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search anything..."
                      className="w-64 pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-3">
                  <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground h-10 min-h-[44px] px-2 sm:px-3">
                    <Home className="h-4 w-4 sm:mr-1.5" />
                    <span className="hidden sm:inline">Home</span>
                  </Button>
                  <NotificationBell />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-muted/50 transition-colors focus:outline-none">
                    <Avatar className="h-8 w-8 border-2 border-primary/20">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:flex flex-col items-start">
                      <span className="text-sm font-medium text-foreground leading-tight">
                        {profile?.full_name || "User"}
                      </span>
                      <span className="text-[11px] text-muted-foreground leading-tight capitalize">
                        {primaryRole.replace("_", " ")}
                      </span>
                    </div>
                    <ChevronDown className="h-3 w-3 text-muted-foreground hidden md:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium text-foreground">{profile?.full_name || "User"}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                      <Badge variant="secondary" className="w-fit text-[10px] capitalize mt-1">
                        {primaryRole.replace("_", " ")}
                      </Badge>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
                </div>
              </>
            )}
          </header>
          <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
    </BrandingProvider>
  );
}
