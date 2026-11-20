import { toast } from 'sonner';

/**
 * Partage natif (mobile, Safari…) si disponible, sinon copie du lien.
 * Une annulation du partage par l'utilisateur n'est pas une erreur.
 */
export async function shareLink(title: string, url = window.location.href): Promise<void> {
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return;
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast.success('Lien copié');
  } catch {
    toast.error('Impossible de copier le lien');
  }
}
