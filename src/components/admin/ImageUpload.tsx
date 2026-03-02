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

function uploadBase(): string {
  // Normalise pour éviter les doubles slashes
  return UPLOAD_URL.replace(/\/+$/, '');
}

function uploadPostUrl(): string {
  // IMPORTANT: /upload/ (slash final) pour éviter 301 Cloudflare sur /upload
  return `${uploadBase()}/upload/`;
}

function toPublicUrl(relativePath: string): string {
  if (!relativePath) return '';
  if (/^https?:\/\//i.test(relativePath)) return relativePath;

  const base = uploadBase();
  const rel = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${base}${rel}`;
}

export default function ImageUpload({ onUploadComplete, folder = 'images' }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);

  // fetch ne donne pas un vrai progress; on simule une barre indéterminée
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

      // Debug (à retirer après validation)
      console.log('UPLOAD_URL=', UPLOAD_URL);
      console.log('UPLOAD endpoint=', uploadPostUrl());

      const response = await fetch(uploadPostUrl(), {
        method: 'POST',
        body: formData,
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

      const publicUrl = toPublicUrl(uploadedItem.relativePath);
      onUploadComplete(publicUrl);

      toast.success('Image téléchargée avec succès');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error("Erreur lors du téléchargement de l'image");
    } finally {
      setUploading(false);
      setProgress(0);
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
          <Progress value={progress ?? 50} />
          <p className="text-sm text-muted-foreground">Téléchargement en cours...</p>
        </div>
      )}
    </div>
  );
}