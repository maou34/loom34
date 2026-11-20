import type { ReactNode } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { cn } from '@/lib/utils';
import { card, container } from '@/components/site/styles';

/**
 * Gabarit des pages juridiques (mentions légales, conditions d'utilisation) :
 * titre, date de mise à jour, puis le texte dans une carte, mis en forme par
 * `prose prose-loom` (couleurs du thème, clair comme nuit).
 */
export default function LegalPage({ title, updated, intro, children }: { title: string; updated: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-loom-bg text-loom-text">
      <Navbar />
      <main className={cn(container, 'flex flex-1 flex-col gap-6 pb-16 pt-6 sm:gap-8 sm:pb-[72px] sm:pt-10')}>
        <header className="flex max-w-[760px] flex-col gap-2">
          <h1 className="text-[34px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[44px]">{title}</h1>
          <p className="text-sm text-loom-text-muted">Mis à jour le {updated}</p>
          {intro && <p className="text-base text-loom-text-2 sm:text-lg">{intro}</p>}
        </header>
        <div className={cn(card, 'max-w-[860px] rounded-[18px] p-5 sm:p-8')}>
          <div className="prose prose-loom max-w-none prose-h2:mt-10 [&>h2:first-child]:mt-0 prose-h2:text-xl prose-h2:font-extrabold prose-li:my-1 sm:prose-h2:text-2xl">
            {children}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
