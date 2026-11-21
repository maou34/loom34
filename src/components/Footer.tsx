import { useState } from 'react';
import { Link } from 'react-router';
import { Facebook, Instagram } from 'lucide-react';
import { cn } from '@/lib/utils';
import AccessibilityMenu from './AccessibilityMenu';
import { SITE_NAV_LINKS, SOCIAL_LINKS } from './site/navigation';

// Le footer est toujours sur fond brun foncé (jour comme nuit) : anneau de
// focus jaune, lisible sur ce fond.
const footerFocus =
  'rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-loom-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-loom-footer-bg';

const Footer = () => {
  const [isAccessibilityOpen, setIsAccessibilityOpen] = useState(false);

  return (
    <>
      <footer className="overflow-hidden bg-loom-footer-bg text-[15px] leading-normal text-loom-band-dark-text">
        <div className="mx-auto flex max-w-[1200px] flex-col px-5 pt-12 sm:px-8">
          <div className="flex flex-wrap gap-x-12 gap-y-9">
            {/* Accroche + contact */}
            <div className="flex min-w-0 flex-[2_1_300px] flex-col items-start gap-5">
              <p className="m-0 max-w-[22ch] text-[22px] font-extrabold leading-snug text-white sm:text-2xl">
                Du XS au XXXXXL, il y a une place pour vous dans la tanière.
              </p>
              <Link
                to="/about#contact"
                className={cn(
                  'inline-flex h-11 items-center rounded-full bg-loom-yellow px-5 font-bold text-loom-on-yellow transition-transform hover:-translate-y-px',
                  footerFocus,
                  'rounded-full',
                )}
              >
                Nous écrire
              </Link>
            </div>

            <nav aria-labelledby="footer-site" className="flex flex-[1_1_160px] flex-col gap-2">
              <h2 id="footer-site" className="mb-1 text-xs font-extrabold uppercase tracking-[0.08em] text-loom-yellow">
                Le site
              </h2>
              {/* Deux colonnes sur mobile pour raccourcir le footer */}
              <ul className="m-0 grid list-none grid-cols-2 gap-x-6 gap-y-1.5 p-0 sm:grid-cols-1">
                {SITE_NAV_LINKS.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className={cn('inline-block hover:text-white', footerFocus)}>
                      {link.longLabel ?? link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="flex flex-[1_1_240px] flex-col gap-2">
              <h2 className="mb-1 text-xs font-extrabold uppercase tracking-[0.08em] text-loom-yellow">Contact</h2>
              <address className="not-italic">
                49 rue du Faubourg Saint-Jaumes, bât. E
                <br />
                34000 Montpellier
              </address>
              <div className="mt-2 flex flex-wrap gap-2.5">
                <a
                  href={SOCIAL_LINKS.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LOOM sur Facebook (nouvel onglet)"
                  className={cn('flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20', footerFocus, 'rounded-full')}
                >
                  <Facebook aria-hidden="true" size={18} />
                </a>
                <a
                  href={SOCIAL_LINKS.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LOOM sur Instagram (nouvel onglet)"
                  className={cn('flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20', footerFocus, 'rounded-full')}
                >
                  <Instagram aria-hidden="true" size={18} />
                </a>
                <button
                  type="button"
                  onClick={() => setIsAccessibilityOpen(true)}
                  aria-label="Options d'accessibilité"
                  className={cn('h-11 rounded-full border border-white/25 bg-transparent px-4 font-semibold text-white hover:bg-white/10', footerFocus, 'rounded-full')}
                >
                  Accessibilité
                </button>
              </div>
            </div>
          </div>

          {/* Grand « LOOM » aux couleurs du drapeau bear, coupé par le bandeau du bas + logo */}
          <div className="mt-10 flex flex-col-reverse gap-6 sm:mt-12 sm:flex-row sm:items-end sm:justify-between">
            <div aria-hidden="true" className="-mb-[0.1em] select-none overflow-hidden text-[clamp(84px,24vw,200px)] font-extrabold leading-[0.8] tracking-[-0.02em]">
              <span className="inline-block translate-y-[0.06em] bg-bear bg-clip-text pr-[0.04em] text-transparent">LOOM</span>
            </div>
            <Link
              to="/"
              aria-label="LOOM – Les Ours Occitanie Montpellier, retour à l'accueil"
              className={cn('flex items-center gap-4 self-end rounded-[18px] sm:mb-2', footerFocus)}
            >
              <span aria-hidden="true" className="text-right text-sm font-extrabold leading-tight text-white">
                Les Ours
                <br />
                Occitanie
                <br />
                Montpellier
              </span>
              <img src="/logo-loom-ours.png" alt="" width={72} height={72} loading="lazy" className="h-[72px] w-[72px] rounded-[18px] shadow-[0_8px_24px_rgba(0,0,0,0.35)]" />
            </Link>
          </div>
        </div>

        <div className="relative bg-loom-footer-bottom-bg">
          <div className="mx-auto flex max-w-[1200px] flex-wrap justify-between gap-x-6 gap-y-2 px-5 py-4 text-[13px] sm:px-8">
            <p className="m-0">
              © {new Date().getFullYear()} LOOM ·{' '}
              <span className="inline-flex items-center gap-[5px] whitespace-nowrap">
                Fait avec
                <svg role="img" aria-label="amour" width="14" height="14" viewBox="0 0 24 24" className="flex-none fill-loom-heart">
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
