import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatEuros,
  formatSaleEnd,
  formatSeatsLabel,
  getCapacity,
  getFillRatio,
  getTicketAvailability,
  isBookable,
  parseTicketPrices,
  type TicketingInfo,
} from '@/lib/ticketing';

/**
 * Tarifs, places restantes et fin des inscriptions d'un événement HelloAsso.
 * Affichage inchangé par rapport à l'avant-refonte (SPEC § 9, décision 3) :
 * un prix par tarif HelloAsso + la ligne « tarif réduit adhérent avec code
 * promo » si cochée dans l'admin ; seul l'habillage change.
 */
export default function TicketInfo({ ticketing, className }: { ticketing: TicketingInfo; className?: string }) {
  const availability = getTicketAvailability(ticketing);
  const closed = !isBookable(availability);
  const prices = parseTicketPrices(ticketing.ticket_prices);
  const seatsLabel = formatSeatsLabel(ticketing);
  const capacity = getCapacity(ticketing);
  const fillRatio = getFillRatio(ticketing);
  const saleEnd = formatSaleEnd(ticketing);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {prices.length > 0 && (
        <div className="flex flex-col gap-2">
          <ul className="flex flex-col gap-2">
            {prices.map((price, i) => (
              <li
                key={`${price.label}-${i}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-loom-highlight-border bg-loom-highlight-bg px-3 py-2.5"
              >
                <span className="font-semibold">{price.label || 'Tarif'}</span>
                <span className="whitespace-nowrap font-extrabold text-loom-chip-fg">
                  {price.price_cents === 0 ? 'Gratuit' : formatEuros(price.price_cents)}
                </span>
              </li>
            ))}
          </ul>
          {ticketing.ticket_member_discount && (
            <p className="text-sm text-loom-text-muted">Tarif réduit pour les adhérents, avec le code promo LOOM.</p>
          )}
        </div>
      )}

      {seatsLabel && (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className={cn('font-bold', availability === 'almost_full' ? 'text-loom-accent-text' : closed ? 'text-loom-text' : 'text-loom-text-2')}>
              {seatsLabel}
            </span>
            {capacity && !closed && <span className="text-loom-text-muted">sur {capacity}</span>}
          </div>
          {fillRatio !== null && availability !== 'closed' && (
            <div
              className="h-2 overflow-hidden rounded-full bg-loom-surface-2 ring-1 ring-loom-border"
              role="progressbar"
              aria-label="Places vendues"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(fillRatio * 100)}
            >
              <div
                className={cn('h-full rounded-full', closed ? 'bg-loom-text-muted' : 'bg-loom-initial')}
                style={{ width: `${fillRatio * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      {saleEnd && (
        <p className="flex items-center gap-2 text-sm text-loom-text-2">
          <Clock aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-loom-accent-text" /> {saleEnd}
        </p>
      )}
    </div>
  );
}
