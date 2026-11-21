import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { CalendarDays, ChevronRight, FileText, Plus, Ticket } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import HealthCard from "@/components/admin/dashboard/HealthCard";
import SecurityCard from "@/components/admin/dashboard/SecurityCard";
import VisitsCard from "@/components/admin/dashboard/VisitsCard";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/db/client";
import { dateBlockParts, daysUntil, formatCountdown, todayISO } from "@/lib/eventDates";
import { eventCity } from "@/lib/eventPlace";
import { getCapacity } from "@/lib/ticketing";

/** Synchronisation HelloAsso considérée en retard au-delà de ce délai (le cron passe toutes les 15 min) */
const SYNC_STALE_MS = 60 * 60 * 1000;

type Todo = { title: string; detail: string; href: string };

const card = "flex flex-col gap-3 rounded-2xl border border-loom-border bg-loom-surface p-4 md:p-5";
const cardTitle = "text-base font-bold";
const cardLink = "text-sm font-semibold text-loom-accent-text hover:underline";

function greeting(now = new Date()) {
  const h = now.getHours();
  return h >= 18 || h < 5 ? "Bonsoir" : "Bonjour";
}

/** Toutes les données du tableau de bord, en une requête groupée. */
function useDashboard() {
  const today = todayISO();
  return useQuery({
    queryKey: ["admin", "dashboard", today],
    queryFn: async () => {
      const [upcoming, articles, partners, messages, admins, pastDrafts] = await Promise.all([
        db
          .from("events")
          .select("id, title, slug, date, time, location, published, latitude, helloasso_form_slug, helloasso_synced_at, tickets_sold, tickets_sold_discounted, ticket_capacity, helloasso_capacity")
          .gte("date", today)
          .order("date", { ascending: true }),
        db.from("articles").select("id, title, slug, date, published, article_categories(name)").order("date", { ascending: false }),
        db.from("partners").select("id, name, city"),
        db.from("contact_tickets").select("id, name, subject, created_at, status").order("created_at", { ascending: false }).limit(50),
        db.from("profiles").select("id").eq("is_admin", true),
        db.from("events").select("id").lt("date", today).eq("published", false),
      ]);
      // Les erreurs Supabase ne sont pas des Error : on les convertit pour un message lisible
      for (const r of [upcoming, articles, partners, messages, admins, pastDrafts]) if (r.error) throw new Error(r.error.message);
      return {
        upcoming: upcoming.data ?? [],
        articles: articles.data ?? [],
        partners: partners.data ?? [],
        messages: messages.data ?? [],
        adminCount: admins.data?.length ?? 0,
        pastDraftCount: pastDrafts.data?.length ?? 0,
      };
    },
  });
}

/**
 * Tableau de bord de l'admin (maquette admin/Main) : prochains événements, points
 * à traiter, messages, derniers articles, chiffres clés, et en tête les blocs
 * « Visites du site » (Cloudflare Web Analytics) et « Santé du site » (UptimeRobot +
 * route /upload/status du serveur d'images), via src/lib/siteStats.ts.
 */
export default function AdminDashboard() {
  const { profile } = useAuth();
  const { data, isLoading, error } = useDashboard();
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || profile?.username || "";

  const upcoming = data?.upcoming ?? [];
  const nextPublished = upcoming.find((e) => e.published);
  const publishedArticles = (data?.articles ?? []).filter((a) => a.published);
  const draftArticles = (data?.articles ?? []).filter((a) => !a.published);
  const newMessages = (data?.messages ?? []).filter((m) => m.status === "Nouveau");
  const pendingMessages = (data?.messages ?? []).filter((m) => m.status === "Nouveau" || m.status === "En attente");

  const todos: Todo[] = [];
  if (data) {
    const drafts = upcoming.filter((e) => !e.published);
    if (drafts.length)
      todos.push({
        title: drafts.length > 1 ? `${drafts.length} événements à venir en brouillon` : `« ${drafts[0].title} » encore en brouillon`,
        detail: drafts.length > 1 ? drafts.map((e) => e.title).slice(0, 3).join(", ") : `Prévu ${formatCountdown(drafts[0].date)} — à publier ou supprimer`,
        href: "/admin/events?onglet=drafts",
      });
    const stale = upcoming.filter(
      (e) => e.helloasso_form_slug && (!e.helloasso_synced_at || Date.now() - new Date(e.helloasso_synced_at).getTime() > SYNC_STALE_MS),
    );
    if (stale.length)
      todos.push({
        title: "Billetterie HelloAsso pas synchronisée",
        detail: `${stale.map((e) => e.title).slice(0, 2).join(", ")} : chiffres de plus d'une heure — vérifier le cron`,
        href: "/admin/events",
      });
    const noMap = upcoming.filter((e) => e.published && e.latitude === null);
    const noCity = upcoming.filter((e) => !eventCity(e.location));
    if (noCity.length)
      todos.push({ title: `${noCity.length} événement${noCity.length > 1 ? "s" : ""} sans ville reconnue`, detail: noCity.map((e) => e.title).slice(0, 2).join(", "), href: "/admin/events" });
    else if (noMap.length)
      todos.push({ title: `${noMap.length} événement${noMap.length > 1 ? "s" : ""} sans plan d'accès`, detail: "Bouton « Calculer les plans manquants » dans Événements", href: "/admin/events" });
    if (draftArticles.length)
      todos.push({
        title: `${draftArticles.length} article${draftArticles.length > 1 ? "s" : ""} en brouillon`,
        detail: draftArticles.map((a) => a.title).slice(0, 2).join(", "),
        href: "/admin/articles?onglet=drafts",
      });
    const partnersNoCity = data.partners.filter((p) => !p.city);
    if (partnersNoCity.length)
      todos.push({ title: `${partnersNoCity.length} partenaire${partnersNoCity.length > 1 ? "s" : ""} sans ville`, detail: "Nécessaire au filtre par ville du site", href: "/admin/partners" });
  }

  const subtitle = (() => {
    const date = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    const day = date.charAt(0).toUpperCase() + date.slice(1);
    if (!nextPublished) return day;
    const days = daysUntil(nextPublished.date);
    return `${day} · prochain événement ${days === 0 ? "aujourd'hui" : days === 1 ? "demain" : `dans ${days} jours`}`;
  })();

  const stats = [
    { value: publishedArticles.length, label: "Articles publiés", href: "/admin/articles" },
    { value: upcoming.filter((e) => e.published).length, label: "Événements à venir", href: "/admin/events" },
    { value: data?.partners.length ?? 0, label: "Partenaires", href: "/admin/partners" },
    { value: data?.adminCount ?? 0, label: "Administrateurs", href: "/admin/users" },
  ];

  return (
    <AdminLayout
      title="Tableau de bord"
      actions={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="sr-only sm:not-sr-only">Créer</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to="/admin/events?nouveau=1">
                <CalendarDays className="mr-2 h-4 w-4" /> Un événement
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/admin/articles?nouveau=1">
                <FileText className="mr-2 h-4 w-4" /> Un article
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <p className="text-xl font-bold">
            {greeting()}
            {firstName && ` ${firstName}`}
          </p>
          <p className="text-sm text-loom-text-muted">{subtitle}</p>
        </div>

        {/* Visites (Cloudflare Web Analytics) et santé du site (UptimeRobot + serveur) */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <VisitsCard className={card} />
          <HealthCard className={card} />
        </div>

        {/* Audit de sécurité automatique de la base (Edge Function security-audit) */}
        <SecurityCard className={card} />

        {error ? (
          <p role="alert" className="rounded-xl border border-loom-border bg-loom-surface-2 p-4 text-sm">
            Impossible de charger le tableau de bord : {error instanceof Error ? error.message : String(error)}
          </p>
        ) : isLoading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              {/* Prochains événements */}
              <section aria-labelledby="h-events" className={card}>
                <div className="flex items-center justify-between gap-3">
                  <h2 id="h-events" className={cardTitle}>
                    Prochains événements
                  </h2>
                  <Link to="/admin/events" className={cardLink}>
                    <span className="sm:hidden">Tout voir →</span>
                    <span className="hidden sm:inline">Tous les événements →</span>
                  </Link>
                </div>
                {upcoming.length === 0 ? (
                  <p className="text-sm text-loom-text-muted">Aucun événement à venir.</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {upcoming.slice(0, 5).map((e) => {
                      const d = dateBlockParts(e.date);
                      const capacity = getCapacity(e);
                      return (
                        <li key={e.id}>
                          <Link to={`/events/${e.slug}`} target="_blank" className="flex items-center gap-3 rounded-xl p-2 hover:bg-loom-surface-2">
                            <span aria-hidden="true" className="flex w-11 flex-none flex-col items-center rounded-lg bg-loom-surface-2 py-1">
                              <span className="text-base font-extrabold leading-tight">{d.day}</span>
                              <span className="text-[10px] font-bold text-loom-accent-text">{d.month}</span>
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="flex items-center gap-1.5 font-semibold">
                                <span className="sr-only">{d.full} : </span>
                                <span className="truncate">{e.title}</span>
                              </span>
                              <span className="truncate text-sm text-loom-text-muted">
                                {e.helloasso_form_slug && e.tickets_sold !== null ? (
                                  <>
                                    <Ticket aria-hidden="true" className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
                                    {e.tickets_sold}
                                    {capacity ? `/${capacity}` : ""} inscrit{e.tickets_sold > 1 ? "s" : ""}
                                    {(e.tickets_sold_discounted ?? 0) > 0 && ` · dont ${e.tickets_sold_discounted} tarif réduit`}
                                  </>
                                ) : (
                                  [e.time, e.location].filter(Boolean).join(" · ")
                                )}
                              </span>
                            </span>
                            <span className="hidden flex-none flex-col items-end gap-1 sm:flex">
                              {!e.published && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">Brouillon</span>}
                              <span className="text-xs text-loom-text-muted">{formatCountdown(e.date)}</span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <div className="flex flex-col gap-4">
                {/* À traiter */}
                <section aria-labelledby="h-todo" className={card}>
                  <h2 id="h-todo" className={cardTitle}>
                    À traiter
                  </h2>
                  {todos.length === 0 ? (
                    <p className="text-sm text-loom-text-muted">Tout est à jour.</p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {todos.map((t) => (
                        <li key={t.title}>
                          <Link to={t.href} className="flex items-center gap-2 rounded-xl p-2 hover:bg-loom-surface-2">
                            <span aria-hidden="true" className="h-2 w-2 flex-none rounded-full bg-loom-accent-text" />
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="font-semibold">{t.title}</span>
                              <span className="truncate text-sm text-loom-text-muted">{t.detail}</span>
                            </span>
                            <ChevronRight aria-hidden="true" className="h-4 w-4 flex-none text-loom-text-muted" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  {(data?.pastDraftCount ?? 0) > 0 && (
                    <p className="text-xs text-loom-text-muted">
                      {data?.pastDraftCount} événement{(data?.pastDraftCount ?? 0) > 1 ? "s" : ""} passé{(data?.pastDraftCount ?? 0) > 1 ? "s" : ""} non publié
                      {(data?.pastDraftCount ?? 0) > 1 ? "s" : ""} (onglet « Passés »).
                    </p>
                  )}
                </section>

                {/* Messages */}
                <section aria-labelledby="h-msg" className={card}>
                  <div className="flex items-center justify-between gap-3">
                    <h2 id="h-msg" className={cardTitle}>
                      Messages
                      {newMessages.length > 0 && (
                        <span className="ml-2 rounded-full bg-loom-accent-text px-2 py-0.5 text-xs font-bold text-white">
                          {newMessages.length} nouveau{newMessages.length > 1 ? "x" : ""}
                        </span>
                      )}
                    </h2>
                    <Link to="/admin/tickets" className={cardLink}>
                      Ouvrir →
                    </Link>
                  </div>
                  {pendingMessages.length === 0 ? (
                    <p className="text-sm text-loom-text-muted">Aucun message à traiter.</p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {pendingMessages.slice(0, 3).map((m) => (
                        <li key={m.id}>
                          <Link to={`/admin/tickets?message=${m.id}`} className="flex flex-col rounded-xl p-2 hover:bg-loom-surface-2">
                            <span className={`truncate ${m.status === "Nouveau" ? "font-bold" : "font-semibold"}`}>{m.subject}</span>
                            <span className="truncate text-sm text-loom-text-muted">
                              {m.name} · {m.created_at ? new Date(m.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : ""}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              {/* Derniers articles */}
              <section aria-labelledby="h-articles" className={card}>
                <div className="flex items-center justify-between gap-3">
                  <h2 id="h-articles" className={cardTitle}>
                    Derniers articles publiés
                  </h2>
                  <Link to="/admin/articles" className={cardLink}>
                    <span className="sm:hidden">Tout voir →</span>
                    <span className="hidden sm:inline">Tous les articles →</span>
                  </Link>
                </div>
                {publishedArticles.length === 0 ? (
                  <p className="text-sm text-loom-text-muted">Aucun article publié.</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {publishedArticles.slice(0, 3).map((a) => (
                      <li key={a.id}>
                        <Link to={`/articles/${a.slug}`} target="_blank" className="flex items-center gap-3 rounded-xl p-2 hover:bg-loom-surface-2">
                          <span className="min-w-0 flex-1 truncate font-semibold">{a.title}</span>
                          {a.article_categories?.name && (
                            <span className="hidden flex-none rounded-full bg-loom-surface-2 px-2 py-0.5 text-xs font-semibold text-loom-text-2 sm:inline">{a.article_categories.name}</span>
                          )}
                          <span className="flex-none text-sm text-loom-text-muted">
                            {new Date(a.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Chiffres */}
              <section aria-labelledby="h-stats" className={card}>
                <h2 id="h-stats" className={cardTitle}>
                  Le site en chiffres
                </h2>
                <ul className="grid grid-cols-2 gap-2">
                  {stats.map((s) => (
                    <li key={s.label}>
                      <Link to={s.href} className="flex flex-col rounded-xl bg-loom-surface-2 p-3 hover:ring-1 hover:ring-loom-border-strong">
                        <span className="text-2xl font-extrabold">{s.value}</span>
                        <span className="text-sm text-loom-text-muted">{s.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
