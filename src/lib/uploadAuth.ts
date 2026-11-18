import { db } from '@/db/client';

/**
 * En-tête d'authentification pour les routes d'écriture du serveur d'upload
 * (envoi d'images, création / suppression d'albums et d'images) : le jeton de
 * session Supabase de l'admin connecté. Le serveur le vérifie auprès de
 * Supabase et exige profiles.is_admin (voir server/upload.js).
 */
export async function uploadAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await db.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
