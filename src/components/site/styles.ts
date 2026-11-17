// Classes communes des pages refaites (boutons, cartes, focus), pour ne pas
// recopier les mêmes chaînes Tailwind partout.

/** Anneau de focus clavier sur le fond de page. */
export const pageFocus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-loom-bg';

/** Bouton principal (marron ; jaune en mode nuit). Ajouter la hauteur / le padding. */
export const btnPrimary = `inline-flex items-center justify-center gap-2 rounded-xl bg-loom-primary-bg font-bold text-loom-primary-fg no-underline transition-colors hover:bg-loom-primary-hover ${pageFocus}`;

/** Bouton secondaire (contour). */
export const btnSecondary = `inline-flex items-center justify-center gap-2 rounded-xl border-[1.5px] border-loom-secondary-border bg-loom-secondary-bg font-semibold text-loom-secondary-fg no-underline transition-colors hover:border-loom-text-muted ${pageFocus}`;

/** État « Complet » / « Inscriptions closes » à la place du bouton principal. */
export const btnDisabled =
  'inline-flex items-center justify-center rounded-xl border-[1.5px] border-dashed border-loom-border-strong font-semibold text-loom-text-muted';

/** Carte blanche à bordure fine. */
export const card = 'rounded-[22px] border border-loom-border bg-loom-surface';

/** Lien texte fort (« Toutes les actualités → »). */
export const strongLink = `rounded-sm font-bold text-loom-link no-underline hover:text-loom-link-hover hover:underline underline-offset-4 ${pageFocus}`;

/** Pastille de catégorie. */
export const chip = 'inline-flex items-center rounded-full bg-loom-chip-bg px-2.5 py-0.5 text-xs font-bold text-loom-chip-fg';

/** Conteneur de section : 1200 px, gouttières 16 px (mobile) / 32 px. */
export const container = 'mx-auto w-full max-w-[1200px] px-4 sm:px-8';
