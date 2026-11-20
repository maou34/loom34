import type { ComponentPropsWithoutRef } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ExternalLink, Maximize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const darkFocus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-loom-yellow';

/**
 * Image d'un texte Markdown (article, description d'événement) : affichée en
 * taille limitée dans la page, un clic l'ouvre en entier par-dessus le site
 * (Échap, clic à côté ou bouton pour fermer ; le focus revient sur l'image).
 */
export default function ZoomableImage({ src, alt, title, className }: ComponentPropsWithoutRef<'img'>) {
  if (!src) return null;
  const label = alt ? `Agrandir l'image : ${alt}` : "Agrandir l'image";
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger
        className="group relative mx-auto block w-fit max-w-full cursor-zoom-in rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label={label}
        title="Agrandir"
      >
        <img src={src} alt={alt ?? ''} title={title} loading="lazy" className={cn('!my-0', className)} />
        <span
          aria-hidden="true"
          className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white opacity-90 transition-opacity group-hover:opacity-100"
        >
          <Maximize2 size={16} />
        </span>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-black/95" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-[71] flex items-center justify-center px-3 pb-16 pt-16 sm:px-8"
          // Clic à côté de l'image = fermer
          onClick={(e) => {
            if (e.target === e.currentTarget) (e.currentTarget.querySelector('[data-close]') as HTMLButtonElement | null)?.click();
          }}
        >
          <DialogPrimitive.Title className="sr-only">{alt || 'Image en grand'}</DialogPrimitive.Title>
          {/* Hauteur calculée sur l'écran (et non max-h-full) : Safari sur iPhone résout mal
              les pourcentages ici et laissait l'image déborder. 8rem = marges haut + bas. */}
          <img src={src} alt={alt ?? ''} className="max-h-[calc(100svh-8rem)] max-w-full rounded-lg object-contain" />
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className={cn('absolute bottom-3 left-1/2 flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-semibold text-white hover:bg-white/25', darkFocus)}
          >
            <ExternalLink aria-hidden="true" size={16} /> Ouvrir l'original<span className="sr-only"> (nouvel onglet)</span>
          </a>
          <DialogPrimitive.Close
            data-close
            className={cn('absolute right-3 top-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25', darkFocus)}
            aria-label="Fermer l'image"
          >
            <X size={22} />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
