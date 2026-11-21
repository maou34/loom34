import { Link } from 'react-router-dom';
import type { Tables } from '@/db/types';
import { cn } from '@/lib/utils';
import { formatShortDateTime } from '@/lib/eventDates';
import { getEventCta } from '@/lib/eventCta';
import SectionHeader from '@/components/site/SectionHeader';
import { commonTime, meetupWhen, meetupWhenShort, useRegularMeetups, type RegularMeetup } from '@/lib/regularMeetups';
import { btnDisabled, btnPrimary, btnSecondary, card, container, pageFocus, strongLink } from '@/components/site/styles';

/** À partir de ce nombre, l'encadré (desktop) passe en bandeau sous les cartes : en colonne, il
 * devenait plus haut que les cartes d'événements et les étirait (grand vide avant les boutons). */
const WIDE_FROM = 3;
const WIDE_COLS: Record<number, string> = { 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4' };

function RegularMeetups({ meetups }: { meetups: RegularMeetup[] }) {
  if (meetups.length === 0) return null;
  const time = commonTime(meetups);
  const wide = meetups.length >= WIDE_FROM;
  return (
    <aside
      aria-labelledby="regular-title"
      className={cn(
        'order-last flex min-w-0 flex-col gap-3 rounded-[18px] border border-loom-highlight-border bg-loom-highlight-bg p-5 lg:gap-4 lg:p-6',
        wide ? 'lg:col-span-3' : 'lg:order-first',
      )}
    >
      <div className={cn(wide && 'lg:flex lg:items-baseline lg:justify-between lg:gap-4')}>
        <h3 id="regular-title" className="text-lg font-extrabold">
          <span className="lg:hidden">Rendez-vous réguliers</span>
          <span className="hidden lg:inline">Nos rendez-vous réguliers</span>
        </h3>
        {wide && <span className="hidden text-sm text-loom-text-2 lg:block">Entrée libre, pas besoin de réserver.</span>}
      </div>
      {/* Mobile : version condensée */}
      <ul className="flex flex-col gap-1.5 text-[15px] lg:hidden">
        {meetups.map((m) => (
          <li key={m.title}>
            <strong>{time ? m.day : meetupWhenShort(m)}</strong> · {m.title}
          </li>
        ))}
        <li className="text-sm text-loom-text-2">{time ? `${time} · entrée libre` : 'Entrée libre'}</li>
      </ul>
      {/* Desktop */}
      <div className={cn('hidden', wide ? cn('lg:grid lg:gap-6', WIDE_COLS[meetups.length]) : 'flex-col gap-4 lg:flex')}>
        {meetups.map((m, i) => (
          <div
            key={m.title}
            className={cn(
              'flex flex-col gap-1',
              i > 0 && (wide ? 'border-l border-loom-highlight-border pl-6' : 'border-t border-loom-highlight-border pt-4'),
            )}
          >
            <span className="text-[13px] font-bold uppercase tracking-[0.04em] text-loom-highlight-label">{meetupWhen(m)}</span>
            <span className="font-bold">{m.title}</span>
            {m.text && <span className="text-sm text-loom-text-2">{m.text}</span>}
          </div>
        ))}
      </div>
      {!wide && <span className="mt-auto hidden text-sm text-loom-text-2 lg:block">Entrée libre, pas besoin de réserver.</span>}
    </aside>
  );
}

function EventTile({ event }: { event: Tables<'events'> }) {
  const cta = getEventCta(event);
  const detailsUrl = `/events/${event.slug}`;
  const showDetails = !(cta.kind === 'link' && cta.to === detailsUrl);

  return (
    <article
      className={cn(
        card,
        'relative flex min-w-0 gap-3.5 overflow-hidden rounded-[18px] p-3 focus-within:ring-2 focus-within:ring-ring lg:flex-col lg:gap-0 lg:p-0',
      )}
    >
      <img
        src={event.image}
        alt=""
        loading="lazy"
        className="h-[76px] w-[76px] flex-none rounded-xl bg-loom-surface-2 object-cover lg:h-[150px] lg:w-full lg:rounded-none"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1 lg:gap-2 lg:px-5 lg:pb-5 lg:pt-[18px]">
        <span className="text-[13px] font-bold uppercase tracking-[0.04em] text-loom-accent-text">{formatShortDateTime(event)}</span>
        <h3 className="text-base font-extrabold leading-tight lg:text-[19px]">
          {/* Lien étiré : toute la carte est cliquable, les boutons restent au-dessus. */}
          <Link to={detailsUrl} className="no-underline after:absolute after:inset-0 focus-visible:outline-none hover:underline underline-offset-4">
            {event.title}
          </Link>
        </h3>
        <span className="text-sm text-loom-text-muted line-clamp-2">{event.location}</span>
        <div className="relative z-10 mt-auto hidden gap-2 pt-2.5 lg:flex">
          {cta.kind === 'disabled' ? (
            <span className={cn(btnDisabled, 'h-11 flex-1 text-[15px]')}>{cta.label}</span>
          ) : cta.kind === 'external' ? (
            <a href={cta.href} target="_blank" rel="noopener noreferrer" aria-label={cta.ariaLabel} className={cn(btnPrimary, 'h-11 flex-1 text-[15px]')}>
              {cta.label}
            </a>
          ) : (
            <Link to={cta.to} aria-label={cta.ariaLabel} className={cn(btnPrimary, 'h-11 flex-1 text-[15px]')}>
              {cta.label}
            </Link>
          )}
          {showDetails && (
            <Link to={detailsUrl} aria-label={`Détails : ${event.title}`} className={cn(btnSecondary, 'h-11 px-3.5 text-[15px]')}>
              Détails
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

/** « Nos prochains événements » : encadré des rendez-vous réguliers + 3 cartes
 * (encadré à gauche jusqu'à 2 rendez-vous, en bandeau sous les cartes au-delà). */
export default function UpcomingEvents({ events, isLoading }: { events: Tables<'events'>[]; isLoading: boolean }) {
  const meetups = useRegularMeetups();
  const wide = meetups.length >= WIDE_FROM;
  return (
    <section aria-labelledby="agenda-title" className={cn(container, 'flex flex-col gap-6 py-10 sm:gap-7 sm:pb-16 sm:pt-14')}>
      <SectionHeader
        id="agenda-title"
        title="Nos prochains événements"
        mobileTitle="Prochains événements"
        subtitle="Inscrivez-vous en ligne, tarif réduit pour les adhérents."
        link={{ to: '/events', label: "Tout l'agenda →", mobileLabel: 'Tout voir' }}
      />
      <div className={cn('flex flex-col gap-3 lg:grid lg:gap-6', wide ? 'lg:grid-cols-3' : 'lg:grid-cols-4')}>
        <RegularMeetups meetups={meetups} />
        {isLoading
          ? [0, 1, 2].map((i) => <div key={i} aria-hidden="true" className={cn(card, 'h-[100px] animate-pulse bg-loom-surface-2 lg:h-[340px]')} />)
          : events.map((event) => <EventTile key={event.id} event={event} />)}
        {!isLoading && events.length === 0 && (
          <p className="flex items-center text-loom-text-muted lg:col-span-3">
            Les prochains événements seront bientôt annoncés.&nbsp;
            <Link to="/events" className={strongLink}>
              Voir l'agenda
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
