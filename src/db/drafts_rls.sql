-- Brouillons privés : événements et articles non publiés invisibles du public.
-- -----------------------------------------------------------------------------
-- Constat (nov. 2026) : avec la clé publique du site (anon), l'API renvoie aussi
-- les lignes `published = false` d'`events` (19 événements passés dépubliés) et
-- d'`articles` (21 brouillons). Le site ne les affiche pas, mais n'importe qui
-- peut les lire en interrogeant l'API directement.
--
-- Principe : on AJOUTE une policy RESTRICTIVE sur la lecture. Les policies
-- restrictives se combinent en ET avec les policies existantes (permissives) :
-- pas besoin de connaître ni de supprimer celles déjà en place. Résultat :
--   - visiteurs (anon) et comptes non admin : uniquement les lignes publiées ;
--   - administrateurs (profiles.is_admin) : tout, comme aujourd'hui dans /admin ;
--   - Edge Functions (service_role, sync HelloAsso) : non concernées, la
--     service role contourne la RLS.
-- Seule la lecture (SELECT) change ; création / modification / suppression
-- restent régies par les policies existantes.
--
-- À coller dans l'éditeur SQL Supabase (pas de migrations dans ce projet).
-- Idempotent : peut être relancé sans erreur.

-- Vérification préalable (facultatif) : policies actuelles des deux tables
-- SELECT tablename, policyname, permissive, cmd, roles, qual
--   FROM pg_policies WHERE tablename IN ('events', 'articles');

DROP POLICY IF EXISTS "Drafts visible to admins only" ON public.events;
CREATE POLICY "Drafts visible to admins only"
    ON public.events
    AS RESTRICTIVE
    FOR SELECT
    TO anon, authenticated
    USING (
        published
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = (SELECT auth.uid())
              AND profiles.is_admin = true
        )
    );

DROP POLICY IF EXISTS "Drafts visible to admins only" ON public.articles;
CREATE POLICY "Drafts visible to admins only"
    ON public.articles
    AS RESTRICTIVE
    FOR SELECT
    TO anon, authenticated
    USING (
        published
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = (SELECT auth.uid())
              AND profiles.is_admin = true
        )
    );

-- Contrôle après coup, depuis un terminal (clé publique du site) : doit renvoyer « */0 »
--   curl -sI "$VITE_SUPABASE_URL/rest/v1/events?select=id&published=eq.false" \
--     -H "apikey: $VITE_SUPABASE_ANON_KEY" -H "Prefer: count=exact" | grep -i content-range
-- Et dans /admin, les événements / articles en brouillon doivent toujours apparaître.
