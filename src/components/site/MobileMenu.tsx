import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Link, useLocation } from 'react-router';
import { ChevronRight, ExternalLink, Facebook, Instagram, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExternalLinks } from '@/hooks/useSiteSettings';
import AdminEntryLink from './AdminEntryLink';
import { SITE_NAV_LINKS, SOCIAL_LINKS, focusRing, isNavActive, type SiteNavLink } from './navigation';

type MobileMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const MENU_LINKS: SiteNavLink[] = [{ to: '/', label: 'Accueil' }, ...SITE_NAV_LINKS];

/**
 * Menu mobile plein écran (maquette Mobile-Menu). Dialog Radix : piège le
 * focus, se ferme avec Échap et bloque le défilement de la page derrière.
 */
export default function MobileMenu({ open, onOpenChange }: MobileMenuProps) {
  const { pathname } = useLocation();
  const { shopUrl, membershipUrl, showShop, showMembership } = useExternalLinks();
  const close = () => onOpenChange(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          id="menu-mobile"
          aria-describedby={undefined}
          className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-loom-bg text-loom-text data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
        >
          <div className="flex-none px-3 pt-2.5">
            <div className="overflow-hidden rounded-[18px] bg-loom-header-bg shadow-loom-header ring-1 ring-loom-header-border">
              <div className="flex h-[60px] items-center gap-2 pl-2 pr-1.5">
                <span className="flex flex-1 items-center gap-2.5">
                  <img src="/logo-loom-ours.png" alt="" width={44} height={44} className="h-11 w-11 rounded-xl" />
                  <DialogPrimitive.Title className="text-[19px] font-extrabold">Menu</DialogPrimitive.Title>
                </span>
                <DialogPrimitive.Close
                  aria-label="Fermer le menu"
                  className={cn('flex h-11 w-11 items-center justify-center rounded-full text-loom-text', focusRing)}
                >
                  <X aria-hidden="true" size={24} />
                </DialogPrimitive.Close>
              </div>
              <div aria-hidden="true" className="h-[3px] bg-bear" />
            </div>
          </div>

          <nav aria-label="Menu principal" className="flex flex-1 flex-col gap-1.5 px-3 py-4">
            {MENU_LINKS.map((link) => {
              const active = isNavActive(pathname, link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={close}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex min-h-[54px] items-center justify-between rounded-full px-[18px] text-[19px] font-bold ring-1',
                    active
                      ? 'bg-loom-nav-active-bg text-loom-nav-active-fg ring-loom-border-strong'
                      : 'bg-loom-surface text-loom-text ring-loom-header-border',
                    focusRing,
                  )}
                >
                  {link.longLabel ?? link.label}
                  <ChevronRight aria-hidden="true" size={20} className="text-loom-text-muted" />
                </Link>
              );
            })}
            {showShop && (
              <a
                href={shopUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn('flex min-h-[52px] items-center gap-2 rounded-full px-[18px] text-[17px] font-semibold text-loom-text-2', focusRing)}
              >
                Boutique
                <ExternalLink aria-hidden="true" size={16} />
                <span className="sr-only">(nouvel onglet)</span>
              </a>
            )}
          </nav>

          <div className="flex flex-none flex-col gap-3 px-5 pb-7 pt-4">
            {showMembership && (
              <a
                href={membershipUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex h-[52px] items-center justify-center rounded-full bg-loom-primary-bg text-[17px] font-extrabold text-loom-primary-fg transition-colors hover:bg-loom-primary-hover',
                  focusRing,
                )}
              >
                Adhérer à LOOM
                <span className="sr-only"> (nouvel onglet)</span>
              </a>
            )}
            <div className="flex justify-center gap-3">
              <a
                href={SOCIAL_LINKS.facebook}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LOOM sur Facebook (nouvel onglet)"
                className={cn('flex h-11 w-11 items-center justify-center rounded-full bg-loom-surface text-loom-text ring-1 ring-loom-header-border', focusRing)}
              >
                <Facebook aria-hidden="true" size={20} />
              </a>
              <a
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LOOM sur Instagram (nouvel onglet)"
                className={cn('flex h-11 w-11 items-center justify-center rounded-full bg-loom-surface text-loom-text ring-1 ring-loom-header-border', focusRing)}
              >
                <Instagram aria-hidden="true" size={20} />
              </a>
            </div>
            <AdminEntryLink
              iconSize={14}
              className="min-h-11 self-center rounded-lg px-3 text-sm text-loom-text-muted hover:text-loom-text"
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
