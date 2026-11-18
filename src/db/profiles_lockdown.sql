-- Verrouillage de public.profiles et de delete_user (correctif sécurité, 18/11/2026).
-- -----------------------------------------------------------------------------
-- Constats (requête de diagnostic du 18/11/2026) :
--   1. La policy « Users can update their own profile » (USING auth.uid() = id, sans
--      WITH CHECK) laisse tout compte connecté modifier SA ligne, y compris
--      is_admin : n'importe qui pouvant créer un compte (/auth/register) pouvait se
--      donner les droits d'administration. Les policies permissives s'additionnent,
--      donc la policy plus stricte qui existait à côté ne protégeait rien.
--   2. delete_user(uuid) est SECURITY DEFINER, sans aucune vérification, et
--      exécutable par anon : la clé publique du site suffisait pour supprimer
--      n'importe quel compte.
--   3. « Public profiles are viewable by everyone » : la liste des comptes (noms,
--      qui est admin) était lisible par tout le monde.
--
-- Ce script :
--   a. ajoute un trigger qui refuse tout changement de is_admin qui ne vient pas
--      d'un admin, du service role (Edge Functions) ou de l'éditeur SQL — y compris
--      à la création du compte (métadonnées d'inscription) ;
--   b. supprime la policy UPDATE trop large et retire à anon tout droit d'écriture ;
--   c. limite la lecture : chacun lit son profil, les admins lisent tout
--      (les policies admin des autres tables lisent la ligne de l'appelant : OK) ;
--   d. remplace delete_user par une version réservée aux admins (pas soi-même),
--      non exécutable par anon.
-- Compatible avec le front actuel (main) : un admin peut toujours changer le statut
-- d'un autre compte et supprimer un compte depuis l'admin Utilisateurs.
--
-- À coller dans l'éditeur SQL Supabase. Idempotent.

-- Admin courant ? (SECURITY DEFINER : évite la récursion des policies sur profiles)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true);
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

-- a. Garde-fou sur is_admin
CREATE OR REPLACE FUNCTION public.protect_profile_is_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    changing boolean := CASE WHEN TG_OP = 'INSERT' THEN coalesce(NEW.is_admin, false)
                             ELSE NEW.is_admin IS DISTINCT FROM OLD.is_admin END;
BEGIN
    -- Seules les connexions exposées à Internet sont contrôlées : l'API (authenticator,
    -- où passent anon, les comptes connectés et le service role) et l'inscription
    -- (supabase_auth_admin, qui crée la ligne via handle_new_user). Les autres sessions
    -- (éditeur SQL du dashboard, psql) exigent les identifiants de la base.
    -- (Le nom de session de l'éditeur SQL n'est pas « postgres » : une première version
    -- qui l'autorisait par son nom bloquait l'éditeur.)
    IF changing
       AND session_user IN ('authenticator', 'supabase_auth_admin')
       AND NOT (
           coalesce(auth.jwt() ->> 'role', '') = 'service_role'         -- Edge Functions
           OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
       ) THEN
        RAISE EXCEPTION 'Seul un administrateur peut changer le statut administrateur'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_profile_is_admin() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_profile_is_admin ON public.profiles;
CREATE TRIGGER protect_profile_is_admin
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_profile_is_admin();

-- b. Écritures
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.profiles FROM anon;

-- c. Lecture : son profil, ou tous pour un admin
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profiles readable by owner or admin" ON public.profiles;
CREATE POLICY "Profiles readable by owner or admin" ON public.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid() OR public.is_admin());
REVOKE SELECT ON public.profiles FROM anon;

-- d. delete_user réservé aux admins
CREATE OR REPLACE FUNCTION public.delete_user(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
        RAISE EXCEPTION 'Réservé aux administrateurs' USING ERRCODE = '42501';
    END IF;
    IF user_id = auth.uid() THEN
        RAISE EXCEPTION 'Impossible de supprimer son propre compte' USING ERRCODE = '42501';
    END IF;
    DELETE FROM auth.users WHERE id = user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.delete_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_user(uuid) TO authenticated, service_role;

-- Vérification (doit renvoyer : anon_select=false, anon_delete_user=false, trigger=1)
SELECT has_table_privilege('anon', 'public.profiles', 'select') AS anon_select,
       has_function_privilege('anon', 'public.delete_user(uuid)', 'execute') AS anon_delete_user,
       (SELECT count(*) FROM pg_trigger WHERE tgname = 'protect_profile_is_admin') AS trigger;
