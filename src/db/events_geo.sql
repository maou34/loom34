-- Coordonnées du lieu des événements, pour le plan OpenStreetMap de la fiche.
-- -----------------------------------------------------------------------------
-- Remplies automatiquement à partir du champ texte `location` (géocodage
-- Nominatim / OpenStreetMap) :
--   - par l'admin (pages/admin/Events.tsx) quand le lieu est créé ou modifié ;
--   - par la synchro HelloAsso (supabase/functions/_shared/sync.ts) quand le lieu
--     recopié depuis HelloAsso change ;
--   - une fois pour les événements existants : `npm run geocode:events`.
-- NULL = adresse introuvable : la fiche n'affiche que le lien d'itinéraire.
--
-- À coller dans l'éditeur SQL Supabase AVANT de redéployer sync-events et
-- helloasso-webhook (ils lisent ces colonnes). Idempotent.

ALTER TABLE public.events ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Pas de nouvelle policy : les colonnes suivent les règles existantes de la table
-- (lecture publique des événements publiés, écriture par les admins et la service role).
