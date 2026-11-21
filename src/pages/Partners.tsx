import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ArrowUpRight, Store } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { btnSecondary, card, container, pageFocus, strongLink } from '@/components/site/styles';
import useSEO from '@/hooks/useSEO';
import { useExternalLinks } from '@/hooks/useSiteSettings';
import { cn } from '@/lib/utils';
import { directionsUrl } from '@/lib/eventPlace';
import { usePartnerCategories, usePartners, type Partner } from '@/lib/partners';

const PAGE_SIZE = 9;

/**
 * Logo du partenaire, toujours sur fond blanc (lisible en mode nuit) :
 * logos larges en « contain » avec marge, logos carrés en « cover ».
 */
function PartnerLogo({ partner }: { partner: Partner }) {
  const [wide, setWide] = useState(true);
  if (!partner.logo) {
    return (
      <span aria-hidden="true" className="flex h-20 w-20 flex-none items-center justify-center rounded-2xl bg-loom-chip-bg text-loom-chip-fg">
        <Store size={30} strokeWidth={1.6} />
      </span>
    );
  }
  return (
    <span className="flex h-20 w-20 flex-none items-center justify-center overflow-hidden rounded-2xl border border-loom-border bg-white">
      <img
        src={partner.logo}
        alt={`Logo ${partner.name}`}
        loading="lazy"
        onLoad={(e) => {
          const img = e.currentTarget;
          setWide(img.naturalWidth / Math.max(1, img.naturalHeight) > 1.25);
        }}
        className={cn('h-full w-full', wide ? 'object-contain p-2' : 'object-cover')}
      />
    </span>
  );
}

function PartnerCard({ partner }: { partner: Partner }) {
  const meta = [partner.type, partner.city].filter(Boolean).join(' · ');
  const place = [partner.name, partner.address, partner.address && partner.city && !partner.address.includes(partner.city) ? partner.city : null]
    .filter(Boolean)
    .join(', ');
  return (
    <li className={cn(card, 'flex flex-col gap-4 rounded-[18px] p-5')}>
      <div className="flex items-center gap-4">
        <PartnerLogo partner={partner} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="text-lg font-extrabold leading-tight">{partner.name}</h3>
          {meta && <p className="text-[15px] text-loom-text-muted">{meta}</p>}
        </div>
      </div>
      {partner.description && (
        <div className="flex flex-col gap-1 rounded-xl border border-loom-highlight-border bg-loom-highlight-bg p-3.5">
          <span className="text-xs font-bold uppercase tracking-[0.06em] text-loom-highlight-label">Avantage adhérent</span>
          <p className="font-bold">{partner.description}</p>
        </div>
      )}
      {(partner.website || partner.address) && (
        <div className="mt-auto flex flex-wrap gap-x-5 gap-y-1">
          {partner.website && (
            <a href={partner.website} target="_blank" rel="noopener noreferrer" className={cn(strongLink, 'inline-flex items-center gap-1')}>
              Site web <ArrowUpRight aria-hidden="true" size={15} />
              <span className="sr-only"> de {partner.name} (nouvel onglet)</span>
            </a>
          )}
          {partner.address && (
            <a href={directionsUrl(place)} target="_blank" rel="noopener noreferrer" className={strongLink}>
              Itinéraire<span className="sr-only"> vers {partner.name} (nouvel onglet)</span>
            </a>
          )}
        </div>
      )}
    </li>
  );
}

const Partners = () => {
  useSEO({
    title: 'Partenaires - LOOM | Les avantages adhérents',
    description:
      "Bars, restaurants, saunas, hébergements, boutiques : les partenaires de LOOM offrent des avantages aux adhérents sur présentation de la carte, à Montpellier, Nîmes et ailleurs.",
    keywords: ['LOOM partenaires', 'avantages adhérents', 'bars Bear Montpellier', 'sauna gay Montpellier', 'Nîmes'],
    type: 'website',
  });

  const { data: partners = [], isLoading } = usePartners();
  const { data: allCategories = [] } = usePartnerCategories();
  const { membershipUrl } = useExternalLinks();
  const [searchParams, setSearchParams] = useSearchParams();
  const [limit, setLimit] = useState(PAGE_SIZE);

  // Filtres : seulement les catégories et villes réellement utilisées
  const categories = useMemo(() => {
    const used = new Set(partners.map((p) => p.category_id).filter(Boolean));
    return allCategories.filter((c) => used.has(c.id));
  }, [partners, allCategories]);
  const cities = useMemo(
    () => [...new Set(partners.map((p) => p.city?.trim()).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b, 'fr')),
    [partners],
  );
  const activeCategory = categories.find((c) => c.name === searchParams.get('categorie')) ?? null;
  const cityParam = searchParams.get('ville');
  const activeCity = cityParam && cities.includes(cityParam) ? cityParam : null;

  const filtered = partners.filter(
    (p) => (!activeCategory || p.category_id === activeCategory.id) && (!activeCity || p.city?.trim() === activeCity),
  );
  const visible = filtered.slice(0, limit);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
    setLimit(PAGE_SIZE);
  };

  return (
    <div className="flex min-h-screen flex-col bg-loom-bg text-loom-text">
      <Navbar />

      <main className={cn(container, 'flex flex-1 flex-col gap-6 pb-16 pt-6 sm:gap-7 sm:pb-[72px] sm:pt-10')}>
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex min-w-0 flex-[2_1_420px] flex-col gap-2">
            <h1 className="text-[34px] font-extrabold tracking-[-0.02em] sm:text-[44px]">Partenaires</h1>
            <p className="max-w-[640px] text-base text-loom-text-2 sm:text-lg">
              {partners.length || 'Nos'} établissements soutiennent LOOM et offrent des avantages aux adhérents, sur présentation de la carte LOOM.
            </p>
          </div>
          <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3 rounded-[22px] bg-loom-join-bg p-6 text-white">
            <h2 className="text-lg font-extrabold">Pas encore de carte ?</h2>
            <p className="text-loom-join-text">L'adhésion se rentabilise vite avec ces réductions.</p>
            <a
              href={membershipUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 items-center self-start rounded-xl bg-loom-yellow px-5 font-extrabold text-loom-on-yellow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-loom-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-loom-join-bg"
            >
              Adhérer<span className="sr-only"> (nouvel onglet)</span>
            </a>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {categories.length > 1 && (
            <div role="group" aria-label="Filtrer par catégorie" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              {[null, ...categories].map((c) => {
                const pressed = (activeCategory?.id ?? null) === (c?.id ?? null);
                return (
                  <button
                    key={c?.id ?? 'all'}
                    type="button"
                    aria-pressed={pressed}
                    onClick={() => setParam('categorie', c?.name ?? null)}
                    className={cn(
                      'h-10 flex-none rounded-full border px-4 text-[15px] font-semibold',
                      pressed ? 'border-loom-primary-bg bg-loom-primary-bg text-loom-primary-fg' : 'border-loom-border-strong bg-loom-surface text-loom-text hover:border-loom-text-muted',
                      pageFocus,
                    )}
                  >
                    {c?.name ?? 'Tous'}
                  </button>
                );
              })}
            </div>
          )}
          {cities.length > 1 && (
            <label className="flex h-11 items-center gap-2 rounded-xl border border-loom-border-strong bg-loom-surface pl-4 pr-2 text-[15px]">
              <span className="text-loom-text-muted">Ville</span>
              <select
                value={activeCity ?? ''}
                onChange={(e) => setParam('ville', e.target.value || null)}
                className={cn('h-9 rounded-lg bg-transparent pr-1 font-semibold text-loom-text', pageFocus)}
              >
                <option value="">Toutes</option>
                {cities.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        {isLoading ? (
          <div aria-hidden="true" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className={cn(card, 'h-[260px] animate-pulse bg-loom-surface-2')} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className={cn(card, 'p-6 text-loom-text-muted')}>Aucun partenaire ne correspond à ces filtres.</p>
        ) : (
          <section aria-label="Liste des partenaires" className="flex flex-col gap-6">
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((p) => (
                <PartnerCard key={p.id} partner={p} />
              ))}
            </ul>
            {filtered.length > visible.length && (
              <button type="button" onClick={() => setLimit(filtered.length)} className={cn(btnSecondary, 'h-12 self-center rounded-full px-6')}>
                Voir les {filtered.length - visible.length} autres partenaires
              </button>
            )}
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Partners;
