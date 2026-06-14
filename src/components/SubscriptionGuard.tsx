import { Navigate, useLocation } from "react-router-dom";
import { useSubscription } from "@/hooks/use-subscription";
import { useBusiness } from "@/hooks/use-business";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Forces business_owner / individual users to pick a plan on /pricing
 * before they can access dashboard routes. Admin/staff roles are exempt.
 */
export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const { roles, loading: authLoading } = useAuth();
  const { data: business, isLoading: bizLoading } = useBusiness();
  const { hasActive, isLoading } = useSubscription();
  const location = useLocation();

  // Roles that should bypass paywall (staff using owner's seat, admins, etc.)
  const exempt =
    roles.some((r) =>
      ["super_admin", "admin", "support_admin", "store_manager", "accountant", "employee"].includes(r)
    ) && !roles.includes("business_owner") && !roles.includes("individual");

  if (authLoading || bizLoading || isLoading) return <>{children}</>;
  if (exempt) return <>{children}</>;

  // Owner/individual must have a business and an active subscription
  if (!business) return <>{children}</>; // OnboardingGuard handles this

  if (!hasActive && location.pathname !== "/pricing") {
    return <Navigate to="/pricing?required=1" replace />;
  }
  return <>{children}</>;
}
