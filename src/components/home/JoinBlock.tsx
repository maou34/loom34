import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { container } from '@/components/site/styles';

// Bloc toujours marron (jour comme nuit) : anneau de focus jaune.
const joinFocus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-loom-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-loom-join-bg';

/** « Pourquoi adhérer à LOOM ? » */
export default function JoinBlock({ membershipUrl, partnersCount }: { membershipUrl: string; partnersCount: number | null }) {
  const perks = [
    { big: String(partnersCount ?? 23), text: 'partenaires qui vous font des réductions : bars, saunas, restos…', short: 'partenaires qui vous font des réductions' },
    { big: '−40 %', text: 'jusqu’à 40 % sur la location de véhicule chez FranceCars', short: 'sur la location de véhicule chez FranceCars' },
    { big: 'Tarif réduit', mobileBig: 'Réduit', text: 'sur nos soirées, dîners et sorties', short: 'le tarif de nos soirées et dîners' },
    { big: '150+', text: 'ours avec qui partager apéros, sorties et Pride', short: 'ours pour partager apéros et sorties' },
  ];

  return (
    <section aria-labelledby="join-title" className={cn(container, 'py-10 sm:pb-[72px] sm:pt-14')}>
      <div className="flex flex-wrap items-center gap-6 rounded-[22px] bg-loom-join-bg p-6 text-white sm:gap-10 sm:rounded-[28px] sm:p-11">
        <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-4">
          <h2 id="join-title" className="text-[28px] font-extrabold leading-tight sm:text-[38px] sm:leading-[1.1]">
            Pourquoi adhérer<span className="hidden sm:inline"> à LOOM</span>&nbsp;?
          </h2>
          <p className="hidden text-lg text-loom-join-text sm:block">
            Votre adhésion fait vivre l'association, et votre carte vous ouvre des avantages toute l'année.
          </p>
          <div className="mt-1.5 hidden flex-wrap gap-3 sm:flex">
            <a
              href={membershipUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn('flex h-[52px] items-center rounded-[14px] bg-loom-yellow px-[26px] text-[17px] font-extrabold text-loom-on-yellow', joinFocus)}
            >
              Adhérer maintenant<span className="sr-only"> (nouvel onglet)</span>
            </a>
            <Link
              to="/partners"
              className={cn('flex h-[52px] items-center rounded-[14px] border-[1.5px] border-white/50 px-5 text-[17px] font-semibold text-white hover:bg-white/10', joinFocus)}
            >
              Voir les partenaires
            </Link>
          </div>
        </div>

        <ul className="grid min-w-0 flex-[1_1_420px] grid-cols-1 gap-3.5 sm:grid-cols-2">
          {perks.map((p) => (
            <li
              key={p.big}
              className="grid grid-cols-[96px_1fr] items-baseline gap-3 sm:flex sm:flex-col sm:gap-1.5 sm:rounded-2xl sm:border sm:border-white/15 sm:bg-white/10 sm:p-[18px]"
            >
              <span className="text-xl font-extrabold text-loom-yellow sm:text-[26px]">
                {p.mobileBig ? (
                  <>
                    <span className="sm:hidden">{p.mobileBig}</span>
                    <span className="hidden sm:inline">{p.big}</span>
                  </>
                ) : (
                  p.big
                )}
              </span>
              <span className="text-sm text-loom-join-text sm:text-[15px]">
                <span className="sm:hidden">{p.short}</span>
                <span className="hidden sm:inline">{p.text}</span>
              </span>
            </li>
          ))}
        </ul>

        <a
          href={membershipUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn('flex h-12 w-full items-center justify-center rounded-[14px] bg-loom-yellow text-base font-extrabold text-loom-on-yellow sm:hidden', joinFocus)}
        >
          Adhérer maintenant<span className="sr-only"> (nouvel onglet)</span>
        </a>
      </div>
    </section>
  );
}
