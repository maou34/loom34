import { useQuery } from "@tanstack/react-query";
import { db } from "@/db/client";

/** Un compte tel que renvoyé par l'Edge Function admin-users (action « list »). */
export type AdminAccount = {
  id: string;
  email: string | null;
  username: string | null;
  full_name: string | null;
  is_admin: boolean;
  banned: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  /** Invité par e-mail, pas encore connecté */
  invited_pending: boolean;
  is_me: boolean;
};

type Action =
  | { action: "list" }
  | { action: "invite"; email: string; full_name: string }
  | { action: "revoke" | "restore" | "delete"; userId: string }
  | { action: "reset"; userId: string };

/** Page où mènent les liens d'invitation et de réinitialisation envoyés par e-mail. */
const passwordPage = () => `${window.location.origin}/auth/update-password`;

/**
 * Appelle l'Edge Function admin-users avec la session de l'admin connecté
 * (la fonction revérifie qu'il est admin). Lève une Error au message lisible.
 */
export async function callAdminUsers<T = unknown>(payload: Action): Promise<T> {
  const { data: session } = await db.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error("Session expirée : reconnectez-vous.");

  const body = payload.action === "invite" || payload.action === "reset" ? { ...payload, redirectTo: passwordPage() } : payload;
  const { data, error } = await db.functions.invoke("admin-users", { body, headers: { Authorization: `Bearer ${token}` } });
  if (error) {
    // FunctionsHttpError : le message utile est dans le corps de la réponse
    const context = (error as { context?: Response }).context;
    const message = await context?.json?.().then((b: { error?: string }) => b?.error).catch(() => undefined);
    throw new Error(message || error.message);
  }
  return data as T;
}

export function useAdminAccounts() {
  return useQuery({
    queryKey: ["admin", "accounts"],
    queryFn: () => callAdminUsers<{ admins: AdminAccount[]; others: AdminAccount[] }>({ action: "list" }),
  });
}

export function accountName(a: Pick<AdminAccount, "full_name" | "username" | "email">) {
  return a.full_name?.trim() || a.username || a.email || "Sans nom";
}

export function accountInitials(a: Pick<AdminAccount, "full_name" | "username" | "email">) {
  const words = accountName(a).split(/[\s@._-]+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? "?").slice(0, 2)).toUpperCase();
}
