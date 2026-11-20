import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, ChevronLeft } from 'lucide-react';
import { db } from '@/db/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PhotoLightbox from '@/components/gallery/PhotoLightbox';
import { btnSecondary, card, container, pageFocus, strongLink } from '@/components/site/styles';
import useSEO from '@/hooks/useSEO';
import { cn } from '@/lib/utils';
import { useAlbumImages, useAlbums } from '@/lib/albums';

/** Un album : grille simple des photos + visionneuse accessible au clavier. */
const AlbumDetail = () => {
  const { albumId: rawId } = useParams();
  const albumId = rawId ? decodeURIComponent(rawId) : undefined;
  const { data: albums = [], isLoading: loadingAlbums } = useAlbums();
  const { data: photos = [], isLoading: loadingPhotos } = useAlbumImages(albumId);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const album = albums.find((a) => a.id === albumId) ?? null;

  const { data: event } = useQuery({
    queryKey: ['albumEvent', album?.eventId],
    enabled: !!album?.eventId,
    queryFn: async () => {
      const { data } = await db.from('events').select('slug, title').eq('id', album!.eventId!).maybeSingle();
      return data;
    },
  });

  useSEO({
    title: album ? `${album.title} - Photos LOOM` : 'Album photo - LOOM',
    description: album ? `${album.count} photos de la soirée « ${album.title} » de LOOM - Les Ours Occitanie Montpellier.` : 'Album photo de LOOM',
    image: album?.cover ?? undefined,
    type: 'website',
  });

  const loading = loadingAlbums || loadingPhotos;

  return (
    <div className="flex min-h-screen flex-col bg-loom-bg text-loom-text">
      <Navbar />

      <main className={cn(container, 'flex flex-1 flex-col gap-6 pb-16 pt-4 sm:pb-[72px] sm:pt-8')}>
        <nav aria-label="Fil d'Ariane" className="hidden text-sm text-loom-text-muted sm:block">
          <Link to="/gallery" className={cn(strongLink, 'font-semibold')}>
            Photos
          </Link>{' '}
          <span aria-hidden="true">›</span> <span aria-current="page">{album?.title ?? albumId}</span>
        </nav>
        <Link to="/gallery" className={cn('flex min-h-11 items-center gap-1 self-start rounded-lg font-semibold text-loom-link sm:hidden', pageFocus)}>
          <ChevronLeft aria-hidden="true" size={18} /> Photos
        </Link>

        {loading ? (
          <div aria-hidden="true" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-xl bg-loom-surface-2" />
            ))}
          </div>
        ) : !album ? (
          <div className={cn(card, 'flex flex-col items-start gap-3 p-6')}>
            <h1 className="text-2xl font-extrabold">Album introuvable</h1>
            <p className="text-loom-text-2">Il a peut-être été renommé ou retiré.</p>
            <Link to="/gallery" className={cn(btnSecondary, 'h-11 px-4')}>
              Voir tous les albums
            </Link>
          </div>
        ) : (
          <>
            <header className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-col gap-1.5">
                <h1 className="text-[30px] font-extrabold leading-tight tracking-[-0.01em] sm:text-[40px]">{album.title}</h1>
                <p className="flex flex-wrap items-center gap-x-2 text-loom-text-muted">
                  {album.dateLabel && (
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays aria-hidden="true" size={16} /> {album.dateLabel}
                    </span>
                  )}
                  {album.dateLabel && <span aria-hidden="true">·</span>}
                  <span>
                    {photos.length} photo{photos.length > 1 ? 's' : ''}
                  </span>
                </p>
              </div>
              {event && (
                <Link to={`/events/${event.slug}`} className={strongLink}>
                  La soirée : {event.title} →
                </Link>
              )}
            </header>

            {photos.length === 0 ? (
              <p className={cn(card, 'p-6 text-loom-text-muted')}>Cet album ne contient pas encore de photos.</p>
            ) : (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
                {photos.map((photo, i) => (
                  <li key={photo.id}>
                    <button
                      type="button"
                      onClick={() => setOpenIndex(i)}
                      data-photo-index={i}
                      aria-label={`Agrandir la photo ${i + 1} sur ${photos.length}`}
                      className={cn('group block aspect-square w-full overflow-hidden rounded-xl bg-loom-surface-2', pageFocus)}
                    >
                      <img src={photo.src} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <p className="text-sm text-loom-text-muted">
              Une photo de vous vous dérange ?{' '}
              <Link to="/about#contact" className={strongLink}>
                Écrivez-nous
              </Link>
              , on la retire.
            </p>

            <PhotoLightbox photos={photos} index={openIndex} onIndexChange={setOpenIndex} albumTitle={album.title} />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default AlbumDetail;
