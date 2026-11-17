import { useQuery } from '@tanstack/react-query';
import { db } from '@/db/client';

// URLs HelloAsso de secours, si site_settings n'est pas (encore) chargé ou vide.
export const DEFAULT_SHOP_URL =
  'https://www.helloasso.com/associations/les-ours-occitanie-montpellier/boutiques/t-shirt-bleu';
export const DEFAULT_MEMBERSHIP_URL =
  'https://www.helloasso.com/associations/les-ours-occitanie-montpellier/adhesions/adhesion-2025-2026';

/** Ligne unique site_settings (id = 1), partagée via la clé ['siteSettings']. */
export function useSiteSettings() {
  return useQuery({
    queryKey: ['siteSettings'],
    queryFn: async () => {
      const { data, error } = await db.from('site_settings').select('*').eq('id', 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

/** Liens externes de l'en-tête et du footer (Boutique / Adhérer). */
export function useExternalLinks() {
  const { data } = useSiteSettings();
  return {
    shopUrl: data?.shop_url || DEFAULT_SHOP_URL,
    membershipUrl: data?.membership_url || DEFAULT_MEMBERSHIP_URL,
  };
}
