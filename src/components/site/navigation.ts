// Menu du site public, dans l'ordre validé (SPEC § 2) : utilisé par l'en-tête
// desktop, le menu mobile et la colonne « Le site » du footer.

export type SiteNavLink = {
  to: string;
  /** Libellé court (en-tête desktop) */
  label: string;
  /** Libellé long (menu mobile, footer) */
  longLabel?: string;
};

export const SITE_NAV_LINKS: SiteNavLink[] = [
  { to: '/articles', label: 'Actualités' },
  { to: '/events', label: 'Agenda' },
  { to: '/about', label: 'L’asso', longLabel: 'L’asso et le bureau' },
  { to: '/monsieur-ours', label: 'Monsieur Ours' },
  { to: '/gallery', label: 'Photos' },
  { to: '/partners', label: 'Partenaires' },
];

export const SOCIAL_LINKS = {
  facebook: 'https://www.facebook.com/groups/1868760663424464/?ref=share_group_link',
  instagram: 'https://www.instagram.com/loom_ours_34/',
};

/** Vrai si `pathname` est la page `to` ou une de ses sous-pages (/events/mon-slug…). */
export function isNavActive(pathname: string, to: string): boolean {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(`${to}/`);
}

/** Anneau de focus clavier commun aux éléments de l'en-tête / du footer. */
export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-loom-header-bg';
