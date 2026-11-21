import { AlertTriangle, CheckCircle2, CircleHelp, Info, Loader2, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLatestSecurityAudit, useRunSecurityAudit, type AuditFinding } from "@/lib/siteStats";

/** Au-delà, l'audit de la nuit n'a visiblement pas tourné (cron arrêté, fonction en erreur) */
const STALE_HOURS = 36;

const FINDING_STYLE: Record<AuditFinding["level"], { icon: typeof XCircle; className: string; label: string }> = {
  critical: { icon: XCircle, className: "text-red-700", label: "Critique" },
  warning: { icon: AlertTriangle, className: "text-amber-700", label: "À vérifier" },
  info: { icon: Info, className: "text-loom-text-muted", label: "Information" },
};

const ORDER: Record<AuditFinding["level"], number> = { critical: 0, warning: 1, info: 2 };

function when(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
}

/** Bloc « Sécurité » : résultat du dernier audit automatique de la base + bouton pour le relancer. */
export default function SecurityCard({ className }: { className: string }) {
  const audit = useLatestSecurityAudit();
  const rerun = useRunSecurityAudit();
  const run = audit.data && audit.data !== "absent" ? audit.data : null;

  const ageHours = run ? (Date.now() - new Date(run.ran_at).getTime()) / 3_600_000 : null;
  const stale = ageHours !== null && ageHours > STALE_HOURS;
  const findings = run ? [...run.findings].sort((a, b) => ORDER[a.level] - ORDER[b.level]) : [];
  const problems = findings.filter((f) => f.level !== "info").length;

  const headline = (() => {
    if (audit.isLoading) return { icon: CircleHelp, className: "text-loom-text-muted", title: "Chargement…", detail: "" };
    if (audit.error)
      return { icon: CircleHelp, className: "text-loom-text-muted", title: "Audit illisible", detail: audit.error instanceof Error ? audit.error.message : "" };
    if (audit.data === "absent")
      return { icon: CircleHelp, className: "text-loom-text-muted", title: "Audit pas encore installé", detail: "Migration security_audit à appliquer sur la base." };
    if (!run) return { icon: CircleHelp, className: "text-loom-text-muted", title: "Aucun audit pour l'instant", detail: "Le premier passage a lieu chaque nuit, ou avec le bouton ci-contre." };
    const at = `Dernier audit : ${when(run.ran_at)}${run.source === "manuel" ? " (relancé à la main)" : ""}`;
    if (run.status === "critical") return { icon: XCircle, className: "text-red-700", title: "Problème de sécurité à traiter", detail: at };
    if (run.status === "warning")
      return { icon: AlertTriangle, className: "text-amber-700", title: `${problems} point${problems > 1 ? "s" : ""} à vérifier`, detail: at };
    return { icon: CheckCircle2, className: "text-green-700", title: "Aucun problème détecté", detail: at };
  })();
  const HIcon = headline.icon;

  return (
    <section aria-labelledby="h-security" className={className}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="h-security" className="flex items-center gap-2 text-base font-bold">
          <ShieldCheck aria-hidden="true" className="h-5 w-5" /> Sécurité
        </h2>
        <Button type="button" variant="outline" size="sm" onClick={() => rerun.mutate()} disabled={rerun.isPending || audit.data === "absent"}>
          {rerun.isPending ? <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw aria-hidden="true" className="mr-2 h-4 w-4" />}
          {rerun.isPending ? "Audit en cours…" : "Relancer l'audit"}
        </Button>
      </div>

      <div className="flex items-center gap-3 rounded-xl bg-loom-surface-2 p-3" aria-live="polite">
        <HIcon aria-hidden="true" className={`h-6 w-6 flex-none ${headline.className}`} />
        <span className="flex min-w-0 flex-col">
          <span className="font-bold">{headline.title}</span>
          {headline.detail && <span className="text-xs text-loom-text-muted">{headline.detail}</span>}
        </span>
      </div>

      {rerun.error && (
        <p role="alert" className="text-sm text-red-700">
          Impossible de relancer l'audit : {rerun.error instanceof Error ? rerun.error.message : String(rerun.error)}
        </p>
      )}
      {stale && (
        <p className="flex items-start gap-2 text-sm text-amber-700">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 flex-none" />
          L'audit de la nuit n'a pas tourné depuis plus de {Math.floor(ageHours! / 24) || 1} jour(s) : vérifier la tâche planifiée « security-audit ».
        </p>
      )}

      {findings.length > 0 && (
        <ul className="flex flex-col">
          {findings.map((f, i) => {
            const s = FINDING_STYLE[f.level];
            const Icon = s.icon;
            return (
              <li key={i} className="border-b border-loom-border py-2 last:border-b-0">
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-start gap-2 text-sm">
                    <Icon aria-hidden="true" className={`mt-0.5 h-4 w-4 flex-none ${s.className}`} />
                    <span className="sr-only">{s.label} : </span>
                    <span className="flex-1">{f.title}</span>
                    {f.detail && <span className="text-xs text-loom-text-muted group-open:hidden">Détails</span>}
                  </summary>
                  {f.detail && <p className="ml-6 mt-1 break-words text-xs text-loom-text-muted">{f.detail}</p>}
                </details>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-loom-text-muted">
        Contrôle chaque nuit les protections de la base (RLS, droits des visiteurs, statut administrateur, inscriptions) et signale tout nouvel
        administrateur, nouveau compte ou règle d'accès modifiée. Les administrateurs sont prévenus par e-mail en cas de problème.
      </p>
    </section>
  );
}
