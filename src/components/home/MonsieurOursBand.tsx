import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import { container } from '@/components/site/styles';

type MonsieurOursBandProps = {
  /** Photo de groupe (Monsieur Ours + oursons) */
  photo: string;
  year: number | null;
  name: string | null;
  /** Première année du palmarès, pour « Le palmarès depuis 2018 » */
  firstYear: number | null;
};

// Bandeau toujours sombre : anneau de focus jaune.
const bandFocus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-loom-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-loom-band-dark-bg';

/** Bandeau sombre « Monsieur Ours » en bas de l'accueil. */
export default function MonsieurOursBand({ photo, year, name, firstYear }: MonsieurOursBandProps) {
  return (
    <>
      <div aria-hidden="true" className="h-1.5 bg-bear" />
      <section aria-labelledby="mo-title" className="bg-loom-band-dark-bg text-white">
        <div className={cn(container, 'flex flex-wrap items-center gap-6 py-10 sm:gap-10 sm:py-16')}>
          <img
            src={photo}
            alt={`Monsieur Ours${year ? ` ${year}` : ''} et ses oursons, avec leurs écharpes`}
            loading="lazy"
            className="h-[220px] w-full min-w-0 flex-[1_1_400px] rounded-[18px] object-cover sm:h-[340px] sm:rounded-[22px]"
          />
          <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-3 sm:gap-3.5">
            <span className="text-sm font-bold uppercase tracking-[0.06em] text-loom-yellow">
              Monsieur Ours{year ? ` ${year}` : ''}
            </span>
            <h2 id="mo-title" className="text-[28px] font-extrabold leading-[1.1] sm:text-[38px]">
              {name ?? 'Monsieur Ours'}
            </h2>
            <p className="text-base text-loom-band-dark-text sm:text-lg">
              <span className="sm:hidden">Élu chaque année en juin lors de la Montpell'Bears.</span>
              <span className="hidden sm:inline">
                Chaque année en juin, lors de la Montpell'Bears, la communauté élit Monsieur Ours et ses oursons pour la
                représenter.
              </span>
            </p>
            <Link
              to="/monsieur-ours#palmares"
              className={cn(
                'mt-1.5 flex h-12 items-center justify-center rounded-[14px] bg-white px-5 font-bold text-loom-on-yellow sm:self-start',
                bandFocus,
              )}
            >
              <span>
                Le palmarès<span className="hidden sm:inline">{firstYear ? ` depuis ${firstYear}` : ''}</span>
              </span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
