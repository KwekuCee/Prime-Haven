import { supabase } from '@/integrations/supabase/client';

/**
 * Maps a core service slug to the `service_pricing.service_type` values that
 * belong to it, so each hiring track page shows its own live rate cards.
 */
export const SERVICE_PRICING_TYPES: Record<string, string[]> = {
  'graphic-design': [
    'logo-design',
    'brand-identity',
    'flyer-design',
    'print-design',
    'banner-design',
    'brochure-design',
    'book-cover',
    'youtube-thumbnails',
  ],
  'ui-ux-design': ['app-design'],
  'web-development': ['web-design', 'web-development'],
  'mobile-app-development': ['mobile-app-development'],
  'motion-graphics': ['motion-graphics'],
  'video-editing': ['video-editing'],
  'social-media-management': ['social-media'],
  'it-solutions': [],
};

export interface RateRow {
  service_type: string;
  service_label: string;
  tier: string;
  price: number;
  description: string | null;
  features: string[] | null;
}

export interface RatePackage {
  serviceType: string;
  label: string;
  tiers: RateRow[];
}

const TIER_ORDER = ['basic', 'standard', 'premium'];

export const fetchServiceRates = async (slug: string): Promise<RatePackage[]> => {
  const types = SERVICE_PRICING_TYPES[slug] || [];
  if (types.length === 0) return [];

  const { data, error } = await supabase
    .from('service_pricing')
    .select('service_type, service_label, tier, price, description, features')
    .in('service_type', types)
    .eq('is_active', true);

  if (error || !data) return [];

  const grouped = new Map<string, RatePackage>();
  (data as RateRow[]).forEach((row) => {
    const existing = grouped.get(row.service_type);
    if (existing) {
      existing.tiers.push(row);
    } else {
      grouped.set(row.service_type, {
        serviceType: row.service_type,
        label: row.service_label,
        tiers: [row],
      });
    }
  });

  const packages = [...grouped.values()];
  packages.forEach((p) =>
    p.tiers.sort((a, b) => {
      const ai = TIER_ORDER.indexOf(a.tier);
      const bi = TIER_ORDER.indexOf(b.tier);
      if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      return a.price - b.price;
    }),
  );
  // Cheapest entry point first so the page reads from accessible to premium.
  packages.sort((a, b) => (a.tiers[0]?.price ?? 0) - (b.tiers[0]?.price ?? 0));
  return packages;
};

export const TIER_LABELS: Record<string, string> = {
  basic: 'Starter',
  standard: 'Standard',
  premium: 'Premium',
};
