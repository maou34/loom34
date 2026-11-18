import { AlertTriangle, CheckCircle2, CircleHelp, XCircle } from "lucide-react";
import { useServerStatus, useUptime } from "@/lib/siteStats";

type Level = "good" | "warning" | "critical" | "unknown";

const LEVEL_STYLE: Record<Level, { icon: typeof CheckCircle2; className: string; label: string }> = {
  good: { icon: CheckCircle2, className: "text-green-700", label: "OK" },
  warning: { icon: AlertTriangle, className: "text-amber-700", label: "À surveiller" },
  critical: { icon: XCircle, className: "text-red-700", label: "Problème" },
  unknown: { icon: CircleHelp, className: "text-loom-text-muted", label: "Inconnu" },
};

function ago(iso: string | null | undefined) {
  if (!iso) return null;
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 60) return `il y a ${Math.max(1, min)} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
}

function Row({ label, value, level, pct }: { label: string; value: string; level: Level; pct?: number | null }) {
  const s = LEVEL_STYLE[level];
  const Icon = s.icon;
  return (
    <li className="flex flex-col gap-1.5 border-b border-loom-border py-2 last:border-b-0">
      <div className="flex items-center gap-2 text-sm">
        <Icon aria-hidden="true" className={`h-4 w-4 flex-none ${s.className}`} />
        <span className="sr-only">{s.label} : </span>
        <span className="flex-1">{label}</span>
        <span className="text-right text-loom-text-muted">{value}</span>
      </div>
      {pct !== undefined && pct !== null && (
        <span aria-hidden="true" className="ml-6 h-1.5 rounded-full bg-loom-surface-2">
          <span className="block h-1.5 rounded-full bg-loom-text-muted" style={{ width: `${Math.min(100, pct)}%` }} />
        </span>
      )}
    </li>
  );
}

const pctLevel = (v: number | null | undefined, warn: number, crit: number): Level =>
  v === null || v === undefined ? "unknown" : v >= crit ? "critical" : v >= warn ? "warning" : "good";

/** Bloc « Santé du site » : UptimeRobot (disponibilité) + route /upload/status du serveur. */
export default function HealthCard({ className }: { className: string }) {
  const uptime = useUptime();
  const server = useServerStatus();

  const monitors = uptime.data?.configured ? uptime.data.monitors : [];
  const site = monitors.find((m) => /lgbt-loom\.fr/.test(m.url) && !/upload\./.test(m.url)) ?? monitors[0];
  const uploadMonitor = monitors.find((m) => /upload\./.test(m.url));
  const st = server.data;

  const headline = (() => {
    if (uptime.isLoading) return { level: "unknown" as Level, title: "Vérification…", detail: "" };
    if (uptime.error) return { level: "unknown" as Level, title: "Surveillance indisponible", detail: uptime.error instanceof Error ? uptime.error.message : "" };
    if (!uptime.data?.configured || !site)
      return { level: "unknown" as Level, title: "Surveillance non configurée", detail: "Clé UptimeRobot manquante (secret UPTIMEROBOT_API_KEY de site-stats)" };
    const ratio = site.uptime30 !== null ? `${site.uptime30.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} % sur 30 jours` : "";
    if (site.status === "up") return { level: "good" as Level, title: "Le site est en ligne", detail: ratio };
    if (site.status === "paused" || site.status === "pending") return { level: "unknown" as Level, title: "Surveillance en pause", detail: ratio };
    return { level: "critical" as Level, title: "Le site ne répond pas", detail: ratio };
  })();
  const H = LEVEL_STYLE[headline.level];
  const HIcon = H.icon;

  const responseMs = site?.avgResponseMs ?? null;
  const cert = st?.certificate;

  return (
    <section aria-labelledby="h-health" className={className}>
      <h2 id="h-health" className="text-base font-bold">
        Santé du site
      </h2>
      <div className="flex items-center gap-3 rounded-xl bg-loom-surface-2 p-3">
        <HIcon aria-hidden="true" className={`h-6 w-6 flex-none ${H.className}`} />
        <span className="flex min-w-0 flex-col">
          <span className="font-bold">{headline.title}</span>
          {headline.detail && <span className="truncate text-xs text-loom-text-muted">{headline.detail}</span>}
        </span>
      </div>

      <ul className="flex flex-col">
        {responseMs !== null && <Row label="Temps de réponse moyen" value={`${responseMs} ms`} level={responseMs > 1500 ? "warning" : "good"} />}
        {uploadMonitor && (
          <Row
            label="Serveur d'images"
            value={uploadMonitor.status === "up" ? "en ligne" : uploadMonitor.status === "paused" ? "en pause" : "ne répond pas"}
            level={uploadMonitor.status === "up" ? "good" : uploadMonitor.status === "paused" ? "unknown" : "critical"}
          />
        )}
        {server.error ? (
          <Row label="État du serveur" value={server.error instanceof Error ? server.error.message : "indisponible"} level="unknown" />
        ) : st ? (
          <>
            <Row
              label="Certificat HTTPS"
              value={cert ? `expire dans ${cert.daysLeft} j` : "non lu"}
              level={!cert ? "unknown" : cert.daysLeft < 7 ? "critical" : cert.daysLeft < 20 ? "warning" : "good"}
            />
            <Row label="Espace disque" value={st.disk?.usedPct != null ? `${Math.round(st.disk.usedPct)} % utilisé` : "—"} level={pctLevel(st.disk?.usedPct, 80, 92)} pct={st.disk?.usedPct} />
            <Row label="Mémoire" value={st.memory?.usedPct != null ? `${Math.round(st.memory.usedPct)} % utilisée` : "—"} level={pctLevel(st.memory?.usedPct, 85, 95)} pct={st.memory?.usedPct} />
            <Row
              label="Dernière mise en ligne"
              value={[ago(st.deploy?.builtAt), st.deploy?.commit?.hash].filter(Boolean).join(" · ") || "—"}
              level={st.deploy?.builtAt ? "good" : "unknown"}
            />
          </>
        ) : (
          <li className="h-24 animate-pulse rounded-xl bg-loom-surface-2" />
        )}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <a href="https://dashboard.uptimerobot.com/monitors" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-loom-accent-text hover:underline">
          Historique de disponibilité →
        </a>
        <span className="text-xs text-loom-text-muted">Sources : UptimeRobot · serveur</span>
      </div>
    </section>
  );
}
