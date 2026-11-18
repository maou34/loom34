// admin-users : gestion des comptes de l'administration (écran « Administrateurs »).
//
// Remplace admin-create-user et le RPC delete_user. Chaque appel exige le jeton de
// session d'un admin (Authorization: Bearer …, vérifié ici : verify_jwt = false dans
// config.toml, comme les autres fonctions) ; les opérations passent ensuite par le
// service role, seul autorisé à changer profiles.is_admin (trigger
// protect_profile_is_admin, src/db/profiles_lockdown.sql).
//
// Corps JSON { action, ... } :
//   list                               → { admins, others } (e-mail, dernière connexion, bloqué)
//   invite  { email, full_name, redirectTo } → invite par e-mail (le lien mène à
//           /auth/update-password pour choisir un mot de passe) ; un compte existant
//           non bloqué est simplement promu admin
//   revoke  { userId }                 → retire is_admin (pas soi-même, jamais le dernier admin)
//   restore { userId }                 → redonne is_admin (pas à un compte bloqué)
//   reset   { userId, redirectTo }     → e-mail de réinitialisation du mot de passe
//   delete  { userId }                 → supprime un compte sans accès admin (pas soi-même)
//
// Les e-mails partent par le SMTP configuré dans Supabase (Gmail de l'asso).
// redirectTo doit figurer dans Authentication → URL Configuration → Redirect URLs.
import { createClient, type SupabaseClient, type User } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...CORS } });
}

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new HttpError(500, `Variable ${name} manquante`);
  return value;
}

/** Seules les pages du site peuvent servir de retour aux liens d'e-mail. */
function safeRedirect(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if ((url.protocol === "https:" || local) && url.pathname === "/auth/update-password") return url.toString();
  } catch {
    // ignoré
  }
  return undefined;
}

type ProfileRow = { id: string; username: string | null; full_name: string | null; is_admin: boolean; created_at: string | null };

async function listAuthUsers(admin: SupabaseClient): Promise<User[]> {
  const users: User[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 200) break;
  }
  return users;
}

const isBanned = (u: User) => !!u.banned_until && new Date(u.banned_until).getTime() > Date.now();

async function getProfile(admin: SupabaseClient, id: string): Promise<ProfileRow | null> {
  const { data, error } = await admin.from("profiles").select("id, username, full_name, is_admin, created_at").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

async function setAdmin(admin: SupabaseClient, id: string, isAdmin: boolean, extra: Record<string, unknown> = {}) {
  const values = { is_admin: isAdmin, updated_at: new Date().toISOString(), ...extra };
  const { data, error } = await admin.from("profiles").update(values).eq("id", id).select("id");
  if (error) throw error;
  if (!data?.length) {
    // Profil pas (encore) créé par le trigger d'inscription
    const { error: insErr } = await admin.from("profiles").insert({ id, ...values });
    if (insErr) throw insErr;
  }
}

/** Admins actifs (non bloqués), pour ne jamais retirer le dernier. */
async function activeAdminIds(admin: SupabaseClient): Promise<string[]> {
  const { data, error } = await admin.from("profiles").select("id").eq("is_admin", true);
  if (error) throw error;
  const users = await listAuthUsers(admin);
  const banned = new Set(users.filter(isBanned).map((u) => u.id));
  return (data ?? []).map((p) => p.id).filter((id) => !banned.has(id));
}

async function getUserOr404(admin: SupabaseClient, userId: unknown): Promise<User> {
  if (typeof userId !== "string" || !userId) throw new HttpError(400, "Compte manquant");
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) throw new HttpError(404, "Compte introuvable");
  return data.user;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  try {
    const admin = createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Appelant : session valide + admin
    const token = (req.headers.get("Authorization") ?? "").match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return json({ error: "Non connecté" }, 401);
    const { data: callerData, error: callerErr } = await admin.auth.getUser(token);
    if (callerErr || !callerData.user) return json({ error: "Session invalide" }, 401);
    const caller = callerData.user;
    if (isBanned(caller) || !(await getProfile(admin, caller.id))?.is_admin) return json({ error: "Réservé aux administrateurs" }, 403);

    const body = await req.json().catch(() => ({}));

    switch (body?.action) {
      case "list": {
        const [users, profilesRes] = await Promise.all([
          listAuthUsers(admin),
          admin.from("profiles").select("id, username, full_name, is_admin, created_at"),
        ]);
        if (profilesRes.error) throw profilesRes.error;
        const profiles = new Map((profilesRes.data as ProfileRow[]).map((p) => [p.id, p]));
        const rows = users.map((u) => {
          const p = profiles.get(u.id);
          return {
            id: u.id,
            email: u.email ?? null,
            username: p?.username ?? null,
            full_name: p?.full_name ?? (u.user_metadata?.full_name as string | undefined) ?? null,
            is_admin: !!p?.is_admin && !isBanned(u),
            banned: isBanned(u),
            created_at: u.created_at,
            last_sign_in_at: u.last_sign_in_at ?? null,
            invited_pending: !u.last_sign_in_at && !!u.invited_at,
            is_me: u.id === caller.id,
          };
        });
        const byDate = (a: { created_at: string }, b: { created_at: string }) => a.created_at.localeCompare(b.created_at);
        return json({ admins: rows.filter((r) => r.is_admin).sort(byDate), others: rows.filter((r) => !r.is_admin).sort(byDate) });
      }

      case "invite": {
        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Adresse e-mail invalide");
        if (!fullName) throw new HttpError(400, "Nom manquant");

        const existing = (await listAuthUsers(admin)).find((u) => u.email?.toLowerCase() === email);
        if (existing) {
          if (isBanned(existing)) throw new HttpError(409, "Ce compte est bloqué");
          await setAdmin(admin, existing.id, true);
          return json({ status: "promoted", userId: existing.id });
        }

        const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
          data: { full_name: fullName },
          redirectTo: safeRedirect(body.redirectTo),
        });
        if (error || !data.user) throw new HttpError(400, error?.message ?? "Invitation impossible");
        await setAdmin(admin, data.user.id, true, { full_name: fullName, username: email.split("@")[0] });
        return json({ status: "invited", userId: data.user.id });
      }

      case "revoke": {
        const user = await getUserOr404(admin, body.userId);
        if (user.id === caller.id) throw new HttpError(409, "Vous ne pouvez pas retirer votre propre accès");
        const remaining = (await activeAdminIds(admin)).filter((id) => id !== user.id);
        if (remaining.length === 0) throw new HttpError(409, "Impossible de retirer le dernier administrateur");
        await setAdmin(admin, user.id, false);
        return json({ status: "revoked" });
      }

      case "restore": {
        const user = await getUserOr404(admin, body.userId);
        if (isBanned(user)) throw new HttpError(409, "Ce compte est bloqué");
        await setAdmin(admin, user.id, true);
        return json({ status: "restored" });
      }

      case "reset": {
        const user = await getUserOr404(admin, body.userId);
        if (!user.email) throw new HttpError(400, "Ce compte n'a pas d'adresse e-mail");
        const { error } = await admin.auth.resetPasswordForEmail(user.email, { redirectTo: safeRedirect(body.redirectTo) });
        if (error) throw new HttpError(400, error.message);
        return json({ status: "sent" });
      }

      case "delete": {
        const user = await getUserOr404(admin, body.userId);
        if (user.id === caller.id) throw new HttpError(409, "Vous ne pouvez pas supprimer votre propre compte");
        if ((await getProfile(admin, user.id))?.is_admin) throw new HttpError(409, "Retirez d'abord son accès administrateur");
        const { error } = await admin.auth.admin.deleteUser(user.id);
        if (error) throw new HttpError(400, error.message);
        return json({ status: "deleted" });
      }

      default:
        return json({ error: "Action inconnue" }, 400);
    }
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error("admin-users", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
