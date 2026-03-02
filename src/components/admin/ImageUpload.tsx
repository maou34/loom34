import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { UPLOAD_URL } from '@/config';

interface ImageUploadProps {
  onUploadComplete: (url: string) => void;
  folder?: string;
}

type UploadResponse = {
  items: Array<{
    filename: string;
    relativePath: string; // ex: /gallery/album/image.jpg
  }>;
};

function toPublicUrl(relativePath: string): string {
  if (!relativePath) return '';
  // Si jamais l'API renvoie déjà une URL absolue
  if (/^https?:\/\//i.test(relativePath)) return relativePath;

  // Normaliser pour éviter les // dans l'URL finale
  const base = UPLOAD_URL.replace(/\/+$/, '');
  const rel = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${base}${rel}`;
}

export default function ImageUpload({ onUploadComplete, folder = 'images' }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);

  // fetch ne permet pas un progress fiable sans XHR/axios,
  // donc on affiche une barre "pseudo-indeterminate" pendant l'upload.
  const [progress, setProgress] = useState<number | null>(null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      setUploading(true);
      setProgress(null);

      const formData = new FormData();
      formData.append('files', file);
      formData.append('albumId', folder);

      const response = await fetch(`${UPLOAD_URL.replace(/\/+$/, '')}/upload/`, {
        method: 'POST',
        body: formData,
        // conseillé si ton serveur utilise credentials:true (et future-proof si cookies un jour)
        credentials: 'include',
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Upload failed (${response.status}): ${text}`);
      }

      const data = (await response.json()) as UploadResponse;
      const uploadedItem = data.items?.[0];
      if (!uploadedItem?.relativePath) {
        throw new Error('Upload failed: invalid server response (missing relativePath)');
      }

      // IMPORTANT: on renvoie une URL utilisable depuis loom-lgbt.fr
      const publicUrl = toPublicUrl(uploadedItem.relativePath);

      onUploadComplete(publicUrl);
      toast.success('Image téléchargée avec succès');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error("Erreur lors du téléchargement de l'image");
    } finally {
      setUploading(false);
      setProgress(0);
      // reset pour permettre de re-sélectionner le même fichier
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="image">Image</Label>
        <Input
          id="image"
          type="file"
          accept="image/*"
          onChange={handleUpload}
          disabled={uploading}
        />
      </div>

      {uploading && (
        <div className="space-y-2">
          {/* Indeterminate "simple" */}
          <Progress value={progress ?? 50} />
          <p className="text-sm text-muted-foreground">Téléchargement en cours...</p>
        </div>
      )}
    </div>
  );
}