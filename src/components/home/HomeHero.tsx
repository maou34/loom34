import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import { btnPrimary, btnSecondary, container } from '@/components/site/styles';
import FeaturedCard, { type FeaturedItem } from './FeaturedCard';

type HomeHeroProps = {
  featured: FeaturedItem | null;
  featuredLoading: boolean;
  membershipUrl: string;
  partnersCount: number | null;
};

const TITLE_LINES: [string, string][] = [
  ['L', 'es'],
  ['O', 'urs'],
  ['O', 'ccitanie'],
  ['M', 'ontpellier'],
];

/**
 * Titre en acrostiche : les initiales L·O·O·M dans une colonne de largeur fixe
 * pour qu'elles restent alignées malgré leurs largeurs différentes.
 */
function LoomTitle() {
  return (
    <h1
      id="hero-title"
      aria-label="Les Ours Occitanie Montpellier"
      className="grid grid-cols-[0.9em_auto] items-baseline justify-start gap-x-[0.07em] gap-y-1.5 text-[44px] font-extrabold leading-none tracking-[0.035em] sm:text-[64px]"
    >
      {TITLE_LINES.map(([initial, rest], i) => (
        <span key={i} className="contents">
          <span aria-hidden="true" className="text-center text-loom-initial">
            {initial}
          </span>
          <span aria-hidden="true" className={i === 3 ? 'text-loom-title-accent' : undefined}>
            {rest}
          </span>
        </span>
      ))}
    </h1>
  );
}

export default function HomeHero({ featured, featuredLoading, membershipUrl, partnersCount }: HomeHeroProps) {
  const stats = [
    { value: '150+', label: 'membres actifs', short: 'membres' },
    { value: '50+', label: 'événements par an', short: 'événements/an' },
    { value: String(partnersCount ?? 23), label: 'partenaires', short: 'partenaires' },
  ];

  return (
    <section
      aria-labelledby="hero-title"
      className={cn(container, 'flex flex-wrap items-center gap-8 pb-10 pt-8 sm:gap-12 sm:pb-[72px] sm:pt-16')}
    >
      <div className="flex min-w-0 flex-[1_1_460px] flex-col gap-5 sm:gap-[22px]">
        <span className="self-start rounded-full border border-loom-highlight-border bg-loom-highlight-bg px-3 py-1.5 text-sm font-semibold text-loom-highlight-label">
          Association Bear <span className="hidden sm:inline">à Montpellier </span>depuis 2017
        </span>
        <LoomTitle />
        <p className="max-w-[520px] text-[17px] text-loom-text-2 sm:text-[19px]">
          Un espace inclusif pour les Bears et tous ceux qui aiment les ours
          <span className="hidden sm:inline">, les poils et la convivialité</span>, du XS au XXXXXL.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
          <a
            href={membershipUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(btnPrimary, 'h-[52px] rounded-[14px] px-[26px] text-[17px]')}
          >
            <span>
              Adhérer<span className="hidden sm:inline"> à LOOM</span>
              <span className="sr-only"> (nouvel onglet)</span>
            </span>
          </a>
          <Link to="/events" className={cn(btnSecondary, 'h-[52px] rounded-[14px] px-[22px] text-[17px]')}>
            Voir l'agenda
          </Link>
        </div>
        <dl className="mt-1 grid grid-cols-3 gap-2.5 sm:mt-2 sm:flex sm:flex-wrap sm:gap-8">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center rounded-2xl border border-loom-border bg-loom-surface py-3 sm:items-start sm:border-0 sm:bg-transparent sm:py-0"
            >
              <dt className="order-2 text-[13px] text-loom-text-muted sm:text-sm">
                <span className="sm:hidden">{s.short}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </dt>
              <dd className="text-[22px] font-extrabold text-loom-stat sm:text-[28px]">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="min-w-0 flex-[1_1_400px]">
        <FeaturedCard item={featured} isLoading={featuredLoading} />
      </div>
    </section>
  );
}
