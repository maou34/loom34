#!/usr/bin/env node
// Contrôle du site en ligne (hebdomadaire, GitHub Actions — voir .github/workflows/site-audit.yml).
//
// - certificats HTTPS de lgbt-loom.fr et upload.lgbt-loom.fr (erreur < 14 jours) ;
// - sitemap.xml et robots.txt ;
// - serveur d'images (GET /upload/albums) ;
// - chaque page du sitemap, puis chaque lien interne trouvé, rendue dans Chrome
//   comme par un visiteur (le site est une SPA : un simple GET répond toujours 200) :
//   page 404, erreurs JavaScript, images ou fichiers du site en erreur ;
// - liens externes (partenaires, HelloAsso…) : 404/410 ou domaine injoignable.
//
// Aucune nouvelle dépendance : Chrome est piloté par le protocole DevTools
// (WebSocket natif de Node ≥ 22). Chrome : CHROME_PATH, sinon google-chrome.
// Le script Cloudflare Web Analytics est bloqué pour ne pas compter ces visites.
//
// Usage : node scripts/site-check.mjs [https://lgbt-loom.fr]
// Sortie : rapport Markdown (+ GITHUB_STEP_SUMMARY) ; code 1 s'il y a des erreurs.
import { spawn } from "node:child_process";
import { appendFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import tls from "node:tls";

const SITE = (process.argv[2] || "https://lgbt-loom.fr").replace(/\/+$/, "");
const SITE_HOST = new URL(SITE).host;
const UPLOAD = "https://upload.lgbt-loom.fr";
const OWN_HOSTS = new Set([SITE_HOST, `www.${SITE_HOST}`, new URL(UPLOAD).host]);
const MAX_PAGES = 150;
const SKIP_PATHS = /^\/(admin|auth)(\/|$)/;
/** Réseaux sociaux : bloquent les robots (403/429/999), inutile de les tester */
const UNCHECKABLE_HOSTS = /(^|\.)(facebook\.com|instagram\.com|linkedin\.com|x\.com|twitter\.com|tiktok\.com)$/;
const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36 LOOM-site-check";

const errors = [];
const warnings = [];
const notes = [];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Certificats

function certDaysLeft(host) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port: 443, servername: host, timeout: 15000 }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      if (!cert?.valid_to) return reject(new Error("certificat illisible"));
      resolve(Math.floor((new Date(cert.valid_to).getTime() - Date.now()) / 86_400_000));
    });
    socket.on("error", reject);
    socket.on("timeout", () => socket.destroy(new Error("délai dépassé")));
  });
}

// (un build local servi en http n'a pas de certificat : seul celui du serveur d'images est alors vérifié)
for (const host of SITE.startsWith("https:") ? [SITE_HOST, new URL(UPLOAD).host] : [new URL(UPLOAD).host]) {
  try {
    const days = await certDaysLeft(host);
    if (days < 14) errors.push(`Certificat HTTPS de ${host} : expire dans ${days} jour(s) — le renouvellement automatique (certbot) ne fonctionne plus ?`);
    else if (days < 30) warnings.push(`Certificat HTTPS de ${host} : expire dans ${days} jours`);
    else notes.push(`Certificat ${host} : ${days} jours restants`);
  } catch (e) {
    errors.push(`Certificat HTTPS de ${host} : ${e.message}`);
  }
}

// ---------------------------------------------------------------------------
// Sitemap, robots.txt, serveur d'images

async function get(url, init = {}) {
  return fetch(url, { redirect: "follow", signal: AbortSignal.timeout(20000), headers: { "User-Agent": UA }, ...init });
}

let sitemapUrls = [];
try {
  const res = await get(`${SITE}/sitemap.xml`);
  const xml = await res.text();
  // Entités XML (&apos; dans les noms d'albums, &amp;…) à décoder
  const decode = (t) => t.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  sitemapUrls = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => decode(m[1]));
  if (!res.ok || sitemapUrls.length < 5) errors.push(`sitemap.xml : HTTP ${res.status}, ${sitemapUrls.length} adresse(s)`);
  else notes.push(`sitemap.xml : ${sitemapUrls.length} adresses`);
} catch (e) {
  errors.push(`sitemap.xml illisible : ${e.message}`);
}
try {
  const res = await get(`${SITE}/robots.txt`);
  const txt = await res.text();
  if (!res.ok || !/sitemap:/i.test(txt)) warnings.push(`robots.txt : HTTP ${res.status}${/sitemap:/i.test(txt) ? "" : ", pas de ligne Sitemap"}`);
} catch (e) {
  warnings.push(`robots.txt illisible : ${e.message}`);
}
try {
  const res = await get(`${UPLOAD}/upload/albums`);
  const albums = await res.json().catch(() => null);
  if (!res.ok || !Array.isArray(albums)) errors.push(`Serveur d'images : GET /upload/albums → HTTP ${res.status}`);
  else notes.push(`Serveur d'images : ${albums.length} albums`);
} catch (e) {
  errors.push(`Serveur d'images injoignable : ${e.message}`);
}

// ---------------------------------------------------------------------------
// Chrome (protocole DevTools)

const profile = mkdtempSync(join(tmpdir(), "loom-site-check-"));
const chrome = spawn(
  process.env.CHROME_PATH || "google-chrome",
  ["--headless=new", "--no-sandbox", "--disable-gpu", "--no-first-run", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"],
  { stdio: ["ignore", "ignore", "pipe"] },
);
const wsUrl = await new Promise((resolve, reject) => {
  let buf = "";
  const timer = setTimeout(() => reject(new Error("Chrome ne démarre pas")), 30000);
  chrome.stderr.on("data", (d) => {
    buf += d;
    const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
    if (m) {
      clearTimeout(timer);
      resolve(m[1]);
    }
  });
  chrome.on("exit", (code) => reject(new Error(`Chrome s'est arrêté (code ${code})`)));
});

const ws = new WebSocket(wsUrl);
await new Promise((r, j) => {
  ws.onopen = r;
  ws.onerror = j;
});
let msgId = 0;
const pending = new Map();
const listeners = new Set();
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
  } else if (msg.method) listeners.forEach((l) => l(msg));
};
const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });

const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
const page = (method, params) => send(method, params, sessionId);
await page("Page.enable");
await page("Runtime.enable");
await page("Network.enable");
await page("Network.setBlockedURLs", { urls: ["*cloudflareinsights*"] });
await page("Network.setUserAgentOverride", { userAgent: UA });
await page("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

const isOwn = (u) => {
  try {
    return OWN_HOSTS.has(new URL(u).host);
  } catch {
    return false;
  }
};

/** Rend une page ; renvoie liens trouvés + problèmes */
async function renderPage(url) {
  const problems = [];
  const requests = new Map();
  const onEvent = (msg) => {
    if (msg.sessionId !== sessionId) return;
    const p = msg.params;
    if (msg.method === "Network.requestWillBeSent") requests.set(p.requestId, { url: p.request.url, type: p.type });
    if (msg.method === "Network.responseReceived") {
      const r = p.response;
      if (r.status >= 400 && (isOwn(r.url) || p.type === "Image")) problems.push(`${p.type ?? "fichier"} en erreur HTTP ${r.status} : ${r.url}`);
    }
    if (msg.method === "Network.loadingFailed" && !p.canceled && !p.blockedReason) {
      const req = requests.get(p.requestId);
      if (req && (isOwn(req.url) || req.type === "Image")) problems.push(`${req.type ?? "fichier"} non chargé (${p.errorText}) : ${req.url}`);
    }
    if (msg.method === "Runtime.exceptionThrown") {
      const d = p.exceptionDetails;
      const where = d.url || d.stackTrace?.callFrames?.[0]?.url || "";
      if (!where || isOwn(where)) problems.push(`Erreur JavaScript : ${(d.exception?.description || d.text || "").split("\n")[0]}`);
    }
  };
  listeners.add(onEvent);
  try {
    const loaded = new Promise((resolve) => {
      const l = (msg) => {
        if (msg.sessionId === sessionId && msg.method === "Page.loadEventFired") {
          listeners.delete(l);
          resolve();
        }
      };
      listeners.add(l);
      setTimeout(() => {
        listeners.delete(l);
        resolve();
      }, 30000);
    });
    const nav = await page("Page.navigate", { url });
    if (nav.errorText) {
      problems.push(`Page injoignable : ${nav.errorText}`);
      return { problems, links: [] };
    }
    await loaded;
    await wait(2500); // données Supabase / serveur d'images
    // Faire défiler pour déclencher les images en chargement différé
    await page("Runtime.evaluate", {
      expression: `(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } })()`,
      awaitPromise: true,
    });
    await wait(1500);
    const { result } = await page("Runtime.evaluate", {
      returnByValue: true,
      expression: `({
        path: location.pathname,
        title: document.title,
        h1: document.querySelector('h1')?.innerText ?? '',
        links: [...document.querySelectorAll('a[href]')].map(a => a.href),
        brokenImages: [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.currentSrc && !i.currentSrc.startsWith('data:')).map(i => i.currentSrc),
      })`,
    });
    const v = result.value;
    const requestedPath = new URL(url).pathname.replace(/\/+$/, "") || "/";
    if (v.path === "/404" || /^Page introuvable/.test(v.title) || /introuvable/i.test(v.h1)) problems.push("Page introuvable (404)");
    else if ((v.path.replace(/\/+$/, "") || "/") !== requestedPath) problems.push(`redirigée vers ${v.path} (lien à mettre à jour)`);
    for (const src of v.brokenImages) if (!problems.some((p) => p.includes(src))) problems.push(`Image cassée : ${src}`);
    return { problems: [...new Set(problems)], links: v.links };
  } finally {
    listeners.delete(onEvent);
  }
}

// ---------------------------------------------------------------------------
// Parcours : pages du sitemap puis liens internes découverts

const normalize = (u) => {
  const x = new URL(u);
  return `${SITE}${x.pathname.replace(/\/+$/, "") || "/"}`;
};
const queue = [...new Set(sitemapUrls.map(normalize))];
const visited = new Set();
const foundOn = new Map(); // lien → première page où il apparaît
const externalLinks = new Map();
const pageProblems = [];

while (queue.length && visited.size < MAX_PAGES) {
  const url = queue.shift();
  if (visited.has(url)) continue;
  visited.add(url);
  let res;
  try {
    res = await renderPage(url);
  } catch (e) {
    res = { problems: [`Rendu impossible : ${e.message}`], links: [] };
  }
  if (res.problems.length) pageProblems.push({ url, from: foundOn.get(url), problems: res.problems });
  for (const href of res.links) {
    let u;
    try {
      u = new URL(href);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(u.protocol)) continue;
    if (u.host === SITE_HOST || u.host === `www.${SITE_HOST}`) {
      if (SKIP_PATHS.test(u.pathname) || /\.[a-z0-9]{2,5}$/i.test(u.pathname)) continue; // fichiers : pas des pages
      const n = normalize(href);
      if (!visited.has(n) && !queue.includes(n)) {
        queue.push(n);
        foundOn.set(n, url);
      }
    } else if (!OWN_HOSTS.has(u.host)) {
      const key = href.split("#")[0];
      if (!externalLinks.has(key)) externalLinks.set(key, url);
    }
  }
}
if (queue.length) warnings.push(`Parcours arrêté à ${MAX_PAGES} pages (${queue.length} non vérifiées)`);

ws.close();
chrome.kill();
await wait(500);
try {
  rmSync(profile, { recursive: true, force: true });
} catch {
  /* profil Chrome encore verrouillé : sans importance */
}

for (const p of pageProblems) {
  const path = p.url.replace(SITE, "") || "/";
  const from = p.from ? ` (lien depuis ${p.from.replace(SITE, "") || "/"})` : "";
  const onlyRedirect = p.problems.every((x) => x.startsWith("redirigée"));
  (onlyRedirect ? warnings : errors).push(`Page ${path}${from} : ${p.problems.join(" ; ")}`);
}
notes.push(`${visited.size} pages rendues dans Chrome`);

// ---------------------------------------------------------------------------
// Liens externes

const external = [...externalLinks.entries()].filter(([u]) => !UNCHECKABLE_HOSTS.test(new URL(u).host));
const unverifiable = [];
async function checkExternal([url, from]) {
  const fromPath = from.replace(SITE, "") || "/";
  try {
    let res = await get(url, { method: "HEAD" });
    if (res.status === 405 || res.status === 403 || res.status === 404) res = await get(url); // certains serveurs refusent HEAD
    if (res.status === 404 || res.status === 410) errors.push(`Lien cassé (HTTP ${res.status}) : ${url} — sur ${fromPath}`);
    else if (res.status >= 400) unverifiable.push(`${url} (HTTP ${res.status})`);
  } catch (e) {
    const cause = e.cause?.code || e.name || e.message;
    if (cause === "ENOTFOUND") errors.push(`Lien cassé (domaine inexistant) : ${url} — sur ${fromPath}`);
    else unverifiable.push(`${url} (${cause})`);
  }
}
for (let i = 0; i < external.length; i += 6) await Promise.all(external.slice(i, i + 6).map(checkExternal));
notes.push(`${external.length} liens externes vérifiés (${externalLinks.size - external.length} vers des réseaux sociaux ignorés)`);
if (unverifiable.length) notes.push(`Liens externes non vérifiables (blocage des robots ou panne passagère) : ${unverifiable.join(", ")}`);

// ---------------------------------------------------------------------------
// Rapport

const lines = ["## Site en ligne", ""];
lines.push(errors.length ? `❌ **${errors.length} problème(s)**` : "✅ Aucun problème détecté.", "");
if (errors.length) lines.push("### Problèmes", ...errors.map((e) => `- ${e}`), "");
if (warnings.length) lines.push("### À vérifier", ...warnings.map((w) => `- ${w}`), "");
lines.push("### Informations", ...notes.map((n) => `- ${n}`));
const md = lines.join("\n") + "\n";
console.log(md);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n");
process.exit(errors.length ? 1 : 0);
