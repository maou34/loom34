import { Link } from 'react-router';
import type { Tables } from '@/db/types';
import { cn } from '@/lib/utils';
import { dateBlockParts, formatShortDateTime, isRecurringApero } from '@/lib/eventDates';
import { getEventCta } from '@/lib/eventCta';
import EventChips from '@/components/site/EventChips';
import { getEventChips } from '@/lib/eventChips';
import { btnDisabled, btnPrimary, btnSecondary, card } from '@/components/site/styles';

/**
 * Carte d'un événement dans l'agenda : verticale sur mobile, horizontale
 * (image · bloc date · infos · boutons) à partir de md. Toute la carte mène
 * à la fiche (lien étiré sur le titre), les boutons restent cliquables.
 */
export default function AgendaEventCard({ event, past = false }: { event: Tables<'events'>; past?: boolean }) {
  const detailsUrl = `/events/${event.slug}`;
  const cta = past ? null : getEventCta(event);
  const showCta = cta && !(cta.kind === 'link' && cta.to === detailsUrl);
  const free = isRecurringApero(event.title);
  const chips = getEventChips(event, { past });
  const { weekday, day } = dateBlockParts(event.date);
  const place = [event.time, event.location].filter(Boolean).join(' · ');

  const ctaButton = !showCta ? null : cta.kind === 'disabled' ? (
    <span className={cn(btnDisabled, 'h-11 px-[18px] text-[15px]')}>{cta.label}</span>
  ) : cta.kind === 'external' ? (
    <a href={cta.href} target="_blank" rel="noopener noreferrer" aria-label={cta.ariaLabel} className={cn(btnPrimary, 'h-11 px-[18px] text-[15px]')}>
      {cta.label}
    </a>
  ) : (
    <Link to={cta.to} aria-label={cta.ariaLabel} className={cn(btnPrimary, 'h-11 px-[18px] text-[15px]')}>
      {cta.label}
    </Link>
  );

  return (
    <article
      className={cn(
        card,
        'relative flex flex-col overflow-hidden rounded-[18px] focus-within:ring-2 focus-within:ring-ring md:flex-row',
        past && 'opacity-90',
      )}
    >
      {/* Desktop : l'image remplit la hauteur de la carte sans l'imposer (affiches carrées ou portrait) */}
      <div className="relative h-[180px] w-full flex-none bg-loom-surface-2 md:h-auto md:min-h-[150px] md:w-[220px]">
        <img src={event.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 md:flex-row md:items-center md:gap-[18px] md:px-[22px] md:py-[18px]">
        {/* Bloc date (desktop) */}
        <div aria-hidden="true" className="hidden w-[58px] flex-none flex-col items-center rounded-xl border border-loom-border bg-loom-surface-2 py-2 md:flex">
          <span className="text-xs font-bold text-loom-accent-text">{weekday}</span>
          <span className="text-2xl font-extrabold leading-tight">{day}</span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-[13px] font-bold uppercase tracking-[0.04em] text-loom-accent-text md:sr-only">
            {formatShortDateTime(event)}
          </span>
          <h3 className="text-lg font-extrabold leading-tight md:text-xl">
            <Link to={detailsUrl} className="no-underline after:absolute after:inset-0 hover:underline underline-offset-4 focus-visible:outline-none">
              {event.title}
            </Link>
          </h3>
          <span className="text-[15px] text-loom-text-muted">
            <span className="hidden md:inline">{place}</span>
            <span className="line-clamp-2 md:hidden">{event.location}</span>
          </span>
          <EventChips chips={chips} className={cn('mt-1', 'hidden md:flex')} />
        </div>

        {/* Boutons : au-dessus du lien étiré */}
        <div className="relative z-10 flex gap-2 md:flex-none md:flex-col">
          {ctaButton ? (
            <span className="flex flex-1 md:flex-none [&>*]:flex-1">{ctaButton}</span>
          ) : free && !past ? (
            <span className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-loom-success-bg text-[15px] font-bold text-loom-success md:hidden">
              Entrée libre
            </span>
          ) : null}
          <Link to={detailsUrl} aria-label={`Détails : ${event.title}`} className={cn(btnSecondary, 'h-11 px-[18px] text-[15px]', !ctaButton && !(free && !past) && 'flex-1 md:flex-none')}>
            Détails
          </Link>
        </div>
      </div>
    </article>
  );
}
