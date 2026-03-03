import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface RequireAdminProps {
  redirectTo?: string;
}

export default function RequireAdmin({ redirectTo = "/auth/login" }: RequireAdminProps) {
  const { isAuthenticated, isAdmin, isLoading, isProfileLoading } = useAuth();
  const location = useLocation();

  // Tant qu'on n'a pas déterminé le profil, on n'envoie PAS vers /unauthorized
  if (isLoading || isProfileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/unauthorized" state={{ from: location }} replace />;
  }

  return <Outlet />;
}