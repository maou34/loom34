// Accès à l'API HelloAsso v5, partagé par les Edge Functions de billetterie
// (sync-events, helloasso-webhook).
//
// Variables d'environnement (supabase secrets en prod, .env.local en local) :
//   HELLOASSO_API_URL        https://api.helloasso-sandbox.com (dev) | https://api.helloasso.com (prod)
//   HELLOASSO_CLIENT_ID
//   HELLOASSO_CLIENT_SECRET
//   HELLOASSO_ORG_SLUG       slug de l'organisation (loom-test en sandbox)
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Variable d'environnement manquante : ${name}`);
  return value;
}

const apiUrl = () => requireEnv("HELLOASSO_API_URL").replace(/\/+$/, "");

/**
 * Le Cloudflare de l'API HelloAsso de prod renvoie une page 403 quand le
 * User-Agent contient « SupabaseEdgeRuntime » (celui envoyé par défaut par les
 * Edge Functions) — constaté le 2026-11-17, la sandbox ne le fait pas. On envoie
 * donc notre propre User-Agent à chaque appel.
 */
export const USER_AGENT = "LOOM-site/1.0 (+https://lgbt-loom.fr)";
export const orgSlug = () => requireEnv("HELLOASSO_ORG_SLUG");

// Marge avant expiration : on renouvelle le token une minute avant la fin.
const EXPIRY_MARGIN_MS = 60_000;
// Le refresh token HelloAsso vaut 30 jours ; on se garde un jour de marge.
const REFRESH_TOKEN_TTL_MS = 29 * 24 * 3600 * 1000;

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

async function requestToken(params: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${apiUrl()}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT },
    body: new URLSearchParams(params),
  });
  if (!res.ok) {
    // Début de la réponse (aucune donnée personnelle ici) : distingue un refus
    // HelloAsso d'un blocage Cloudflare (page HTML, en-tête cf-ray).
    const body = (await res.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 200);
    const cf = res.headers.get("cf-ray") ? " [cloudflare]" : "";
    throw new Error(`HelloAsso oauth2/token (${params.grant_type}) : HTTP ${res.status}${cf} ${body}`);
  }
  return await res.json();
}

/**
 * Token d'accès HelloAsso, mis en cache dans la table helloasso_token (ligne
 * unique id = 1, accessible au seul service role). HelloAsso limite la création
 * de tokens : on réutilise le token tant qu'il est valide, puis on le renouvelle
 * avec le refresh token, et on ne repasse par client_credentials qu'en dernier recours.
 */
export async function getAccessToken(supabase: SupabaseClient, { forceNew = false } = {}): Promise<string> {
  const now = Date.now();
  const { data: cached, error } = await supabase
    .from("helloasso_token")
    .select("access_token, refresh_token, expires_at, refresh_expires_at")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(`Lecture de helloasso_token : ${error.message}`);

  if (!forceNew && cached && new Date(cached.expires_at).getTime() - EXPIRY_MARGIN_MS > now) {
    return cached.access_token;
  }

  const clientId = requireEnv("HELLOASSO_CLIENT_ID");
  let token: TokenResponse | null = null;

  if (cached?.refresh_token && cached.refresh_expires_at && new Date(cached.refresh_expires_at).getTime() > now) {
    try {
      token = await requestToken({
        grant_type: "refresh_token",
        client_id: clientId,
        refresh_token: cached.refresh_token,
      });
    } catch (e) {
      console.warn("Refresh du token HelloAsso refusé, nouvelle authentification :", (e as Error).message);
    }
  }

  token ??= await requestToken({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: requireEnv("HELLOASSO_CLIENT_SECRET"),
  });

  const { error: saveError } = await supabase.from("helloasso_token").upsert({
    id: 1,
    access_token: token.access_token,
    refresh_token: token.refresh_token ?? null,
    expires_at: new Date(now + token.expires_in * 1000).toISOString(),
    refresh_expires_at: token.refresh_token ? new Date(now + REFRESH_TOKEN_TTL_MS).toISOString() : null,
  });
  // Pas bloquant : le token reste utilisable même si le cache n'a pas pu être écrit.
  if (saveError) console.warn("Écriture de helloasso_token :", saveError.message);

  return token.access_token;
}

/**
 * GET authentifié sur l'API v5. `path` est relatif à /v5 (ex. "/organizations/x/forms").
 * En cas de 401 (token révoqué ou expiré plus tôt que prévu), on retente une fois
 * avec un token neuf.
 */
export async function helloAssoGet<T>(
  supabase: SupabaseClient,
  path: string,
  query?: URLSearchParams,
): Promise<T> {
  const url = `${apiUrl()}/v5${path}${query ? `?${query}` : ""}`;
  for (const forceNew of [false, true]) {
    const token = await getAccessToken(supabase, { forceNew });
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, "User-Agent": USER_AGENT } });
    if (res.status === 401 && !forceNew) continue;
    if (!res.ok) throw new Error(`HelloAsso GET ${path} : HTTP ${res.status}`);
    return await res.json();
  }
  throw new Error(`HelloAsso GET ${path} : 401 après renouvellement du token`);
}

// --- Formulaires -------------------------------------------------------------

/** Réponse de GET /organizations/{org}/forms/{formType}/{formSlug}/public (champs utilisés). */
export interface PublicForm {
  formSlug: string;
  formType: string;
  title: string;
  /** "Public" | "Private" (un brouillon apparaît aussi en "Private") | "Draft" | "Disabled" */
  state: string;
  description?: string | null;
  /** ISO avec fuseau, ex. "2026-12-10T18:00:00+01:00" (heure locale de l'événement) */
  startDate?: string | null;
  endDate?: string | null;
  /** Période de vente, absente si la billetterie n'en définit pas (saleEndDate vérifié en sandbox le 2026-11-17) */
  saleStartDate?: string | null;
  saleEndDate?: string | null;
  place?: {
    name?: string | null;
    address?: string | null;
    zipCode?: string | null;
    city?: string | null;
    /** Pas encore observé en sandbox : utilisé s'il est présent, sinon géocodage Nominatim */
    geoLocation?: { latitude?: number | null; longitude?: number | null } | null;
  } | null;
  logo?: { publicUrl?: string | null } | null;
  tiers?: Array<{ id: number; label: string; price: number; tierType: string }>;
}

/** Entrée de GET /organizations/{org}/forms (liste : pas de tarifs ni de lieu). */
export interface FormSummary {
  formSlug: string;
  formType: string;
  title: string;
  state: string;
  startDate?: string | null;
  endDate?: string | null;
  meta?: { createdAt?: string | null; updatedAt?: string | null } | null;
}

export interface TicketPrice {
  label: string;
  price_cents: number;
}

const formPath = (formType: string, formSlug: string) =>
  `/organizations/${encodeURIComponent(orgSlug())}/forms/${encodeURIComponent(formType)}/${encodeURIComponent(formSlug)}`;

/** Toutes les billetteries (formType Event) de l'organisation, toutes pages confondues. */
export async function listEventForms(supabase: SupabaseClient): Promise<FormSummary[]> {
  const forms: FormSummary[] = [];
  let continuationToken: string | undefined;
  for (let page = 0; page < 100; page++) {
    const query = new URLSearchParams({ formTypes: "Event", pageSize: "100" });
    if (continuationToken) query.set("continuationToken", continuationToken);
    const res = await helloAssoGet<{ data: FormSummary[]; pagination?: { continuationToken?: string } }>(
      supabase,
      `/organizations/${encodeURIComponent(orgSlug())}/forms`,
      query,
    );
    forms.push(...res.data);
    continuationToken = res.pagination?.continuationToken;
    if (res.data.length < 100 || !continuationToken) return forms;
  }
  throw new Error("listEventForms : pagination anormalement longue");
}

export function getPublicForm(supabase: SupabaseClient, formType: string, formSlug: string) {
  return helloAssoGet<PublicForm>(supabase, `${formPath(formType, formSlug)}/public`);
}

/**
 * GET …/stats : par tarif, le nombre d'inscrits (entriesTaken) et la limite du
 * tarif (maxEntries, absente si le tarif n'est pas limité). La limite globale
 * « Limiter le nombre total de participants » n'y figure PAS (ni nulle part
 * dans l'API) — vérifié en sandbox, billetterie publiée, le 2026-11-15.
 */
export interface FormStats {
  totalParticipant: number;
  unGroupedTiers?: Array<{ id: number; label: string; tierType: string; entriesTaken: number; maxEntries?: number | null; isEnabled?: boolean }>;
}

export function getFormStats(supabase: SupabaseClient, formType: string, formSlug: string) {
  return helloAssoGet<FormStats>(supabase, `${formPath(formType, formSlug)}/stats`);
}

/** Jauge déduite des limites de tarifs « billet » : leur somme, ou null si l'un d'eux est illimité. */
export function capacityFromStats(stats: FormStats): number | null {
  const tiers = (stats.unGroupedTiers ?? []).filter((t) => t.tierType === "Registration" && t.isEnabled !== false);
  if (tiers.length === 0 || tiers.some((t) => typeof t.maxEntries !== "number")) return null;
  return tiers.reduce((sum, t) => sum + (t.maxEntries as number), 0);
}

/** Tarifs « billet » d'un formulaire, en centimes (HelloAsso donne déjà `price` en centimes). */
export function extractTicketPrices(form: PublicForm): TicketPrice[] {
  return (form.tiers ?? [])
    .filter((tier) => tier.tierType === "Registration")
    .map((tier) => ({ label: tier.label, price_cents: tier.price }));
}

const ITEMS_PAGE_SIZE = 100;

/**
 * Nombre de billets vendus, tous tarifs confondus : on compte les items de type
 * « Registration » non annulés. L'API ne donne pas de total (totalCount = -1),
 * il faut donc parcourir toutes les pages.
 * Vérifié en sandbox (2026-11-15) : un billet payé (y compris avec code promo)
 * est `type: Registration, state: Processed`. `Registered` (billet gratuit)
 * n'a pas encore été observé sur une vraie inscription. Un billet acheté avec un
 * code promo porte `discount: { code, amount }` (amount en centimes).
 */
export interface SoldTickets {
  /** Billets vendus, tous tarifs confondus */
  total: number;
  /** Dont billets vendus avec un code promo (item.discount renseigné) */
  discounted: number;
}

export async function countSoldTickets(supabase: SupabaseClient, formType: string, formSlug: string): Promise<SoldTickets> {
  let total = 0;
  let discounted = 0;
  let continuationToken: string | undefined;
  for (let page = 0; page < 1000; page++) {
    const query = new URLSearchParams({ pageSize: String(ITEMS_PAGE_SIZE), tierTypes: "Registration" });
    query.append("itemStates", "Processed");
    query.append("itemStates", "Registered");
    if (continuationToken) query.set("continuationToken", continuationToken);

    // On ne lit que `discount` : les items contiennent aussi nom, e-mail, etc.,
    // qui ne sont jamais conservés.
    const res = await helloAssoGet<{ data: Array<{ discount?: { amount?: number } | null }>; pagination?: { continuationToken?: string } }>(
      supabase,
      `${formPath(formType, formSlug)}/items`,
      query,
    );
    total += res.data.length;
    discounted += res.data.filter((item) => (item.discount?.amount ?? 0) > 0).length;
    continuationToken = res.pagination?.continuationToken;
    if (res.data.length < ITEMS_PAGE_SIZE || !continuationToken) return { total, discounted };
  }
  throw new Error(`countSoldTickets(${formSlug}) : pagination anormalement longue`);
}
