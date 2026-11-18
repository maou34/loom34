import { useQuery } from "@tanstack/react-query";
import { UPLOAD_URL } from "@/config";
import { db } from "@/db/client";
import { uploadAuthHeaders } from "@/lib/uploadAuth";

/** Les statistiques bougent peu : pas besoin de les recharger à chaque visite du tableau de bord. */
const STALE_MS = 5 * 60 * 1000;

export type VisitsStats =
  | { configured: false }
  | {
      configured: true;
      days: number;
      visits: number;
      pageViews: number;
      previousVisits: number;
      previousDaysWithData: number;
      series: { date: string; visits: number; pageViews: number }[];
      topPages: { path: string; pageViews: number }[];
    };

export type UptimeStats =
  | { configured: false }
  | {
      configured: true;
      monitors: {
        name: string;
        url: string;
        status: "up" | "down" | "seems_down" | "paused" | "pending" | "unknown";
        uptime30: number | null;
        avgResponseMs: number | null;
        lastResponseMs: number | null;
      }[];
    };

export type ServerStatus = {
  checkedAt: string;
  disk: { usedPct: number | null; totalGb: number } | null;
  memory: { usedPct: number | null } | null;
  certificate: { host: string; expiresAt: string; daysLeft: number } | null;
  deploy: { builtAt: string | null; commit: { hash: string; subject: string } | null; committedAt: string | null } | null;
  uptimeSec: number;
};

/** Appelle l'Edge Function site-stats (réservée aux admins) ; message d'erreur lisible. */
async function callSiteStats<T>(body: Record<string, unknown>): Promise<T> {
  const { data: session } = await db.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new Error("Session expirée : reconnectez-vous.");
  const { data, error } = await db.functions.invoke("site-stats", { body, headers: { Authorization: `Bearer ${token}` } });
  if (error) {
    const context = (error as { context?: Response }).context;
    const message = await context?.json?.().then((b: { error?: string }) => b?.error).catch(() => undefined);
    throw new Error(message || error.message);
  }
  return data as T;
}

export function useSiteVisits(days: 7 | 30) {
  return useQuery({
    queryKey: ["admin", "siteStats", "visits", days],
    queryFn: () => callSiteStats<VisitsStats>({ action: "visits", days }),
    staleTime: STALE_MS,
    retry: 1,
  });
}

export function useUptime() {
  return useQuery({
    queryKey: ["admin", "siteStats", "uptime"],
    queryFn: () => callSiteStats<UptimeStats>({ action: "uptime" }),
    staleTime: STALE_MS,
    retry: 1,
  });
}

/** État du serveur (disque, mémoire, certificat, déploiement) : route admin du serveur d'images. */
export function useServerStatus() {
  return useQuery({
    queryKey: ["admin", "serverStatus"],
    staleTime: STALE_MS,
    retry: 1,
    queryFn: async (): Promise<ServerStatus> => {
      const res = await fetch(`${UPLOAD_URL.replace(/\/+$/, "")}/upload/status`, { headers: await uploadAuthHeaders() });
      if (res.status === 404) throw new Error("Route d'état absente : serveur d'images à mettre à jour");
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Serveur d'images : HTTP ${res.status}`);
      }
      return res.json();
    },
  });
}

/** Libellé lisible d'une page du site (pages fixes ; les fiches sont résolues à part). */
export const STATIC_PAGE_LABELS: Record<string, string> = {
  "/": "Accueil",
  "/events": "Agenda",
  "/articles": "Actualités",
  "/about": "L'asso",
  "/gallery": "Photos",
  "/partners": "Partenaires",
  "/monsieur-ours": "Monsieur Ours",
  "/terms": "Conditions d'utilisation",
  "/legal-notice": "Mentions légales",
};
