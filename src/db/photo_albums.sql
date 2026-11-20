-- Page Photos (refonte, étape 7) : informations des albums photo.
-- -----------------------------------------------------------------------------
-- Les albums sont des DOSSIERS du serveur d'upload (/upload/albums) : leur nom
-- sert d'identifiant et de titre, la couverture est la première photo. Il manque
-- une date (filtre par année, tri), une couverture choisie et le lien vers
-- l'événement de la soirée : cette table les ajoute, une ligne par dossier.
-- Sans ligne pour un album, le site déduit la date du nom du dossier quand il en
-- contient une (« Aper'Ours au Coxx 3 avril 2026 ») et prend la 1re photo.
--
-- NB : les anciennes tables gallery_albums / gallery_images (ids UUID sans lien
-- avec les dossiers) ne sont pas utilisées par la page Photos.
--
-- À coller dans l'éditeur SQL Supabase. Idempotent.

CREATE TABLE IF NOT EXISTS public.photo_albums (
    album_id    TEXT PRIMARY KEY,               -- nom du dossier sur le serveur d'upload
    title       TEXT,                           -- titre affiché (NULL : nom du dossier)
    album_date  DATE,                           -- date de la soirée (NULL : déduite du nom)
    cover_image TEXT,                           -- URL d'une photo de l'album (NULL : la 1re)
    event_id    UUID REFERENCES public.events(id) ON DELETE SET NULL,  -- soirée liée
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS photo_albums_event_id_idx ON public.photo_albums (event_id);

DROP TRIGGER IF EXISTS update_photo_albums_updated_at ON public.photo_albums;
CREATE TRIGGER update_photo_albums_updated_at
    BEFORE UPDATE ON public.photo_albums
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sécurité : lecture publique, écriture réservée aux admins
ALTER TABLE public.photo_albums ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read photo albums" ON public.photo_albums;
CREATE POLICY "Public can read photo albums"
    ON public.photo_albums
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "LOOM admins manage photo_albums" ON public.photo_albums;
CREATE POLICY "LOOM admins manage photo_albums"
    ON public.photo_albums
    FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true));

GRANT SELECT ON public.photo_albums TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.photo_albums TO authenticated;
GRANT ALL ON public.photo_albums TO service_role;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.photo_albums FROM anon;
