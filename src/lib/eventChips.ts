import type { Tables } from '@/db/types';
import { isRecurringApero } from '@/lib/eventDates';
import { closedLabel, getTicketAvailability, hasTicketing, isBookable } from '@/lib/ticketing';

type ChipEvent = Pick<Tables<'events'>, 'title' | 'registration_url' | 'ticket_member_discount'> &
  Parameters<typeof getTicketAvailability>[0];

export type EventChip = { label: string; tone: 'default' | 'hot' | 'muted' | 'free' | 'member' };

/**
 * Pastilles d'une carte d'agenda : « Sur réservation » / « Dernières places » /
 * « Complet » / « Inscriptions closes », « Entrée libre » (apéros), « Tarif adhérent ».
 * Les états de billetterie viennent de lib/ticketing (jamais recalculés ici).
 */
export function getEventChips(event: ChipEvent, { past = false } = {}): EventChip[] {
  const chips: EventChip[] = [];
  if (!past && hasTicketing(event)) {
    const availability = getTicketAvailability(event);
    if (!isBookable(availability)) chips.push({ label: closedLabel(availability), tone: 'muted' });
    else if (availability === 'almost_full') chips.push({ label: 'Dernières places', tone: 'hot' });
    else chips.push({ label: 'Sur réservation', tone: 'default' });
  } else if (!past && event.registration_url) {
    chips.push({ label: 'Sur réservation', tone: 'default' });
  }
  if (isRecurringApero(event.title)) chips.push({ label: 'Entrée libre', tone: 'free' });
  if (event.ticket_member_discount) chips.push({ label: 'Tarif adhérent', tone: 'member' });
  return chips;
}
