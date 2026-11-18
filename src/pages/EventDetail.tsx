import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useSlugRedirect } from '@/lib/slug';
import { db } from '@/db/client';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, MapPin, Clock, ArrowLeft, Ticket, Share2, ExternalLink } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Tables } from '@/db/types';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { stripMarkdown } from '@/lib/markdown';
import useSEO from '@/hooks/useSEO';
import { generateEventStructuredData } from '@/lib/seo';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { HELLOASSO_BASE_URL } from '@/config';
import {
  closedLabel,
  formatEuros,
  formatPriceSummary,
  formatSaleEnd,
  formatSeatsLabel,
  getCapacity,
  getFillRatio,
  getHelloAssoFormUrl,
  getHelloAssoWidgetUrl,
  getTicketAvailability,
  hasTicketing,
  isBookable,
  parseTicketPrices,
  type TicketingInfo,
} from '@/lib/ticketing';

const HELLOASSO_ORIGIN = new URL(HELLOASSO_BASE_URL).origin;
const IFRAME_DEFAULT_HEIGHT = 750;

/**
 * Widget HelloAsso intégré. HelloAsso envoie la hauteur de son contenu par
 * postMessage ({ height }) ; on l'applique pour éviter une double barre de défilement.
 * À vérifier en sandbox : si aucun message n'arrive, la hauteur par défaut reste.
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
      className="w-full border-0 rounded-xl"
      style={{ height }}
      allow="payment"
      loading="lazy"
    />
  );
};

const EventDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch event details
  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event', slug],
    // Adresse inconnue (PGRST116) : inutile de réessayer, on passe tout de suite à la redirection / 404
    retry: (count, err) => (err as { code?: string })?.code !== 'PGRST116' && count < 3,
    queryFn: async () => {
      const { data, error } = await db
        .from('events')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      return data as Tables<'events'>;
    }
  });

  // SEO Configuration
  useSEO({
    title: event ? `${event.title} - Événement LOOM` : 'Événement - LOOM',
    description: event?.description ? stripMarkdown(event.description).substring(0, 160) : 'Découvrez cet événement de LOOM - Les Ours Occitanie Montpellier',
    keywords: ['LOOM', 'Bears', 'événement', 'rencontre', 'communauté'],
    image: event?.image,
    type: 'website',
    publishedTime: event?.created_at,
    author: 'LOOM'
  });

  // Generate structured data for event
  useEffect(() => {
    if (event) {
      generateEventStructuredData({
        name: event.title,
        description: stripMarkdown(event.description),
        startDate: event.date,
        location: event.location,
        image: event.image,
        url: window.location.href
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

  // Arrivée depuis le bouton « S'inscrire » d'une carte (/events/<slug>#billetterie) :
  // React Router ne fait pas défiler jusqu'à l'ancre, on le fait une fois la page rendue.
  // Sur mobile la section est masquée (barre fixe à la place), scrollIntoView n'y fait rien.
  useEffect(() => {
    if (event && location.hash === '#billetterie') {
      document.getElementById('billetterie')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [event, location.hash]);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex-1 container mx-auto px-4 py-32">
          <div className="max-w-4xl mx-auto space-y-8">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-[400px] w-full rounded-2xl" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              <div className="lg:col-span-1">
                <Skeleton className="h-64 w-full rounded-xl" />
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!event) {
    return null;
  }

  const formattedDate = new Date(event.date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const isTicketed = hasTicketing(event);
  const availability = isTicketed ? getTicketAvailability(event) : null;
  // Complet ou ventes terminées : plus de bouton ni de billetterie.
  const isClosed = isTicketed && !isBookable(availability);
  const saleEndLabel = isTicketed ? formatSaleEnd(event) : null;
  const prices = isTicketed ? parseTicketPrices(event.ticket_prices) : [];
  const priceSummary = isTicketed ? formatPriceSummary(event.ticket_prices) : null;
  const seatsLabel = isTicketed ? formatSeatsLabel(event) : null;
  const fillRatio = isTicketed ? getFillRatio(event) : null;

  const scrollToBooking = () =>
    document.getElementById('billetterie')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const shareCard = (
    <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Share2 className="w-5 h-5 text-orange" />
        Partager
      </h3>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="w-full" onClick={() => {
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank');
        }}>
          Facebook
        </Button>
        <Button variant="outline" className="w-full" onClick={() => {
          navigator.clipboard.writeText(window.location.href);
        }}>
          Copier
        </Button>
      </div>
    </div>
  );

  return (
    <div className={cn("flex flex-col min-h-screen bg-gray-50", isTicketed && "pb-32 lg:pb-0")}>
      <Navbar />

      {/* Hero with Background Image Blur */}
      <div className="relative h-[45vh] min-h-[340px] md:h-[60vh] md:min-h-[500px] flex items-end pb-28 md:pb-12 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={event.image}
            alt={event.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />
        </div>

        <div className="container mx-auto px-4 relative z-10 text-white">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Button
              variant="ghost"
              className="text-white/90 hover:bg-white/20 hover:text-white mb-3 md:mb-8 -ml-4 h-8 md:h-10 text-sm md:text-base"
              onClick={() => navigate('/events')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              <span className="md:hidden">Tous les événements</span>
              <span className="hidden md:inline">Retour aux événements</span>
            </Button>

            <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold mb-4 md:mb-6 leading-tight max-w-4xl">
              {event.title}
            </h1>

            {/* Mobile : une seule pastille date · heure (le lieu est dans « Détails pratiques ») */}
            <span className="md:hidden inline-flex items-center bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/20 text-sm font-medium text-white/90">
              <span className="capitalize">{formattedDate}</span>&nbsp;· {event.time}
            </span>

            <div className="hidden md:flex flex-wrap gap-6 text-lg md:text-xl font-medium text-white/90">
              <span className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10">
                <CalendarDays className="w-5 h-5" />
                <span className="capitalize">{formattedDate}</span>
              </span>
              <span className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10">
                <MapPin className="w-5 h-5" />
                {event.location}
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 -mt-20 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content — après les détails pratiques sur mobile */}
          <div className="lg:col-span-2 order-2 lg:order-1 space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-gray-100"
            >
              <h2 className="text-2xl font-bold mb-8 text-gray-900 border-b pb-4">À propos de l'événement</h2>
              <div className="prose prose-lg prose-orange max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{event.description}</ReactMarkdown>
              </div>
            </motion.div>

            {/* Réservation (ordinateur) : widget HelloAsso intégré */}
            {isTicketed && (
              <motion.section
                id="billetterie"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="hidden lg:block scroll-mt-28 bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-gray-100"
              >
                <h2 className="text-2xl font-bold mb-6 text-gray-900 border-b pb-4">Réservation</h2>
                {isClosed ? (
                  <div className="text-center p-8 bg-gray-50 rounded-xl text-gray-600">
                    {availability === 'closed'
                      ? 'Les inscriptions à cet événement sont closes.'
                      : 'Cet événement est complet.'}
                  </div>
                ) : (
                  <>
                    <p className="text-gray-600 mb-6">
                      Le paiement est sécurisé par HelloAsso. Une contribution volontaire à leur
                      fonctionnement vous sera proposée : elle est facultative. Vos billets arrivent par e-mail.
                    </p>
                    <HelloAssoWidget ticketing={event} title={event.title} />
                  </>
                )}
              </motion.section>
            )}

            <div className="lg:hidden">{shareCard}</div>
          </div>

          {/* Sidebar Info — en premier sur mobile */}
          <div className="lg:col-span-1 order-1 lg:order-2">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="space-y-6 lg:sticky lg:top-24"
            >
              {/* Details Card */}
              <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-6 text-lg">Détails pratiques</h3>
                <ul className="space-y-6">
                  {/* Mobile : date et heure regroupées */}
                  <li className="flex items-start gap-4 lg:hidden">
                    <div className="bg-orange/10 p-3 rounded-xl text-orange">
                      <CalendarDays className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Date et heure</p>
                      <p className="text-gray-600"><span className="capitalize">{formattedDate}</span>, {event.time}</p>
                    </div>
                  </li>
                  <li className="hidden lg:flex items-start gap-4">
                    <div className="bg-orange/10 p-3 rounded-xl text-orange">
                      <CalendarDays className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Date</p>
                      <p className="text-gray-600 capitalize">{formattedDate}</p>
                    </div>
                  </li>
                  <li className="hidden lg:flex items-start gap-4">
                    <div className="bg-orange/10 p-3 rounded-xl text-orange">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Heure</p>
                      <p className="text-gray-600">{event.time}</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-4">
                    <div className="bg-orange/10 p-3 rounded-xl text-orange">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Lieu</p>
                      <p className="text-gray-600">{event.location}</p>
                    </div>
                  </li>
                </ul>

                {isTicketed ? (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    {prices.length > 0 && (
                      <>
                        <h4 className="font-bold text-gray-900 mb-3 hidden lg:flex items-center gap-2">
                          <Ticket className="w-5 h-5 text-orange" /> Tarifs
                        </h4>
                        <ul className="space-y-2 mb-4">
                          {prices.map((price, i) => (
                            <li key={`${price.label}-${i}`} className="flex justify-between gap-4 text-gray-700">
                              <span>{price.label || 'Tarif'}</span>
                              <span className="font-bold text-gray-900 whitespace-nowrap">
                                {price.price_cents === 0 ? 'Gratuit' : formatEuros(price.price_cents)}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {event.ticket_member_discount && (
                          <p className="-mt-2 mb-4 text-sm text-gray-500">
                            Tarif réduit pour les adhérents, avec le code promo LOOM.
                          </p>
                        )}
                      </>
                    )}

                    {seatsLabel && (
                      <div className="mb-6">
                        <div className="flex justify-between items-baseline text-sm mb-2">
                          <span
                            className={cn(
                              "font-bold",
                              availability === 'almost_full' ? "text-orange-800" : isClosed ? "text-gray-700" : "text-gray-600"
                            )}
                          >
                            {seatsLabel}
                          </span>
                          {getCapacity(event) && !isClosed && (
                            <span className="text-gray-500">sur {getCapacity(event)}</span>
                          )}
                        </div>
                        {fillRatio !== null && availability !== 'closed' && (
                          <div
                            className="h-2 rounded-full bg-gray-100 overflow-hidden"
                            role="progressbar"
                            aria-label="Places vendues"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.round(fillRatio * 100)}
                          >
                            <div
                              className={cn("h-full rounded-full", isClosed ? "bg-gray-400" : "bg-orange")}
                              style={{ width: `${fillRatio * 100}%` }}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {saleEndLabel && (
                      <p className="mb-6 flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4 text-orange flex-shrink-0" /> {saleEndLabel}
                      </p>
                    )}

                    {/* Ordinateur : renvoie vers le widget intégré ; sur mobile, c'est la barre fixe */}
                    <Button
                      className={cn(
                        "w-full h-12 text-lg hidden lg:flex",
                        isClosed ? "" : "bg-brown hover:bg-brown-light text-white shadow-lg shadow-brown/20"
                      )}
                      variant={isClosed ? 'outline' : 'default'}
                      disabled={isClosed}
                      onClick={scrollToBooking}
                    >
                      <Ticket className="mr-2 h-5 w-5" /> {isClosed ? closedLabel(availability) : "S'inscrire"}
                    </Button>
                  </div>
                ) : (
                  <div className="mt-8 pt-6 border-t border-gray-100">
                    {event.registration_url ? (
                      <Button className="w-full bg-brown hover:bg-brown-light text-white h-12 text-lg shadow-lg shadow-brown/20" asChild>
                        <a href={event.registration_url} target="_blank" rel="noopener noreferrer">
                          <Ticket className="mr-2 h-5 w-5" /> S'inscrire
                        </a>
                      </Button>
                    ) : (
                      <div className="text-center p-4 bg-gray-50 rounded-xl text-gray-500 text-sm">
                        Aucune inscription requise pour cet événement
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="hidden lg:block">{shareCard}</div>
            </motion.div>
          </div>
        </div>
      </div>

      <Footer />

      {/* Mobile : barre fixe qui ouvre HelloAsso en plein écran */}
      {isTicketed && (
        <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {isClosed ? (
            <Button className="w-full h-12 text-base" variant="outline" disabled>
              {closedLabel(availability)}
            </Button>
          ) : (
            <>
              <Button className="w-full h-12 text-base bg-brown hover:bg-brown-light text-white" asChild>
                <a href={getHelloAssoFormUrl(event)} target="_blank" rel="noopener noreferrer">
                  S'inscrire{priceSummary ? ` · ${priceSummary.charAt(0).toLowerCase()}${priceSummary.slice(1)}` : ''}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <p className="mt-2 text-center text-xs text-gray-500">
                Vous continuez sur HelloAsso pour choisir vos billets et payer en toute sécurité.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default EventDetail;
