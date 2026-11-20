import { useEffect, useRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type Photo = { src: string; id: string };

type Props = {
  photos: Photo[];
  /** Index de la photo affichée, null = fermée */
  index: number | null;
  onIndexChange: (index: number | null) => void;
  albumTitle: string;
};

const darkFocus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-loom-yellow';

/**
 * Visionneuse plein écran (Dialog Radix : focus piégé, Échap pour fermer).
 * Flèches gauche / droite du clavier ou boutons pour naviguer ; boucle aux extrémités.
 */
export default function PhotoLightbox({ photos, index, onIndexChange, albumTitle }: Props) {
  const open = index !== null && photos.length > 0;
  const lastIndexRef = useRef(0);
  if (index !== null) lastIndexRef.current = index;
  const current = open ? photos[index] : null;
  const go = (delta: number) => {
    if (index === null) return;
    onIndexChange((index + delta + photos.length) % photos.length);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Précharge les photos voisines pour une navigation sans attente
  useEffect(() => {
    if (index === null) return;
    [index + 1, index - 1].forEach((i) => {
      const p = photos[(i + photos.length) % photos.length];
      if (p) new Image().src = p.src;
    });
  }, [index, photos]);

  const navButton = cn('flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20', darkFocus);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onIndexChange(null)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-black" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          // Ouverte par programme (pas de Dialog.Trigger) : on rend le focus à la
          // vignette de la dernière photo vue (attribut data-photo-index côté grille).
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            document.querySelector<HTMLElement>(`[data-photo-index="${lastIndexRef.current}"]`)?.focus();
          }}
          className="fixed inset-0 z-[70] flex flex-col text-white focus:outline-none"
        >
          <div className="flex items-center justify-between gap-3 p-3 sm:p-4">
            <DialogPrimitive.Title className="min-w-0 truncate text-sm font-semibold sm:text-base">
              {albumTitle} <span className="font-normal text-white/70">· photo {index !== null ? index + 1 : 0} sur {photos.length}</span>
            </DialogPrimitive.Title>
            <div className="flex flex-none items-center gap-2">
              {current && (
                <a href={current.src} target="_blank" rel="noopener noreferrer" aria-label="Ouvrir la photo en taille réelle (nouvel onglet)" className={cn('flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10', darkFocus)}>
                  <ExternalLink aria-hidden="true" size={20} />
                </a>
              )}
              <DialogPrimitive.Close aria-label="Fermer la visionneuse" className={cn('flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/10', darkFocus)}>
                <X aria-hidden="true" size={24} />
              </DialogPrimitive.Close>
            </div>
          </div>

          <div className="relative min-h-0 flex-1">
            {/* Photo en position absolue dans une zone de taille fixe : Safari (iPhone)
                calcule mal max-h-full dans un élément flex-1 et laissait la photo
                déborder (on n'en voyait que la moitié). */}
            {current && (
              <div className="absolute inset-x-2 bottom-4 top-0 sm:inset-x-20">
                <img
                  key={current.id}
                  src={current.src}
                  alt={`Photo ${index! + 1} sur ${photos.length} de l'album ${albumTitle}`}
                  className="h-full w-full object-contain"
                />
              </div>
            )}
            {photos.length > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} aria-label="Photo précédente" className={cn(navButton, 'absolute left-2 top-1/2 -translate-y-1/2 sm:left-4')}>
                  <ChevronLeft aria-hidden="true" size={26} />
                </button>
                <button type="button" onClick={() => go(1)} aria-label="Photo suivante" className={cn(navButton, 'absolute right-2 top-1/2 -translate-y-1/2 sm:right-4')}>
                  <ChevronRight aria-hidden="true" size={26} />
                </button>
              </>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
