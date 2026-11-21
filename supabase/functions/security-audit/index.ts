// security-audit : audit de sécurité de la base, chaque nuit et à la demande.
//
// Appelée :
//   - par le cron pg_cron `security-audit` (migration 20261121100000_security_audit.sql,
//     branche feature/supabase-docker) avec l'en-tête `x-notify-secret` — le même
//     secret que notify-new-message (NOTIFY_MESSAGE_SECRET / Vault notify_message_secret) ;
//   - par le bouton « Relancer l'audit » du tableau de bord, avec la session d'un admin.
// verify_jwt = false (config.toml) : l'authentification est faite ici.
//
// Lit le réglage « inscriptions ouvertes » d'Auth (GET /auth/v1/settings), lance
// public.security_audit_run() (qui fait les contrôles en SQL et enregistre le
// résultat dans security_audit_runs), puis, pour l'audit de la nuit, prévient par
// e-mail tous les admins actifs si le résultat n'est pas « ok » (Gmail de
// l'association, comme notify-new-message ; secrets GMAIL_USER, GMAIL_APP_PASSWORD).
// L'e-mail ne contient que les titres des constats et un lien vers l'admin.
// @ts-types="npm:@types/nodemailer@6.4.17"
import nodemailer from "npm:nodemailer@6.9.16";
import { requireEnv } from "../_shared/helloasso.ts";
import { safeEqual, serviceClient } from "../_shared/sync.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } });

type Finding = { level: "critical" | "warning" | "info"; code: string; title: string; detail: string };
type Run = { id: number; ran_at: string; source: string; status: "ok" | "warning" | "critical"; findings: Finding[] };

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** true = inscriptions ouvertes, false = fermées, null = réglage illisible */
async function signupsOpen(): Promise<boolean | null> {
  try {
    const url = requireEnv("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_ANON_KEY") ?? requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const settings = await res.json();
    return typeof settings?.disable_signup === "boolean" ? !settings.disable_signup : null;
  } catch (e) {
    console.error("security-audit : lecture des réglages Auth", e instanceof Error ? e.message : e);
    return null;
  }
}

async function emailAdmins(supabase: ReturnType<typeof serviceClient>, run: Run) {
  const { data: profiles, error } = await supabase.from("profiles").select("id").eq("is_admin", true);
  if (error) throw error;
  const recipients: string[] = [];
  for (const p of profiles ?? []) {
    const { data } = await supabase.auth.admin.getUserById(p.id);
    const u = data?.user;
    const banned = u?.banned_until && new Date(u.banned_until).getTime() > Date.now();
    if (u?.email && !banned) recipients.push(u.email);
  }
  if (recipients.length === 0) return 0;

  const site = (Deno.env.get("SITE_URL") || "https://lgbt-loom.fr").replace(/\/+$/, "");
  const link = `${site}/admin`;
  const important = run.findings.filter((f) => f.level !== "info");
  const critical = run.status === "critical";
  const subject = critical ? "⚠ Audit de sécurité : problème à traiter" : "Audit de sécurité : point(s) à vérifier";
  const label = (f: Finding) => (f.level === "critical" ? "CRITIQUE" : "À vérifier");
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
    bcc: recipients,
    subject,
    text: `L'audit de sécurité automatique du site a relevé :\n\n${important
      .map((f) => `- [${label(f)}] ${f.title}\n  ${f.detail}`)
      .join("\n\n")}\n\nDétails sur le tableau de bord : ${link}\n\n—\nE-mail envoyé à tous les administrateurs du site.`,
    html: `<div style="font-family:Arial,sans-serif;color:#111;line-height:1.5;max-width:600px">
  <p>L'audit de sécurité automatique du site a relevé :</p>
  <ul style="padding-left:18px">${important
    .map(
      (f) =>
        `<li style="margin-bottom:12px"><strong style="color:${f.level === "critical" ? "#B91C1C" : "#92400E"}">${label(f)}</strong> · <strong>${escapeHtml(f.title)}</strong><br><span style="color:#4b5563;font-size:14px">${escapeHtml(f.detail)}</span></li>`,
    )
    .join("")}</ul>
  <p style="margin:24px 0"><a href="${escapeHtml(link)}" style="background:#623804;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:bold">Ouvrir le tableau de bord</a></p>
  <p style="color:#6b7280;font-size:13px">E-mail envoyé à tous les administrateurs du site.</p>
</div>`,
  });
  return recipients.length;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  try {
    const supabase = serviceClient();

    // Cron (secret partagé) ou admin connecté (bouton du tableau de bord)
    let source: "cron" | "manuel";
    const secret = req.headers.get("x-notify-secret");
    if (secret !== null) {
      if (!safeEqual(secret, requireEnv("NOTIFY_MESSAGE_SECRET"))) return json({ error: "Non autorisé" }, 401);
      source = "cron";
    } else {
      const token = (req.headers.get("Authorization") ?? "").match(/^Bearer\s+(.+)$/i)?.[1];
      if (!token) return json({ error: "Non connecté" }, 401);
      const { data: caller, error: callerErr } = await supabase.auth.getUser(token);
      if (callerErr || !caller.user) return json({ error: "Session invalide" }, 401);
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", caller.user.id).maybeSingle();
      if (!profile?.is_admin) return json({ error: "Réservé aux administrateurs" }, 403);
      source = "manuel";
    }

    const { data, error } = await supabase.rpc("security_audit_run", { p_signups_open: await signupsOpen(), p_source: source });
    if (error) throw new Error(error.message);
    const run = data as Run;

    // E-mail seulement pour l'audit de la nuit : un admin qui relance l'audit voit le résultat à l'écran
    let emailed: number | null = null;
    let emailError: string | null = null;
    if (source === "cron" && run.status !== "ok") {
      try {
        emailed = await emailAdmins(supabase, run);
      } catch (e) {
        emailError = e instanceof Error ? e.message : String(e);
        console.error("security-audit : envoi de l'e-mail", emailError);
      }
    }

    return json({ run, emailed, emailError });
  } catch (e) {
    console.error("security-audit", e instanceof Error ? e.message : e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
