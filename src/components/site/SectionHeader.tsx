import { Link } from 'react-router';
import { strongLink } from './styles';

type SectionHeaderProps = {
  id: string;
  title: string;
  /** Titre plus court sur mobile (« Dernières nouvelles ») */
  mobileTitle?: string;
  subtitle?: string;
  link?: { to: string; label: string; mobileLabel?: string };
};

/** Titre de section + sous-titre + lien « Tout voir → » aligné à droite. */
export default function SectionHeader({ id, title, mobileTitle, subtitle, link }: SectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-1.5">
        <h2 id={id} className="text-[26px] font-extrabold tracking-[-0.01em] sm:text-4xl">
          {mobileTitle ? (
            <>
              <span className="sm:hidden">{mobileTitle}</span>
              <span className="hidden sm:inline">{title}</span>
            </>
          ) : (
            title
          )}
        </h2>
        {subtitle && <p className="hidden text-[17px] text-loom-text-muted sm:block">{subtitle}</p>}
      </div>
      {link && (
        <Link to={link.to} className={strongLink}>
          {link.mobileLabel ? (
            <>
              <span className="sm:hidden">{link.mobileLabel}</span>
              <span className="hidden sm:inline">{link.label}</span>
            </>
          ) : (
            link.label
          )}
        </Link>
      )}
    </div>
  );
}
