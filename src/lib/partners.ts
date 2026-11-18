import { useQuery } from '@tanstack/react-query';
import { db } from '@/db/client';
import type { Tables } from '@/db/types';

export type Partner = Tables<'partners'>;

/** Catégories de partenaires, dans l'ordre choisi dans l'admin. */
export function usePartnerCategories() {
  return useQuery({
    queryKey: ['partnerCategories'],
    queryFn: async () => {
      const { data, error } = await db.from('partner_categories').select('*').order('position').order('name');
      if (error) throw error;
      return data;
    },
  });
}

/** Partenaires par ordre alphabétique. */
export function usePartners() {
  return useQuery({
    queryKey: ['partners', 'public'],
    queryFn: async () => {
      const { data, error } = await db.from('partners').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });
}
