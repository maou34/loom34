-- Cron de synchronisation HelloAsso : appelle l'Edge Function sync-events
-- toutes les 15 minutes. À coller manuellement dans le SQL Editor de Supabase,
-- après avoir déployé la fonction (supabase functions deploy sync-events).
--
-- Prérequis : extensions pg_cron et pg_net activées
-- (Dashboard → Database → Extensions).
--
-- Le secret partagé (SYNC_EVENTS_SECRET, le même que dans `supabase secrets`)
-- est rangé dans Supabase Vault plutôt qu'en clair dans la définition du job.
-- Remplacer <SYNC_EVENTS_SECRET> par sa valeur (voir .env.local) — ne jamais
-- committer la vraie valeur dans ce fichier.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. Secret dans le Vault (une seule fois ; pour le changer :
--    SELECT vault.update_secret(id, '<nouvelle valeur>') FROM vault.secrets WHERE name = 'sync_events_secret';)
SELECT vault.create_secret('<SYNC_EVENTS_SECRET>', 'sync_events_secret');

-- 2. Job toutes les 15 minutes (cron.schedule remplace un job du même nom)
SELECT cron.schedule(
    'helloasso-sync-events',
    '*/15 * * * *',
    $$
    SELECT net.http_post(
        url := 'https://abqhawhalbrqgtepaclc.supabase.co/functions/v1/sync-events',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-sync-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'sync_events_secret')
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 30000
    );
    $$
);

-- Vérifier les derniers passages :
--   SELECT status, return_message, start_time FROM cron.job_run_details
--   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'helloasso-sync-events')
--   ORDER BY start_time DESC LIMIT 10;
-- Réponses HTTP de la fonction :
--   SELECT status_code, content, created FROM net._http_response ORDER BY created DESC LIMIT 10;
-- Arrêter le cron :
--   SELECT cron.unschedule('helloasso-sync-events');
