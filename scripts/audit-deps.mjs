#!/usr/bin/env node
// Failles connues dans les dépendances utilisées en production (npm audit --omit=dev).
//
// Échoue (code 1) dès qu'une faille de gravité « moderate » ou plus n'est ni
// corrigée ni acceptée ci-dessous. Accepter une faille = l'ajouter à ACCEPTED avec
// une raison et une date de revue : ça doit rester l'exception.
//
// Usage : node scripts/audit-deps.mjs   (rapport Markdown sur la sortie standard,
// ajouté au résumé de l'exécution GitHub Actions si GITHUB_STEP_SUMMARY est défini)
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

/** Avis GHSA acceptés : { id: "raison (revoir le JJ/MM/AAAA)" } */
const ACCEPTED = {
  // (aucun pour l'instant — zod 4 et react-router 7 ont fermé les trois derniers, 21/11/2026)
};

const SEVERITIES = ["info", "low", "moderate", "high", "critical"];
const MIN = SEVERITIES.indexOf("moderate");

let raw;
try {
  raw = execFileSync("npm", ["audit", "--omit=dev", "--json"], { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
} catch (e) {
  raw = e.stdout; // npm audit sort en code 1 quand il trouve quelque chose
}
const report = JSON.parse(raw);
if (report.error) {
  console.error("npm audit a échoué :", report.error.summary ?? report.error);
  process.exit(2);
}

// Un avis par ligne : paquet, gravité, titre, lien, correctif disponible
const rows = [];
for (const [name, v] of Object.entries(report.vulnerabilities ?? {})) {
  for (const via of v.via) {
    if (typeof via === "string") continue; // hérité d'une autre dépendance, listée à part
    const id = via.url?.split("/").pop() ?? String(via.source);
    const fix = v.fixAvailable === false ? "aucun" : v.fixAvailable === true ? "npm audit fix" : `${v.fixAvailable.name}@${v.fixAvailable.version}${v.fixAvailable.isSemVerMajor ? " (majeur)" : ""}`;
    rows.push({ name, severity: via.severity, title: via.title, url: via.url, id, fix, accepted: ACCEPTED[id] });
  }
}
const seen = new Set();
const unique = rows
  .filter((r) => !seen.has(`${r.name}|${r.id}`) && seen.add(`${r.name}|${r.id}`))
  .sort((a, b) => SEVERITIES.indexOf(b.severity) - SEVERITIES.indexOf(a.severity) || a.name.localeCompare(b.name));
const blocking = unique.filter((r) => !r.accepted && SEVERITIES.indexOf(r.severity) >= MIN);
const accepted = unique.filter((r) => r.accepted);

const lines = ["## Dépendances (npm audit, production)", ""];
if (unique.length === 0) lines.push("✅ Aucune faille connue.");
else {
  lines.push(blocking.length ? `❌ **${blocking.length} faille(s) à corriger**` : "✅ Aucune faille à corriger.", "");
  lines.push("| Gravité | Paquet | Faille | Correctif | Statut |", "|---|---|---|---|---|");
  for (const r of unique) {
    const status = r.accepted ? `acceptée : ${r.accepted}` : SEVERITIES.indexOf(r.severity) >= MIN ? "**à corriger**" : "faible";
    lines.push(`| ${r.severity} | ${r.name} | [${r.title.replace(/\|/g, "/")}](${r.url}) | ${r.fix} | ${status} |`);
  }
}
// Un avis accepté qui n'apparaît plus : à retirer de ACCEPTED
const stale = Object.keys(ACCEPTED).filter((id) => !accepted.some((r) => r.id === id));
if (stale.length) lines.push("", `ℹ️ Avis acceptés qui ne s'appliquent plus (à retirer de ACCEPTED) : ${stale.join(", ")}`);

const md = lines.join("\n") + "\n";
console.log(md);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n");
process.exit(blocking.length ? 1 : 0);
