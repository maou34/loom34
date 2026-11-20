-- Adresse des Edge Functions lue dans le Vault au lieu d'être écrite en dur.
--
-- Avant : le trigger de notification des messages et le cron HelloAsso
-- appelaient https://abqhawhalbrqgtepaclc.supabase.co/... : une copie locale ou
-- auto-hébergée de la base aurait appelé les fonctions de la prod.
-- Après : chaque instance range sa propre adresse dans le secret Vault
-- `project_url` (sans / final) :
--   prod Supabase en ligne : https://abqhawhalbrqgtepaclc.supabase.co
--   local (supabase start)  : http://kong:8000 (créé par supabase/seed.sql)
--   auto-hébergé            : http://kong:8000
--
-- ⚠ En prod, créer le secret AVANT d'appliquer cette migration, sinon les
-- notifications de messages et la sync HelloAsso s'arrêtent (sans bloquer le
-- formulaire de contact) :
--   SELECT vault.create_secret('https://abqhawhalbrqgtepaclc.supabase.co', 'project_url');

CREATE OR REPLACE FUNCTION public.edge_function_url(fn text) RETURNS text
    LANGUAGE sql STABLE
    SET search_path TO ''
    AS $$
    SELECT rtrim(decrypted_secret, '/') || '/functions/v1/' || fn
    FROM vault.decrypted_secrets
    WHERE name = 'project_url'
$$;

-- Réservée aux triggers et au cron (exécutés en postgres) : jamais via l'API
REVOKE ALL ON FUNCTION public.edge_function_url(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_new_contact_ticket() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
    BEGIN
        PERFORM net.http_post(
            url := public.edge_function_url('notify-new-message'),
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'x-notify-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'notify_message_secret')
            ),
            body := jsonb_build_object('id', NEW.id),
            timeout_milliseconds := 10000
        );
    EXCEPTION WHEN OTHERS THEN
        -- Une notification ratée ne doit jamais bloquer le formulaire de contact
        RAISE WARNING 'notify_new_contact_ticket : %', SQLERRM;
    END;
    RETURN NEW;
END;
$$;

-- Cron de synchronisation HelloAsso (remplace le job du même nom créé à la main
-- par src/db/helloasso_cron.sql) : toutes les 15 minutes, adresse relue à chaque passage.
SELECT cron.schedule(
    'helloasso-sync-events',
    '*/15 * * * *',
    $$
    SELECT net.http_post(
        url := public.edge_function_url('sync-events'),
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-sync-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'sync_events_secret')
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 30000
    );
    $$
);
