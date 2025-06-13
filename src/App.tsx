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
const Profile = lazy(() => import("./pages/auth/Profile"));
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminArticles = lazy(() => import("./pages/admin/Articles"));
const AdminEvents = lazy(() => import("./pages/admin/Events"));
const AdminGallery = lazy(() => import("./pages/admin/Gallery"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminTickets = lazy(() => import("./pages/admin/Tickets"));
const AdminSEO = lazy(() => import("./pages/admin/SEO"));
const ArticleDetail = lazy(() => import("./pages/ArticleDetail"));
const EventDetail = lazy(() => import("./pages/EventDetail"));
const Articles = lazy(() => import("./pages/Articles"));
const Terms = lazy(() => import("./pages/Terms"));
const LegalNotice = lazy(() => import("./pages/LegalNotice"));
const AlbumDetail = lazy(() => import("./pages/AlbumDetail"));

// Components
import RequireAuth from "./components/auth/RequireAuth";
import RequireAdmin from "./components/auth/RequireAdmin"; 
import ExternalRedirect from "./components/ExternalRedirect";
import PageLoader from "./components/PageLoader";
import { LOOMOrganizationSchema } from "./components/SEOStructuredData";
import { AutoBreadcrumbs } from "./components/InternalLinks";

const queryClient = new QueryClient();

// HelloAsso URLs - Direct links without host prefixing
const SHOP_URL = "https://www.helloasso.com/associations/your-association/boutiques/shop";
const MEMBERSHIP_URL = "https://www.helloasso.com/associations/association-les-ours-occitanie-mediterranee-loom/adhesions/adhesion-2024-2025";

// Mapping des routes vers leurs titres
const PAGE_TITLES: { [key: string]: string } = {
  "/": "LOOM - Les Ours Occitanie Méditerranée",
  "/about": "LOOM - À propos",
  "/events": "LOOM - Événements",
  "/articles": "LOOM - Articles",
  "/monsieur-ours": "LOOM - Monsieur Ours",
  "/gallery": "LOOM - Galerie Photos",
  "/partners": "LOOM - Nos Partenaires",
  "/auth/login": "LOOM - Connexion",
  "/auth/register": "LOOM - Inscription",
  "/auth/profile": "LOOM - Mon Profil",  "/admin/dashboard": "LOOM Admin - Tableau de bord",
  "/admin/articles": "LOOM Admin - Articles",
  "/admin/events": "LOOM Admin - Événements",
  "/admin/gallery": "LOOM Admin - Galerie",
  "/admin/users": "LOOM Admin - Utilisateurs",
  "/admin/tickets": "LOOM Admin - Tickets",  "/admin/seo": "LOOM Admin - SEO & Référencement",
  "/terms": "LOOM - Conditions d'utilisation",
  "/legal-notice": "LOOM - Mentions légales",
  "/unauthorized": "LOOM - Accès non autorisé"
};

// Composant qui force le rechargement complet à chaque navigation
function RouteReload() {
  const location = useLocation();
  const isFirstRender = React.useRef(true);
  React.useEffect(() => {
    // Gestion des titres dynamiques pour les pages avec paramètres
    let pageTitle = PAGE_TITLES[location.pathname] || "LOOM - Les Ours Occitanie Méditerranée";
    
    // Gestion spéciale pour les pages avec slug
    if (location.pathname.startsWith("/articles/")) {
      pageTitle = "LOOM - Article";
    } else if (location.pathname.startsWith("/events/")) {
      pageTitle = "LOOM - Événement";
    }
    
    // Mise à jour du titre de la page
    document.title = pageTitle;
    
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    window.location.href = location.pathname + location.search + location.hash;
  }, [location]);
  return null;
}

const App = () => {
  // Scroll to top on route change
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
              
              {/* External Redirects - Using ExternalRedirect component */}
              <Route path="/shop" element={<ExternalRedirect url={SHOP_URL} />} />
              <Route path="/membership" element={<ExternalRedirect url={MEMBERSHIP_URL} />} />
              
              {/* Auth Routes */}
              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/register" element={<Register />} />
              <Route path="/login" element={<Navigate to="/auth/login" replace />} />
              <Route path="/register" element={<Navigate to="/auth/register" replace />} />
              
              {/* Protected User Routes */}
              <Route element={<RequireAuth />}>
                <Route path="/auth/profile" element={<Profile />} />
              </Route>
              
              {/* Admin Routes - Using RequireAuth and RequireAdmin as route wrappers */}
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              
              <Route element={<RequireAuth />}>                <Route element={<RequireAdmin />}>
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/articles" element={<AdminArticles />} />
                  <Route path="/admin/events" element={<AdminEvents />} />
                  <Route path="/admin/gallery" element={<AdminGallery />} />
                  <Route path="/admin/users" element={<AdminUsers />} />
                  <Route path="/admin/tickets" element={<AdminTickets />} />
                  <Route path="/admin/seo" element={<AdminSEO />} />
                </Route>
              </Route>                {/* Privacy Policy and Terms Routes */}              <Route path="/terms" element={<Terms />} />
              <Route path="/legal-notice" element={<LegalNotice />} />
              <Route path="/unauthorized" element={<Unauthorized />} />
              
              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
