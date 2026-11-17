-- Billetterie HelloAsso
-- À coller manuellement dans le SQL Editor de Supabase (pas de migrations auto).
-- Idempotent : peut être rejoué sans casse.

-- ---------------------------------------------------------------------------
-- 1. Colonnes billetterie sur events
-- ---------------------------------------------------------------------------
-- La table events reste la référence. Un événement n'a de billetterie que si
-- helloasso_form_slug est renseigné ; les autres (apéros, etc.) sont inchangés.
-- Qui écrit quoi :
--   - admin            : helloasso_form_slug, ticket_member_discount et
--                        ticket_capacity (la jauge : l'API
--                        HelloAsso ne l'expose pas, voir plus bas) ; remet aussi
--                        tickets_sold / ticket_prices / helloasso_synced_at à NULL
--                        quand le slug change.
--   - sync-events,
--     helloasso-webhook: helloasso_capacity, tickets_sold, tickets_sold_discounted, ticket_prices,
--                        helloasso_synced_at, helloasso_sale_start_date,
--                        helloasso_sale_end_date, helloasso_auto_published_at
--                        (service role).
--   - Postgres         : tickets_remaining, colonne calculée.
-- Aucune donnée nominative des participants n'est stockée.

ALTER TABLE events ADD COLUMN IF NOT EXISTS helloasso_form_slug TEXT;
-- Type de formulaire HelloAsso (segment {formType} de l'API v5). 'Event' pour
-- une billetterie ; gardé en colonne au cas où un autre type serait utilisé.
ALTER TABLE events ADD COLUMN IF NOT EXISTS helloasso_form_type TEXT NOT NULL DEFAULT 'Event';

-- Jauge. L'API HelloAsso n'expose pas la limite globale (« Limiter le nombre
-- total de participants »), mais /stats donne la limite de chaque tarif
-- (maxEntries) — vérifié en sandbox le 2026-11-15. Avec la règle LOOM d'un seul
-- tarif par événement, c'est la jauge. Deux colonnes :
--   helloasso_capacity : somme des maxEntries des tarifs, écrite par sync-events
--                        (NULL si un tarif n'a pas de limite) ;
--   ticket_capacity    : saisie facultative dans l'admin, prioritaire si renseignée
--                        (plusieurs tarifs, ou limite seulement globale chez HelloAsso).
-- Jauge effective = COALESCE(ticket_capacity, helloasso_capacity).
ALTER TABLE events ADD COLUMN IF NOT EXISTS ticket_capacity INTEGER;
ALTER TABLE events ADD COLUMN IF NOT EXISTS helloasso_capacity INTEGER;
-- Billets vendus tous tarifs confondus (compté par sync-events / le webhook)
ALTER TABLE events ADD COLUMN IF NOT EXISTS tickets_sold INTEGER;
-- Dont billets vendus avec un code promo (compteur seul : qui a utilisé le code
-- se vérifie dans le back-office HelloAsso, jamais stocké ici)
ALTER TABLE events ADD COLUMN IF NOT EXISTS tickets_sold_discounted INTEGER;
-- Case cochée dans l'admin : affiche « tarif réduit adhérent avec code promo »
-- sur la page publique. L'API HelloAsso ne dit pas si un code promo existe.
ALTER TABLE events ADD COLUMN IF NOT EXISTS ticket_member_discount BOOLEAN NOT NULL DEFAULT false;

-- Places restantes : calculées par Postgres, jamais écrites à la main.
-- NULL tant que la jauge ou le nombre de ventes est inconnu.
-- Attention : GREATEST ignore les NULL (GREATEST(NULL, 0) = 0), d'où le CASE
-- explicite — sinon un événement pas encore synchronisé apparaîtrait « complet ».
-- (Les premières versions de ce fichier en faisaient une colonne ordinaire, puis
-- une colonne calculée sans ce CASE, puis sans helloasso_capacity : on la
-- recrée si besoin, sans toucher aux autres colonnes. La valeur étant calculée,
-- rien n'est perdu.)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'events'
          AND column_name = 'tickets_remaining'
          AND (is_generated = 'NEVER' OR generation_expression NOT ILIKE '%helloasso_capacity%')
    ) THEN
        ALTER TABLE events DROP COLUMN tickets_remaining;
    END IF;
END $$;
ALTER TABLE events ADD COLUMN IF NOT EXISTS tickets_remaining INTEGER
    GENERATED ALWAYS AS (
        CASE
            WHEN COALESCE(ticket_capacity, helloasso_capacity) IS NULL OR tickets_sold IS NULL THEN NULL
            ELSE GREATEST(COALESCE(ticket_capacity, helloasso_capacity) - tickets_sold, 0)
        END
    ) STORED;
-- Tarifs : tableau JSON [{ "label": "Plein tarif", "price_cents": 1500 }, ...]
ALTER TABLE events ADD COLUMN IF NOT EXISTS ticket_prices JSONB;
-- Horodatage de la dernière synchro réussie avec HelloAsso
ALTER TABLE events ADD COLUMN IF NOT EXISTS helloasso_synced_at TIMESTAMP WITH TIME ZONE;

-- Période de vente HelloAsso (saleStartDate / saleEndDate de /forms/{type}/{slug}/public,
-- absents quand la billetterie n'en définit pas), écrite par sync-events :
--   helloasso_sale_start_date : à cette date, la synchro publie l'événement sur
--                               le site, une seule fois (voir helloasso_auto_published_at) ;
--   helloasso_sale_end_date   : passée cette date, le site affiche « Inscriptions
--                               closes » et masque la billetterie.
ALTER TABLE events ADD COLUMN IF NOT EXISTS helloasso_sale_start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS helloasso_sale_end_date TIMESTAMP WITH TIME ZONE;
-- Date à laquelle la synchro a publié l'événement (ouverture des ventes). Une
-- fois renseignée, la synchro ne republie plus : un admin peut dépublier.
ALTER TABLE events ADD COLUMN IF NOT EXISTS helloasso_auto_published_at TIMESTAMP WITH TIME ZONE;

-- Un même formulaire HelloAsso ne peut être rattaché qu'à un seul événement
-- (le webhook retrouve l'événement à partir du slug).
CREATE UNIQUE INDEX IF NOT EXISTS events_helloasso_form_slug_key
    ON events (helloasso_form_slug)
    WHERE helloasso_form_slug IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Cache du token OAuth HelloAsso
-- ---------------------------------------------------------------------------
-- Ligne unique (id = 1). Lue et écrite uniquement par les Edge Functions via
-- la service role key, qui contourne la RLS. RLS activée SANS aucune policy :
-- anon et authenticated (y compris les admins) n'y ont aucun accès.

CREATE TABLE IF NOT EXISTS helloasso_token (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    refresh_expires_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS update_helloasso_token_updated_at ON helloasso_token;
CREATE TRIGGER update_helloasso_token_updated_at
    BEFORE UPDATE ON helloasso_token
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE helloasso_token ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON helloasso_token FROM anon, authenticated;
-- Le service role contourne la RLS mais a quand même besoin des droits SQL :
-- sur ce projet, les tables créées dans le SQL Editor n'en reçoivent pas
-- automatiquement (sinon : « permission denied for table helloasso_token »).
GRANT SELECT, INSERT, UPDATE, DELETE ON helloasso_token TO service_role;
