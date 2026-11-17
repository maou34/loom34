// sync-events : importe les nouvelles billetteries HelloAsso comme événements
// du site, puis met à jour, pour chaque événement à venir lié à une billetterie,
// son contenu (HelloAsso fait foi), ses tarifs et ses ventes. Règles détaillées
// dans ../_shared/sync.ts.
//
// Appelée par un cron Supabase (pg_cron + pg_net), avec l'en-tête
// `x-sync-secret: <SYNC_EVENTS_SECRET>`. verify_jwt = false (config.toml) : la
// protection repose sur ce secret partagé, pas sur un JWT Supabase.
//
// Corps facultatif : { "slug": "<slug de l'événement>" } pour ne synchroniser
// qu'un événement, sans import (sinon : import + tous les événements à venir).
import { requireEnv } from "../_shared/helloasso.ts";
import {
  type ImportResult,
  importNewForms,
  json,
  safeEqual,
  serviceClient,
  syncEvent,
  syncSinceDate,
  type SyncResult,
  TICKETED_EVENT_COLUMNS,
  type TicketedEvent,
} from "../_shared/sync.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  try {
    if (!safeEqual(req.headers.get("x-sync-secret") ?? "", requireEnv("SYNC_EVENTS_SECRET"))) {
      return json({ error: "Non autorisé" }, 401);
    }

    const supabase = serviceClient();
    const body = await req.json().catch(() => ({}));
    const onlySlug = typeof body?.slug === "string" ? body.slug : null;

    let imported: ImportResult[] = [];
    if (!onlySlug) {
      try {
        imported = await importNewForms(supabase);
      } catch (e) {
        // L'import ne doit pas empêcher la synchro des événements déjà liés.
        console.error("import :", (e as Error).message);
        imported = [{ form: "*", ok: false, error: (e as Error).message }];
      }
    }

    let query = supabase.from("events").select(TICKETED_EVENT_COLUMNS).not("helloasso_form_slug", "is", null);
    query = onlySlug ? query.eq("slug", onlySlug) : query.gte("date", syncSinceDate());

    const { data: events, error } = await query;
    if (error) throw new Error(`Lecture des événements : ${error.message}`);

    const results: SyncResult[] = [];
    // Séquentiel : peu d'événements, et ça ménage la limite de débit de l'API.
    for (const event of (events ?? []) as TicketedEvent[]) {
      results.push(await syncEvent(supabase, event));
    }

    const failed = results.filter((r) => !r.ok).length;
    return json(
      { imported, synced: results.length - failed, failed, results },
      failed && failed === results.length ? 502 : 200,
    );
  } catch (e) {
    console.error("sync-events :", (e as Error).message);
    return json({ error: (e as Error).message }, 500);
  }
});
