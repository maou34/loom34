import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigationType, useParams } from "react-router-dom";
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
const ResetPasswordRequest = lazy(() => import("./pages/auth/ResetPasswordRequest"));
const UpdatePassword = lazy(() => import("./pages/auth/UpdatePassword"));
const Profile = lazy(() => import("./pages/auth/Profile"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminArticles = lazy(() => import("./pages/admin/Articles"));
const AdminEvents = lazy(() => import("./pages/admin/Events"));
const AdminGallery = lazy(() => import("./pages/admin/Gallery"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminTickets = lazy(() => import("./pages/admin/Tickets"));
const AdminPartners = lazy(() => import("./pages/admin/Partners"));
const AdminHomeSettings = lazy(() => import("./pages/admin/HomeSettings"));
const AdminNavigation = lazy(() => import("./pages/admin/Navigation"));
const AdminMonsieurOurs = lazy(() => import("./pages/admin/MonsieurOurs"));
const AdminHistory = lazy(() => import("./pages/admin/History"));
const AdminTeam = lazy(() => import("./pages/admin/Team"));
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
  "/photos": "LOOM - Photos",
  "/partners": "LOOM - Nos Partenaires",
  "/auth/login": "LOOM - Connexion",
  "/admin/login": "LOOM - Espace admin",
  "/auth/reset-password": "LOOM - Réinitialisation du mot de passe",
  "/auth/update-password": "LOOM - Nouveau mot de passe",
  "/auth/profile": "LOOM - Mon Profil",
  "/admin/dashboard": "LOOM Admin - Tableau de bord",
  "/admin/articles": "LOOM Admin - Articles",
  "/admin/events": "LOOM Admin - Événements",
  "/admin/gallery": "LOOM Admin - Galerie",
  "/admin/users": "LOOM Admin - Utilisateurs",
  "/admin/tickets": "LOOM Admin - Messages",
  "/admin/partners": "LOOM Admin - Partenaires",
  "/admin/home-settings": "LOOM Admin - Page d'accueil",
  "/admin/navigation": "LOOM Admin - Navigation",
  "/admin/monsieur-ours": "LOOM Admin - Monsieur Ours",
  "/admin/history": "LOOM Admin - Historique",
  "/admin/team": "LOOM Admin - La Tanière",
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

/** /gallery/<album> (ancienne adresse) → /photos/<album>. */
function LegacyAlbumRedirect() {
  const { albumId = "" } = useParams();
  return <Navigate to={`/photos/${encodeURIComponent(albumId)}`} replace />;
}

/**
 * Remonte en haut de la page à chaque changement de page (clic sur un lien).
 * Sans lui, une application React garde la position de défilement de la page
 * précédente : on arrivait souvent en bas de la nouvelle page. Exceptions : le
 * bouton « Retour » du navigateur (il restaure lui-même la position), les liens
 * vers une ancre (#contact…, gérés par la page) et les changements de filtres
 * (?ville=… : même page, on garde sa place).
 */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();
  useEffect(() => {
    if (navigationType === "POP" || hash) return;
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
  return null;
}

/**
 * Précharge le code des pages publiques une fois l'accueil affiché (quand le
 * navigateur n'a rien d'autre à faire) : un clic ensuite ouvre la page sans
 * attendre son téléchargement.
 */
function preloadPublicPages() {
  const load = () => {
    void import("./pages/Events");
    void import("./pages/EventDetail");
    void import("./pages/Articles");
    void import("./pages/ArticleDetail");
    void import("./pages/About");
    void import("./pages/MonsieurOurs");
    void import("./pages/Gallery");
    void import("./pages/AlbumDetail");
    void import("./pages/Partners");
  };
  if ("requestIdleCallback" in window) window.requestIdleCallback(load, { timeout: 4000 });
  else setTimeout(load, 2500);
}

const App = () => {
  // Scroll to top on initial mount
  useEffect(() => {
    window.scrollTo(0, 0);
    preloadPublicPages();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          {/* Données structurées globales de l'organisation */}
          <LOOMOrganizationSchema />

          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <RouteReload />
            <ScrollToTop />
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
                <Route path="/photos" element={<Gallery />} />
                <Route path="/photos/:albumId" element={<AlbumDetail />} />
                {/* Anciennes adresses : sur le serveur, /gallery/… est réservé aux fichiers
                    photo (nginx → serveur d'images), une page d'album y était introuvable
                    en accès direct. Restent valables pour les liens internes. */}
                <Route path="/gallery" element={<Navigate to="/photos" replace />} />
                <Route path="/gallery/:albumId" element={<LegacyAlbumRedirect />} />
                <Route path="/partners" element={<Partners />} />

                {/* External Redirects - URLs configurable depuis /admin/home-settings */}
                <Route path="/shop" element={<SettingsRedirect settingKey="shop_url" fallbackUrl={DEFAULT_SHOP_URL} />} />
                <Route path="/membership" element={<SettingsRedirect settingKey="membership_url" fallbackUrl={DEFAULT_MEMBERSHIP_URL} />} />

                {/* Auth Routes */}
                <Route path="/auth/login" element={<Login />} />
                <Route path="/admin/login" element={<Login />} />
                {/* Inscriptions publiques fermées (incident du 14/11/2026) : comptes créés par un admin */}
                <Route path="/auth/register" element={<Navigate to="/auth/login" replace />} />
                <Route path="/auth/reset-password" element={<ResetPasswordRequest />} />
                <Route path="/auth/update-password" element={<UpdatePassword />} />
                <Route path="/login" element={<Navigate to="/auth/login" replace />} />
                <Route path="/register" element={<Navigate to="/auth/login" replace />} />
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
                    <Route path="/admin/partners" element={<AdminPartners />} />
                    <Route path="/admin/home-settings" element={<AdminHomeSettings />} />
                    <Route path="/admin/navigation" element={<AdminNavigation />} />
                    <Route path="/admin/monsieur-ours" element={<AdminMonsieurOurs />} />
                    <Route path="/admin/history" element={<AdminHistory />} />
                    <Route path="/admin/team" element={<AdminTeam />} />
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