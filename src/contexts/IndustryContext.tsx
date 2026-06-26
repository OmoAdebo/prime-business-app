import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useBusiness } from "@/hooks/use-business";
import { getIndustryConfig, type IndustryConfig, type IndustryTerms } from "@/lib/industry-config";

interface IndustryContextValue {
  config: IndustryConfig;
  terms: IndustryTerms;
  category: string | null;
  subcategory: string | null;
  loading: boolean;
}

const IndustryContext = createContext<IndustryContextValue | null>(null);

export function IndustryProvider({ children }: { children: ReactNode }) {
  const { data: business, isLoading } = useBusiness();
  const value = useMemo<IndustryContextValue>(() => {
    const category = (business as any)?.business_category ?? null;
    const subcategory = (business as any)?.business_subcategory ?? null;
    const config = getIndustryConfig(category, subcategory);
    return { config, terms: config.terms, category, subcategory, loading: isLoading };
  }, [business, isLoading]);

  return <IndustryContext.Provider value={value}>{children}</IndustryContext.Provider>;
}

export function useIndustry(): IndustryContextValue {
  const ctx = useContext(IndustryContext);
  if (!ctx) {
    // Safe fallback so components outside the provider still work
    const config = getIndustryConfig(null);
    return { config, terms: config.terms, category: null, subcategory: null, loading: false };
  }
  return ctx;
}

export function useIndustryTerms(): IndustryTerms {
  return useIndustry().terms;
}
