-- Notification par e-mail des nouveaux messages du formulaire de contact
-- (refonte, étape 9).
-- -----------------------------------------------------------------------------
-- 1. profiles.notify_on_message : chaque admin choisit d'être prévenu ou non
--    (interrupteur « Me prévenir par e-mail » de l'écran Messages ; un compte
--    peut modifier sa propre ligne, le trigger protect_profile_is_admin ne
--    s'intéresse qu'à is_admin).
-- 2. À chaque nouveau message (INSERT dans contact_tickets), un trigger appelle
--    l'Edge Function notify-new-message via pg_net (asynchrone : l'envoi du
--    formulaire n'attend pas l'e-mail et n'échoue jamais à cause de lui). La
--    fonction relit le message par son id et envoie l'e-mail par le Gmail de
--    l'association — sujet, nom et lien vers l'admin seulement : ni le texte du
--    message ni l'adresse de l'expéditeur ne quittent Supabase.
--
-- Prérequis : la fonction déployée (supabase functions deploy notify-new-message),
-- ses secrets posés (supabase secrets set …), l'extension pg_net (déjà activée
-- pour le cron HelloAsso).
-- Remplacer <NOTIFY_MESSAGE_SECRET> par la même valeur que dans `supabase secrets`
-- — ne jamais committer la vraie valeur dans ce fichier.
--
-- À coller dans l'éditeur SQL Supabase. Idempotent, sauf l'étape 2 (secret) :
-- pour changer le secret ensuite :
--   SELECT vault.update_secret(id, '<nouvelle valeur>') FROM vault.secrets WHERE name = 'notify_message_secret';

-- 1. Préférence par admin
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notify_on_message BOOLEAN NOT NULL DEFAULT false;

-- 2. Secret partagé avec la fonction, rangé dans le Vault (une seule fois)
SELECT vault.create_secret('<NOTIFY_MESSAGE_SECRET>', 'notify_message_secret');

-- 3. Appel de la fonction à chaque nouveau message
CREATE OR REPLACE FUNCTION public.notify_new_contact_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    BEGIN
        PERFORM net.http_post(
            url := 'https://abqhawhalbrqgtepaclc.supabase.co/functions/v1/notify-new-message',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'x-notify-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'notify_message_secret')
            ),
            body := jsonb_build_object('id', NEW.id),
            timeout_milliseconds := 10000
        );
    EXCEPTION WHEN OTHERS THEN
        -- Jamais bloquer l'enregistrement d'un message à cause de la notification
        RAISE WARNING 'notify_new_contact_ticket : %', SQLERRM;
    END;
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_new_contact_ticket() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notify_new_contact_ticket ON public.contact_tickets;
CREATE TRIGGER notify_new_contact_ticket
    AFTER INSERT ON public.contact_tickets
    FOR EACH ROW EXECUTE FUNCTION public.notify_new_contact_ticket();

-- Vérifier les derniers appels :
--   SELECT status_code, content, created FROM net._http_response ORDER BY created DESC LIMIT 5;
