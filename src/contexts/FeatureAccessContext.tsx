import { createContext, useContext, useMemo, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/use-subscription";

export type PlanKey = "starter" | "growth" | "business";

export interface PlanFeature {
  id: string;
  feature_key: string;
  label: string;
  description: string | null;
  feature_group: string;
  enabled: boolean;
  starter: boolean;
  growth: boolean;
  business: boolean;
  display_order: number;
}

interface FeatureAccessValue {
  features: PlanFeature[];
  plan: PlanKey;
  loading: boolean;
  /** Registry could not be loaded (table missing / offline) — fail open. */
  unavailable: boolean;
  bypass: boolean;
  isEnabled: (key: string) => boolean;
  getFeature: (key: string) => PlanFeature | undefined;
}

const FeatureAccessContext = createContext<FeatureAccessValue | undefined>(undefined);

export function FeatureAccessProvider({ children }: { children: ReactNode }) {
  const { roles } = useAuth();
  const { subscription, isLoading: subLoading } = useSubscription();

  const query = useQuery({
    queryKey: ["plan-features"],
    retry: false,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("plan_features")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PlanFeature[];
    },
  });

  const value = useMemo<FeatureAccessValue>(() => {
    const features = query.data ?? [];
    const unavailable = !!query.error;
    const plan = (subscription?.plan as PlanKey) ?? "starter";
    const bypass = roles.some((r) =>
      ["super_admin", "admin", "support_admin"].includes(r)
    );

    const getFeature = (key: string) => features.find((f) => f.feature_key === key);

    const isEnabled = (key: string) => {
      if (bypass || unavailable) return true;
      const f = getFeature(key);
      if (!f) return true; // unknown feature keys are visible by default
      if (!f.enabled) return false;
      return plan === "business" ? f.business : plan === "growth" ? f.growth : f.starter;
    };

    return {
      features,
      plan,
      loading: query.isLoading || subLoading,
      unavailable,
      bypass,
      isEnabled,
      getFeature,
    };
  }, [query.data, query.error, query.isLoading, subLoading, subscription?.plan, roles]);

  return (
    <FeatureAccessContext.Provider value={value}>{children}</FeatureAccessContext.Provider>
  );
}

export function useFeatureAccess() {
  const ctx = useContext(FeatureAccessContext);
  if (!ctx) {
    // Rendered outside the provider (e.g. public pages) — fail open.
    return {
      features: [],
      plan: "starter" as PlanKey,
      loading: false,
      unavailable: true,
      bypass: false,
      isEnabled: () => true,
      getFeature: () => undefined,
    } as FeatureAccessValue;
  }
  return ctx;
}

export function useFeature(key: string) {
  const { isEnabled, loading } = useFeatureAccess();
  return { allowed: isEnabled(key), loading };
}
