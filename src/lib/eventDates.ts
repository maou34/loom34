// Dates des événements : la base stocke `date` (AAAA-MM-JJ) et `time` (texte
// libre, en pratique « 19:00 ») séparément, en heure de Montpellier.

type EventWhen = { date: string; time?: string | null };

/** Heure et minutes lues dans le champ texte `time` (« 19:00 », « 19h », « 19h30 »), ou null. */
export function parseEventTime(time?: string | null): { hours: number; minutes: number } | null {
  const match = time?.match(/(\d{1,2})\s*[:hH]\s*(\d{2})?/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

/** Jour de l'événement à minuit, heure locale (sans le décalage UTC de `new Date('2026-11-21')`). */
export function eventDay(date: string): Date {
  const [y, m, d] = date.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Début de l'événement (heure locale), à minuit si l'heure est inconnue. */
export function eventStart({ date, time }: EventWhen): Date {
  const day = eventDay(date);
  const t = parseEventTime(time);
  if (t) day.setHours(t.hours, t.minutes);
  return day;
}

/** Date du jour au format AAAA-MM-JJ (heure locale), pour filtrer les événements à venir. */
export function todayISO(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Nombre de jours calendaires entre aujourd'hui et le jour de l'événement. */
export function daysUntil(date: string, now = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((eventDay(date).getTime() - today.getTime()) / 86_400_000);
}

/** « aujourd'hui », « demain », « dans 7 jours » (null si passé). */
export function formatCountdown(date: string, now = new Date()): string | null {
  const days = daysUntil(date, now);
  if (days < 0) return null;
  if (days === 0) return "aujourd'hui";
  if (days === 1) return 'demain';
  return `dans ${days} jours`;
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Morceaux du bloc date : { weekday: 'SAM.', day: '21', month: 'NOV.' }. */
export function dateBlockParts(date: string) {
  const d = eventDay(date);
  return {
    weekday: d.toLocaleDateString('fr-FR', { weekday: 'short' }).toUpperCase(),
    day: String(d.getDate()),
    month: d.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase(),
    /** Version lisible pour les lecteurs d'écran : « samedi 21 novembre 2026 » */
    full: d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
  };
}

/** « Sam. 5 déc. · 20:00 » (sans l'heure si elle est vide). */
export function formatShortDateTime({ date, time }: EventWhen): string {
  const d = eventDay(date);
  const label = capitalize(d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }));
  return time?.trim() ? `${label} · ${time.trim()}` : label;
}

/** « 25 octobre 2026 » pour une date d'article (timestamp ISO). */
export function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Apéros mensuels (Apérours au Coxx, Apér'ours à l'Hypnobar) : présentés dans
 * l'encadré « Nos rendez-vous réguliers », pas dans les cartes d'événements.
 * Aucune colonne ne les distingue en base : on se fie au titre.
 */
export function isRecurringApero(title: string): boolean {
  return /ap[ée]r\W?\s*ours/i.test(title);
}
