// helloasso-webhook : reçoit les notifications HelloAsso (commande, paiement,
// modification de formulaire) et resynchronise aussitôt l'événement concerné,
// sans attendre le prochain passage du cron sync-events.
//
// On ne fait PAS confiance au contenu de la notification (HelloAsso ne la signe
// pas) : on n'en lit que le slug du formulaire, puis on relit tarifs et ventes
// directement dans l'API HelloAsso. Les notifications contiennent des données
// nominatives (payeur, participants) : elles ne sont ni stockées ni journalisées.
//
// URL à déclarer dans le back-office HelloAsso (Mon compte → Intégrations et API) :
//   https://<projet>.supabase.co/functions/v1/helloasso-webhook?secret=<HELLOASSO_WEBHOOK_SECRET>
// HelloAsso ne permet pas d'ajouter un en-tête : le secret passe donc dans l'URL.
// verify_jwt = false (config.toml) : HelloAsso n'envoie pas de JWT Supabase.
//
// Codes de retour : 200 si la notification est traitée ou ignorée (formulaire
// non lié à un événement du site) ; 500 si la synchro échoue, pour que HelloAsso
// renvoie la notification plus tard.
import { orgSlug, requireEnv } from "../_shared/helloasso.ts";
import {
  importNewForms,
  json,
  safeEqual,
  serviceClient,
  syncEvent,
  TICKETED_EVENT_COLUMNS,
  type TicketedEvent,
} from "../_shared/sync.ts";

// Fourni par le runtime Supabase Edge (absent quand on lance le fichier avec deno run).
declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void } | undefined;

// Délais cumulés : resynchro à +10 s puis à +30 s (sous la limite de durée
// d'une invocation). Le cron sync-events reste le filet de sécurité.
const RESYNC_DELAYS_MS = [10_000, 20_000];

interface Notification {
  eventType?: string;
  data?: {
    formSlug?: string;
    formType?: string;
    organizationSlug?: string;
    // Notification « Payment » : le formulaire est porté par la commande
    order?: { formSlug?: string; formType?: string; organizationSlug?: string };
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  try {
    const secret = new URL(req.url).searchParams.get("secret") ?? "";
    if (!safeEqual(secret, requireEnv("HELLOASSO_WEBHOOK_SECRET"))) {
      return json({ error: "Non autorisé" }, 401);
    }

    const notification: Notification = await req.json().catch(() => ({}));
    const data = notification.data ?? {};
    const formSlug = data.formSlug ?? data.order?.formSlug;
    const formType = data.formType ?? data.order?.formType;
    const organization = data.organizationSlug ?? data.order?.organizationSlug;
    const eventType = notification.eventType ?? "?";

    if (!formSlug) {
      console.log(`webhook ${eventType} : pas de formulaire, ignoré`);
      return json({ ignored: "pas de formulaire" });
    }
    if (organization && organization !== orgSlug()) {
      console.log(`webhook ${eventType} : autre organisation (${organization}), ignoré`);
      return json({ ignored: "autre organisation" });
    }

    const supabase = serviceClient();
    const findEvent = async () => {
      let query = supabase.from("events").select(TICKETED_EVENT_COLUMNS).eq("helloasso_form_slug", formSlug);
      if (formType) query = query.eq("helloasso_form_type", formType);
      const { data, error } = await query.maybeSingle();
      if (error) throw new Error(`Lecture de l'événement : ${error.message}`);
      return data as TicketedEvent | null;
    };

    let event = await findEvent();
    // Billetterie inconnue (nouvelle, ou modifiée avant le passage du cron) : on
    // lance l'import tout de suite. Les formulaires qui ne sont pas des
    // billetteries à venir (adhésion, boutique, événement passé) restent ignorés.
    if (!event && (!formType || formType === "Event")) {
      const imported = await importNewForms(supabase);
      if (imported.some((r) => !r.ok && r.form === formSlug)) throw new Error(`Import de ${formSlug} échoué`);
      event = await findEvent();
    }
    if (!event) {
      console.log(`webhook ${eventType} : formulaire ${formSlug} non lié à un événement, ignoré`);
      return json({ ignored: "formulaire non lié à un événement" });
    }

    const result = await syncEvent(supabase, event);
    console.log(`webhook ${eventType} : ${formSlug} → ${result.ok ? "synchronisé" : "échec"}`);

    // HelloAsso notifie avant que la nouvelle inscription apparaisse dans
    // /items (constaté en sandbox : notification 3 s après la commande, mais
    // compteur encore à l'ancienne valeur). On resynchronise donc en arrière-plan
    // un peu plus tard, sans retarder la réponse à HelloAsso.
    if (typeof EdgeRuntime !== "undefined") {
      EdgeRuntime.waitUntil((async () => {
        for (const delayMs of RESYNC_DELAYS_MS) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          const later = await syncEvent(supabase, event!);
          console.log(`webhook ${eventType} : ${formSlug} → resynchro +${delayMs / 1000}s ${later.ok ? `(${later.sold} vendus)` : "échec"}`);
        }
      })());
    }

    return json(result, result.ok ? 200 : 500);
  } catch (e) {
    console.error("helloasso-webhook :", (e as Error).message);
    return json({ error: (e as Error).message }, 500);
  }
});
