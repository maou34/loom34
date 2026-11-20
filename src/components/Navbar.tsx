import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ExternalLink, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExternalLinks } from '@/hooks/useSiteSettings';
import { ThemeToggle } from '@/theme/ThemeToggle';
import AdminEntryLink from '@/components/site/AdminEntryLink';
import MobileMenu from '@/components/site/MobileMenu';
import { SITE_NAV_LINKS, focusRing, isNavActive } from '@/components/site/navigation';

/**
 * En-tête du site public (maquettes Header / MobileHeader) : barre « pilule »
 * flottante et collante. En dessous de xl, version compacte + menu plein écran.
 * L'onglet « Espace admin » (desktop) est sous la barre et défile avec la page.
 */
const Navbar = () => {
  const { pathname } = useLocation();
  const { shopUrl, membershipUrl, showShop, showMembership } = useExternalLinks();
  const [menuOpen, setMenuOpen] = useState(false);

  // Ferme le menu mobile à chaque changement de page
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Fond opaque : le contenu qui défile passe sous la marge au-dessus de la pilule, pas à travers. */}
      <div className="sticky top-0 z-50 bg-loom-bg px-3 pt-2.5 xl:px-5 xl:pt-[18px]">
        <header className="mx-auto max-w-[1200px] overflow-hidden rounded-[18px] bg-loom-header-bg shadow-loom-header ring-1 ring-loom-header-border xl:rounded-[22px]">
          <div className="flex h-[60px] items-center gap-1.5 pl-2 pr-1.5 xl:h-auto xl:gap-6 xl:py-2 xl:pl-2.5 xl:pr-2.5">
            <Link
              to="/"
              aria-label="LOOM, retour à l'accueil"
              className={cn('flex flex-1 items-center gap-2.5 rounded-xl text-loom-text xl:flex-none', focusRing)}
            >
              <img
                src="/logo-loom-ours.png"
                alt=""
                width={56}
                height={56}
                className="h-11 w-11 rounded-xl xl:h-14 xl:w-14 xl:rounded-[14px]"
              />
              <span aria-hidden="true" className="text-[19px] font-extrabold tracking-[0.03em] xl:hidden">
                LOOM
              </span>
            </Link>

            <nav aria-label="Menu principal" className="hidden min-w-0 flex-1 flex-wrap gap-1 xl:flex">
              {SITE_NAV_LINKS.map((link) => {
                const active = isNavActive(pathname, link.to);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'rounded-full px-3.5 py-2.5 text-base transition-colors',
                      active
                        ? 'bg-loom-nav-active-bg font-bold text-loom-nav-active-fg'
                        : 'font-medium text-loom-nav-fg hover:bg-loom-nav-active-bg hover:text-loom-nav-active-fg',
                      focusRing,
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {showShop && (
              <a
                href={shopUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'hidden h-11 items-center gap-1.5 rounded-full px-2 text-base font-semibold text-loom-nav-fg transition-colors hover:text-loom-nav-active-fg xl:flex',
                  focusRing,
                )}
              >
                Boutique
                <ExternalLink aria-hidden="true" size={14} />
                <span className="sr-only">(nouvel onglet)</span>
              </a>
            )}

            <ThemeToggle />

            {showMembership && (
              <a
                href={membershipUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex h-[42px] items-center rounded-full bg-loom-primary-bg px-3.5 text-[15px] font-extrabold text-loom-primary-fg transition-colors hover:bg-loom-primary-hover xl:h-[46px] xl:px-[22px] xl:text-base',
                  focusRing,
                )}
              >
                Adhérer
                <span className="sr-only"> (nouvel onglet)</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Ouvrir le menu"
              aria-expanded={menuOpen}
              aria-controls="menu-mobile"
              className={cn('flex h-11 w-11 flex-none items-center justify-center rounded-full text-loom-text xl:hidden', focusRing)}
            >
              <Menu aria-hidden="true" size={24} />
            </button>
          </div>
          <div aria-hidden="true" className="h-[3px] bg-bear xl:h-1" />
        </header>
      </div>

      <div className="hidden px-5 xl:block">
        <div className="mx-auto flex max-w-[1200px] justify-end pr-[22px]">
          <AdminEntryLink className="h-9 rounded-b-xl bg-loom-header-bg px-3.5 text-[13px] text-loom-text-muted shadow-loom-header ring-1 ring-loom-header-border hover:text-loom-text" />
        </div>
      </div>

      <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  );
};

export default Navbar;
