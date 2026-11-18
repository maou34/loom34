// État du serveur pour le tableau de bord de l'admin (route GET /upload/status,
// réservée aux admins) : espace disque, mémoire, certificat HTTPS du site,
// dernier déploiement (date du build + commit). Chaque mesure est indépendante :
// une qui échoue vaut null, sans empêcher les autres.
import fs from 'fs';
import { promises as fsp } from 'fs';
import os from 'os';
import path from 'path';
import tls from 'tls';
import { execFile } from 'child_process';
import { promisify } from 'util';

const run = promisify(execFile);
const ROOT = process.cwd(); // /var/www/loom34 en production
/** Domaine dont on lit le certificat, servi par le nginx local */
const CERT_HOST = process.env.STATUS_CERT_HOST || 'lgbt-loom.fr';

const pct = (used, total) => (total > 0 ? Math.round((used / total) * 1000) / 10 : null);

async function disk() {
  const s = await fsp.statfs('/');
  // Même calcul que `df` : utilisé / (utilisé + disponible pour les utilisateurs)
  const used = (s.blocks - s.bfree) * s.bsize;
  const avail = s.bavail * s.bsize;
  return { usedPct: pct(used, used + avail), totalGb: Math.round(((used + avail) / 1e9) * 10) / 10 };
}

async function memory() {
  try {
    const info = await fsp.readFile('/proc/meminfo', 'utf8');
    const kb = (key) => Number(info.match(new RegExp(`^${key}:\\s+(\\d+)`, 'm'))?.[1] ?? NaN);
    const total = kb('MemTotal');
    const available = kb('MemAvailable'); // le cache disque n'est pas de la mémoire « prise »
    if (Number.isFinite(total) && Number.isFinite(available)) return { usedPct: pct(total - available, total) };
  } catch {
    // pas de /proc (macOS) : repli ci-dessous
  }
  return { usedPct: pct(os.totalmem() - os.freemem(), os.totalmem()) };
}

/** Certificat présenté par le nginx local pour CERT_HOST (pas de dépendance aux fichiers root de certbot). */
function certificate() {
  return new Promise((resolve) => {
    const socket = tls.connect({ host: '127.0.0.1', port: 443, servername: CERT_HOST, rejectUnauthorized: false, timeout: 3000 }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      if (!cert?.valid_to) return resolve(null);
      const expiresAt = new Date(cert.valid_to);
      resolve({ host: CERT_HOST, expiresAt: expiresAt.toISOString(), daysLeft: Math.floor((expiresAt.getTime() - Date.now()) / 86400000) });
    });
    socket.on('error', () => resolve(null));
    socket.on('timeout', () => {
      socket.destroy();
      resolve(null);
    });
  });
}

async function deploy() {
  let builtAt = null;
  try {
    builtAt = (await fsp.stat(path.join(ROOT, 'dist', 'index.html'))).mtime.toISOString();
  } catch {
    // pas de build (développement)
  }
  let commit = null;
  let committedAt = null;
  if (fs.existsSync(path.join(ROOT, '.git'))) {
    try {
      const { stdout } = await run('git', ['-C', ROOT, 'log', '-1', '--format=%h|%cI|%s'], { timeout: 3000 });
      const [hash, date, ...subject] = stdout.trim().split('|');
      commit = { hash, subject: subject.join('|').slice(0, 120) };
      committedAt = date;
    } catch {
      // git absent ou dépôt illisible
    }
  }
  return builtAt || commit ? { builtAt, commit, committedAt } : null;
}

const settle = (p) => p.then((v) => v).catch(() => null);

export async function serverStatus() {
  const [d, m, c, dep] = await Promise.all([settle(disk()), settle(memory()), certificate(), settle(deploy())]);
  return {
    checkedAt: new Date().toISOString(),
    disk: d,
    memory: m,
    certificate: c,
    deploy: dep,
    uptimeSec: Math.round(os.uptime()),
  };
}
