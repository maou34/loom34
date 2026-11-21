-- Audit de sécurité automatique de la base (chaque nuit + bouton « Relancer »
-- du tableau de bord de l'admin).
--
-- public.security_audit_run() contrôle l'état actuel de la base et le compare à
-- celui du passage précédent (security_audit_baseline) :
--   critique  : table sans RLS ; fonction SECURITY DEFINER exécutable par les
--               visiteurs (anon) ; trigger protect_profile_is_admin absent ou
--               désactivé ; inscriptions publiques ouvertes (vérifié par l'Edge
--               Function, passé en paramètre) ; nouveau compte administrateur.
--   attention : droits d'écriture SQL d'anon sur une table (hors envoi du
--               formulaire de contact) ; anon peut lire une table sensible ; règle
--               d'accès (policy) ajoutée, modifiée ou supprimée ; fonction
--               SECURITY DEFINER ajoutée ou modifiée ; nouveau compte créé ;
--               banned_until = 'infinity' (casse auth.admin.listUsers) ; job
--               pg_cron attendu absent, désactivé ou en échec.
-- Les changements (« diff ») ne sont signalés qu'une fois : l'état de référence
-- est remplacé à chaque passage.
--
-- Le cron appelle l'Edge Function security-audit (qui ajoute le contrôle des
-- inscriptions et prévient les admins par e-mail en cas de problème) avec le même
-- secret que les notifications de messages (Vault : notify_message_secret).
-- Prérequis : migration 20261120090000_functions_url_from_vault (secret Vault
-- project_url) et la fonction déployée (supabase functions deploy security-audit).

-- 0. Quand la base est recréée depuis les migrations (copie locale, auto-hébergement),
--    les droits par défaut du schéma rendent ces deux fonctions exécutables par anon,
--    alors qu'elles ne le sont pas en prod (premier constat de l'audit). Sans effet en prod.
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_user(uuid) FROM PUBLIC, anon;

-- 1. Résultats des audits (lisibles par les admins, écrits seulement par la fonction)
CREATE TABLE IF NOT EXISTS public.security_audit_runs (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ran_at timestamptz NOT NULL DEFAULT now(),
    source text NOT NULL DEFAULT 'cron' CHECK (source IN ('cron', 'manuel')),
    status text NOT NULL CHECK (status IN ('ok', 'warning', 'critical')),
    findings jsonb NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS security_audit_runs_ran_at_idx ON public.security_audit_runs (ran_at DESC);
ALTER TABLE public.security_audit_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.security_audit_runs FROM anon, authenticated;
GRANT SELECT ON public.security_audit_runs TO authenticated;
GRANT ALL ON public.security_audit_runs TO service_role;
DROP POLICY IF EXISTS "Admins read security audit runs" ON public.security_audit_runs;
CREATE POLICY "Admins read security audit runs" ON public.security_audit_runs
    FOR SELECT TO authenticated USING (public.is_admin());

-- 2. État de référence (ligne unique ; aucune policy : illisible via l'API)
CREATE TABLE IF NOT EXISTS public.security_audit_baseline (
    id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    taken_at timestamptz NOT NULL,
    snapshot jsonb NOT NULL
);
ALTER TABLE public.security_audit_baseline ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.security_audit_baseline FROM anon, authenticated;
GRANT ALL ON public.security_audit_baseline TO service_role;

-- 3. L'audit
CREATE OR REPLACE FUNCTION public.security_audit_run(p_signups_open boolean DEFAULT NULL, p_source text DEFAULT 'cron')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    f jsonb := '[]'::jsonb;
    r record;
    k text;
    base jsonb;
    base_at timestamptz;
    snap jsonb;
    st text;
    run public.security_audit_runs;
    expected_jobs text[] := ARRAY['helloasso-sync-events', 'purge-old-contact-tickets', 'security-audit'];
    sensitive_tables text[] := ARRAY['contact_tickets', 'helloasso_token', 'security_audit_runs', 'security_audit_baseline'];
BEGIN
    -- Tables sans RLS : les règles d'accès ne s'appliquent pas du tout
    FOR r IN
        SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity
        ORDER BY 1
    LOOP
        f := f || jsonb_build_object('level', 'critical', 'code', 'rls_disabled',
            'title', format('Protection RLS désactivée sur la table %s', r.relname),
            'detail', 'Les règles d''accès ne s''appliquent pas à cette table : la clé publique du site suffit pour la lire, voire la modifier. Corriger : ALTER TABLE public.' || r.relname || ' ENABLE ROW LEVEL SECURITY; (et vérifier ses policies).');
    END LOOP;

    -- Droits d'écriture SQL des visiteurs non connectés (seule la RLS les retient)
    FOR r IN
        SELECT c.relname, string_agg(p.priv, ', ' ORDER BY p.priv) AS privs
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        CROSS JOIN unnest(ARRAY['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) AS p(priv)
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
          AND has_table_privilege('anon', c.oid, p.priv)
          AND NOT (c.relname = 'contact_tickets' AND p.priv = 'INSERT')
        GROUP BY c.relname ORDER BY 1
    LOOP
        f := f || jsonb_build_object('level', 'warning', 'code', 'anon_write',
            'title', format('Les visiteurs ont le droit d''écrire dans %s (%s)', r.relname, r.privs),
            'detail', 'Seules les règles RLS les en empêchent : une policy trop large suffirait à ouvrir la table. Les nouvelles tables reçoivent ces droits par défaut. Corriger : REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.' || r.relname || ' FROM anon;');
    END LOOP;

    -- Tables sensibles lisibles par anon (privilège SQL)
    FOR r IN
        SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = ANY (sensitive_tables)
          AND has_table_privilege('anon', c.oid, 'SELECT')
        ORDER BY 1
    LOOP
        f := f || jsonb_build_object('level', 'warning', 'code', 'anon_read_sensitive',
            'title', format('Les visiteurs ont le droit de lire la table %s', r.relname),
            'detail', 'Table sensible : seules les règles RLS en protègent le contenu. Corriger : REVOKE SELECT ON public.' || r.relname || ' FROM anon;');
    END LOOP;

    -- Fonctions SECURITY DEFINER appelables par les visiteurs (hors triggers, non appelables)
    FOR r IN
        SELECT p.oid::regprocedure::text AS sig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.prosecdef AND p.prorettype <> 'trigger'::regtype
          AND has_function_privilege('anon', p.oid, 'EXECUTE')
        ORDER BY 1
    LOOP
        f := f || jsonb_build_object('level', 'critical', 'code', 'anon_definer',
            'title', format('Fonction %s exécutable par les visiteurs', r.sig),
            'detail', 'Elle s''exécute avec les droits de son propriétaire (contourne la RLS). Corriger : REVOKE ALL ON FUNCTION ' || r.sig || ' FROM PUBLIC, anon;');
    END LOOP;

    -- Protection du statut administrateur (incident du 14/11/2026)
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'profiles' AND t.tgname = 'protect_profile_is_admin' AND t.tgenabled <> 'D'
    ) THEN
        f := f || jsonb_build_object('level', 'critical', 'code', 'is_admin_trigger',
            'title', 'Le statut administrateur n''est plus protégé',
            'detail', 'Le trigger protect_profile_is_admin sur profiles est absent ou désactivé : un compte pourrait se rendre administrateur. Réappliquer src/db/profiles_lockdown.sql.');
    END IF;

    IF p_signups_open THEN
        f := f || jsonb_build_object('level', 'critical', 'code', 'signups_open',
            'title', 'Les inscriptions publiques sont ouvertes',
            'detail', 'N''importe qui peut créer un compte. Les refermer : dashboard Supabase → Authentication → Sign In / Providers → décocher « Allow new users to sign up ».');
    ELSIF p_signups_open IS NULL THEN
        f := f || jsonb_build_object('level', 'info', 'code', 'signups_unknown',
            'title', 'Ouverture des inscriptions non vérifiée',
            'detail', 'Le réglage d''Auth n''a pas pu être lu (audit lancé hors de l''Edge Function security-audit, ou erreur de lecture).');
    END IF;

    IF EXISTS (SELECT 1 FROM auth.users WHERE banned_until = 'infinity') THEN
        f := f || jsonb_build_object('level', 'warning', 'code', 'banned_infinity',
            'title', 'Un compte est bloqué « pour toujours » (infinity)',
            'detail', 'Supabase Auth ne sait pas lire cette valeur : la liste des comptes de l''admin tombe en erreur. Mettre une date lointaine (ex. 2999-01-01) à la place.');
    END IF;

    -- Tâches planifiées attendues
    FOR r IN
        SELECT e.name, j.active FROM unnest(expected_jobs) AS e(name) LEFT JOIN cron.job j ON j.jobname = e.name
        WHERE j.jobid IS NULL OR NOT j.active
    LOOP
        f := f || jsonb_build_object('level', 'warning', 'code', 'cron_missing',
            'title', format('Tâche planifiée %s %s', r.name, CASE WHEN r.active IS NULL THEN 'absente' ELSE 'désactivée' END),
            'detail', 'Voir cron.job dans l''éditeur SQL.');
    END LOOP;
    FOR r IN
        SELECT j.jobname, count(*) AS n, max(d.return_message) AS msg
        FROM cron.job_run_details d JOIN cron.job j ON j.jobid = d.jobid
        WHERE d.status = 'failed' AND d.start_time > now() - interval '24 hours'
        GROUP BY j.jobname ORDER BY 1
    LOOP
        f := f || jsonb_build_object('level', 'warning', 'code', 'cron_failed',
            'title', format('La tâche planifiée %s a échoué %s fois en 24 h', r.jobname, r.n),
            'detail', left(coalesce(r.msg, ''), 300));
    END LOOP;

    -- État actuel, pour la comparaison avec le passage précédent
    snap := jsonb_build_object(
        'admins', coalesce((
            SELECT jsonb_object_agg(p.id::text, coalesce(u.email, '(adresse inconnue)'))
            FROM public.profiles p LEFT JOIN auth.users u ON u.id = p.id WHERE p.is_admin), '{}'::jsonb),
        'policies', coalesce((
            SELECT jsonb_object_agg(tablename || ' · ' || policyname,
                md5(concat_ws('|', permissive, roles::text, cmd, qual, with_check)))
            FROM pg_policies WHERE schemaname = 'public'), '{}'::jsonb),
        'definer_functions', coalesce((
            SELECT jsonb_object_agg(p.oid::regprocedure::text, md5(p.prosrc || coalesce(p.proacl::text, '')))
            FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.prosecdef), '{}'::jsonb)
    );

    SELECT b.snapshot, b.taken_at INTO base, base_at FROM public.security_audit_baseline b WHERE b.id = 1;

    IF base IS NULL THEN
        f := f || jsonb_build_object('level', 'info', 'code', 'first_run',
            'title', 'Premier audit : état de référence enregistré',
            'detail', format('%s administrateur(s), %s règles d''accès. Les prochains audits signaleront tout changement.',
                (SELECT count(*) FROM jsonb_object_keys(snap -> 'admins')), (SELECT count(*) FROM jsonb_object_keys(snap -> 'policies'))));
    ELSE
        FOR k IN SELECT jsonb_object_keys(snap -> 'admins') EXCEPT SELECT jsonb_object_keys(base -> 'admins') LOOP
            f := f || jsonb_build_object('level', 'critical', 'code', 'new_admin',
                'title', format('Nouvel administrateur : %s', snap -> 'admins' ->> k),
                'detail', 'Si personne au bureau ne l''a ajouté, retirer ses droits tout de suite (Admin → Administrateurs) et bloquer le compte.');
        END LOOP;
        FOR k IN SELECT jsonb_object_keys(base -> 'admins') EXCEPT SELECT jsonb_object_keys(snap -> 'admins') LOOP
            f := f || jsonb_build_object('level', 'info', 'code', 'admin_removed',
                'title', format('Administrateur retiré : %s', base -> 'admins' ->> k), 'detail', '');
        END LOOP;

        FOR r IN
            SELECT u.email, u.created_at FROM auth.users u WHERE u.created_at > base_at ORDER BY u.created_at
        LOOP
            f := f || jsonb_build_object('level', 'warning', 'code', 'new_user',
                'title', format('Nouveau compte : %s', coalesce(r.email, '(sans adresse)')),
                'detail', 'Les inscriptions sont fermées : ce compte devrait venir d''une invitation envoyée depuis l''admin.');
        END LOOP;

        FOR k IN SELECT jsonb_object_keys(snap -> 'policies') EXCEPT SELECT jsonb_object_keys(base -> 'policies') LOOP
            f := f || jsonb_build_object('level', 'warning', 'code', 'policy_added',
                'title', format('Règle d''accès ajoutée : %s', k), 'detail', 'Vérifier qu''elle était prévue (pg_policies).');
        END LOOP;
        FOR k IN
            SELECT s.key FROM jsonb_each_text(snap -> 'policies') s JOIN jsonb_each_text(base -> 'policies') b ON b.key = s.key
            WHERE s.value <> b.value
        LOOP
            f := f || jsonb_build_object('level', 'warning', 'code', 'policy_changed',
                'title', format('Règle d''accès modifiée : %s', k), 'detail', 'Vérifier qu''elle était prévue (pg_policies).');
        END LOOP;
        FOR k IN SELECT jsonb_object_keys(base -> 'policies') EXCEPT SELECT jsonb_object_keys(snap -> 'policies') LOOP
            f := f || jsonb_build_object('level', 'warning', 'code', 'policy_removed',
                'title', format('Règle d''accès supprimée : %s', k), 'detail', 'Vérifier qu''elle était prévue.');
        END LOOP;

        FOR k IN
            SELECT s.key FROM jsonb_each_text(snap -> 'definer_functions') s
            LEFT JOIN jsonb_each_text(base -> 'definer_functions') b ON b.key = s.key
            WHERE b.value IS DISTINCT FROM s.value
        LOOP
            f := f || jsonb_build_object('level', 'warning', 'code', 'definer_changed',
                'title', format('Fonction à privilèges ajoutée ou modifiée : %s', k),
                'detail', 'Elle contourne la RLS : vérifier qu''elle était prévue et qui peut l''exécuter.');
        END LOOP;
    END IF;

    st := CASE
        WHEN f @> '[{"level": "critical"}]' THEN 'critical'
        WHEN f @> '[{"level": "warning"}]' THEN 'warning'
        ELSE 'ok' END;

    INSERT INTO public.security_audit_runs (source, status, findings)
    VALUES (CASE WHEN p_source = 'manuel' THEN 'manuel' ELSE 'cron' END, st, f)
    RETURNING * INTO run;

    INSERT INTO public.security_audit_baseline (id, taken_at, snapshot) VALUES (1, run.ran_at, snap)
    ON CONFLICT (id) DO UPDATE SET taken_at = EXCLUDED.taken_at, snapshot = EXCLUDED.snapshot;

    DELETE FROM public.security_audit_runs WHERE ran_at < now() - interval '90 days';

    RETURN to_jsonb(run);
END;
$$;
-- Réservée à l'Edge Function (service role) : jamais via l'API publique
REVOKE ALL ON FUNCTION public.security_audit_run(boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.security_audit_run(boolean, text) TO service_role;

-- 4. Chaque nuit à 5 h UTC (6 h / 7 h à Paris), via l'Edge Function
SELECT cron.schedule(
    'security-audit',
    '0 5 * * *',
    $$
    SELECT net.http_post(
        url := public.edge_function_url('security-audit'),
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-notify-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'notify_message_secret')
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 30000
    );
    $$
);
