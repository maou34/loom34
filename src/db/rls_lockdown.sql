-- Verrouillage des tables de contenu : activation de la RLS et règles explicites.
-- -----------------------------------------------------------------------------
-- Constat (18/11/2026, requête sur pg_class / pg_policies) : la RLS était
-- DÉSACTIVÉE sur events, articles, gallery_albums, gallery_images, partners et
-- contact_tickets, alors que le rôle `anon` (clé publique, présente dans le code
-- du site) y a les droits INSERT / UPDATE / DELETE. N'importe qui pouvait donc
-- modifier ou supprimer le contenu du site, et lire les messages de contact.
-- Les policies existantes (« Admins can manage all events »…) étaient écrites
-- mais sans effet tant que la RLS est coupée.
--
-- Ce script :
--   1. ajoute, sur chaque table, une policy admin explicite (profiles.is_admin)
--      AVANT d'activer la RLS, pour que l'admin ne soit jamais bloqué, même si
--      les anciennes policies admin sont mal écrites ;
--   2. crée les policies manquantes (partners, contact_tickets) ;
--   3. active la RLS ;
--   4. retire au rôle anon les droits d'écriture dont il n'a pas besoin
--      (seul le formulaire de contact écrit en anonyme).
-- Non concernés : les Edge Functions (service_role contourne la RLS), le serveur
-- d'upload (n'écrit pas en base), profiles / site_settings / monsieur_ours_timeline /
-- article_categories / helloasso_token (RLS déjà active).
--
-- À coller dans l'éditeur SQL Supabase. Idempotent.

-- Condition « administrateur », réutilisée par toutes les policies ci-dessous :
--   EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true)

-- 1. Policies admin explicites --------------------------------------------------------
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['events', 'articles', 'gallery_albums', 'gallery_images', 'partners', 'contact_tickets'] LOOP
        EXECUTE format('DROP POLICY IF EXISTS "LOOM admins manage %1$s" ON public.%1$I', t);
        EXECUTE format(
            'CREATE POLICY "LOOM admins manage %1$s" ON public.%1$I FOR ALL TO authenticated '
            'USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true)) '
            'WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true))',
            t
        );
    END LOOP;
END $$;

-- 2. Lectures publiques manquantes -------------------------------------------------------
-- events / articles : « Published … are viewable by everyone » existe déjà, et la
-- policy restrictive de drafts_rls.sql limite le public aux lignes publiées.
-- gallery_albums / gallery_images : « … are viewable by everyone » existe déjà.
DROP POLICY IF EXISTS "Public can read partners" ON public.partners;
CREATE POLICY "Public can read partners"
    ON public.partners
    FOR SELECT
    USING (true);

-- contact_tickets : le public peut ENVOYER un message (formulaire « Nous écrire »),
-- jamais en lire. Lecture / traitement réservés aux admins (policy du point 1).
DROP POLICY IF EXISTS "Anyone can send a contact message" ON public.contact_tickets;
CREATE POLICY "Anyone can send a contact message"
    ON public.contact_tickets
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- 3. Activation de la RLS ---------------------------------------------------------------
ALTER TABLE public.events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_albums  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_images  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_tickets ENABLE ROW LEVEL SECURITY;

-- 4. Droits du rôle anon : lecture seule (sauf envoi d'un message de contact) ----------
-- Double sécurité : même si une policy trop large réapparaissait, anon ne pourrait pas écrire.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON
    public.events, public.articles, public.gallery_albums, public.gallery_images, public.partners,
    public.article_categories, public.monsieur_ours_timeline, public.site_settings
FROM anon;
REVOKE SELECT, UPDATE, DELETE, TRUNCATE ON public.contact_tickets FROM anon;
GRANT INSERT ON public.contact_tickets TO anon;
-- id SERIAL : l'insertion anonyme a besoin de la séquence
GRANT USAGE ON SEQUENCE public.contact_tickets_id_seq TO anon, authenticated;

-- 5. Contrôle --------------------------------------------------------------------------
-- Relancer la requête de diagnostic : rls_active doit être true partout, et
-- anon_insert / anon_update / anon_delete false partout sauf anon_insert sur contact_tickets.
--   SELECT c.relname, c.relrowsecurity,
--          has_table_privilege('anon', c.oid, 'INSERT') AS anon_insert,
--          has_table_privilege('anon', c.oid, 'UPDATE') AS anon_update,
--          has_table_privilege('anon', c.oid, 'DELETE') AS anon_delete
--   FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE n.nspname = 'public' AND c.relkind = 'r' ORDER BY 1;
-- Puis vérifier dans /admin : créer / modifier / supprimer un brouillon d'événement,
-- d'article, un partenaire, un album ; et sur le site : pages publiques normales.
