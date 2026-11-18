// site-stats : statistiques du tableau de bord de l'admin.
//
// Réservée aux admins (jeton de session vérifié ici, comme admin-users ;
// verify_jwt = false dans config.toml). Corps JSON { action, ... } :
//   visits { days: 7 | 30 } → Cloudflare Web Analytics (le script beacon de
//          index.html) : visites, pages vues, série par jour, pages les plus vues,
//          et le total de la période précédente pour la comparaison.
//          Secrets : CF_API_TOKEN (droit « Account Analytics : Read »),
//          CF_ACCOUNT_ID, CF_SITE_TAG (facultatif : sans lui, tout le compte).
//   uptime → UptimeRobot (getMonitors) : état, disponibilité sur 30 jours, temps
//          de réponse moyen. Secret : UPTIMEROBOT_API_KEY (clé « Read-Only »).
// Une source non configurée répond { configured: false } (le tableau de bord
// affiche alors une invite), jamais une erreur.
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } });

const DAY_MS = 86_400_000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

type RumGroup = { count: number; sum?: { visits: number }; dimensions?: { date?: string; requestPath?: string } };

async function cloudflareVisits(days: number) {
  const token = Deno.env.get("CF_API_TOKEN");
  const account = Deno.env.get("CF_ACCOUNT_ID");
  if (!token || !account) return { configured: false };
  const siteTag = Deno.env.get("CF_SITE_TAG");

  const now = new Date();
  // Période = les `days` derniers jours, aujourd'hui compris
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - (days - 1) * DAY_MS);
  const prevStart = new Date(start.getTime() - days * DAY_MS);
  const filter = (from: Date, to: Date) => ({
    AND: [{ datetime_geq: from.toISOString() }, { datetime_lt: to.toISOString() }, ...(siteTag ? [{ siteTag }] : [])],
  });

  const query = `query ($account: string!, $cur: AccountRumPageloadEventsAdaptiveGroupsFilter_InputObject, $prev: AccountRumPageloadEventsAdaptiveGroupsFilter_InputObject) {
    viewer { accounts(filter: { accountTag: $account }) {
      total: rumPageloadEventsAdaptiveGroups(filter: $cur, limit: 1) { count sum { visits } }
      previous: rumPageloadEventsAdaptiveGroups(filter: $prev, limit: 1) { count sum { visits } }
      previousDays: rumPageloadEventsAdaptiveGroups(filter: $prev, limit: 100) { count dimensions { date } }
      series: rumPageloadEventsAdaptiveGroups(filter: $cur, limit: 100, orderBy: [date_ASC]) { count sum { visits } dimensions { date } }
      pages: rumPageloadEventsAdaptiveGroups(filter: $cur, limit: 12, orderBy: [count_DESC]) { count dimensions { requestPath } }
    } }
  }`;
  const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { account, cur: filter(start, now), prev: filter(prevStart, start) } }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.errors?.length) {
    throw new Error(`Cloudflare : ${body?.errors?.[0]?.message ?? `HTTP ${res.status}`}`);
  }
  const acc = body?.data?.viewer?.accounts?.[0];
  if (!acc) throw new Error("Cloudflare : compte introuvable (vérifier CF_ACCOUNT_ID et les droits du jeton)");

  const first = (g: RumGroup[] | undefined) => g?.[0] ?? { count: 0, sum: { visits: 0 } };
  const byDate = new Map<string, RumGroup>((acc.series as RumGroup[]).map((g) => [g.dimensions?.date ?? "", g]));
  const series = Array.from({ length: days }, (_, i) => {
    const date = isoDay(new Date(start.getTime() + i * DAY_MS));
    const g = byDate.get(date);
    return { date, visits: g?.sum?.visits ?? 0, pageViews: g?.count ?? 0 };
  });

  return {
    configured: true,
    days,
    visits: first(acc.total).sum?.visits ?? 0,
    pageViews: first(acc.total).count ?? 0,
    previousVisits: first(acc.previous).sum?.visits ?? 0,
    // Jours de la période précédente avec des données : la comparaison n'a de sens que si
    // l'outil mesurait déjà le site (sinon « +1140 % » le premier mois)
    previousDaysWithData: (acc.previousDays as RumGroup[]).filter((g) => g.count > 0).length,
    series,
    topPages: (acc.pages as RumGroup[]).map((g) => ({ path: g.dimensions?.requestPath ?? "/", pageViews: g.count })),
  };
}

const UPTIME_STATUS: Record<number, string> = { 0: "paused", 1: "pending", 2: "up", 8: "seems_down", 9: "down" };

async function uptimeRobot() {
  const key = Deno.env.get("UPTIMEROBOT_API_KEY");
  if (!key) return { configured: false };
  const res = await fetch("https://api.uptimerobot.com/v2/getMonitors", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body: new URLSearchParams({ api_key: key, format: "json", custom_uptime_ratios: "30", response_times: "1", response_times_limit: "1" }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.stat !== "ok") throw new Error(`UptimeRobot : ${body?.error?.message ?? `HTTP ${res.status}`}`);
  return {
    configured: true,
    monitors: (body.monitors ?? []).map((m: Record<string, unknown>) => ({
      name: String(m.friendly_name ?? ""),
      url: String(m.url ?? ""),
      status: UPTIME_STATUS[Number(m.status)] ?? "unknown",
      uptime30: m.custom_uptime_ratio !== undefined ? Number(m.custom_uptime_ratio) : null,
      avgResponseMs: m.average_response_time !== undefined ? Math.round(Number(m.average_response_time)) : null,
      lastResponseMs: Array.isArray(m.response_times) && m.response_times[0] ? Number((m.response_times[0] as { value: number }).value) : null,
    })),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return json({ error: "Configuration Supabase manquante" }, 500);
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

    const token = (req.headers.get("Authorization") ?? "").match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return json({ error: "Non connecté" }, 401);
    const { data: caller, error: callerErr } = await admin.auth.getUser(token);
    if (callerErr || !caller.user) return json({ error: "Session invalide" }, 401);
    const { data: profile } = await admin.from("profiles").select("is_admin").eq("id", caller.user.id).maybeSingle();
    if (!profile?.is_admin) return json({ error: "Réservé aux administrateurs" }, 403);

    const body = await req.json().catch(() => ({}));
    switch (body?.action) {
      case "visits":
        return json(await cloudflareVisits(body.days === 7 ? 7 : 30));
      case "uptime":
        return json(await uptimeRobot());
      default:
        return json({ error: "Action inconnue" }, 400);
    }
  } catch (e) {
    console.error("site-stats", e instanceof Error ? e.message : e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 502);
  }
});
