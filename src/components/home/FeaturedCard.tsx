import { Link } from 'react-router-dom';
import { CalendarPlus } from 'lucide-react';
import type { Tables } from '@/db/types';
import { cn } from '@/lib/utils';
import { stripMarkdown } from '@/lib/markdown';
import { formatCountdown, formatShortDateTime } from '@/lib/eventDates';
import { getEventCta } from '@/lib/eventCta';
import { downloadEventIcs } from '@/lib/ics';
import EventDateBlock from '@/components/site/EventDateBlock';
import { btnDisabled, btnPrimary, btnSecondary, card, pageFocus } from '@/components/site/styles';

export type FeaturedItem =
  | { kind: 'event'; event: Tables<'events'> }
  | { kind: 'visual'; image: string; link: string };

const cardShell = cn(card, 'min-w-0 overflow-hidden shadow-loom-card');

/** Carte « À ne pas manquer » à droite du hero (événement choisi dans l'admin). */
export default function FeaturedCard({ item, isLoading }: { item: FeaturedItem | null; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className={cn(cardShell, 'animate-pulse')} aria-hidden="true">
        <div className="h-[190px] bg-loom-surface-2 sm:h-[230px]" />
        <div className="flex flex-col gap-3 p-6">
          <div className="h-6 w-2/3 rounded bg-loom-surface-2" />
          <div className="h-4 w-1/2 rounded bg-loom-surface-2" />
          <div className="h-12 rounded-xl bg-loom-surface-2" />
        </div>
      </div>
    );
  }
  if (!item) return null;

  if (item.kind === 'visual') {
    // Lien de l'admin (« Page d'accueil ») qui ne pointe pas vers un événement :
    // simple visuel cliquable, comme avant la refonte.
    const external = /^https?:\/\//i.test(item.link);
    const inner = <img src={item.image} alt="" className="block h-auto w-full" fetchPriority="high" />;
    return (
      <div className={cardShell}>
        {external ? (
          <a href={item.link} target="_blank" rel="noopener noreferrer" aria-label="À ne pas manquer (nouvel onglet)" className={cn('block', pageFocus)}>
            {inner}
          </a>
        ) : (
          <Link to={item.link} aria-label="À ne pas manquer" className={cn('block', pageFocus)}>
            {inner}
          </Link>
        )}
      </div>
    );
  }

  const { event } = item;
  const countdown = formatCountdown(event.date);
  const cta = getEventCta(event);
  const place = [event.time, event.location].filter(Boolean).join(' · ');

  return (
    <article aria-labelledby="featured-title" className={cardShell}>
      <div className="relative">
        <img
          src={event.image}
          alt={`Affiche : ${event.title}`}
          className="block h-[190px] w-full object-cover sm:h-[230px]"
          fetchPriority="high"
        />
        <span className="absolute left-4 top-4 rounded-full bg-loom-surface px-3 py-1.5 text-[13px] font-bold text-loom-nav-active-fg">
          À ne pas manquer{countdown ? ` · ${countdown}` : ''}
        </span>
      </div>
      <div className="flex flex-col gap-3.5 p-5 sm:px-6 sm:pb-6 sm:pt-[22px]">
        <div className="flex items-center gap-4">
          <EventDateBlock date={event.date} className="hidden sm:flex" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[13px] font-bold uppercase tracking-[0.04em] text-loom-accent-text sm:hidden">
              {formatShortDateTime(event)}
            </span>
            <h2 id="featured-title" className="text-xl font-extrabold leading-tight sm:text-[22px]">
              <Link to={`/events/${event.slug}`} className={cn('rounded-sm hover:underline underline-offset-4', pageFocus)}>
                {event.title}
              </Link>
            </h2>
            <span className="text-[15px] text-loom-text-muted">
              <span className="hidden sm:inline">{place}</span>
              <span className="sm:hidden">{event.location}</span>
            </span>
          </div>
        </div>
        {event.description && (
          // Enveloppe : « sm:block » écraserait le display de line-clamp
          <div className="hidden sm:block">
            <p className="text-[15px] text-loom-text-2 line-clamp-3">{stripMarkdown(event.description)}</p>
          </div>
        )}
        <div className="flex gap-2.5">
          {cta.kind === 'disabled' ? (
            <span className={cn(btnDisabled, 'h-[46px] flex-1')}>{cta.label}</span>
          ) : cta.kind === 'external' ? (
            <a href={cta.href} target="_blank" rel="noopener noreferrer" aria-label={cta.ariaLabel} className={cn(btnPrimary, 'h-[46px] flex-1')}>
              {cta.label}
            </a>
          ) : (
            <Link to={cta.to} aria-label={cta.ariaLabel} className={cn(btnPrimary, 'h-[46px] flex-1')}>
              {cta.label}
            </Link>
          )}
          <button
            type="button"
            onClick={() => downloadEventIcs(event)}
            aria-label="Ajouter la soirée à mon agenda"
            title="Ajouter à mon agenda"
            className={cn(btnSecondary, 'h-[46px] w-[46px] flex-none sm:w-auto sm:px-4')}
          >
            <CalendarPlus aria-hidden="true" size={18} />
            <span aria-hidden="true" className="hidden sm:inline">
              Ajouter
            </span>
          </button>
        </div>
      </div>
    </article>
  );
}
