import { cn } from '@/lib/utils';

/** Séparateur de sections : barre au dégradé du drapeau bear, dans le conteneur de 1200 px. */
export default function BearDivider({ className }: { className?: string }) {
  return (
    <div className={cn('mx-auto w-full max-w-[1200px] px-4 sm:px-8', className)} aria-hidden="true">
      <div className="h-[6px] rounded-full bg-bear outline outline-1 outline-loom-divider-outline" />
    </div>
  );
}
