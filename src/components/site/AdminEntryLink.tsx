import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { adminLoginPath } from '@/lib/adminRedirect';
import { cn } from '@/lib/utils';
import { focusRing } from './navigation';

/**
 * Lien « Espace admin » : connecté → /admin directement (RequireAdmin renvoie
 * vers /unauthorized si le compte n'est pas admin), sinon page de connexion
 * avec retour vers /admin.
 */
export default function AdminEntryLink({ className, iconSize = 13 }: { className?: string; iconSize?: number }) {
  const { isAuthenticated } = useAuth();
  return (
    <Link
      to={isAuthenticated ? '/admin' : adminLoginPath('/admin')}
      className={cn('flex items-center gap-1.5 font-semibold no-underline', focusRing, className)}
    >
      <Lock aria-hidden="true" size={iconSize} strokeWidth={2.2} />
      Espace admin
    </Link>
  );
}
