import type { Tables } from '@/db/types';
import { closedLabel, getTicketAvailability, hasTicketing, isBookable } from '@/lib/ticketing';

/**
 * Bouton principal d'une carte d'événement (accueil, agenda) :
 * - billetterie HelloAsso ouverte → « S'inscrire », vers la billetterie de la fiche ;
 * - billetterie complète / close  → libellé d'état, non cliquable ;
 * - lien d'inscription externe    → « S'inscrire » dans un nouvel onglet ;
 * - sinon                          → « Voir l'événement ».
 */
export type EventCta =
  | { kind: 'link'; label: string; to: string; ariaLabel: string }
  | { kind: 'external'; label: string; href: string; ariaLabel: string }
  | { kind: 'disabled'; label: string };

type CtaEvent = Pick<Tables<'events'>, 'title' | 'slug' | 'registration_url'> & Parameters<typeof getTicketAvailability>[0];

export function getEventCta(event: CtaEvent): EventCta {
  if (hasTicketing(event)) {
    const availability = getTicketAvailability(event);
    if (!isBookable(availability)) return { kind: 'disabled', label: closedLabel(availability) };
    return {
      kind: 'link',
      label: "S'inscrire",
      to: `/events/${event.slug}#billetterie`,
      ariaLabel: `S'inscrire : ${event.title}`,
    };
  }
  if (event.registration_url) {
    return {
      kind: 'external',
      label: "S'inscrire",
      href: event.registration_url,
      ariaLabel: `S'inscrire : ${event.title} (nouvel onglet)`,
    };
  }
  return { kind: 'link', label: "Voir l'événement", to: `/events/${event.slug}`, ariaLabel: `Voir l'événement : ${event.title}` };
}
