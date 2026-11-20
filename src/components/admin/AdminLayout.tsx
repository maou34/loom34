import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  CalendarDays,
  Crown,
  ExternalLink,
  FileText,
  History,
  Home,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  MessageSquare,
  MoreHorizontal,
  Navigation,
  ShieldCheck,
  Store,
  User,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/db/client";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AdminLayoutProps = {
  children: ReactNode;
  title: string;
  /** Boutons d'action de l'écran (« Créer », « Ajouter »…), à droite du titre */
  actions?: ReactNode;
};

type NavItem = { title: string; href: string; icon: LucideIcon; badge?: "messages" };
type NavGroup = { label?: string; items: NavItem[] };

/** Menu de l'admin, groupé comme la maquette (SPEC § 4.1). */
const NAV: NavGroup[] = [
  {
    items: [
      { title: "Tableau de bord", href: "/admin/dashboard", icon: LayoutDashboard },
      { title: "Messages", href: "/admin/tickets", icon: MessageSquare, badge: "messages" },
    ],
  },
  {
    label: "Contenu",
    items: [
      { title: "Événements", href: "/admin/events", icon: CalendarDays },
      { title: "Articles", href: "/admin/articles", icon: FileText },
      { title: "Galerie photos", href: "/admin/gallery", icon: ImageIcon },
    ],
  },
  {
    label: "Association",
    items: [
      { title: "Partenaires", href: "/admin/partners", icon: Store },
      { title: "Monsieur Ours", href: "/admin/monsieur-ours", icon: Crown },
      { title: "Historique", href: "/admin/history", icon: History },
      { title: "La Tanière", href: "/admin/team", icon: UsersRound },
    ],
  },
  {
    label: "Site",
    items: [
      { title: "Page d'accueil", href: "/admin/home-settings", icon: Home },
      { title: "Navigation", href: "/admin/navigation", icon: Navigation },
      { title: "Administrateurs", href: "/admin/users", icon: ShieldCheck },
    ],
  },
];

/** Onglets du bas en mobile ; « Plus » ouvre le reste du menu. */
const MOBILE_TABS: NavItem[] = [
  { title: "Accueil", href: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Événements", href: "/admin/events", icon: CalendarDays },
  { title: "Articles", href: "/admin/articles", icon: FileText },
  { title: "Messages", href: "/admin/tickets", icon: MessageSquare, badge: "messages" },
];

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

function BearStripe({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("bg-bear", className)} />;
}

/** Nombre de messages à traiter (statut « Nouveau »), pour la pastille du menu. */
function useUnreadMessages() {
  const { data = 0 } = useQuery({
    queryKey: ["admin", "unreadMessages"],
    refetchInterval: 120_000,
    queryFn: async () => {
      const { count, error } = await db.from("contact_tickets").select("id", { count: "exact", head: true }).eq("status", "Nouveau");
      if (error) return 0;
      return count ?? 0;
    },
  });
  return data;
}

function Badge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="ml-auto min-w-[22px] rounded-full bg-loom-chip-hot-bg px-1.5 text-center text-xs font-bold leading-[20px] text-loom-chip-hot-fg">
      <span className="sr-only">, </span>
      {count > 99 ? "99+" : count}
      <span className="sr-only"> à traiter</span>
    </span>
  );
}

/**
 * Cadre de toutes les pages admin (maquettes admin/Sidebar, MobileTabs,
 * Mobile-Plus) : sidebar groupée de 248 px en desktop, barre d'onglets en bas
 * en mobile. Fond crème, contenu dans une carte blanche.
 */
export default function AdminLayout({ children, title, actions }: AdminLayoutProps) {
  const { signOut, profile, user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const unread = useUnreadMessages();
  const [moreOpen, setMoreOpen] = useState(false);

  const displayName = profile?.full_name || profile?.username || user?.email || "Administrateur";
  const initials = displayName
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const mobileTabActive = MOBILE_TABS.some((t) => isActive(pathname, t.href));

  return (
    <div className="flex min-h-screen bg-loom-bg text-[15px] text-loom-text">
      {/* Sidebar (desktop) */}
      <nav aria-label="Menu de l'administration" className="sticky top-0 hidden h-screen w-[248px] flex-none flex-col gap-4 overflow-y-auto border-r border-loom-border bg-loom-surface px-4 py-5 lg:flex">
        <BearStripe className="mx-2 -mb-2 h-1.5 flex-none rounded-full outline outline-1 outline-loom-border" />
        <Link to="/admin/dashboard" className={cn("flex items-center gap-3 rounded-xl px-2", focusRing)}>
          <img src="/logo-loom.png" alt="" width={40} height={40} className="h-10 w-10 rounded-xl" />
          <span className="flex flex-col">
            <span className="text-[17px] font-bold">LOOM</span>
            <span className="text-[13px] text-loom-text-muted">Administration</span>
          </span>
        </Link>

        {NAV.map((group, gi) => (
          <div key={gi} className="flex flex-col gap-0.5">
            {group.label && (
              <span className="px-3 pb-1 text-xs font-semibold uppercase tracking-[0.06em] text-loom-text-muted">{group.label}</span>
            )}
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-[10px] px-3 py-2 no-underline transition-colors",
                    active ? "bg-loom-chip-bg font-semibold text-loom-chip-fg" : "text-loom-text-2 hover:bg-loom-surface-2",
                    focusRing,
                  )}
                >
                  <Icon aria-hidden="true" className="h-[18px] w-[18px] flex-none" />
                  {item.title}
                  {item.badge === "messages" && <Badge count={unread} />}
                </Link>
              );
            })}
          </div>
        ))}

        <div className="mt-auto flex flex-col gap-1 border-t border-loom-border pt-3">
          <Link to="/" className={cn("flex items-center gap-3 rounded-[10px] px-3 py-2 text-loom-text-2 no-underline hover:bg-loom-surface-2", focusRing)}>
            <ExternalLink aria-hidden="true" className="h-[18px] w-[18px]" />
            Voir le site
          </Link>
          <div className="flex items-center gap-3 px-3 py-2">
            <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-loom-chip-bg text-[13px] font-semibold text-loom-chip-fg">
              {initials}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold">{displayName}</span>
              <span className="text-xs text-loom-text-muted">Administrateur</span>
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Menu du compte (profil, déconnexion)"
                className={cn("flex h-11 w-11 items-center justify-center rounded-[10px] text-loom-text-muted hover:bg-loom-surface-2", focusRing)}
              >
                <MoreHorizontal aria-hidden="true" className="h-5 w-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top">
                <DropdownMenuItem asChild>
                  <Link to="/auth/profile">
                    <User className="mr-2 h-4 w-4" /> Mon profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-loom-danger focus:text-loom-danger">
                  <LogOut className="mr-2 h-4 w-4" /> Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* En-tête mobile */}
        <div className="sticky top-0 z-30 lg:hidden">
          <BearStripe className="h-[5px]" />
          <header className="flex h-[60px] items-center gap-3 border-b border-loom-border bg-loom-surface px-4">
            <h1 className="min-w-0 flex-1 truncate text-xl font-bold">{title}</h1>
            {actions && <div className="flex flex-none items-center gap-2">{actions}</div>}
          </header>
        </div>

        <main className="flex-1 px-4 pb-28 pt-4 lg:px-8 lg:pb-10 lg:pt-8">
          <div className="mb-6 hidden flex-wrap items-center justify-between gap-3 lg:flex">
            <h1 className="text-[26px] font-bold">{title}</h1>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
          <div className="rounded-2xl border border-loom-border bg-loom-surface p-4 md:p-6">{children}</div>
        </main>
      </div>

      {/* Onglets du bas (mobile) */}
      <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 z-40 grid h-[76px] grid-cols-5 border-t border-loom-border bg-loom-surface px-1 pb-[max(14px,env(safe-area-inset-bottom))] pt-1.5 lg:hidden">
        {MOBILE_TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              to={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center justify-center gap-[3px] rounded-lg text-[11px] no-underline",
                active ? "font-bold text-loom-chip-fg" : "font-medium text-loom-text-muted",
                focusRing,
              )}
            >
              <span className={cn("flex h-7 w-[52px] items-center justify-center rounded-full", active && "bg-loom-chip-bg")}>
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              {tab.title}
              {tab.badge === "messages" && unread > 0 && (
                <span className="absolute right-[18%] top-0 min-w-[18px] rounded-full bg-loom-chip-hot-bg px-1 text-center text-[10px] font-bold leading-[18px] text-loom-chip-hot-fg">
                  {unread > 99 ? "99+" : unread}
                  <span className="sr-only"> à traiter</span>
                </span>
              )}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
          className={cn(
            "flex flex-col items-center justify-center gap-[3px] rounded-lg text-[11px]",
            !mobileTabActive ? "font-bold text-loom-chip-fg" : "font-medium text-loom-text-muted",
            focusRing,
          )}
        >
          <span className={cn("flex h-7 w-[52px] items-center justify-center rounded-full", !mobileTabActive && "bg-loom-chip-bg")}>
            <MenuIcon aria-hidden="true" className="h-5 w-5" />
          </span>
          Plus
        </button>
      </nav>

      {/* « Plus » : le reste du menu, groupé */}
      <DialogPrimitive.Root open={moreOpen} onOpenChange={setMoreOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 lg:hidden" />
          <DialogPrimitive.Content aria-describedby={undefined} className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88vh] flex-col overflow-y-auto rounded-t-[22px] bg-loom-bg pb-[max(16px,env(safe-area-inset-bottom))] lg:hidden">
            <div className="sticky top-0 flex h-[60px] items-center border-b border-loom-border bg-loom-surface px-4">
              <DialogPrimitive.Title className="flex-1 text-xl font-bold">Plus</DialogPrimitive.Title>
              <DialogPrimitive.Close aria-label="Fermer" className={cn("flex h-11 w-11 items-center justify-center rounded-full", focusRing)}>
                <X aria-hidden="true" className="h-6 w-6" />
              </DialogPrimitive.Close>
            </div>
            <div className="flex flex-col gap-[18px] p-4">
              <div className="flex items-center gap-3 rounded-[14px] border border-loom-border bg-loom-surface p-3.5">
                <span aria-hidden="true" className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-loom-chip-bg font-bold text-loom-chip-fg">
                  {initials}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-semibold">{displayName}</span>
                  <span className="text-[13px] text-loom-text-muted">Administrateur</span>
                </span>
                <Link to="/" onClick={() => setMoreOpen(false)} className={cn("flex h-11 items-center gap-1.5 rounded-[10px] bg-loom-chip-bg px-3 text-sm font-semibold text-loom-chip-fg no-underline", focusRing)}>
                  Voir le site
                </Link>
              </div>
              {NAV.filter((g) => g.label).map((group) => {
                const items = group.items.filter((item) => !MOBILE_TABS.some((t) => t.href === item.href));
                if (!items.length) return null;
                return (
                  <section key={group.label} aria-label={group.label} className="flex flex-col gap-2">
                    <h2 className="mx-1 text-xs font-bold uppercase tracking-[0.05em] text-loom-text-muted">{group.label}</h2>
                    <div className="overflow-hidden rounded-[14px] border border-loom-border bg-loom-surface">
                      {items.map((item, i) => {
                        const Icon = item.icon;
                        const active = isActive(pathname, item.href);
                        return (
                          <Link
                            key={item.href}
                            to={item.href}
                            onClick={() => setMoreOpen(false)}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "flex h-[52px] items-center gap-3.5 px-3.5 no-underline",
                              i > 0 && "border-t border-loom-border",
                              active ? "bg-loom-chip-bg font-semibold text-loom-chip-fg" : "text-loom-text",
                              focusRing,
                            )}
                          >
                            <Icon aria-hidden="true" className="h-5 w-5 text-loom-text-muted" />
                            <span className="flex-1">{item.title}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
              <button
                type="button"
                onClick={handleSignOut}
                className={cn("flex h-12 items-center justify-center gap-2 rounded-[14px] border border-loom-border-strong bg-loom-surface font-semibold text-loom-danger", focusRing)}
              >
                <LogOut aria-hidden="true" className="h-5 w-5" /> Se déconnecter
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
