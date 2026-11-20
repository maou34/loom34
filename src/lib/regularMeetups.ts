import type { Json } from '@/db/types';
import { useSiteSettings } from '@/hooks/useSiteSettings';

/**
 * Rendez-vous réguliers (apéros mensuels en entrée libre) : encadrés « Nos
 * rendez-vous réguliers » de l'accueil et de l'agenda. Modifiables dans l'admin
 * Événements, stockés dans site_settings.regular_meetups (JSONB) ; sans valeur
 * en base, les valeurs par défaut ci-dessous s'affichent.
 */
export type RegularMeetup = {
  /** « 1ᵉʳ vendredi » (affiché « 1ᵉʳ vendredi du mois » dans l'encadré détaillé) */
  day: string;
  /** « 19:00 » */
  time: string;
  title: string;
  /** Avantage adhérent / précision, une phrase */
  text: string;
};

export const DEFAULT_REGULAR_MEETUPS: RegularMeetup[] = [
  { day: '1ᵉʳ vendredi', time: '19:00', title: 'Apérours au Coxx', text: 'Happy hour prolongée sur présentation de la carte.' },
  { day: '3ᵉ vendredi', time: '19:00', title: "Apér'ours à l'Hypnobar", text: 'Tarifs adhérents sur présentation de la carte.' },
];

export const MAX_REGULAR_MEETUPS = 4;

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/** Lit site_settings.regular_meetups en ignorant les entrées invalides. */
export function parseRegularMeetups(raw: Json | null | undefined): RegularMeetup[] {
  // Colonne absente ou jamais enregistrée : valeurs par défaut. Liste vide
  // enregistrée exprès : aucun rendez-vous (l'encadré disparaît).
  if (!Array.isArray(raw)) return DEFAULT_REGULAR_MEETUPS;
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const o = item as Record<string, unknown>;
    const title = str(o.title);
    if (!title) return [];
    return [{ day: str(o.day), time: str(o.time), title, text: str(o.text) }];
  });
}

/** « 1ᵉʳ vendredi du mois · 19:00 » (encadré détaillé). */
export const meetupWhen = (m: RegularMeetup) => [m.day && `${m.day} du mois`, m.time].filter(Boolean).join(' · ');

/** « 1ᵉʳ vendredi · 19:00 » (versions courtes). */
export const meetupWhenShort = (m: RegularMeetup) => [m.day, m.time].filter(Boolean).join(' · ');

/** Heure commune à tous les rendez-vous (« 19:00 »), sinon null : affichée une seule fois sur mobile. */
export function commonTime(meetups: RegularMeetup[]): string | null {
  const times = new Set(meetups.map((m) => m.time));
  return times.size === 1 ? [...times][0] || null : null;
}

export function useRegularMeetups(): RegularMeetup[] {
  const { data } = useSiteSettings();
  return parseRegularMeetups(data?.regular_meetups);
}
