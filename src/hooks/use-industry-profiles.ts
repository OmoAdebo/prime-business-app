import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BUSINESS_CATEGORIES, INDUSTRY_CONFIG, getIndustryConfig, type IndustryConfig } from "@/lib/industry-config";

export interface IndustryProfile {
  category: string;
  hint: string;
  config: Partial<IndustryConfig>;
  is_active: boolean;
  display_order: number;
}

function builtInProfiles(): IndustryProfile[] {
  return BUSINESS_CATEGORIES.map((category, index) => ({
    category,
    hint: INDUSTRY_CONFIG[category].hint,
    config: {},
    is_active: true,
    display_order: (index + 1) * 10,
  }));
}

export function useIndustryProfiles(includeInactive = false) {
  const query = useQuery({
    queryKey: ["industry-profiles", includeInactive],
    retry: false,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("industry_profiles")
        .select("category,hint,config,is_active,display_order")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as IndustryProfile[];
    },
  });

  const profiles = query.data?.length ? query.data : builtInProfiles();
  const visibleProfiles = includeInactive ? profiles : profiles.filter((profile) => profile.is_active);
  const getConfig = (category: string | null | undefined, subcategory?: string | null) => {
    const profile = profiles.find((item) => item.category === category);
    return getIndustryConfig(category, subcategory, profile?.config ?? null);
  };

  return {
    ...query,
    profiles: visibleProfiles,
    allProfiles: profiles,
    getConfig,
    usingFallback: !!query.error || !query.data?.length,
  };
}