import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UserRound } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BearDivider from '@/components/site/BearDivider';
import SectionHeader from '@/components/site/SectionHeader';
import { card, container, pageFocus } from '@/components/site/styles';
import useSEO from '@/hooks/useSEO';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { cn } from '@/lib/utils';
import { DEFAULT_CTA, DEFAULT_INTRO, cubLabel, cubsOf, parseSteps, useEditions, type Edition } from '@/lib/monsieurOurs';

const FALLBACK_GROUP_PHOTO = '/gallery/images/Mr-ours-2026_gagnants.jpg';

/**
 * Portraits du palmarès : photos verticales, visage dans le haut (plus ou moins
 * bas selon la photo). Le cadre est plus large que haut ; centrer l'image
 * montrait l'écharpe et coupait le visage. On cadre à 12 % du haut, et sur
 * ordinateur les cartes font 400 px de haut (au lieu de 320) pour montrer plus
 * de la moitié de la photo : assez pour tous les visages du palmarès.
 */
const portraitImg = 'absolute inset-0 h-full w-full object-cover object-[50%_12%]';

// Fond toujours sombre : anneau de focus jaune
const darkFocus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-loom-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-loom-band-dark-bg';

function PhotoPlaceholder({ dark }: { dark?: boolean }) {
  return (
    <div
      role="img"
      aria-label="Photo à venir"
      className={cn('flex h-full w-full flex-col items-center justify-center gap-2', dark ? 'bg-white/10 text-loom-yellow' : 'bg-loom-chip-bg text-loom-chip-fg')}
    >
      <UserRound aria-hidden="true" size={40} strokeWidth={1.6} />
      <span className="text-xs font-bold">Photo à venir</span>
    </div>
  );
}

/** Une année du palmarès : grande carte du lauréat + 2 cartes deux fois moins larges pour les oursons. */
function EditionRow({ edition, current }: { edition: Edition; current: boolean }) {
  const cubs = cubsOf(edition);
  return (
    <li id={`mo-${edition.year}`} aria-labelledby={`y-${edition.year}`} className="flex scroll-mt-28 flex-col gap-3">
      <div className="flex items-center gap-3">
        <h3 id={`y-${edition.year}`} className="text-[28px] font-extrabold text-loom-title-accent">
          {edition.year}
        </h3>
        {current && <span className="rounded-full bg-loom-yellow px-2.5 py-0.5 text-xs font-extrabold text-loom-on-yellow">En titre</span>}
        <span aria-hidden="true" className="h-px flex-1 bg-loom-border-strong" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <figure className="col-span-2 m-0 flex flex-col overflow-hidden rounded-[18px] bg-loom-band-dark-bg text-white">
          <div className="relative h-[300px] lg:h-auto lg:min-h-[400px] lg:flex-1">
            {edition.image ? (
              <img src={edition.image} alt={`${edition.title}, Monsieur Ours ${edition.year}`} loading="lazy" className={portraitImg} />
            ) : (
              <PhotoPlaceholder dark />
            )}
          </div>
          <figcaption className="flex flex-col gap-0.5 p-4 sm:px-5">
            <span className="text-xs font-bold uppercase tracking-[0.06em] text-loom-yellow">Monsieur Ours {edition.year}</span>
            <span className="text-xl font-extrabold">{edition.title}</span>
            {edition.description && <span className="text-sm text-loom-band-dark-text">{edition.description}</span>}
          </figcaption>
        </figure>
        {cubs.map((cub) => (
          <figure key={cub.rank} className={cn(card, 'm-0 flex flex-col overflow-hidden rounded-[18px]')}>
            <div className="relative aspect-[4/5] lg:aspect-auto lg:min-h-[400px] lg:flex-1">
              {cub.photo ? (
                <img src={cub.photo} alt={`${cub.name}, ${cubLabel(cub.rank)} ${edition.year}`} loading="lazy" className={portraitImg} />
              ) : (
                <PhotoPlaceholder />
              )}
            </div>
            <figcaption className="flex flex-col gap-0.5 p-3 sm:p-4">
              <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-loom-accent-text">{cubLabel(cub.rank)} {edition.year}</span>
              <span className="font-extrabold leading-tight">{cub.name}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </li>
  );
}

const MonsieurOurs = () => {
  useSEO({
    title: 'Monsieur Ours - LOOM | Le palmarès depuis 2018',
    description:
      "Monsieur Ours et ses oursons, élus chaque année en juin lors de la Montpell'Bears par la communauté Bear de Montpellier. Le palmarès depuis 2018.",
    keywords: ['Monsieur Ours', 'Mister Bear', 'Montpellier', "Montpell'Bears", 'LOOM', 'oursons'],
    type: 'website',
  });

  const { data: settings } = useSiteSettings();
  const { data: editions = [], isLoading } = useEditions();
  const { hash } = useLocation();

  // Arrivée sur /monsieur-ours#palmares (bandeau de l'accueil) ou #mo-<année> :
  // React Router ne défile pas jusqu'à l'ancre, on le fait une fois le palmarès chargé.
  useEffect(() => {
    if (!hash || isLoading) return;
    const timer = window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 100);
    return () => window.clearTimeout(timer);
  }, [hash, isLoading]);
  const current = editions[0] ?? null;
  const firstYear = editions.length ? editions[editions.length - 1].year : null;
  const steps = parseSteps(settings?.monsieur_ours_steps);
  const nextYear = (current?.year ?? new Date().getFullYear()) + 1;
  // Les anciennes adresses /gallery/… enregistrées dans l'admin pointent vers /photos/…
  const photosUrl = (settings?.monsieur_ours_photos_url || '/photos').replace(/^\/gallery(?=\/|$)/, '/photos');
  const photosExternal = /^https?:\/\//i.test(photosUrl);

  return (
    <div className="flex min-h-screen flex-col bg-loom-bg text-loom-text">
      <Navbar />

      <main className="flex-1">
        {/* Hero : photo de groupe + lauréat en titre */}
        <section aria-labelledby="mo-title" className={cn(container, 'pb-10 pt-6 sm:pb-14 sm:pt-10')}>
          <div className="flex flex-col overflow-hidden rounded-[22px] bg-loom-band-dark-bg text-white lg:flex-row">
            <img
              src={settings?.monsieur_ours_hero_image || FALLBACK_GROUP_PHOTO}
              alt={`Photo de groupe : Monsieur Ours${current ? ` ${current.year}` : ''} et ses oursons, avec leurs écharpes`}
              className="h-[260px] w-full object-cover sm:h-[360px] lg:h-auto lg:min-h-[400px] lg:w-[55%]"
              fetchPriority="high"
            />
            <div className="flex flex-col justify-center gap-3.5 p-6 sm:p-10">
              <span className="text-sm font-bold uppercase tracking-[0.06em] text-loom-yellow">
                Monsieur Ours {current?.year ?? ''}
              </span>
              <h1 id="mo-title" className="text-[32px] font-extrabold leading-[1.1] sm:text-[44px]">
                {current?.title ?? 'Monsieur Ours'}
              </h1>
              <p className="text-base text-loom-band-dark-text sm:text-lg">{DEFAULT_INTRO}</p>
              {settings?.monsieur_ours_intro && <p className="text-base text-loom-band-dark-text">{settings.monsieur_ours_intro}</p>}
              {photosExternal ? (
                <a href={photosUrl} target="_blank" rel="noopener noreferrer" className={cn('mt-1 flex h-12 items-center self-start rounded-[14px] bg-white px-5 font-bold text-loom-on-yellow', darkFocus)}>
                  Les photos de l'élection<span className="sr-only"> (nouvel onglet)</span>
                </a>
              ) : (
                <Link to={photosUrl} className={cn('mt-1 flex h-12 items-center self-start rounded-[14px] bg-white px-5 font-bold text-loom-on-yellow', darkFocus)}>
                  Les photos de l'élection
                </Link>
              )}
            </div>
          </div>
        </section>

        <BearDivider />

        {/* Comment ça marche ? */}
        <section aria-labelledby="h-how" className={cn(container, 'flex flex-col gap-6 py-10 sm:py-14')}>
          <SectionHeader id="h-how" title="Comment ça marche ?" subtitle="Chaque année, la communauté élit Monsieur Ours et ses oursons pour la représenter." />
          <ol className="grid gap-4 md:grid-cols-3">
            {steps.map((step, i) => (
              <li key={i} className={cn(card, 'flex flex-col gap-2 rounded-[18px] p-5')}>
                <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-full bg-loom-primary-bg font-extrabold text-loom-primary-fg">
                  {i + 1}
                </span>
                {step.when && <span className="text-xs font-bold uppercase tracking-[0.06em] text-loom-accent-text">{step.when}</span>}
                <h3 className="text-lg font-extrabold">{step.title}</h3>
                {step.text && <p className="text-[15px] text-loom-text-2">{step.text}</p>}
              </li>
            ))}
          </ol>
        </section>

        <BearDivider />

        {/* Palmarès */}
        <section id="palmares" aria-labelledby="h-wins" className={cn(container, 'flex scroll-mt-24 flex-col gap-6 py-10 sm:py-14')}>
          <SectionHeader
            id="h-wins"
            title="Le palmarès"
            subtitle={firstYear ? `Tous nos Monsieur Ours depuis la première élection en ${firstYear}.` : undefined}
          />
          {editions.length > 1 && (
            <nav aria-label="Aller à une année" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              {editions.map((e) => (
                <a
                  key={e.id}
                  href={`#mo-${e.year}`}
                  className={cn('flex h-10 flex-none items-center rounded-full border border-loom-border-strong bg-loom-surface px-4 text-[15px] font-semibold text-loom-text hover:border-loom-text-muted', pageFocus)}
                >
                  {e.year}
                </a>
              ))}
            </nav>
          )}
          {isLoading ? (
            <div aria-hidden="true" className={cn(card, 'h-[420px] animate-pulse bg-loom-surface-2')} />
          ) : (
            <ol className="flex flex-col gap-9">
              {editions.map((e, i) => (
                <EditionRow key={e.id} edition={e} current={i === 0} />
              ))}
            </ol>
          )}
        </section>

        {/* Appel à candidatures */}
        <section aria-labelledby="h-cand" className={cn(container, 'pb-16 sm:pb-[72px]')}>
          <div className="flex flex-wrap items-center justify-between gap-5 rounded-[22px] bg-loom-join-bg p-6 text-white sm:p-8">
            <div className="flex flex-col gap-1.5">
              <h2 id="h-cand" className="text-2xl font-extrabold sm:text-[28px]">
                Et si c'était toi en {nextYear} ?
              </h2>
              <p className="text-loom-join-text">{settings?.monsieur_ours_cta || DEFAULT_CTA}</p>
            </div>
            <Link
              to="/about#contact"
              className="flex h-12 items-center rounded-[14px] bg-loom-yellow px-6 font-extrabold text-loom-on-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-loom-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-loom-join-bg"
            >
              Je suis intéressé
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default MonsieurOurs;
