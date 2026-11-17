// Retour vers la page admin demandée après connexion (/admin/login?redirect=…).
// Seuls les chemins internes de l'admin sont acceptés : un « redirect » vers
// un autre site (ou « //evil.com ») ferait de la page de connexion une
// redirection ouverte.

const DEFAULT_ADMIN_PATH = '/admin';

export function safeAdminRedirect(value: string | null | undefined): string {
  if (!value) return DEFAULT_ADMIN_PATH;
  // /admin, /admin/…, /admin?…, /admin#… — rien d'autre (pas de //, pas de \)
  if (!/^\/admin(?:[/?#]|$)/.test(value)) return DEFAULT_ADMIN_PATH;
  if (value.includes('//') || value.includes('\\')) return DEFAULT_ADMIN_PATH;
  if (value.startsWith('/admin/login')) return DEFAULT_ADMIN_PATH;
  return value;
}

export function adminLoginPath(redirect: string = DEFAULT_ADMIN_PATH): string {
  return `/admin/login?redirect=${encodeURIComponent(safeAdminRedirect(redirect))}`;
}
