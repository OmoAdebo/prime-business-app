import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface BrandingValues {
  brandName: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  sidebarStyle: string;
}

const DEFAULTS: BrandingValues = {
  brandName: 'Prime',
  logoUrl: null,
  primaryColor: '#22c55e',
  secondaryColor: '#f59e0b',
  accentColor: '#f59e0b',
  fontFamily: 'DM Sans',
  sidebarStyle: 'default',
};

const BrandingContext = createContext<BrandingValues>(DEFAULTS);

function hexToHsl(hex: string): string {
  let r = 0, g = 0, b = 0;
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    r = parseInt(hex[0] + hex[0], 16);
    g = parseInt(hex[1] + hex[1], 16);
    b = parseInt(hex[2] + hex[2], 16);
  } else {
    r = parseInt(hex.substring(0, 2), 16);
    g = parseInt(hex.substring(2, 4), 16);
    b = parseInt(hex.substring(4, 6), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function lightenHsl(hsl: string, amount: number): string {
  const parts = hsl.match(/(\d+)\s+(\d+)%\s+(\d+)%/);
  if (!parts) return hsl;
  const h = parseInt(parts[1]);
  const s = parseInt(parts[2]);
  const l = Math.min(100, parseInt(parts[3]) + amount);
  return `${h} ${s}% ${l}%`;
}

const FONT_IMPORTS: Record<string, string> = {
  'DM Sans': '',
  'Inter': 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'Poppins': 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
  'Nunito': 'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700&display=swap',
  'Roboto': 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap',
};

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { user, roles } = useAuth();
  const [branding, setBranding] = useState<BrandingValues>(DEFAULTS);

  useEffect(() => {
    if (!user) {
      // Reset to defaults on logout
      applyTheme(DEFAULTS);
      setBranding(DEFAULTS);
      return;
    }

    const fetchBranding = async () => {
      let businessId: string | null = null;

      // Check if user is a business owner
      const { data: ownBiz } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (ownBiz) {
        businessId = ownBiz.id;
      } else {
        // Check if invited by a business owner
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('invited_by')
          .eq('user_id', user.id)
          .not('invited_by', 'is', null)
          .limit(1)
          .maybeSingle();

        if (roleData?.invited_by) {
          const { data: ownerBiz } = await supabase
            .from('businesses')
            .select('id')
            .eq('owner_id', roleData.invited_by)
            .maybeSingle();
          if (ownerBiz) businessId = ownerBiz.id;
        }
      }

      if (!businessId) {
        applyTheme(DEFAULTS);
        setBranding(DEFAULTS);
        return;
      }

      const { data: settings } = await supabase
        .from('business_settings')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle();

      if (settings) {
        const values: BrandingValues = {
          brandName: settings.brand_name || DEFAULTS.brandName,
          logoUrl: settings.logo_url,
          primaryColor: settings.primary_color || DEFAULTS.primaryColor,
          secondaryColor: settings.secondary_color || DEFAULTS.secondaryColor,
          accentColor: (settings as any).accent_color || settings.secondary_color || DEFAULTS.accentColor,
          fontFamily: (settings as any).font_family || DEFAULTS.fontFamily,
          sidebarStyle: (settings as any).sidebar_style || DEFAULTS.sidebarStyle,
        };
        applyTheme(values);
        setBranding(values);
      } else {
        applyTheme(DEFAULTS);
        setBranding(DEFAULTS);
      }
    };

    fetchBranding();
  }, [user, roles]);

  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  );
}

function applyTheme(values: BrandingValues) {
  const root = document.documentElement;
  const primaryHsl = hexToHsl(values.primaryColor);
  const accentHsl = hexToHsl(values.accentColor);

  // Primary
  root.style.setProperty('--primary', primaryHsl);
  root.style.setProperty('--ring', primaryHsl);

  // Accent derived from primary
  root.style.setProperty('--accent', lightenHsl(primaryHsl, 45));
  root.style.setProperty('--accent-foreground', `${primaryHsl.split(' ')[0]} 71% 30%`);

  // Sidebar
  root.style.setProperty('--sidebar-primary', primaryHsl);
  root.style.setProperty('--sidebar-accent', lightenHsl(primaryHsl, 48));
  root.style.setProperty('--sidebar-accent-foreground', `${primaryHsl.split(' ')[0]} 71% 30%`);
  root.style.setProperty('--sidebar-ring', primaryHsl);

  // Success token mirrors primary
  root.style.setProperty('--success', primaryHsl);

  // Font
  root.style.setProperty('--font-body', `'${values.fontFamily}', sans-serif`);
  root.style.fontFamily = `'${values.fontFamily}', sans-serif`;

  // Load font if needed
  const fontUrl = FONT_IMPORTS[values.fontFamily];
  if (fontUrl) {
    const id = `branding-font-${values.fontFamily.replace(/\s/g, '-')}`;
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = fontUrl;
      document.head.appendChild(link);
    }
  }
}

export function useBranding() {
  return useContext(BrandingContext);
}
