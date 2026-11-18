// notify-new-message : prévient par e-mail les admins qui l'ont demandé
// (profiles.notify_on_message) qu'un message est arrivé par le formulaire de contact.
//
// Appelée par le trigger notify_new_contact_ticket (src/db/message_notifications.sql,
// pg_net) avec l'en-tête `x-notify-secret: <NOTIFY_MESSAGE_SECRET>` et le corps
// { "id": <contact_tickets.id> }. verify_jwt = false (config.toml) : la protection
// repose sur ce secret, comme sync-events.
//
// Données personnelles : l'e-mail ne contient que le sujet, le prénom/nom saisi et
// un lien vers l'admin — ni le texte du message ni l'adresse de l'expéditeur.
//
// Envoi par le Gmail de l'association en SMTP sur le port 465 (Supabase bloque les
// ports 25 et 587 en sortie des Edge Functions). Secrets : GMAIL_USER,
// GMAIL_APP_PASSWORD (mot de passe d'application Google, pas le mot de passe du
// compte), NOTIFY_MESSAGE_SECRET ; SITE_URL facultatif (défaut https://lgbt-loom.fr).
// @ts-types="npm:@types/nodemailer@6.4.17"
import nodemailer from "npm:nodemailer@6.9.16";
import { requireEnv } from "../_shared/helloasso.ts";
import { json, safeEqual, serviceClient } from "../_shared/sync.ts";

/** Un message plus vieux que ça n'est plus « nouveau » (rejeu, appel manuel) */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Coupe les retours à la ligne (en-têtes d'e-mail) et limite la longueur. */
const oneLine = (s: string, max: number) => {
  const clean = s.replace(/[\r\n\t]+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  try {
    if (!safeEqual(req.headers.get("x-notify-secret") ?? "", requireEnv("NOTIFY_MESSAGE_SECRET"))) {
      return json({ error: "Non autorisé" }, 401);
    }
    const body = await req.json().catch(() => ({}));
    const id = Number(body?.id);
    if (!Number.isInteger(id) || id <= 0) return json({ error: "id manquant" }, 400);

    const supabase = serviceClient();
    const { data: ticket, error: ticketErr } = await supabase
      .from("contact_tickets")
      .select("id, name, subject, status, created_at")
      .eq("id", id)
      .maybeSingle();
    if (ticketErr) throw ticketErr;
    if (!ticket) return json({ skipped: "message introuvable" });
    if (ticket.status !== "Nouveau" || Date.now() - new Date(ticket.created_at).getTime() > MAX_AGE_MS) {
      return json({ skipped: "message déjà traité ou trop ancien" });
    }

    // Destinataires : admins qui ont activé l'option, compte non bloqué
    const { data: profiles, error: profErr } = await supabase.from("profiles").select("id").eq("is_admin", true).eq("notify_on_message", true);
    if (profErr) throw profErr;
    const recipients: string[] = [];
    for (const p of profiles ?? []) {
      const { data } = await supabase.auth.admin.getUserById(p.id);
      const u = data?.user;
      const banned = u?.banned_until && new Date(u.banned_until).getTime() > Date.now();
      if (u?.email && !banned) recipients.push(u.email);
    }
    if (recipients.length === 0) return json({ skipped: "aucun admin à prévenir" });

    const site = (Deno.env.get("SITE_URL") || "https://lgbt-loom.fr").replace(/\/+$/, "");
    const link = `${site}/admin/tickets?message=${ticket.id}`;
    const subject = oneLine(ticket.subject || "(sans sujet)", 120);
    const name = oneLine(ticket.name || "Quelqu'un", 80);
    const gmailUser = requireEnv("GMAIL_USER");

    const transport = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: gmailUser, pass: requireEnv("GMAIL_APP_PASSWORD") },
    });

    await transport.sendMail({
      from: { name: "Site LOOM", address: gmailUser },
      to: gmailUser,
      bcc: recipients, // les admins ne voient pas les adresses des autres
      subject: `Nouveau message : ${subject}`,
      text: `${name} a écrit via le formulaire de contact du site.\n\nSujet : ${subject}\n\nLire et répondre : ${link}\n\n—\nVous recevez cet e-mail car l'option « Me prévenir par e-mail » est activée dans l'écran Messages de l'admin.`,
      html: `<div style="font-family:Arial,sans-serif;color:#111;line-height:1.5;max-width:520px">
  <p><strong>${escapeHtml(name)}</strong> a écrit via le formulaire de contact du site.</p>
  <p>Sujet : <strong>${escapeHtml(subject)}</strong></p>
  <p style="margin:24px 0"><a href="${escapeHtml(link)}" style="background:#623804;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:bold">Lire et répondre</a></p>
  <p style="color:#6b7280;font-size:13px">Vous recevez cet e-mail car l'option « Me prévenir par e-mail » est activée dans l'écran Messages de l'admin.</p>
</div>`,
    });

    return json({ sent: recipients.length });
  } catch (e) {
    console.error("notify-new-message", e instanceof Error ? e.message : e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
