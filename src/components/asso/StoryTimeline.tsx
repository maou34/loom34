import { useRef } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { HistoryEntry } from '@/lib/asso';
import { pageFocus } from '@/components/site/styles';

// Couleur du point de chaque date, en boucle (du brun au jaune, comme la maquette)
const DOT_COLORS = ['bg-loom-title-accent', 'bg-loom-accent-text', 'bg-loom-initial', 'bg-loom-yellow'];

/**
 * « Notre histoire » : frise horizontale défilante en desktop (scroll-snap,
 * flèches, « Aujourd'hui → » qui va à la fin, fondu à droite), verticale en mobile.
 * Les dates viennent de l'admin « Historique », triées chronologiquement.
 */
export default function StoryTimeline({ entries }: { entries: HistoryEntry[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const scroll = (left: number) => trackRef.current?.scrollBy({ left, behavior: 'smooth' });
  const toEnd = () => trackRef.current?.scrollTo({ left: trackRef.current.scrollWidth, behavior: 'smooth' });
  const lastIndex = entries.length - 1;

  const iconButton = cn(
    'flex h-10 w-10 items-center justify-center rounded-full border border-loom-border-strong bg-loom-surface text-loom-text hover:border-loom-text-muted',
    pageFocus,
  );

  return (
    <section aria-labelledby="h-story" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="h-story" className="text-[26px] font-extrabold sm:text-4xl">
          Notre histoire
        </h2>
        <div className="hidden items-center gap-2 md:flex">
          <button type="button" onClick={() => scroll(-320)} aria-label="Dates précédentes" className={iconButton}>
            <ChevronLeft aria-hidden="true" size={18} />
          </button>
          <button type="button" onClick={() => scroll(320)} aria-label="Dates suivantes" className={iconButton}>
            <ChevronRight aria-hidden="true" size={18} />
          </button>
          <button
            type="button"
            onClick={toEnd}
            className={cn('flex h-10 items-center gap-1.5 rounded-full bg-loom-primary-bg px-4 text-sm font-bold text-loom-primary-fg hover:bg-loom-primary-hover', pageFocus)}
          >
            Aujourd'hui <ArrowRight aria-hidden="true" size={16} />
          </button>
        </div>
      </div>

      {/* Desktop : frise horizontale */}
      <div
        ref={trackRef}
        role="region"
        aria-label="Frise chronologique, faire défiler horizontalement"
        tabIndex={0}
        className={cn(
          'no-scrollbar hidden snap-x snap-mandatory overflow-x-auto scroll-smooth pb-2 md:block',
          '[mask-image:linear-gradient(to_right,black_88%,transparent)]',
          pageFocus,
        )}
      >
        <ol className="flex w-max gap-0 pr-24">
          {entries.map((entry, i) => (
            <li key={entry.id} className="flex w-[300px] snap-start flex-col gap-3 pr-5">
              <span className="flex items-center gap-2">
                <span aria-hidden="true" className={cn('h-4 w-4 flex-none rounded-full ring-4 ring-loom-bg outline outline-2 outline-loom-title-accent', DOT_COLORS[i % DOT_COLORS.length])} />
                <span className="text-[32px] font-extrabold leading-none text-loom-title-accent">{entry.year}</span>
                <span aria-hidden="true" className="h-0.5 flex-1 rounded-full bg-loom-border-strong" />
              </span>
              <span
                className={cn(
                  'flex min-h-[150px] flex-col gap-1.5 rounded-[18px] border p-5',
                  i === lastIndex ? 'border-loom-highlight-border bg-loom-highlight-bg' : 'border-loom-border bg-loom-surface',
                )}
              >
                {entry.month_label && (
                  <span className="text-xs font-bold uppercase tracking-[0.06em] text-loom-accent-text">{entry.month_label}</span>
                )}
                <span className="text-[17px] font-extrabold">{entry.title}</span>
                <span className="text-sm text-loom-text-2">{entry.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* Mobile : frise verticale */}
      <ol className="relative flex flex-col gap-5 border-l-2 border-loom-border-strong pl-6 md:hidden">
        {entries.map((entry, i) => (
          <li key={entry.id} className="relative flex flex-col gap-1.5">
            <span aria-hidden="true" className={cn('absolute -left-[33px] top-1.5 h-4 w-4 rounded-full ring-4 ring-loom-bg', DOT_COLORS[i % DOT_COLORS.length])} />
            <span className="text-2xl font-extrabold leading-none text-loom-title-accent">{entry.year}</span>
            <span
              className={cn(
                'flex flex-col gap-1 rounded-[18px] border p-4',
                i === lastIndex ? 'border-loom-highlight-border bg-loom-highlight-bg' : 'border-loom-border bg-loom-surface',
              )}
            >
              {entry.month_label && (
                <span className="text-xs font-bold uppercase tracking-[0.06em] text-loom-accent-text">{entry.month_label}</span>
              )}
              <span className="font-extrabold">{entry.title}</span>
              <span className="text-sm text-loom-text-2">{entry.body}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
