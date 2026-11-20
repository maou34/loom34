import { useQuery } from '@tanstack/react-query';
import { db } from '@/db/client';
import type { Json, Tables } from '@/db/types';

/** Une année du palmarès : title = nom du lauréat, description = légende, image = portrait. */
export type Edition = Tables<'monsieur_ours_timeline'>;
export type Step = { when: string; title: string; text: string };

/** Textes par défaut (la page tutoie, SPEC § 1), utilisés si site_settings n'en a pas. */
export const DEFAULT_STEPS: Step[] = [
  { when: 'Au printemps', title: 'Les candidatures', text: "Envie de te présenter ? Écris-nous : on t'explique comment se déroule la candidature." },
  { when: 'En juin', title: "L'élection", text: "Lors de la Montpell'Bears, la communauté élit Monsieur Ours et ses oursons." },
  { when: "Toute l'année", title: "Une année d'ours", text: 'Monsieur Ours et ses oursons représentent LOOM lors de nos soirées et des événements de la communauté.' },
];
export const DEFAULT_INTRO = "Élu en juin lors de la Montpell'Bears, il représente la communauté avec ses oursons jusqu'à la prochaine élection.";
export const DEFAULT_CTA = "Laisse-nous un message : on te prévient dès l'ouverture des candidatures.";

/** Lit site_settings.monsieur_ours_steps (JSONB) en ignorant les entrées invalides ; 3 étapes par défaut. */
export function parseSteps(raw: Json | null | undefined): Step[] {
  if (!Array.isArray(raw)) return DEFAULT_STEPS;
  const steps = raw.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const { when, title, text } = item as Record<string, unknown>;
    if (typeof title !== 'string' || !title.trim()) return [];
    return [{ when: typeof when === 'string' ? when : '', title, text: typeof text === 'string' ? text : '' }];
  });
  return steps.length ? steps : DEFAULT_STEPS;
}

export type Cub = { rank: 1 | 2; name: string; photo: string | null };

/** Oursons renseignés de l'année (0, 1 ou 2), avec leur rang (1er / 2e ourson). */
export const cubsOf = (e: Edition): Cub[] =>
  [
    { rank: 1 as const, name: e.cub1_name, photo: e.cub1_photo },
    { rank: 2 as const, name: e.cub2_name, photo: e.cub2_photo },
  ].filter((c): c is Cub => !!c.name?.trim());

/** « 1er ourson » / « 2e ourson » */
export const cubLabel = (rank: 1 | 2) => (rank === 1 ? '1er ourson' : '2e ourson');

/** Statut d'une année dans l'admin : Complet / Photos manquantes / À compléter. */
export function editionStatus(e: Edition): 'complete' | 'photos' | 'todo' {
  const cubs = cubsOf(e);
  if (!e.title?.trim() || cubs.length < 2) return 'todo';
  if (!e.image || cubs.some((c) => !c.photo)) return 'photos';
  return 'complete';
}

/** Palmarès, de la plus récente à la plus ancienne (la première est « En titre »). */
export function useEditions() {
  return useQuery({
    queryKey: ['monsieurOursEditions'],
    queryFn: async () => {
      const { data, error } = await db.from('monsieur_ours_timeline').select('*').order('year', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
