import { cn } from '@/lib/utils';
import { dateBlockParts } from '@/lib/eventDates';

/** Bloc date « SAM. / 21 / NOV. » des cartes d'événements. */
export default function EventDateBlock({ date, className }: { date: string; className?: string }) {
  const { weekday, day, month, full } = dateBlockParts(date);
  return (
    <div
      className={cn(
        'flex w-[60px] flex-none flex-col items-center rounded-xl border border-loom-border bg-loom-surface-2 py-2',
        className,
      )}
    >
      <span className="sr-only">{full}</span>
      <span aria-hidden="true" className="text-xs font-bold text-loom-accent-text">
        {weekday}
      </span>
      <span aria-hidden="true" className="text-2xl font-extrabold leading-tight">
        {day}
      </span>
      <span aria-hidden="true" className="text-xs font-bold text-loom-text-muted">
        {month}
      </span>
    </div>
  );
}
