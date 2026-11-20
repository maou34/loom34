import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useSlugRedirect } from '@/lib/slug';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowDown, CalendarDays, CalendarPlus, ChevronLeft, ExternalLink, Lock, MapPin, Share2, Ticket } from 'lucide-react';
import { db } from '@/db/client';
import type { Tables } from '@/db/types';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import EventDateBlock from '@/components/site/EventDateBlock';
import TicketInfo from '@/components/event/TicketInfo';
import OsmMap from '@/components/event/OsmMap';
import { useEventAlbums } from '@/lib/albums';
import { Chip } from '@/components/site/EventChips';
import type { EventChip } from '@/lib/eventChips';
import { btnDisabled, btnPrimary, btnSecondary, card, container, pageFocus, strongLink } from '@/components/site/styles';
import useSEO from '@/hooks/useSEO';
import { useExternalLinks } from '@/hooks/useSiteSettings';
import { generateEventStructuredData } from '@/lib/seo';
import { stripMarkdown } from '@/lib/markdown';
import { cn } from '@/lib/utils';
import { HELLOASSO_BASE_URL } from '@/config';
import { daysUntil, eventDay, formatCountdown, formatShortDateTime, isRecurringApero, todayISO } from '@/lib/eventDates';
import { directionsUrl } from '@/lib/eventPlace';
import { downloadEventIcs } from '@/lib/ics';
import { shareLink } from '@/lib/share';
import {
  closedLabel,
  formatPriceSummary,
  getHelloAssoFormUrl,
  getHelloAssoWidgetUrl,
  getTicketAvailability,
  hasTicketing,
  isBookable,
  type TicketingInfo,
} from '@/lib/ticketing';
import { SOCIAL_LINKS } from '@/components/site/navigation';
import { BLANK_IMAGE } from '@/lib/blankImage';
import ZoomableImage from '@/components/site/ZoomableImage';

/** Images du texte cliquables pour les voir en entier */
const MARKDOWN_COMPONENTS = { img: ZoomableImage };

const HELLOASSO_ORIGIN = new URL(HELLOASSO_BASE_URL).origin;
const IFRAME_DEFAULT_HEIGHT = 750;

/**
 * Widget HelloAsso intégré (desktop uniquement). HelloAsso envoie la hauteur de
 * son contenu par postMessage ({ height }) ; on l'applique pour éviter une double
 * barre de défilement. Si aucun message n'arrive, la hauteur par défaut reste.
 * L'iframe reste claire en mode nuit (on ne contrôle pas son style).
 */
const HelloAssoWidget = ({ ticketing, title }: { ticketing: TicketingInfo; title: string }) => {
  const [height, setHeight] = useState(IFRAME_DEFAULT_HEIGHT);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== HELLOASSO_ORIGIN) return;
      const h = typeof e.data === 'object' && e.data !== null ? Number((e.data as { height?: unknown }).height) : NaN;
      if (Number.isFinite(h) && h > 0) setHeight(h);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <iframe
      src={getHelloAssoWidgetUrl(ticketing)}
      title={`Billetterie HelloAsso : ${title}`}
      className="w-full rounded-xl border-0 bg-white"
      style={{ height }}
      allow="payment"
      loading="lazy"
    />
  );
};

/** Ligne d'info du bloc mobile (icône + intitulé + détail). */
const InfoRow = ({ icon, term, children }: { icon: ReactNode; term: string; children: ReactNode }) => (
  <div className="flex gap-3">
    <span aria-hidden="true" className="mt-0.5 text-loom-accent-text">
      {icon}
    </span>
    <div className="flex min-w-0 flex-col">
      <dt className="sr-only">{term}</dt>
      {children}
    </div>
  </div>
);

const EventDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { membershipUrl } = useExternalLinks();

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event', slug],
    // Adresse inconnue (PGRST116) : inutile de réessayer, on passe tout de suite à la redirection / 404
    retry: (count, err) => (err as { code?: string })?.code !== 'PGRST116' && count < 3,
    queryFn: async () => {
      const { data, error } = await db.from('events').select('*').eq('slug', slug).single();
      if (error) throw error;
      return data as Tables<'events'>;
    },
  });

  const today = todayISO();
  const { data: eventAlbums = [] } = useEventAlbums(event?.id);

  const { data: otherEvents = [] } = useQuery({
    queryKey: ['event', slug, 'others', today],
    enabled: !!event,
    queryFn: async () => {
      const { data, error } = await db
        .from('events')
        .select('id, slug, title, date, time, image')
        .eq('published', true)
        .gte('date', today)
        .neq('slug', slug!)
        .order('date', { ascending: true })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  useSEO({
    title: event ? `${event.title} - Événement LOOM` : 'Événement - LOOM',
    description: event?.description
      ? stripMarkdown(event.description).substring(0, 160)
      : 'Découvrez cet événement de LOOM - Les Ours Occitanie Montpellier',
    keywords: ['LOOM', 'Bears', 'événement', 'rencontre', 'communauté'],
    image: event?.image,
    type: 'website',
    publishedTime: event?.created_at,
    author: 'LOOM',
  });

  useEffect(() => {
    if (event) {
      generateEventStructuredData({
        name: event.title,
        description: stripMarkdown(event.description),
        startDate: event.date,
        location: event.location,
        image: event.image,
        url: window.location.href,
      });
    }
  }, [event]);

  // Adresse inconnue : contenu renommé ? (slug_redirects) — sinon page 404
  const { data: movedTo, isFetched: redirectChecked } = useSlugRedirect('events', slug, !!error);
  useEffect(() => {
    if (!error || !redirectChecked) return;
    if (movedTo) navigate(`/events/${movedTo}${location.search}${location.hash}`, { replace: true });
    else navigate('/404');
  }, [error, redirectChecked, movedTo, navigate, location.search, location.hash]);

  // Arrivée depuis un bouton « S'inscrire » (/events/<slug>#billetterie) : React Router
  // ne fait pas défiler jusqu'à l'ancre. Sur mobile la section n'existe pas (pas
  // d'iframe) : on vise le bouton d'inscription du bloc infos.
  useEffect(() => {
    if (!event || location.hash !== '#billetterie') return;
    const desktop = window.matchMedia('(min-width: 1024px)').matches;
    document.getElementById(desktop ? 'billetterie' : 'inscription-mobile')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [event, location.hash]);

  // Mobile : la barre fixe « S'inscrire » n'apparaît que quand le bouton du bloc infos est hors de l'écran.
  const mobileCtaRef = useRef<HTMLDivElement>(null);
  const [mobileCtaVisible, setMobileCtaVisible] = useState(true);
  useEffect(() => {
    const el = mobileCtaRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setMobileCtaVisible(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, [event]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-loom-bg">
        <Navbar />
        <div className={cn(container, 'flex-1 py-10')} aria-hidden="true">
          <div className="flex flex-wrap gap-8">
            <div className="flex flex-[999_1_560px] flex-col gap-5">
              <div className="h-[320px] animate-pulse rounded-[22px] bg-loom-surface-2" />
              <div className="h-10 w-2/3 animate-pulse rounded bg-loom-surface-2" />
              <div className="h-24 animate-pulse rounded bg-loom-surface-2" />
            </div>
            <div className="hidden h-[360px] flex-[1_1_300px] animate-pulse rounded-[22px] bg-loom-surface-2 lg:block" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!event) return null;

  const isPast = daysUntil(event.date) < 0;
  const isTicketed = hasTicketing(event);
  const availability = isTicketed ? getTicketAvailability(event) : null;
  const isClosed = isTicketed && !isBookable(availability);
  const canBook = isTicketed && !isClosed && !isPast;
  const free = isRecurringApero(event.title);
  const priceSummary = isTicketed ? formatPriceSummary(event.ticket_prices) : null;
  const countdown = formatCountdown(event.date);
  const longDate = eventDay(event.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const longDateCap = longDate.charAt(0).toUpperCase() + longDate.slice(1);
  const timeLabel = event.time?.trim() ? `à partir de ${event.time.trim()}` : null;

  // Badge d'état (un seul)
  let badge: EventChip | null = null;
  if (isPast) badge = { label: 'Événement passé', tone: 'muted' };
  else if (isTicketed) {
    if (isClosed) badge = { label: closedLabel(availability), tone: 'muted' };
    else if (availability === 'almost_full') badge = { label: 'Dernières places', tone: 'hot' };
    else badge = { label: 'Sur réservation', tone: 'default' };
  } else if (free) badge = { label: 'Entrée libre', tone: 'free' };
  else if (event.registration_url) badge = { label: 'Sur réservation', tone: 'default' };

  const helloAssoUrl = isTicketed ? getHelloAssoFormUrl(event) : null;
  const priceSuffix = priceSummary ? ` · ${priceSummary.charAt(0).toLowerCase()}${priceSummary.slice(1)}` : '';
  const scrollToBooking = () => document.getElementById('billetterie')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const memberNote = event.ticket_member_discount && !isPast && (
    <p className="text-sm text-loom-text-muted">
      Pas encore adhérent ?{' '}
      <a href={membershipUrl} target="_blank" rel="noopener noreferrer" className={cn(strongLink, 'underline')}>
        Adhérez<span className="sr-only"> (nouvel onglet)</span>
      </a>{' '}
      et payez le tarif réduit.
    </p>
  );

  const closedMessage = (
    <div className="flex flex-col gap-2 rounded-xl border border-loom-border bg-loom-surface-2 p-4 text-[15px]">
      <p className="font-bold">
        {availability === 'closed' ? 'Les inscriptions à cet événement sont closes.' : 'Cet événement est complet.'}
      </p>
      {availability !== 'closed' && (
        <p className="text-loom-text-2">
          Suivez-nous sur{' '}
          <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noopener noreferrer" className={strongLink}>
            Instagram
          </a>{' '}
          ou{' '}
          <a href={SOCIAL_LINKS.facebook} target="_blank" rel="noopener noreferrer" className={strongLink}>
            Facebook
          </a>{' '}
          pour être prévenu en cas de désistement.
        </p>
      )}
      <Link to="/events" className={cn(strongLink, 'self-start')}>
        Voir l'agenda →
      </Link>
    </div>
  );

  const agendaShareButtons = (labelAgenda: string) => (
    <div className="flex gap-2.5">
      {!isPast && (
        <button type="button" onClick={() => downloadEventIcs(event)} className={cn(btnSecondary, 'h-11 flex-1 px-3 text-[15px]')}>
          <CalendarPlus aria-hidden="true" size={18} className="hidden lg:block" />
          <span className="whitespace-nowrap">{labelAgenda}</span>
        </button>
      )}
      <button
        type="button"
        onClick={() => shareLink(event.title)}
        aria-label="Partager l'événement"
        className={cn(btnSecondary, 'h-11 px-3 text-[15px]', isPast ? 'flex-1' : 'flex-1 lg:w-11 lg:flex-none')}
      >
        <Share2 aria-hidden="true" size={18} />
        <span className="lg:hidden">Partager</span>
      </button>
    </div>
  );

  return (
    <div className={cn('flex min-h-screen flex-col bg-loom-bg text-loom-text', canBook && 'max-lg:pb-24')}>
      <Navbar />

      <main className="flex-1">
        <div className={cn(container, 'flex flex-col gap-5 pb-14 pt-4 sm:pt-8')}>
          {/* Fil d'Ariane (desktop) / retour (mobile) */}
          <nav aria-label="Fil d'Ariane" className="hidden text-sm text-loom-text-muted sm:block">
            <Link to="/events" className={cn(strongLink, 'font-semibold')}>
              Agenda
            </Link>{' '}
            <span aria-hidden="true">›</span> <span aria-current="page">{event.title}</span>
          </nav>
          <Link to="/events" className={cn('flex min-h-11 items-center gap-1 self-start rounded-lg font-semibold text-loom-link sm:hidden', pageFocus)}>
            <ChevronLeft aria-hidden="true" size={18} /> Agenda
          </Link>

          <div className="flex flex-wrap items-start gap-8">
            {/* Colonne principale */}
            <article aria-labelledby="event-title" className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">
              {/* Pas d'affiche en en-tête sur mobile : on arrive directement aux infos. La
                  <source> vide évite aussi que le téléphone télécharge l'image cachée. */}
              <div className="hidden overflow-hidden rounded-[22px] bg-loom-surface-2 sm:block">
                <picture>
                  <source media="(max-width: 639px)" srcSet={BLANK_IMAGE} />
                  <img
                    src={event.image}
                    alt={`Affiche : ${event.title}`}
                    className="mx-auto block max-h-[420px] w-full object-contain"
                    fetchPriority="high"
                  />
                </picture>
              </div>

              <div className="flex flex-col gap-2.5">
                {badge && <Chip chip={badge} className="self-start px-3 py-1 text-[13px]" />}
                <h1 id="event-title" className="text-[28px] font-extrabold leading-tight tracking-[-0.01em] sm:text-[40px]">
                  {event.title}
                </h1>
                <p className="hidden text-[17px] text-loom-text-2 lg:block">
                  {[longDateCap, timeLabel, event.location].filter(Boolean).join(' · ')}
                </p>
              </div>

              {event.description && (
                <div className={cn(card, 'rounded-[18px] p-5 sm:p-6')}>
                  {/* Images de la description : hauteur limitée, centrées, un clic les affiche en entier */}
                  <div className="prose prose-loom max-w-none sm:prose-lg prose-img:mx-auto prose-img:max-h-[min(75vh,560px)] prose-img:w-auto prose-img:rounded-xl">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={MARKDOWN_COMPONENTS}>{event.description}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Mobile : infos pratiques, inscription, agenda / partage */}
              <div className="flex flex-col gap-4 lg:hidden">
                <dl className={cn(card, 'flex flex-col gap-4 rounded-[18px] p-4')}>
                  <InfoRow icon={<CalendarDays size={20} />} term="Date">
                    <dd className="font-bold">{formatShortDateTime(event)}</dd>
                    {countdown && <dd className="text-sm text-loom-text-muted">{countdown}</dd>}
                  </InfoRow>
                  <InfoRow icon={<MapPin size={20} />} term="Lieu">
                    <dd className="font-bold">{event.location}</dd>
                    <dd>
                      <a href={directionsUrl(event.location)} target="_blank" rel="noopener noreferrer" className={cn(strongLink, 'text-sm underline')}>
                        Itinéraire<span className="sr-only"> (nouvel onglet)</span>
                      </a>
                    </dd>
                  </InfoRow>
                  {isTicketed && !isPast && (
                    <InfoRow icon={<Ticket size={20} />} term="Tarifs et places">
                      <dd>
                        <TicketInfo ticketing={event} />
                      </dd>
                    </InfoRow>
                  )}
                </dl>

                <div id="inscription-mobile" ref={mobileCtaRef} className="flex scroll-mt-28 flex-col gap-2">
                  {canBook && helloAssoUrl ? (
                    <>
                      <a href={helloAssoUrl} target="_blank" rel="noopener noreferrer" className={cn(btnPrimary, 'h-[52px] text-[17px]')}>
                        S'inscrire{priceSuffix}
                        <ExternalLink aria-hidden="true" size={16} />
                        <span className="sr-only"> (HelloAsso, nouvel onglet)</span>
                      </a>
                      <p className="text-center text-xs text-loom-text-muted">
                        Vous continuez sur HelloAsso pour choisir vos billets et payer en toute sécurité.
                      </p>
                    </>
                  ) : !isTicketed && !isPast && event.registration_url ? (
                    <a href={event.registration_url} target="_blank" rel="noopener noreferrer" className={cn(btnPrimary, 'h-[52px] text-[17px]')}>
                      S'inscrire <ExternalLink aria-hidden="true" size={16} />
                      <span className="sr-only"> (nouvel onglet)</span>
                    </a>
                  ) : null}
                </div>

                {agendaShareButtons("Ajouter à l'agenda")}
                {isClosed && !isPast && closedMessage}
                {memberNote}
              </div>

              {/* Albums photo liés à la soirée (admin Galerie → « Soirée liée ») */}
              {eventAlbums.length > 0 && (
                <section aria-labelledby="h-photos" className="flex flex-col gap-2 rounded-[18px] border border-loom-highlight-border bg-loom-highlight-bg p-5">
                  <h2 id="h-photos" className="text-lg font-extrabold">
                    Les photos de la soirée
                  </h2>
                  <ul className="flex flex-wrap gap-x-4 gap-y-1">
                    {eventAlbums.map((a) => (
                      <li key={a.album_id}>
                        <Link to={`/photos/${encodeURIComponent(a.album_id)}`} className={strongLink}>
                          {a.title || a.album_id} →
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Accès : adresse, itinéraire, plan (si le lieu a pu être géocodé) */}
              <section aria-labelledby="h-acces" className={cn(card, 'flex flex-col gap-4 rounded-[18px] p-5 sm:flex-row sm:p-6')}>
                <div className="flex min-w-0 flex-col gap-2 sm:flex-[1_1_0]">
                  <h2 id="h-acces" className="text-lg font-extrabold">
                    Accès
                  </h2>
                  <p className="text-loom-text-2">{event.location}</p>
                  <a href={directionsUrl(event.location)} target="_blank" rel="noopener noreferrer" className={cn(strongLink, 'self-start')}>
                    Ouvrir l'itinéraire →<span className="sr-only"> (nouvel onglet)</span>
                  </a>
                </div>
                {typeof event.latitude === 'number' && typeof event.longitude === 'number' && (
                  <div className="min-w-0 sm:flex-[1.3_1_0]">
                    <OsmMap latitude={event.latitude} longitude={event.longitude} label={event.location} />
                  </div>
                )}
              </section>

              {/* Réservation (desktop) : widget HelloAsso intégré */}
              {isTicketed && !isPast && (
                <section id="billetterie" aria-labelledby="h-resa" className={cn(card, 'hidden scroll-mt-32 flex-col gap-4 p-6 lg:flex lg:p-8')}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 id="h-resa" className="text-2xl font-extrabold">
                      Réservation
                    </h2>
                    <span className="flex items-center gap-1.5 text-sm text-loom-text-muted">
                      <Lock aria-hidden="true" size={15} /> Paiement sécurisé par HelloAsso
                    </span>
                  </div>
                  {isClosed ? (
                    closedMessage
                  ) : (
                    <>
                      <p className="text-[15px] text-loom-text-2">
                        Choisissez vos billets et payez directement ici, sans quitter le site. HelloAsso vous proposera une
                        contribution volontaire à son fonctionnement : elle est facultative. Vos billets arrivent par e-mail.
                      </p>
                      <HelloAssoWidget ticketing={event} title={event.title} />
                    </>
                  )}
                </section>
              )}
            </article>

            {/* Colonne de droite (desktop), collante */}
            <aside aria-labelledby="h-side" className="hidden min-w-0 flex-[1_1_300px] flex-col gap-3 lg:sticky lg:top-32 lg:flex">
              <div className={cn(card, 'flex flex-col gap-4 p-5 shadow-loom-card')}>
                <div className="flex items-center gap-3.5">
                  <EventDateBlock date={event.date} />
                  <div className="flex min-w-0 flex-col">
                    <h2 id="h-side" className="text-lg font-extrabold">
                      {isPast ? 'Événement passé' : isTicketed || event.registration_url ? "S'inscrire" : 'En pratique'}
                    </h2>
                    <span className="text-sm text-loom-text-muted">
                      {[timeLabel && timeLabel.charAt(0).toUpperCase() + timeLabel.slice(1), countdown].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                </div>

                {isTicketed && !isPast && <TicketInfo ticketing={event} />}

                {!isPast &&
                  (canBook ? (
                    <button type="button" onClick={scrollToBooking} className={cn(btnPrimary, 'h-12 text-base')}>
                      S'inscrire <ArrowDown aria-hidden="true" size={16} />
                    </button>
                  ) : isClosed ? (
                    <span className={cn(btnDisabled, 'h-12')}>{closedLabel(availability)}</span>
                  ) : event.registration_url ? (
                    <a href={event.registration_url} target="_blank" rel="noopener noreferrer" className={cn(btnPrimary, 'h-12 text-base')}>
                      S'inscrire <ExternalLink aria-hidden="true" size={16} />
                      <span className="sr-only"> (nouvel onglet)</span>
                    </a>
                  ) : (
                    <p className="rounded-xl bg-loom-surface-2 p-3 text-center text-sm text-loom-text-2">
                      {free ? 'Entrée libre, pas besoin de réserver.' : 'Aucune inscription requise pour cet événement.'}
                    </p>
                  ))}

                {agendaShareButtons('Ajouter à mon agenda')}
              </div>
              <div className="px-1">{memberNote}</div>
            </aside>
          </div>

          {/* Les autres rendez-vous */}
          {otherEvents.length > 0 && (
            <section aria-labelledby="h-more" className="mt-6 flex flex-col gap-4">
              <h2 id="h-more" className="text-2xl font-extrabold">
                Les autres rendez-vous
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {otherEvents.map((other) => (
                  <Link
                    key={other.id}
                    to={`/events/${other.slug}`}
                    className={cn(card, 'group flex overflow-hidden rounded-[18px] text-loom-text no-underline sm:flex-col', pageFocus)}
                  >
                    <img src={other.image} alt="" loading="lazy" className="h-[88px] w-[88px] flex-none bg-loom-surface-2 object-cover sm:h-[120px] sm:w-full" />
                    <span className="flex min-w-0 flex-col justify-center gap-1 px-4 py-3">
                      <span className="text-[13px] font-bold uppercase tracking-[0.04em] text-loom-accent-text">{formatShortDateTime(other)}</span>
                      <span className="font-extrabold leading-tight group-hover:underline underline-offset-4">{other.title}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />

      {/* Mobile : barre fixe vers HelloAsso (nouvel onglet), quand le bouton du bloc infos n'est plus visible */}
      {canBook && helloAssoUrl && (
        <div
          className={cn(
            'fixed inset-x-0 bottom-0 z-40 border-t border-loom-border bg-loom-surface px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-loom-header transition-transform duration-200 lg:hidden',
            mobileCtaVisible ? 'pointer-events-none translate-y-full' : 'translate-y-0',
          )}
          aria-hidden={mobileCtaVisible}
        >
          <a
            href={helloAssoUrl}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={mobileCtaVisible ? -1 : 0}
            className={cn(btnPrimary, 'h-12 w-full text-base')}
          >
            S'inscrire{priceSuffix}
            <ExternalLink aria-hidden="true" size={16} />
            <span className="sr-only"> (HelloAsso, nouvel onglet)</span>
          </a>
        </div>
      )}
    </div>
  );
};

export default EventDetail;
