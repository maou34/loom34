import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/db/client';
import type { Tables } from '@/db/types';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AgendaEventCard from '@/components/agenda/AgendaEventCard';
import { REGULAR_MEETUPS } from '@/components/site/regularMeetups';
import { btnSecondary, card, container, pageFocus, strongLink } from '@/components/site/styles';
import useSEO from '@/hooks/useSEO';
import { useExternalLinks } from '@/hooks/useSiteSettings';
import { cn } from '@/lib/utils';
import { eventDay, todayISO } from '@/lib/eventDates';
import { eventCity, sortCities } from '@/lib/eventPlace';

type Period = 'upcoming' | 'past';
type EventRow = Tables<'events'>;

const PAST_PAGE_SIZE = 12;

/** Regroupe des événements déjà triés par mois (« Novembre 2026 »). */
function groupByMonth(events: EventRow[]) {
  const groups: { key: string; label: string; items: EventRow[] }[] = [];
  for (const event of events) {
    const key = event.date.slice(0, 7);
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      const label = eventDay(event.date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      group = { key, label: label.charAt(0).toUpperCase() + label.slice(1), items: [] };
      groups.push(group);
    }
    group.items.push(event);
  }
  return groups;
}

const Events = () => {
  useSEO({
    title: 'Agenda - LOOM | Les soirées et sorties de la communauté Bear',
    description:
      'Apéros, dîners, soirées et sorties : retrouvez tous les rendez-vous de LOOM - Les Ours Occitanie Montpellier, et inscrivez-vous en ligne.',
    keywords: ['LOOM agenda', 'événements Bears', 'soirées Bear', 'Montpellier', 'Nîmes', 'apéro ours'],
    type: 'website',
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const period: Period = searchParams.get('periode') === 'passes' ? 'past' : 'upcoming';
  const city = searchParams.get('ville');
  const [pastLimit, setPastLimit] = useState(PAST_PAGE_SIZE);
  const { membershipUrl } = useExternalLinks();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const today = todayISO();
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['agenda', 'events'],
    queryFn: async () => {
      const { data, error } = await db.from('events').select('*').eq('published', true).order('date', { ascending: true });
      if (error) throw error;
      return data as EventRow[];
    },
  });

  const { upcoming, past } = useMemo(
    () => ({
      upcoming: events.filter((e) => e.date.slice(0, 10) >= today),
      past: events.filter((e) => e.date.slice(0, 10) < today).reverse(),
    }),
    [events, today],
  );

  const periodEvents = period === 'upcoming' ? upcoming : past;
  const cities = useMemo(
    () => sortCities([...new Set(periodEvents.map((e) => eventCity(e.location)).filter((c): c is string => !!c))]),
    [periodEvents],
  );
  const activeCity = city && cities.includes(city) ? city : null;
  const filtered = activeCity ? periodEvents.filter((e) => eventCity(e.location) === activeCity) : periodEvents;
  const visible = period === 'past' ? filtered.slice(0, pastLimit) : filtered;
  const months = groupByMonth(visible);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };
  const selectPeriod = (p: Period) => {
    const next = new URLSearchParams(searchParams);
    if (p === 'past') next.set('periode', 'passes');
    else next.delete('periode');
    next.delete('ville');
    setSearchParams(next, { replace: true });
    setPastLimit(PAST_PAGE_SIZE);
  };
  // Onglets : flèches gauche / droite (motif ARIA « tabs »)
  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const next: Period = period === 'upcoming' ? 'past' : 'upcoming';
    selectPeriod(next);
    tabRefs.current[next === 'upcoming' ? 0 : 1]?.focus();
  };

  const tabs: { id: Period; label: string }[] = [
    { id: 'upcoming', label: 'À venir' },
    { id: 'past', label: 'Passés' },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-loom-bg text-loom-text">
      <Navbar />

      <main className={cn(container, 'flex flex-1 flex-col gap-5 pb-16 pt-6 sm:gap-7 sm:pb-[72px] sm:pt-10')}>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[34px] font-extrabold tracking-[-0.02em] sm:text-[44px]">Agenda</h1>
          <p className="text-base text-loom-text-2 sm:text-lg">
            Apéros, dîners, soirées et sorties<span className="hidden sm:inline"> : retrouvez tous nos rendez-vous</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div role="tablist" aria-label="Période" className="flex w-full gap-1 rounded-xl bg-loom-surface-2 p-1 ring-1 ring-loom-border sm:w-auto">
            {tabs.map((tab, i) => {
              const selected = period === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => (tabRefs.current[i] = el)}
                  type="button"
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls="agenda-panel"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => selectPeriod(tab.id)}
                  onKeyDown={onTabKeyDown}
                  className={cn(
                    'h-10 flex-1 rounded-[9px] px-[18px] text-base sm:flex-none',
                    selected ? 'bg-loom-surface font-bold text-loom-text shadow-sm' : 'text-loom-text-2 hover:text-loom-text',
                    pageFocus,
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {cities.length > 1 && (
            <div role="group" aria-label="Ville" className="flex flex-wrap gap-2">
              {[null, ...cities].map((c) => {
                const pressed = activeCity === c;
                return (
                  <button
                    key={c ?? 'all'}
                    type="button"
                    aria-pressed={pressed}
                    onClick={() => setParam('ville', c)}
                    className={cn(
                      'h-10 rounded-full border px-3.5 text-[15px]',
                      pressed
                        ? 'border-loom-primary-bg bg-loom-primary-bg font-semibold text-loom-primary-fg'
                        : 'border-loom-border-strong bg-loom-surface text-loom-text-2 hover:text-loom-text',
                      pageFocus,
                    )}
                  >
                    {c ?? 'Toutes les villes'}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Mobile : rendez-vous réguliers en tête de liste */}
        {period === 'upcoming' && (
          <div className="flex flex-col gap-1.5 rounded-[18px] border border-loom-highlight-border bg-loom-highlight-bg p-4 lg:hidden">
            <h2 className="font-extrabold">Rendez-vous réguliers · 19:00</h2>
            {REGULAR_MEETUPS.map((m) => (
              <span key={m.title} className="text-[15px]">
                <strong>{m.day}</strong> · {m.title}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-start gap-8">
          <div
            id="agenda-panel"
            role="tabpanel"
            aria-labelledby={`tab-${period}`}
            className="flex min-w-0 flex-[999_1_560px] flex-col gap-7"
          >
            {isLoading ? (
              [0, 1, 2].map((i) => <div key={i} aria-hidden="true" className={cn(card, 'h-[330px] animate-pulse bg-loom-surface-2 md:h-[150px]')} />)
            ) : months.length === 0 ? (
              <p className={cn(card, 'p-6 text-loom-text-muted')}>
                {period === 'upcoming'
                  ? activeCity
                    ? `Aucune soirée annoncée à ${activeCity} pour le moment.`
                    : 'Les prochaines soirées seront bientôt annoncées. En attendant, les apéros mensuels continuent !'
                  : 'Aucun événement passé.'}
              </p>
            ) : (
              months.map((month) => (
                <section key={month.key} aria-labelledby={`mois-${month.key}`} className="flex flex-col gap-3.5">
                  <h2 id={`mois-${month.key}`} className="text-[15px] font-extrabold uppercase tracking-[0.06em] text-loom-text-muted">
                    {month.label}
                  </h2>
                  {month.items.map((event) => (
                    <AgendaEventCard key={event.id} event={event} past={period === 'past'} />
                  ))}
                </section>
              ))
            )}

            {period === 'past' && filtered.length > visible.length && (
              <button
                type="button"
                onClick={() => setPastLimit((n) => n + PAST_PAGE_SIZE)}
                className={cn(btnSecondary, 'h-12 self-center px-6')}
              >
                Afficher plus d'événements
              </button>
            )}
          </div>

          <aside aria-label="À savoir" className="hidden min-w-0 flex-[1_1_280px] flex-col gap-4 lg:flex">
            <div className="flex flex-col gap-3.5 rounded-[18px] border border-loom-highlight-border bg-loom-highlight-bg p-6">
              <h2 className="text-lg font-extrabold">Rendez-vous réguliers</h2>
              {REGULAR_MEETUPS.map((m) => (
                <div key={m.title} className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-bold uppercase tracking-[0.04em] text-loom-highlight-label">{m.whenShort}</span>
                  <span className="font-bold">{m.title}</span>
                </div>
              ))}
              <span className="text-sm text-loom-text-2">Entrée libre, sans réservation.</span>
            </div>
            <div className="flex flex-col gap-3 rounded-[18px] bg-loom-join-bg p-6 text-white">
              <h2 className="text-lg font-extrabold">Payez moins cher vos soirées</h2>
              <p className="text-[15px] text-loom-join-text">
                Les adhérents profitent du tarif réduit sur les événements et de réductions chez nos{' '}
                <Link to="/partners" className="font-semibold text-white underline underline-offset-2">
                  partenaires
                </Link>
                .
              </p>
              <a
                href={membershipUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 items-center self-start rounded-xl bg-loom-yellow px-[18px] font-extrabold text-loom-on-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-loom-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-loom-join-bg"
              >
                Adhérer<span className="sr-only"> (nouvel onglet)</span>
              </a>
            </div>
          </aside>
        </div>

        {period === 'upcoming' && (
          <p className="text-[15px] text-loom-text-muted lg:hidden">
            Pas encore adhérent ?{' '}
            <a href={membershipUrl} target="_blank" rel="noopener noreferrer" className={strongLink}>
              Adhérez<span className="sr-only"> (nouvel onglet)</span>
            </a>{' '}
            et payez le tarif réduit.
          </p>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Events;
