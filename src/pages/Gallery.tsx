import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ArrowRight, Camera, ImageIcon } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { btnPrimary, btnSecondary, card, container, pageFocus } from '@/components/site/styles';
import useSEO from '@/hooks/useSEO';
import { cn } from '@/lib/utils';
import { useAlbums, type Album } from '@/lib/albums';

const PAGE_SIZE = 9;

function AlbumCover({ album, className }: { album: Album; className?: string }) {
  if (album.cover) return <img src={album.cover} alt="" loading="lazy" className={cn('bg-loom-surface-2 object-cover', className)} />;
  return (
    <span aria-hidden="true" className={cn('flex items-center justify-center bg-loom-chip-bg text-loom-chip-fg', className)}>
      <ImageIcon size={36} strokeWidth={1.6} />
    </span>
  );
}

const photosLabel = (n: number) => `${n} photo${n > 1 ? 's' : ''}`;

const Gallery = () => {
  useSEO({
    title: 'Photos - LOOM | Les albums de nos soirées',
    description: 'Les albums photo des soirées de LOOM - Les Ours Occitanie Montpellier : apéros, Montpell\'Bears, Pride, dîners… Un album par événement.',
    keywords: ['LOOM photos', 'galerie', 'soirées Bear', 'Montpellier', "Montpell'Bears"],
    type: 'website',
  });

  const { data: albums = [], isLoading, isError } = useAlbums();
  const [searchParams, setSearchParams] = useSearchParams();
  const [limit, setLimit] = useState(PAGE_SIZE);

  const years = useMemo(() => [...new Set(albums.map((a) => a.year).filter((y): y is number => y !== null))].sort((a, b) => b - a), [albums]);
  const yearParam = Number(searchParams.get('annee'));
  const activeYear = years.includes(yearParam) ? yearParam : null;
  const filtered = activeYear ? albums.filter((a) => a.year === activeYear) : albums;
  // « Dernier album » en grand seulement sans filtre
  const [lead, ...rest] = activeYear ? [null, ...filtered] : filtered;
  const visible = rest.slice(0, limit);

  const selectYear = (year: number | null) => {
    const next = new URLSearchParams(searchParams);
    if (year) next.set('annee', String(year));
    else next.delete('annee');
    setSearchParams(next, { replace: true });
    setLimit(PAGE_SIZE);
  };

  return (
    <div className="flex min-h-screen flex-col bg-loom-bg text-loom-text">
      <Navbar />

      <main className={cn(container, 'flex flex-1 flex-col gap-6 pb-16 pt-6 sm:gap-7 sm:pb-[72px] sm:pt-10')}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[34px] font-extrabold tracking-[-0.02em] sm:text-[44px]">Photos</h1>
            <p className="text-base text-loom-text-2 sm:text-lg">Les souvenirs de nos soirées, un album par événement.</p>
          </div>
          {years.length > 1 && (
            <div role="group" aria-label="Filtrer par année" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
              {[null, ...years].map((y) => {
                const pressed = activeYear === y;
                return (
                  <button
                    key={y ?? 'all'}
                    type="button"
                    aria-pressed={pressed}
                    onClick={() => selectYear(y)}
                    className={cn(
                      'h-10 flex-none rounded-full border px-4 text-[15px] font-semibold',
                      pressed ? 'border-loom-primary-bg bg-loom-primary-bg text-loom-primary-fg' : 'border-loom-border-strong bg-loom-surface text-loom-text hover:border-loom-text-muted',
                      pageFocus,
                    )}
                  >
                    {y ?? 'Tous'}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {isLoading ? (
          <div aria-hidden="true" className="flex flex-col gap-6">
            <div className={cn(card, 'h-[360px] animate-pulse bg-loom-surface-2')} />
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className={cn(card, 'h-[280px] animate-pulse bg-loom-surface-2')} />
              ))}
            </div>
          </div>
        ) : isError ? (
          <p className={cn(card, 'p-6 text-loom-text-muted')}>Les albums n'ont pas pu être chargés. Réessayez dans un instant.</p>
        ) : (
          <>
            {lead && (
              <Link
                to={`/photos/${encodeURIComponent(lead.id)}`}
                className={cn('group relative flex h-[300px] overflow-hidden rounded-[22px] text-white no-underline sm:h-[400px]', pageFocus)}
              >
                <AlbumCover album={lead} className="absolute inset-0 h-full w-full transition-transform duration-500 group-hover:scale-[1.02]" />
                <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <span className="relative mt-auto flex w-full flex-wrap items-end justify-between gap-4 p-5 sm:p-8">
                  <span className="flex flex-col gap-2">
                    <span className="self-start rounded-full bg-loom-yellow px-2.5 py-0.5 text-xs font-extrabold text-loom-on-yellow">Dernier album</span>
                    <span className="text-2xl font-extrabold leading-tight sm:text-[34px]">{lead.title}</span>
                    <span className="text-sm text-white/85 sm:text-base">{[lead.dateLabel, photosLabel(lead.count)].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span aria-hidden="true" className="flex h-11 items-center gap-1.5 rounded-xl bg-white px-4 font-bold text-loom-on-yellow">
                    Voir l'album <ArrowRight size={16} />
                  </span>
                </span>
              </Link>
            )}

            <section aria-labelledby="h-albums" className="flex flex-col gap-5">
              <h2 id="h-albums" className="text-2xl font-extrabold">
                {activeYear ? `Albums ${activeYear}` : 'Tous les albums'}
              </h2>
              {filtered.length === 0 ? (
                <p className={cn(card, 'p-6 text-loom-text-muted')}>Aucun album pour le moment.</p>
              ) : (
                <ul className="grid gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
                  {visible.map((album) => (
                    <li key={album.id}>
                      <Link to={`/photos/${encodeURIComponent(album.id)}`} className={cn('group flex flex-col gap-2.5 rounded-[18px] text-loom-text no-underline', pageFocus)}>
                        <span className="relative block overflow-hidden rounded-[18px]">
                          <AlbumCover album={album} className="aspect-[4/3] w-full transition-transform duration-500 group-hover:scale-[1.03]" />
                          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold text-white">
                            <Camera aria-hidden="true" size={13} />
                            <span className="sr-only">{photosLabel(album.count)}</span>
                            <span aria-hidden="true">{album.count}</span>
                          </span>
                        </span>
                        <span className="flex flex-col gap-0.5 px-1">
                          <span className="text-lg font-extrabold leading-tight group-hover:underline group-hover:underline-offset-4">{album.title}</span>
                          {album.dateLabel && <span className="text-sm text-loom-text-muted">{album.dateLabel}</span>}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {rest.length > visible.length && (
                <button type="button" onClick={() => setLimit((n) => n + PAGE_SIZE)} className={cn(btnSecondary, 'h-12 self-center rounded-full px-6')}>
                  Afficher plus d'albums
                </button>
              )}
            </section>
          </>
        )}

        <aside aria-labelledby="h-share" className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-loom-highlight-border bg-loom-highlight-bg p-6 sm:px-8">
          <div className="flex max-w-[640px] flex-col gap-1">
            <h2 id="h-share" className="text-xl font-extrabold">
              Vous avez pris de belles photos ?
            </h2>
            <p className="text-loom-text-2">Envoyez-les-nous, on les ajoute à l'album. Une photo de vous vous dérange ? Écrivez-nous, on la retire.</p>
          </div>
          <Link to="/about#contact" className={cn(btnPrimary, 'h-11 px-5')}>
            Nous écrire
          </Link>
        </aside>
      </main>

      <Footer />
    </div>
  );
};

export default Gallery;
