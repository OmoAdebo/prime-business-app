import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/use-business";

export interface Subscription {
  id: string;
  business_id: string;
  plan: "starter" | "growth" | "business";
  period: "monthly" | "quarterly" | "annually";
  status: "active" | "trialing" | "past_due" | "canceled" | "pending";
  current_period_end: string | null;
  paystack_reference: string | null;
  amount: number | null;
}

export function useSubscription() {
  const { data: business, isLoading: bizLoading } = useBusiness();
  const businessId = business?.id;

  const query = useQuery({
    queryKey: ["subscription", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions" as any)
        .select("*")
        .eq("business_id", businessId!)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as Subscription) ?? null;
    },
  });

  const sub = query.data ?? null;
  const hasActive = !!sub && (sub.status === "active" || sub.status === "trialing");

  return {
    subscription: sub,
    hasActive,
    isLoading: bizLoading || query.isLoading,
    refetch: query.refetch,
  };
}
