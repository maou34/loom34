import React, { useEffect, useMemo, useState } from "react";
import "./AlbumManager.css";

type Album = {
  id: string;
  name?: string;
  title?: string;
};

type AlbumManagerProps = {
  onSelectAlbum?: (album: Album) => void;
};

/**
 * Albums masqués:
 * - images
 * - unclassified
 * - tout ce qui commence par "tip"
 */
const HIDDEN_ALBUM_IDS = new Set<string>(["images", "unclassified"]);
const HIDDEN_PREFIXES = ["tip"];

function isHiddenAlbum(album: Album): boolean {
  const id = String(album?.id ?? "");
  if (HIDDEN_ALBUM_IDS.has(id)) return true;
  return HIDDEN_PREFIXES.some((p) => id.startsWith(p));
}

export default function AlbumManager({ onSelectAlbum }: AlbumManagerProps) {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAlbums = async (): Promise<Album[]> => {
    const res = await fetch("/upload/albums", { credentials: "include" });
    if (!res.ok) throw new Error(`Erreur chargement albums (${res.status})`);
    const data = (await res.json()) as unknown;
    return Array.isArray(data) ? (data as Album[]) : [];
  };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await fetchAlbums();
        if (!cancelled) setAlbums(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Erreur inconnue");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleAlbums = useMemo(() => albums.filter((a) => !isHiddenAlbum(a)), [albums]);

  const handleAlbumClick = (album: Album) => {
    onSelectAlbum?.(album);
  };

  const handleDeleteAlbum = async (album: Album) => {
    const albumId = String(album?.id ?? "");
    if (!albumId) return;

    const ok = window.confirm(`Supprimer l'album "${album.name ?? album.title ?? albumId}" ?`);
    if (!ok) return;

    try {
      setDeletingId(albumId);
      setError("");

      const res = await fetch(`/upload/albums/${encodeURIComponent(albumId)}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Suppression impossible (${res.status})`);
      }

      const updated = await fetchAlbums();
      setAlbums(updated);
    } catch (e: any) {
      setError(e?.message || "Erreur inconnue");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="album-manager">
      <h2>Albums</h2>

      {loading && <div>Chargement...</div>}
      {error && <div className="error">{error}</div>}

      {!loading && !error && (
        <ul className="album-list">
          {visibleAlbums.map((album) => {
            const id = String(album.id);
            return (
              <li key={id} className="album-item">
                <button
                  type="button"
                  className="album-select"
                  onClick={() => handleAlbumClick(album)}
                >
                  {album.name ?? album.title ?? album.id}
                </button>

                <button
                  type="button"
                  className="album-delete"
                  onClick={() => handleDeleteAlbum(album)}
                  disabled={deletingId === id}
                  aria-busy={deletingId === id}
                  title="Supprimer l'album"
                >
                  {deletingId === id ? "..." : "Supprimer"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}