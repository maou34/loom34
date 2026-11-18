// Authentification des routes d'écriture du serveur d'upload.
// -----------------------------------------------------------------------------
// Avant (jusqu'à nov. 2026) : aucune vérification, seulement du CORS — qui ne
// protège que contre les autres sites ouverts dans un navigateur, pas contre
// curl. N'importe qui pouvait déposer des fichiers ou supprimer des albums.
//
// Maintenant : l'admin envoie son jeton de session Supabase
// (Authorization: Bearer <access_token>, voir src/lib/uploadAuth.ts). On le
// vérifie auprès de Supabase (/auth/v1/user), puis on lit profiles.is_admin avec
// ce même jeton (lecture publique de profiles). Aucune clé secrète n'est
// nécessaire : l'URL et la clé publique (anon) du projet suffisent.
//
// Variables d'environnement : SUPABASE_URL + SUPABASE_ANON_KEY, ou à défaut
// VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (celles du site). Sans elles, les
// routes d'écriture refusent tout (503) plutôt que de rester ouvertes.

// Charge .env / .env.local du dossier courant s'ils existent (Node ≥ 20.12),
// sans écraser les variables déjà définies.
for (const file of ['.env.local', '.env']) {
  try {
    process.loadEnvFile?.(file);
  } catch {
    /* fichier absent */
  }
}

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

export const authConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// Résultats récents par jeton : un import de 100 photos ne doit pas interroger
// Supabase 100 fois. Court (1 min) pour qu'un admin retiré perde vite l'accès.
const CACHE_TTL_MS = 60_000;
const cache = new Map();

async function checkAdmin(token) {
  const cached = cache.get(token);
  if (cached && cached.expires > Date.now()) return cached.result;

  const headers = { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` };
  let result = 'forbidden';

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers });
  if (!userRes.ok) {
    result = 'unauthorized';
  } else {
    const user = await userRes.json();
    if (user?.id) {
      const profileRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?select=is_admin&id=eq.${encodeURIComponent(user.id)}`,
        { headers },
      );
      if (profileRes.ok) {
        const [profile] = await profileRes.json();
        if (profile?.is_admin === true) result = 'admin';
      } else {
        throw new Error(`profiles HTTP ${profileRes.status}`);
      }
    } else {
      result = 'unauthorized';
    }
  }

  cache.set(token, { result, expires: Date.now() + CACHE_TTL_MS });
  if (cache.size > 500) cache.delete(cache.keys().next().value);
  return result;
}

/** Middleware Express : laisse passer uniquement un admin LOOM connecté. */
export async function requireAdmin(req, res, next) {
  if (!authConfigured) {
    return res.status(503).json({ error: 'Upload server not configured (SUPABASE_URL / SUPABASE_ANON_KEY missing)' });
  }
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
  if (!match) return res.status(401).json({ error: 'Authentication required' });

  try {
    const result = await checkAdmin(match[1].trim());
    if (result === 'admin') return next();
    if (result === 'unauthorized') return res.status(401).json({ error: 'Invalid or expired session' });
    return res.status(403).json({ error: 'Admin only' });
  } catch (err) {
    console.error('Auth check failed:', err?.message || err);
    return res.status(503).json({ error: 'Authentication check failed' });
  }
}
