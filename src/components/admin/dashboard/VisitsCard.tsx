import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { db } from "@/db/client";
import { STATIC_PAGE_LABELS, useSiteVisits } from "@/lib/siteStats";

const nf = new Intl.NumberFormat("fr-FR");
const shortDay = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

/**
 * Pages les plus vues, regroupées par page : une ancienne adresse (slug renommé,
 * table slug_redirects) compte pour la nouvelle ; libellé = titre de la fiche.
 */
function useTopPages(pages: { path: string; pageViews: number }[]) {
  const clean = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);
  const slugsOf = (prefix: string) => pages.map((p) => clean(p.path)).filter((p) => p.startsWith(prefix)).map((p) => decodeURIComponent(p.slice(prefix.length)));
  const eventSlugs = slugsOf("/events/");
  const articleSlugs = slugsOf("/articles/");
  const { data } = useQuery({
    queryKey: ["admin", "pageLabels", eventSlugs, articleSlugs],
    enabled: eventSlugs.length + articleSlugs.length > 0,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const redirects: Record<string, string> = {};
      const { data: rows } = await db.from("slug_redirects").select("kind, old_slug, new_slug").in("old_slug", [...eventSlugs, ...articleSlugs]);
      for (const r of rows ?? []) redirects[`/${r.kind}/${r.old_slug}`] = `/${r.kind}/${r.new_slug}`;
      const resolved = (kind: string, slugs: string[]) => slugs.map((s) => (redirects[`/${kind}/${s}`] ?? `/${kind}/${s}`).slice(kind.length + 2));
      const [ev, ar] = await Promise.all([
        eventSlugs.length ? db.from("events").select("slug, title").in("slug", resolved("events", eventSlugs)) : Promise.resolve({ data: [] }),
        articleSlugs.length ? db.from("articles").select("slug, title").in("slug", resolved("articles", articleSlugs)) : Promise.resolve({ data: [] }),
      ]);
      const titles: Record<string, string> = {};
      for (const e of ev.data ?? []) titles[`/events/${e.slug}`] = e.title;
      for (const a of ar.data ?? []) titles[`/articles/${a.slug}`] = a.title;
      return { redirects, titles };
    },
  });

  return useMemo(() => {
    const merged = new Map<string, number>();
    for (const p of pages) {
      let path = clean(p.path);
      try {
        path = decodeURIComponent(path);
      } catch {
        // adresse mal encodée : gardée telle quelle
      }
      const target = data?.redirects[path] ?? path;
      merged.set(target, (merged.get(target) ?? 0) + p.pageViews);
    }
    return [...merged.entries()]
      .map(([path, pageViews]) => ({ path, pageViews, label: STATIC_PAGE_LABELS[path] ?? data?.titles[path] ?? path }))
      .sort((a, b) => b.pageViews - a.pageViews)
      .slice(0, 5);
  }, [pages, data]);
}

function VisitsChart({ series }: { series: { date: string; visits: number; pageViews: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...series.map((d) => d.visits));
  const peak = series.reduce((best, d, i) => (d.visits > series[best].visits ? i : best), 0);
  const summary = `Visites par jour du ${shortDay(series[0].date)} au ${shortDay(series[series.length - 1].date)} ; maximum ${nf.format(series[peak].visits)} le ${shortDay(series[peak].date)}.`;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        {/* Grille : une ligne de base, recessive */}
        <div role="img" aria-label={summary} className="flex h-28 items-end gap-[2px] border-b border-loom-border" onMouseLeave={() => setHover(null)}>
          {series.map((d, i) => (
            <div
              key={d.date}
              className="flex h-full min-w-0 flex-1 items-end"
              onMouseEnter={() => setHover(i)}
              aria-hidden="true"
            >
              <div
                className={`w-full rounded-t-[4px] bg-loom-accent-text transition-opacity ${hover !== null && hover !== i ? "opacity-40" : ""}`}
                style={{ height: `${Math.max(d.visits > 0 ? 3 : 0, (d.visits / max) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        {hover !== null && (
          <div
            role="status"
            className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-loom-border bg-loom-surface px-2.5 py-1.5 text-xs shadow-loom-card"
            style={{ left: `${((hover + 0.5) / series.length) * 100}%` }}
          >
            <span className="font-semibold">{shortDay(series[hover].date)}</span>
            <span className="text-loom-text-muted"> · {nf.format(series[hover].visits)} visite{series[hover].visits > 1 ? "s" : ""} · {nf.format(series[hover].pageViews)} pages vues</span>
          </div>
        )}
      </div>
      <div className="flex justify-between text-xs text-loom-text-muted">
        <span>{shortDay(series[0].date)}</span>
        {series[peak].visits > 0 && (
          <span>
            Pic : {nf.format(series[peak].visits)} le {shortDay(series[peak].date)}
          </span>
        )}
        <span>Aujourd'hui</span>
      </div>
      {/* Version tableau pour les lecteurs d'écran */}
      <table className="sr-only">
        <caption>Visites et pages vues par jour</caption>
        <thead>
          <tr>
            <th scope="col">Jour</th>
            <th scope="col">Visites</th>
            <th scope="col">Pages vues</th>
          </tr>
        </thead>
        <tbody>
          {series.map((d) => (
            <tr key={d.date}>
              <th scope="row">{shortDay(d.date)}</th>
              <td>{d.visits}</td>
              <td>{d.pageViews}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Bloc « Visites du site » du tableau de bord (Cloudflare Web Analytics via site-stats). */
export default function VisitsCard({ className }: { className: string }) {
  const [days, setDays] = useState<7 | 30>(30);
  const { data, isLoading, error } = useSiteVisits(days);
  const stats = data?.configured ? data : null;
  const topPages = useTopPages(stats?.topPages ?? []);

  const delta = useMemo(() => {
    // Comparaison seulement si l'outil mesurait déjà le site sur la période précédente
    if (!stats || stats.previousVisits === 0 || (stats.previousDaysWithData ?? 0) < stats.days * 0.8) return null;
    return Math.round(((stats.visits - stats.previousVisits) / stats.previousVisits) * 100);
  }, [stats]);
  const topMax = Math.max(1, ...topPages.map((p) => p.pageViews));

  return (
    <section aria-labelledby="h-visits" className={className}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="h-visits" className="text-base font-bold">
          Visites du site
        </h2>
        <div role="tablist" aria-label="Période" className="flex gap-1 rounded-xl bg-loom-surface-2 p-1 ring-1 ring-loom-border">
          {([7, 30] as const).map((d) => (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={days === d}
              onClick={() => setDays(d)}
              className={`h-8 rounded-[9px] px-3 text-sm ${days === d ? "bg-loom-surface font-bold shadow-sm" : "text-loom-text-2 hover:text-loom-text"}`}
            >
              {d} jours
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-loom-text-muted">Statistiques indisponibles : {error instanceof Error ? error.message : String(error)}</p>
      ) : isLoading ? (
        <div className="h-48 animate-pulse rounded-xl bg-loom-surface-2" />
      ) : !stats ? (
        <p className="text-sm text-loom-text-muted">
          Statistiques non configurées : il manque le jeton Cloudflare (secrets <code>CF_API_TOKEN</code> et <code>CF_ACCOUNT_ID</code> de la fonction
          site-stats).
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-2">
            <div className="flex flex-col rounded-xl bg-loom-surface-2 p-3">
              <dt className="order-2 text-xs text-loom-text-muted sm:text-sm">Visiteurs</dt>
              <dd className="order-1 text-xl font-extrabold sm:text-2xl">{nf.format(stats.visits)}</dd>
              {delta !== null && (
                <dd className="order-3 text-xs text-loom-text-muted">
                  {delta > 0 ? "+" : ""}
                  {delta} %<span className="hidden sm:inline"> vs {days} j précédents</span>
                </dd>
              )}
            </div>
            <div className="flex flex-col rounded-xl bg-loom-surface-2 p-3">
              <dt className="order-2 text-xs text-loom-text-muted sm:text-sm">Pages vues</dt>
              <dd className="order-1 text-xl font-extrabold sm:text-2xl">{nf.format(stats.pageViews)}</dd>
            </div>
            <div className="flex flex-col rounded-xl bg-loom-surface-2 p-3">
              <dt className="order-2 text-xs text-loom-text-muted sm:text-sm">Pages par visite</dt>
              <dd className="order-1 text-xl font-extrabold sm:text-2xl">
                {stats.visits ? (stats.pageViews / stats.visits).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) : "—"}
              </dd>
            </div>
          </dl>

          <VisitsChart series={stats.series} />

          {topPages.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-bold">Pages les plus vues</h3>
              <ul className="flex flex-col gap-1.5">
                {topPages.map((p) => (
                  <li key={p.path} className="grid grid-cols-[minmax(0,1fr)_6rem_3rem] items-center gap-3 text-sm">
                    <span className="truncate" title={p.path}>
                      {p.label}
                    </span>
                    <span aria-hidden="true" className="h-2 rounded-full bg-loom-surface-2">
                      <span className="block h-2 rounded-full bg-loom-accent-text" style={{ width: `${(p.pageViews / topMax) * 100}%` }} />
                    </span>
                    <span className="text-right text-loom-text-muted">{nf.format(p.pageViews)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-loom-text-muted">Source : Cloudflare Web Analytics, sans cookies. Chiffres estimés par Cloudflare à partir d'un échantillon des visites.</p>
        </>
      )}
    </section>
  );
}
