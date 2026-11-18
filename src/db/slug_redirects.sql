-- Adresses (slugs) des événements et articles : correctif des accents et
-- redirections des anciennes adresses (refonte, étape 10).
-- -----------------------------------------------------------------------------
-- L'ancienne règle de l'admin supprimait les lettres accentuées au lieu de les
-- translittérer (« Nîmes » → « nmes », « fête » → « f-te ») et laissait des tirets
-- en bout (« anniversaire- »). La nouvelle règle (src/lib/slug.ts, et slugify()
-- ci-dessous : garder les deux identiques) donne « nimes », « fete ».
--
-- Pour ne casser aucun lien déjà partagé, chaque changement de slug est noté dans
-- slug_redirects par un trigger (quel que soit l'auteur : admin, synchro HelloAsso,
-- SQL) ; la page d'un événement / article introuvable y cherche la nouvelle
-- adresse et y renvoie (src/lib/slug.ts, useSlugRedirect).
--
-- À coller dans l'éditeur SQL Supabase, EN TROIS FOIS :
--   PARTIE 1 (structure, idempotente), puis
--   PARTIE 2 (aperçu, lecture seule) : vérifier la liste, puis
--   PARTIE 3 (renommage des adresses existantes).

-- =============================================================================
-- PARTIE 1 — structure
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- Même règle que slugify() de src/lib/slug.ts
CREATE OR REPLACE FUNCTION public.slugify(t text)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = public, extensions
AS $$
    SELECT trim(both '-' FROM regexp_replace(lower(extensions.unaccent(coalesce(t, ''))), '[^a-z0-9]+', '-', 'g'));
$$;

CREATE TABLE IF NOT EXISTS public.slug_redirects (
    kind       TEXT NOT NULL CHECK (kind IN ('events', 'articles')),
    old_slug   TEXT NOT NULL,
    new_slug   TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (kind, old_slug)
);

-- Lecture publique (la page d'un contenu renommé doit trouver sa nouvelle adresse) ;
-- aucune écriture depuis l'API : seul le trigger (SECURITY DEFINER) écrit.
ALTER TABLE public.slug_redirects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can read slug redirects" ON public.slug_redirects;
CREATE POLICY "Public can read slug redirects" ON public.slug_redirects FOR SELECT USING (true);
GRANT SELECT ON public.slug_redirects TO anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.slug_redirects FROM anon, authenticated;
GRANT ALL ON public.slug_redirects TO service_role;

CREATE OR REPLACE FUNCTION public.record_slug_redirect()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.slug IS DISTINCT FROM OLD.slug AND coalesce(OLD.slug, '') <> '' AND coalesce(NEW.slug, '') <> '' THEN
        -- Les anciennes adresses qui menaient à OLD mènent désormais à NEW (pas de chaîne)
        UPDATE public.slug_redirects SET new_slug = NEW.slug WHERE kind = TG_TABLE_NAME AND new_slug = OLD.slug;
        INSERT INTO public.slug_redirects (kind, old_slug, new_slug)
        VALUES (TG_TABLE_NAME, OLD.slug, NEW.slug)
        ON CONFLICT (kind, old_slug) DO UPDATE SET new_slug = EXCLUDED.new_slug, created_at = CURRENT_TIMESTAMP;
        -- L'adresse NEW est de nouveau vivante : plus de redirection depuis elle
        DELETE FROM public.slug_redirects WHERE kind = TG_TABLE_NAME AND old_slug = NEW.slug;
    END IF;
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.record_slug_redirect() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS record_slug_redirect ON public.events;
CREATE TRIGGER record_slug_redirect AFTER UPDATE OF slug ON public.events
    FOR EACH ROW EXECUTE FUNCTION public.record_slug_redirect();
DROP TRIGGER IF EXISTS record_slug_redirect ON public.articles;
CREATE TRIGGER record_slug_redirect AFTER UPDATE OF slug ON public.articles
    FOR EACH ROW EXECUTE FUNCTION public.record_slug_redirect();

-- =============================================================================
-- PARTIE 2 — aperçu (lecture seule)
-- Ne sont renommés que les slugs produits par l'ANCIENNE règle à partir du titre
-- actuel (un slug choisi à la main, ou venu de HelloAsso, n'est pas touché).
-- « conflit » = la nouvelle adresse est déjà prise : ligne ignorée en partie 3.
-- =============================================================================
WITH candidates AS (
    SELECT 'events' AS kind, id, title, slug, public.slugify(title) AS new_slug, published
    FROM public.events
    UNION ALL
    SELECT 'articles', id, title, slug, public.slugify(title), published
    FROM public.articles
)
SELECT kind, published, slug AS ancienne_adresse, new_slug AS nouvelle_adresse,
       EXISTS (SELECT 1 FROM candidates o WHERE o.kind = c.kind AND o.id <> c.id AND (o.slug = c.new_slug OR o.new_slug = c.new_slug)) AS conflit
FROM candidates c
WHERE slug = regexp_replace(regexp_replace(regexp_replace(lower(title), '[^a-z0-9_[:space:]-]', '', 'g'), '[[:space:]]+', '-', 'g'), '-+', '-', 'g')
  AND slug <> new_slug
  AND new_slug <> ''
ORDER BY kind, published DESC, slug;

-- =============================================================================
-- PARTIE 3 — renommage (le trigger crée les redirections)
-- =============================================================================
BEGIN;

UPDATE public.events e SET slug = public.slugify(e.title)
WHERE e.slug = regexp_replace(regexp_replace(regexp_replace(lower(e.title), '[^a-z0-9_[:space:]-]', '', 'g'), '[[:space:]]+', '-', 'g'), '-+', '-', 'g')
  AND e.slug <> public.slugify(e.title)
  AND public.slugify(e.title) <> ''
  AND NOT EXISTS (SELECT 1 FROM public.events o WHERE o.id <> e.id AND (o.slug = public.slugify(e.title) OR public.slugify(o.title) = public.slugify(e.title)));

UPDATE public.articles a SET slug = public.slugify(a.title)
WHERE a.slug = regexp_replace(regexp_replace(regexp_replace(lower(a.title), '[^a-z0-9_[:space:]-]', '', 'g'), '[[:space:]]+', '-', 'g'), '-+', '-', 'g')
  AND a.slug <> public.slugify(a.title)
  AND public.slugify(a.title) <> ''
  AND NOT EXISTS (SELECT 1 FROM public.articles o WHERE o.id <> a.id AND (o.slug = public.slugify(a.title) OR public.slugify(o.title) = public.slugify(a.title)));

-- Redirections créées
SELECT kind, old_slug AS ancienne_adresse, new_slug AS nouvelle_adresse FROM public.slug_redirects ORDER BY kind, old_slug;

COMMIT;
