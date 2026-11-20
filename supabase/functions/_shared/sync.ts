// Synchronisation des événements du site avec les billetteries HelloAsso,
// partagée par sync-events (cron) et helloasso-webhook (notifications).
//
// Règles (décidées avec LOOM) :
//   - Import automatique : toute billetterie HelloAsso (formType Event) à venir
//     et pas encore liée crée un événement sur le site — seulement si elle a été
//     créée après HELLOASSO_IMPORT_CREATED_AFTER quand ce secret est défini.
//   - HelloAsso fait foi : titre, date, heure, lieu, description (et l'image si
//     HelloAsso en a une) sont recopiés à chaque synchro ; une modification de
//     ces champs dans l'admin du site sera écrasée.
//   - Publication : selon HELLOASSO_PUBLISH_MODE
//       "follow" → publié sur le site quand la billetterie est publique chez
//                  HelloAsso, dépublié sinon ;
//       "draft"  → importé en brouillon (défaut, choix de LOOM : billetteries
//                  gardées « Privé »). Publié automatiquement, une seule fois,
//                  à l'ouverture des ventes (saleStartDate) si la billetterie
//                  en a une ; sinon publication laissée à l'admin.
//   - Fin des ventes (saleEndDate) : recopiée ; le site affiche alors
//     « Inscriptions closes ».
//   - Jauge : helloasso_capacity = somme des limites des tarifs (/stats) ; la
//     limite globale HelloAsso n'est pas exposée par l'API. ticket_capacity,
//     saisi dans l'admin, reste prioritaire.
// Aucune donnée nominative n'est lue ni stockée : seulement des compteurs.
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  capacityFromStats,
  countSoldTickets,
  extractTicketPrices,
  getFormStats,
  getPublicForm,
  listEventForms,
  type PublicForm,
  requireEnv,
} from "./helloasso.ts";
import { coordinatesForPlace } from "./geocode.ts";

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Comparaison en temps constant, pour ne pas laisser deviner un secret. */
export function safeEqual(a: string, b: string) {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/** Client Supabase service role (contourne la RLS) : réservé aux Edge Functions. */
export function serviceClient(): SupabaseClient {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false },
  });
}

const followPublication = () => (Deno.env.get("HELLOASSO_PUBLISH_MODE") ?? "draft") === "follow";

/** Image utilisée quand la billetterie HelloAsso n'en a pas (fichier de public/). */
const FALLBACK_IMAGE = "/loom_logo_square.jpg";

/**
 * HELLOASSO_IMPORT_CREATED_AFTER (date ISO, facultatif) : seules les billetteries
 * créées chez HelloAsso après cette date sont importées. Réglé à la date de mise
 * en prod pour ne pas importer les billetteries qui existaient déjà (un admin
 * peut toujours en lier une à la main dans l'admin). Absent : pas de filtre.
 */
function importCreatedAfter(): number | null {
  const raw = Deno.env.get("HELLOASSO_IMPORT_CREATED_AFTER")?.trim();
  if (!raw) return null;
  const time = Date.parse(raw);
  // Valeur invalide : on refuse d'importer plutôt que de tout importer.
  if (Number.isNaN(time)) throw new Error(`HELLOASSO_IMPORT_CREATED_AFTER invalide : ${raw}`);
  return time;
}

// Un événement reste synchronisé (et importable) jusqu'au lendemain de sa date.
const KEEP_SYNCING_DAYS_AFTER = 1;
export const syncSinceDate = () =>
  new Date(Date.now() - KEEP_SYNCING_DAYS_AFTER * 24 * 3600 * 1000).toISOString().slice(0, 10);

export interface TicketedEvent {
  id: string;
  slug: string;
  helloasso_form_slug: string;
  helloasso_form_type: string;
  helloasso_sale_start_date: string | null;
  helloasso_auto_published_at: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
}

export const TICKETED_EVENT_COLUMNS =
  "id, slug, helloasso_form_slug, helloasso_form_type, helloasso_sale_start_date, helloasso_auto_published_at, location, latitude, longitude";

// --- Conversion du contenu HelloAsso vers les colonnes de events ----------------

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/**
 * La description HelloAsso peut contenir du HTML simple (paragraphes, retours à
 * la ligne, listes). Le site stocke du Markdown : on garde la structure en
 * texte (paragraphes, puces) et on retire le reste des balises.
 */
export function htmlToMarkdown(html: string): string {
  return html
    .replace(/\r\n?/g, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/(p|div|h[1-6]|ul|ol)>/gi, "\n\n")
    .replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, "**$2**")
    .replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, "*$2*")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+);/gi, (m, code: string) => {
      if (code[0] === "#") {
        const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
        return Number.isFinite(n) ? String.fromCodePoint(n) : m;
      }
      return ENTITIES[code.toLowerCase()] ?? m;
    })
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** "2026-12-10T18:00:00+01:00" → { date: "2026-12-10", time: "18:00" } (heure locale de l'événement). */
function splitStartDate(startDate?: string | null) {
  const m = startDate?.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return m ? { date: m[1], time: m[2] } : null;
}

/** Même format que les lieux saisis à la main : « Le Marvelous - 3 Rue Saint Ravy 34000 Montpellier ». */
function formatPlace(place: PublicForm["place"]): string | null {
  if (!place) return null;
  const street = [place.address, place.zipCode, place.city].filter(Boolean).join(" ");
  return [place.name, street].filter(Boolean).join(" - ") || null;
}

/** Champs de events recopiés depuis HelloAsso (HelloAsso fait foi). Les champs inconnus ne sont pas touchés. */
function contentFromForm(form: PublicForm): Record<string, unknown> {
  const fields: Record<string, unknown> = { title: form.title };
  const description = form.description ? htmlToMarkdown(form.description) : "";
  if (description) fields.description = description;
  const start = splitStartDate(form.startDate);
  if (start) Object.assign(fields, start);
  const location = formatPlace(form.place);
  if (location) fields.location = location;
  if (form.logo?.publicUrl) fields.image = form.logo.publicUrl;
  if (followPublication()) fields.published = form.state === "Public";
  return fields;
}

/** Date ISO HelloAsso → timestamptz, ou null si absente/invalide. */
function toTimestamp(value?: string | null): string | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

const sameInstant = (a: string | null, b: string | null) =>
  a === b || (a !== null && b !== null && Date.parse(a) === Date.parse(b));

/**
 * Publication à l'ouverture des ventes (mode "draft") : quand saleStartDate est
 * atteinte, l'événement est publié, une seule fois — helloasso_auto_published_at
 * le mémorise, pour qu'un admin puisse ensuite le dépublier. Si la date
 * d'ouverture change chez HelloAsso (ouverture reportée…), la publication
 * automatique est réarmée. Sans saleStartDate, l'événement reste en brouillon
 * jusqu'à publication manuelle. En mode "follow", c'est l'état de la
 * billetterie qui décide (contentFromForm).
 */
function autoPublishFields(form: PublicForm, event: TicketedEvent): Record<string, unknown> {
  if (followPublication()) return {};
  const saleStart = toTimestamp(form.saleStartDate);
  const startChanged = !sameInstant(event.helloasso_sale_start_date, saleStart);
  if (event.helloasso_auto_published_at && !startChanged) return {};
  const reset = startChanged && event.helloasso_auto_published_at ? { helloasso_auto_published_at: null } : {};
  if (!saleStart || Date.parse(saleStart) > Date.now()) return reset;
  return { published: true, helloasso_auto_published_at: new Date().toISOString() };
}

// --- Synchro d'un événement déjà lié ------------------------------------------

export type SyncResult =
  | {
    slug: string;
    ok: true;
    form_state: string;
    prices: number;
    sold: number;
    discounted: number;
    auto_published: boolean;
  }
  | { slug: string; ok: false; error: string };

/** Relit contenu, tarifs et ventes chez HelloAsso et met à jour la ligne events correspondante. */
export async function syncEvent(supabase: SupabaseClient, event: TicketedEvent): Promise<SyncResult> {
  try {
    const form = await getPublicForm(supabase, event.helloasso_form_type, event.helloasso_form_slug);
    const ticketPrices = extractTicketPrices(form);
    const sold = await countSoldTickets(supabase, event.helloasso_form_type, event.helloasso_form_slug);
    const stats = await getFormStats(supabase, event.helloasso_form_type, event.helloasso_form_slug);
    const publish = autoPublishFields(form, event);
    const content = contentFromForm(form);
    const coordinates = await coordinatesForPlace(form, content.location as string | undefined, event);

    const { error } = await supabase
      .from("events")
      .update({
        ...content,
        ...coordinates,
        ...publish,
        helloasso_sale_start_date: toTimestamp(form.saleStartDate),
        helloasso_sale_end_date: toTimestamp(form.saleEndDate),
        ticket_prices: ticketPrices,
        helloasso_capacity: capacityFromStats(stats),
        tickets_sold: sold.total,
        tickets_sold_discounted: sold.discounted,
        helloasso_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", event.id);
    if (error) throw new Error(`Mise à jour : ${error.message}`);
    if (publish.published) console.log(`sync ${event.slug} : ventes ouvertes → publié`);

    return {
      slug: event.slug,
      ok: true,
      form_state: form.state,
      prices: ticketPrices.length,
      sold: sold.total,
      discounted: sold.discounted,
      auto_published: Boolean(publish.published),
    };
  } catch (e) {
    console.error(`sync ${event.slug} :`, (e as Error).message);
    return { slug: event.slug, ok: false, error: (e as Error).message };
  }
}

// --- Import des nouvelles billetteries ------------------------------------------

/** Premier slug de site libre : « les-ours-font-du-macrame », puis « …-2 », « …-3 »… */
async function freeSiteSlug(supabase: SupabaseClient, base: string): Promise<string> {
  for (let n = 1; n < 100; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const { data, error } = await supabase.from("events").select("id").eq("slug", candidate).maybeSingle();
    if (error) throw new Error(`Vérification du slug ${candidate} : ${error.message}`);
    if (!data) return candidate;
  }
  throw new Error(`Aucun slug libre pour ${base}`);
}

export type ImportResult = { form: string; ok: true; slug: string; published: boolean } | { form: string; ok: false; error: string };

/**
 * Crée un événement sur le site pour chaque billetterie HelloAsso à venir qui
 * n'est liée à aucun événement. Les tarifs et ventes sont remplis ensuite par
 * syncEvent (appelé dans la foulée par sync-events).
 */
export async function importNewForms(supabase: SupabaseClient): Promise<ImportResult[]> {
  const since = syncSinceDate();
  const createdAfter = importCreatedAfter();
  const forms = (await listEventForms(supabase)).filter((f) =>
    (f.endDate ?? f.startDate ?? "").slice(0, 10) >= since &&
    (createdAfter === null || Date.parse(f.meta?.createdAt ?? "") > createdAfter)
  );
  if (forms.length === 0) return [];

  const { data: linked, error } = await supabase
    .from("events")
    .select("helloasso_form_slug")
    .not("helloasso_form_slug", "is", null);
  if (error) throw new Error(`Lecture des événements liés : ${error.message}`);
  const linkedSlugs = new Set((linked ?? []).map((e) => e.helloasso_form_slug));

  const results: ImportResult[] = [];
  for (const summary of forms.filter((f) => !linkedSlugs.has(f.formSlug))) {
    try {
      const form = await getPublicForm(supabase, summary.formType, summary.formSlug);
      const content = contentFromForm(form);
      const start = splitStartDate(form.startDate);
      if (!start) throw new Error("date de début absente");

      const slug = await freeSiteSlug(supabase, summary.formSlug);
      const coordinates = await coordinatesForPlace(form, content.location as string | undefined);
      const row = {
        description: form.title,
        location: "Lieu à préciser",
        image: FALLBACK_IMAGE,
        published: false,
        ...content,
        ...coordinates,
        slug,
        helloasso_form_slug: summary.formSlug,
        helloasso_form_type: summary.formType,
      };
      const { error: insertError } = await supabase.from("events").insert(row);
      // 23505 sur helloasso_form_slug : importé entre-temps par un appel concurrent (cron + webhook).
      if (insertError && !(insertError.code === "23505" && insertError.message.includes("helloasso_form_slug"))) {
        throw new Error(`Création : ${insertError.message}`);
      }
      console.log(`import ${summary.formSlug} → événement ${slug}${row.published ? " (publié)" : " (brouillon)"}`);
      results.push({ form: summary.formSlug, ok: true, slug, published: Boolean(row.published) });
    } catch (e) {
      console.error(`import ${summary.formSlug} :`, (e as Error).message);
      results.push({ form: summary.formSlug, ok: false, error: (e as Error).message });
    }
  }
  return results;
}
