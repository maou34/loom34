import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, Suspense, lazy } from "react";
import { AuthProvider } from "./contexts/AuthContext";
import React from "react";

// Immediate pages (critical for initial load)
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";

// Lazy loaded pages
const About = lazy(() => import("./pages/About"));
const Events = lazy(() => import("./pages/Events"));
const MonsieurOurs = lazy(() => import("./pages/MonsieurOurs"));
const Gallery = lazy(() => import("./pages/Gallery"));
const Partners = lazy(() => import("./pages/Partners"));
const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const ResetPasswordRequest = lazy(() => import("./pages/auth/ResetPasswordRequest"));
const UpdatePassword = lazy(() => import("./pages/auth/UpdatePassword"));
const Profile = lazy(() => import("./pages/auth/Profile"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminArticles = lazy(() => import("./pages/admin/Articles"));
const AdminEvents = lazy(() => import("./pages/admin/Events"));
const AdminGallery = lazy(() => import("./pages/admin/Gallery"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminTickets = lazy(() => import("./pages/admin/Tickets"));
const AdminSEO = lazy(() => import("./pages/admin/SEO"));
const AdminPartners = lazy(() => import("./pages/admin/Partners"));
const AdminHomeSettings = lazy(() => import("./pages/admin/HomeSettings"));
const AdminMonsieurOurs = lazy(() => import("./pages/admin/MonsieurOurs"));
const ArticleDetail = lazy(() => import("./pages/ArticleDetail"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const Articles = lazy(() => import("./pages/Articles"));
const Terms = lazy(() => import("./pages/Terms"));
const LegalNotice = lazy(() => import("./pages/LegalNotice"));
const AlbumDetail = lazy(() => import("./pages/AlbumDetail"));

// Components
import RequireAuth from "./components/auth/RequireAuth";
import RequireAdmin from "./components/auth/RequireAdmin";
import SettingsRedirect from "./components/SettingsRedirect";
import PageLoader from "./components/PageLoader";
import { LOOMOrganizationSchema } from "./components/SEOStructuredData";
import { AutoBreadcrumbs } from "./components/InternalLinks";
import ErrorBoundary from "./components/ErrorBoundary";
import { DEFAULT_SHOP_URL, DEFAULT_MEMBERSHIP_URL } from "./hooks/useSiteSettings";

const queryClient = new QueryClient();


// Mapping des routes vers leurs titres
const PAGE_TITLES: { [key: string]: string } = {
  "/": "LOOM - Les Ours Occitanie Montpellier",
  "/about": "LOOM - À propos",
  "/events": "LOOM - Événements",
  "/articles": "LOOM - Articles",
  "/monsieur-ours": "LOOM - Monsieur Ours",
  "/gallery": "LOOM - Galerie Photos",
  "/partners": "LOOM - Nos Partenaires",
  "/auth/login": "LOOM - Connexion",
  "/admin/login": "LOOM - Espace admin",
  "/auth/register": "LOOM - Inscription",
  "/auth/reset-password": "LOOM - Réinitialisation du mot de passe",
  "/auth/update-password": "LOOM - Nouveau mot de passe",
  "/auth/profile": "LOOM - Mon Profil",
  "/admin/dashboard": "LOOM Admin - Tableau de bord",
  "/admin/articles": "LOOM Admin - Articles",
  "/admin/events": "LOOM Admin - Événements",
  "/admin/gallery": "LOOM Admin - Galerie",
  "/admin/users": "LOOM Admin - Utilisateurs",
  "/admin/tickets": "LOOM Admin - Tickets",
  "/admin/seo": "LOOM Admin - SEO & Référencement",
  "/admin/partners": "LOOM Admin - Partenaires",
  "/admin/home-settings": "LOOM Admin - Page d'accueil et menu",
  "/admin/monsieur-ours": "LOOM Admin - Timeline Mr Ours",
  "/terms": "LOOM - Conditions d'utilisation",
  "/legal-notice": "LOOM - Mentions légales",
  "/unauthorized": "LOOM - Accès non autorisé",
};

// Composant qui met à jour le titre à chaque navigation (SANS hard reload)
function RouteReload() {
  const location = useLocation();

  React.useEffect(() => {
    // Gestion des titres dynamiques pour les pages avec paramètres
    let pageTitle = PAGE_TITLES[location.pathname] || "LOOM - Les Ours Occitanie Montpellier";

    // Gestion spéciale pour les pages avec slug
    if (location.pathname.startsWith("/articles/")) {
      pageTitle = "LOOM - Article";
    } else if (location.pathname.startsWith("/events/")) {
      pageTitle = "LOOM - Événement";
    }

    document.title = pageTitle;
  }, [location.pathname]);

  return null;
}

const App = () => {
  // Scroll to top on initial mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          {/* Données structurées globales de l'organisation */}
          <LOOMOrganizationSchema />

          <Toaster />
          <Sonner />
          <BrowserRouter>
            <RouteReload />
            <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />

                {/* Main Pages */}
                <Route path="/about" element={<About />} />
                <Route path="/events" element={<Events />} />
                <Route path="/articles" element={<Articles />} />
                <Route path="/articles/:slug" element={<ArticleDetail />} />
                <Route path="/events/:slug" element={<EventDetail />} />
                <Route path="/monsieur-ours" element={<MonsieurOurs />} />
                <Route path="/gallery" element={<Gallery />} />
                <Route path="/gallery/:albumId" element={<AlbumDetail />} />
                <Route path="/partners" element={<Partners />} />

                {/* External Redirects - URLs configurable depuis /admin/home-settings */}
                <Route path="/shop" element={<SettingsRedirect settingKey="shop_url" fallbackUrl={DEFAULT_SHOP_URL} />} />
                <Route path="/membership" element={<SettingsRedirect settingKey="membership_url" fallbackUrl={DEFAULT_MEMBERSHIP_URL} />} />

                {/* Auth Routes */}
                <Route path="/auth/login" element={<Login />} />
                <Route path="/admin/login" element={<Login />} />
                <Route path="/auth/register" element={<Register />} />
                <Route path="/auth/reset-password" element={<ResetPasswordRequest />} />
                <Route path="/auth/update-password" element={<UpdatePassword />} />
                <Route path="/login" element={<Navigate to="/auth/login" replace />} />
                <Route path="/register" element={<Navigate to="/auth/register" replace />} />
                <Route path="/reset-password" element={<Navigate to="/auth/reset-password" replace />} />
                <Route path="/update-password" element={<Navigate to="/auth/update-password" replace />} />

                {/* Protected User Routes */}
                <Route element={<RequireAuth />}>
                  <Route path="/auth/profile" element={<Profile />} />
                </Route>

                {/* Admin Routes - Using RequireAuth and RequireAdmin as route wrappers */}
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

                <Route element={<RequireAuth />}>
                  <Route element={<RequireAdmin />}>
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    <Route path="/admin/articles" element={<AdminArticles />} />
                    <Route path="/admin/events" element={<AdminEvents />} />
                    <Route path="/admin/gallery" element={<AdminGallery />} />
                    <Route path="/admin/users" element={<AdminUsers />} />
                    <Route path="/admin/tickets" element={<AdminTickets />} />
                    <Route path="/admin/seo" element={<AdminSEO />} />
                    <Route path="/admin/partners" element={<AdminPartners />} />
                    <Route path="/admin/home-settings" element={<AdminHomeSettings />} />
                    <Route path="/admin/monsieur-ours" element={<AdminMonsieurOurs />} />
                  </Route>
                </Route>

                {/* Privacy Policy and Terms Routes */}
                <Route path="/terms" element={<Terms />} />
                <Route path="/legal-notice" element={<LegalNotice />} />
                <Route path="/unauthorized" element={<Unauthorized />} />

                {/* Catch-all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;