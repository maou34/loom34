import { useQuery } from '@tanstack/react-query';
import { db } from '@/db/client';
import type { Tables } from '@/db/types';

export type HistoryEntry = Tables<'history_entries'>;
export type TeamGroup = Tables<'team_groups'> & { team_members: Tables<'team_members'>[] };

/** Longueur maximale du texte d'une date de la frise (contrainte en base). */
export const HISTORY_BODY_MAX = 160;

/** Frise « Notre histoire », dans l'ordre chronologique (tri automatique). */
export function useHistoryEntries() {
  return useQuery({
    queryKey: ['historyEntries'],
    queryFn: async () => {
      const { data, error } = await db
        .from('history_entries')
        .select('*')
        .order('year')
        .order('sort_month', { ascending: true, nullsFirst: false })
        .order('created_at');
      if (error) throw error;
      return data;
    },
  });
}

/** La Tanière : sections avec leurs membres, dans l'ordre choisi dans l'admin. */
export function useTeam() {
  return useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      const { data, error } = await db
        .from('team_groups')
        .select('*, team_members(*)')
        .order('position')
        .order('position', { referencedTable: 'team_members' });
      if (error) throw error;
      return data as TeamGroup[];
    },
  });
}

/** « Stéphane » → « ST », « Jean-Luc » → « JE » (comme la maquette). */
export const initials = (name: string) => name.trim().slice(0, 2).toUpperCase();
