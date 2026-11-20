import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useExternalLinks } from '@/hooks/useSiteSettings';
import AccessibilityMenu from './AccessibilityMenu';
import { SITE_NAV_LINKS, SOCIAL_LINKS } from './site/navigation';

// Le footer est toujours sur fond brun foncé (jour comme nuit) : anneau de
// focus jaune, lisible sur ce fond.
const footerFocus =
  'rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-loom-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-loom-footer-bg';

const Footer = () => {
  const [isAccessibilityOpen, setIsAccessibilityOpen] = useState(false);
  const { membershipUrl } = useExternalLinks();

  return (
    <>
      <footer className="bg-loom-footer-bg text-[15px] leading-normal text-loom-band-dark-text">
        <div aria-hidden="true" className="h-1 bg-bear" />
        <div className="mx-auto flex max-w-[1200px] flex-col gap-9 px-5 pb-6 pt-12 sm:px-8">
          <div className="flex flex-wrap gap-x-12 gap-y-8">
            <div className="flex min-w-0 flex-[2_1_260px] flex-col gap-4">
              {/* Logo en grand : il porte déjà « LOOM – Les Ours Occitanie Montpellier » */}
              <Link to="/" aria-label="LOOM – Les Ours Occitanie Montpellier, retour à l'accueil" className={cn('self-start rounded-[22px]', footerFocus)}>
                <img
                  src="/logo-loom-ours.png"
                  alt=""
                  width={144}
                  height={144}
                  loading="lazy"
                  className="h-32 w-32 rounded-[22px] shadow-[0_10px_30px_rgba(0,0,0,0.35)] sm:h-36 sm:w-36"
                />
              </Link>
              <p className="m-0 max-w-[320px]">
                Association Bear fondée en 2017. Un espace inclusif pour les Bears et tous ceux qui aiment les ours, du XS
                au XXXXXL.
              </p>
              <a
                href={membershipUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex h-11 items-center self-start rounded-xl bg-loom-yellow px-[18px] font-extrabold text-loom-on-yellow',
                  footerFocus,
                )}
              >
                Adhérer
                <span className="sr-only"> (nouvel onglet)</span>
              </a>
            </div>

            <nav aria-labelledby="footer-site" className="flex flex-[1_1_160px] flex-col gap-2">
              <h2 id="footer-site" className="mb-1 text-[15px] font-extrabold text-white">
                Le site
              </h2>
              {/* Deux colonnes sur mobile pour raccourcir le footer */}
              <ul className="m-0 grid list-none grid-cols-2 gap-x-6 gap-y-2 p-0 sm:grid-cols-1">
                {SITE_NAV_LINKS.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className={cn('inline-block hover:text-white', footerFocus)}>
                      {link.longLabel ?? link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="flex flex-[1_1_220px] flex-col gap-2.5">
              <h2 className="mb-1 text-[15px] font-extrabold text-white">Contact</h2>
              <address className="not-italic">
                49 rue du Faubourg Saint-Jaumes, bât. E
                <br />
                34000 Montpellier
              </address>
              <Link to="/about#contact" className={cn('self-start font-semibold text-loom-yellow hover:underline', footerFocus)}>
                Nous écrire →
              </Link>
            </div>

            <div className="flex flex-[1_1_180px] flex-col gap-3">
              <h2 className="mb-1 text-[15px] font-extrabold text-white">Suivez-nous</h2>
              <div className="flex gap-2.5">
                <a
                  href={SOCIAL_LINKS.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LOOM sur Facebook (nouvel onglet)"
                  className={cn('flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20', footerFocus)}
                >
                  <Facebook aria-hidden="true" size={20} />
                </a>
                <a
                  href={SOCIAL_LINKS.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LOOM sur Instagram (nouvel onglet)"
                  className={cn('flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white hover:bg-white/20', footerFocus)}
                >
                  <Instagram aria-hidden="true" size={20} />
                </a>
              </div>
              <button
                type="button"
                onClick={() => setIsAccessibilityOpen(true)}
                className={cn(
                  'h-11 self-start rounded-xl border border-white/25 bg-transparent px-3.5 font-semibold text-white hover:bg-white/10',
                  footerFocus,
                )}
              >
                Options d'accessibilité
              </button>
            </div>
          </div>

          <div className="flex flex-wrap justify-between gap-3 border-t border-white/15 pt-5 text-sm">
            <p className="m-0">
              © {new Date().getFullYear()} LOOM – Les Ours Occitanie Montpellier ·{' '}
              <span className="inline-flex items-center gap-[5px] whitespace-nowrap">
                Fait avec
                <svg role="img" aria-label="amour" width="15" height="15" viewBox="0 0 24 24" className="flex-none fill-loom-heart">
                  <path d="M12 21s-7.5-4.6-10-9.3C.4 8.4 2.2 4.5 5.9 4.1 8.2 3.8 10.2 5 12 7.1c1.8-2.1 3.8-3.3 6.1-3 3.7.4 5.5 4.3 3.9 7.6C19.5 16.4 12 21 12 21z" />
                </svg>
                à Montpellier
              </span>
            </p>
            <div className="flex flex-wrap gap-[18px]">
              <Link to="/legal-notice" className={cn('hover:text-white', footerFocus)}>
                Mentions légales
              </Link>
              <Link to="/terms" className={cn('hover:text-white', footerFocus)}>
                Conditions d'utilisation
              </Link>
            </div>
          </div>
        </div>
      </footer>

      <AccessibilityMenu isOpen={isAccessibilityOpen} onClose={() => setIsAccessibilityOpen(false)} />
    </>
  );
};

export default Footer;
