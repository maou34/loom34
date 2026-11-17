import { HELLOASSO_BASE_URL, HELLOASSO_ORG_SLUG } from '@/config';
import type { Tables } from '@/db/types';

/** Sous-ensemble d'un événement utile à l'affichage de la billetterie. */
export type TicketingInfo = Pick<
  Tables<'events'>,
  | 'helloasso_form_slug'
  | 'helloasso_form_type'
  | 'ticket_capacity'
  | 'helloasso_capacity'
  | 'tickets_remaining'
  | 'ticket_prices'
  | 'ticket_member_discount'
  | 'helloasso_sale_end_date'
>;

/** closed : date de fin des ventes HelloAsso passée. */
export type TicketAvailability = 'available' | 'almost_full' | 'sold_out' | 'closed';

export interface TicketPrice {
  label: string;
  price_cents: number;
}

/** Seuil « presque complet » : 10 % de la jauge, et jamais moins de 5 places. */
const ALMOST_FULL_MIN_SEATS = 5;
const ALMOST_FULL_RATIO = 0.1;

// Segment d'URL public HelloAsso selon le type de formulaire de l'API v5.
// À vérifier sur une vraie URL sandbox (seul 'Event' est utilisé pour l'instant).
const FORM_TYPE_PATH: Record<string, string> = {
  Event: 'evenements',
  Membership: 'adhesions',
  Donation: 'formulaires',
  Shop: 'boutiques',
  CrowdFunding: 'collectes',
  PaymentForm: 'paiements',
};

// Pas un type guard : Tables<'events'> étant assignable à TicketingInfo, un guard
// réduirait la branche « sans billetterie » à never.
export const hasTicketing = (info?: Partial<TicketingInfo> | null): boolean => !!info?.helloasso_form_slug;

/** URL publique du formulaire HelloAsso (page plein écran). */
export const getHelloAssoFormUrl = (info: TicketingInfo): string => {
  const path = FORM_TYPE_PATH[info.helloasso_form_type] ?? FORM_TYPE_PATH.Event;
  return `${HELLOASSO_BASE_URL}/associations/${HELLOASSO_ORG_SLUG}/${path}/${info.helloasso_form_slug}`;
};

/** URL du widget HelloAsso à intégrer en iframe. */
export const getHelloAssoWidgetUrl = (info: TicketingInfo): string => `${getHelloAssoFormUrl(info)}/widget`;

/**
 * Accepte un slug brut ou une URL HelloAsso collée telle quelle depuis le
 * back-office, et renvoie le slug du formulaire (ou null si vide).
 */
export const normalizeHelloAssoSlug = (input: string): string | null => {
  const value = input.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    const segments = url.pathname.split('/').filter(Boolean);
    // /associations/<org>/<type>/<slug>[/widget|/...]
    if (segments[0] === 'associations' && segments.length >= 4) return segments[3];
    return segments[segments.length - 1] ?? null;
  } catch {
    return value.replace(/^\/+|\/+$/g, '');
  }
};

/** Jauge effective : celle de l'admin si renseignée, sinon la limite des tarifs HelloAsso. */
export const getCapacity = (info: Pick<TicketingInfo, 'ticket_capacity' | 'helloasso_capacity'>): number | null =>
  info.ticket_capacity ?? info.helloasso_capacity ?? null;

/** Ventes terminées : date de fin des ventes HelloAsso passée. */
export const isSaleEnded = (info: Pick<TicketingInfo, 'helloasso_sale_end_date'>, now = new Date()): boolean =>
  !!info.helloasso_sale_end_date && new Date(info.helloasso_sale_end_date) <= now;

export const getTicketAvailability = (info: TicketingInfo): TicketAvailability => {
  if (isSaleEnded(info)) return 'closed';
  const remaining = info.tickets_remaining;
  // Pas encore synchronisé, ou jauge illimitée : considéré comme disponible.
  if (remaining === null || remaining === undefined) return 'available';
  if (remaining <= 0) return 'sold_out';
  const capacity = getCapacity(info);
  const threshold = Math.max(ALMOST_FULL_MIN_SEATS, capacity ? Math.ceil(capacity * ALMOST_FULL_RATIO) : 0);
  return remaining <= threshold ? 'almost_full' : 'available';
};

/** On peut encore s'inscrire (ni complet, ni ventes terminées). */
export const isBookable = (availability: TicketAvailability | null): boolean =>
  availability === 'available' || availability === 'almost_full';

/** Libellé à la place de « S'inscrire » quand on ne peut plus s'inscrire. */
export const closedLabel = (availability: TicketAvailability | null): string =>
  availability === 'closed' ? 'Inscriptions closes' : 'Complet';

/** « Inscriptions jusqu'au samedi 20 novembre à 12h00 », ou null sans date de fin (ou si déjà passée). */
export const formatSaleEnd = (info: Pick<TicketingInfo, 'helloasso_sale_end_date'>): string | null => {
  if (!info.helloasso_sale_end_date || isSaleEnded(info)) return null;
  const end = new Date(info.helloasso_sale_end_date);
  const day = end.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const time = end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
  return `Inscriptions jusqu'au ${day} à ${time}`;
};

/**
 * Libellé des places : « Plus que 3 places », « 42 places restantes », « Complet »,
 * « Inscriptions closes »,
 * ou null tant que la jauge n'est pas connue (pas encore synchronisée ou illimitée).
 */
export const formatSeatsLabel = (info: TicketingInfo): string | null => {
  const availability = getTicketAvailability(info);
  if (availability === 'closed') return 'Inscriptions closes';
  if (availability === 'sold_out') return 'Complet';
  const remaining = info.tickets_remaining;
  if (remaining === null || remaining === undefined) return null;
  const places = remaining > 1 ? 'places' : 'place';
  return availability === 'almost_full' ? `Plus que ${remaining} ${places}` : `${remaining} ${places} restantes`;
};

/** Part de la jauge déjà vendue (0 → 1), ou null si inconnue. */
export const getFillRatio = (info: TicketingInfo): number | null => {
  const capacity = getCapacity(info);
  const remaining = info.tickets_remaining;
  if (!capacity || remaining === null || remaining === undefined) return null;
  return Math.min(1, Math.max(0, (capacity - remaining) / capacity));
};

/** Lit ticket_prices (JSONB écrit par sync-events) en ignorant les entrées invalides. */
export const parseTicketPrices = (raw: TicketingInfo['ticket_prices']): TicketPrice[] => {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const { label, price_cents } = item as Record<string, unknown>;
    if (typeof price_cents !== 'number') return [];
    return [{ label: typeof label === 'string' ? label : '', price_cents }];
  });
};

export const formatEuros = (cents: number) =>
  (cents / 100).toLocaleString('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  });

/** « Gratuit », « 12 € » ou « Dès 8 € » ; null si les tarifs ne sont pas encore connus. */
export const formatPriceSummary = (raw: TicketingInfo['ticket_prices']): string | null => {
  const prices = parseTicketPrices(raw).map((p) => p.price_cents);
  if (prices.length === 0) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (max === 0) return 'Gratuit';
  if (min === max) return formatEuros(min);
  return `Dès ${formatEuros(min)}`;
};
