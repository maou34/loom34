import { cn } from '@/lib/utils';
import { formatSeatsLabel, getTicketAvailability, type TicketingInfo } from '@/lib/ticketing';

interface TicketAvailabilityBadgeProps {
  ticketing: TicketingInfo;
  className?: string;
}

/**
 * Pastille posée sur l'image des cartes d'événement. N'apparaît que lorsqu'il
 * y a quelque chose à signaler (presque complet, complet, inscriptions closes), comme sur la maquette.
 */
const TicketAvailabilityBadge = ({ ticketing, className }: TicketAvailabilityBadgeProps) => {
  const availability = getTicketAvailability(ticketing);
  if (availability === 'available') return null;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-bold shadow-sm',
        availability === 'almost_full' ? 'bg-orange-100 text-orange-900' : 'bg-gray-800 text-white',
        className
      )}
    >
      {formatSeatsLabel(ticketing)}
    </span>
  );
};

export default TicketAvailabilityBadge;
