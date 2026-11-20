import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useLayoutEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { lockTheme, unlockTheme } from "@/theme/theme";
import { adminLoginPath } from "@/lib/adminRedirect";

interface RequireAdminProps {
  redirectTo?: string;
}

export default function RequireAdmin({ redirectTo }: RequireAdminProps) {
  const { isAuthenticated, isAdmin, isLoading, isProfileLoading, profile } = useAuth();
  const location = useLocation();

  // L'admin n'a pas de mode nuit (pour l'instant) : on impose le jour tant
  // qu'une route admin est affichée, sans toucher au choix du visiteur.
  useLayoutEffect(() => {
    lockTheme("light");
    return unlockTheme;
  }, []);

  // Tant qu'on n'a pas déterminé le profil pour la première fois, on bloque.
  // Une fois le profil connu, ne pas re-bloquer sur un rafraîchissement en
  // arrière-plan (ex: Supabase revalide la session au retour d'un onglet) :
  // ça démonterait toute la page admin (donc les modales ouvertes) pour rien.
  if (isLoading || (isProfileLoading && !profile)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={redirectTo ?? adminLoginPath(location.pathname + location.search)}
        state={{ from: location }}
        replace
      />
    );
  }

  if (!isAdmin) {
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  return <Outlet />;
}