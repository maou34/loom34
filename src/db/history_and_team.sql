-- Page L'asso (refonte, étape 5) : frise « Notre histoire » + « La Tanière ».
-- -----------------------------------------------------------------------------
-- Remplace les listes écrites en dur dans src/pages/About.tsx, éditables
-- ensuite dans l'admin (« Historique » et « La Tanière »).
-- À coller dans l'éditeur SQL Supabase, puis src/db/types.ts est mis à jour
-- avec le code. Idempotent ; les données de départ ne sont insérées que si les
-- tables sont vides.

-- 1. Frise « Notre histoire » ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.history_entries (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year        INTEGER NOT NULL CHECK (year BETWEEN 1990 AND 2100),
    month_label TEXT,                                          -- facultatif : « Juin », « 9 novembre », « Aujourd'hui »
    sort_month  INTEGER CHECK (sort_month BETWEEN 1 AND 12),    -- facultatif : départage les dates d'une même année
    title       TEXT NOT NULL,
    body        TEXT NOT NULL CHECK (char_length(body) <= 160),
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Ordre d'affichage (chronologique, automatique) : year, sort_month NULLS LAST, created_at.

DROP TRIGGER IF EXISTS update_history_entries_updated_at ON public.history_entries;
CREATE TRIGGER update_history_entries_updated_at
    BEFORE UPDATE ON public.history_entries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. La Tanière : sections + membres du bureau ------------------------------------------
CREATE TABLE IF NOT EXISTS public.team_groups (
    id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title    TEXT NOT NULL,                 -- « Les indispensables »…
    position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.team_members (
    id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.team_groups(id) ON DELETE RESTRICT,  -- vider une section avant de la supprimer
    name     TEXT NOT NULL,
    role     TEXT NOT NULL,                 -- « Communication · Instagram »
    photo    TEXT,                          -- NULL : initiales sur fond beige
    position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS team_members_group_id_idx ON public.team_members (group_id);

-- 3. Sécurité : lecture publique, écriture réservée aux admins ------------------------------
-- RLS activée en clair (et pas seulement dans la boucle ci-dessous) : l'éditeur SQL
-- Supabase ne lit pas l'intérieur des blocs DO et signalerait sinon des tables sans RLS.
ALTER TABLE public.history_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_groups     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members    ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['history_entries', 'team_groups', 'team_members'] LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public can read %1$s" ON public.%1$I', t);
        EXECUTE format('CREATE POLICY "Public can read %1$s" ON public.%1$I FOR SELECT USING (true)', t);
        EXECUTE format('DROP POLICY IF EXISTS "LOOM admins manage %1$s" ON public.%1$I', t);
        EXECUTE format(
            'CREATE POLICY "LOOM admins manage %1$s" ON public.%1$I FOR ALL TO authenticated '
            'USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true)) '
            'WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = (SELECT auth.uid()) AND profiles.is_admin = true))',
            t
        );
        -- Droits SQL : lecture pour tous, écriture pour les comptes connectés (filtrés par la RLS), rien pour anon.
        EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated', t);
        EXECUTE format('GRANT INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
        EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
        EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.%I FROM anon', t);
    END LOOP;
END $$;

-- 4. Données de départ (maquette validée), seulement si les tables sont vides -------------
INSERT INTO public.history_entries (year, month_label, sort_month, title, body)
SELECT * FROM (VALUES
    (2017, '9 novembre', 11, 'La genèse',
     'Six copains ont l''idée de créer l''association pour ajouter du moelleux et des poils dans l''univers LGBTQ de Montpellier.'),
    (2018, 'Juillet', 7, 'Le premier Monsieur Ours',
     'Élection de notre unique Monsieur Ours Languedoc-Roussillon, Cédric François.'),
    (2024, 'Juin', 6, 'L''expansion',
     'Un char à nous à la Marche des fiertés, et le cap des 100 adhérents dépassé.'),
    (2026, 'Aujourd''hui', 12, 'Et ça continue',
     'Plus de 150 membres actifs, 23 partenaires et plus de 50 événements par an.')
) AS v(year, month_label, sort_month, title, body)
WHERE NOT EXISTS (SELECT 1 FROM public.history_entries);

INSERT INTO public.team_groups (title, position)
SELECT * FROM (VALUES ('Les indispensables', 1), ('Les rois de la tech', 2), ('Les touche-à-tout', 3)) AS v(title, position)
WHERE NOT EXISTS (SELECT 1 FROM public.team_groups);

INSERT INTO public.team_members (group_id, name, role, photo, position)
SELECT g.id, v.name, v.role, v.photo, v.position
FROM (VALUES
    ('Les indispensables', 'Stéphane', 'Président',  'https://upload.lgbt-loom.fr/gallery/images/stephane.jpg', 1),
    ('Les indispensables', 'Marc',     'Trésorier',  'https://upload.lgbt-loom.fr/gallery/images/marc.jpg',     2),
    ('Les indispensables', 'Pascal',   'Secrétaire', 'https://upload.lgbt-loom.fr/gallery/images/pascal.jpg',   3),
    ('Les rois de la tech', 'Franck',   'Communication', 'https://upload.lgbt-loom.fr/gallery/images/franck.jpg', 1),
    ('Les rois de la tech', 'Jean-Luc', 'Communication · Facebook / Relations publiques', NULL, 2),
    ('Les rois de la tech', 'Pierre',   'Communication · Instagram', 'https://upload.lgbt-loom.fr/gallery/images/pierre.jpeg', 3),
    ('Les rois de la tech', 'Cyril',    'Communication · Site web', NULL, 4),
    ('Les rois de la tech', 'Florent',  'Webmaster', 'https://upload.lgbt-loom.fr/gallery/images/florent.jpg', 5),
    ('Les touche-à-tout', 'Henri',   'Monsieur Culture', 'https://upload.lgbt-loom.fr/gallery/images/henri.jpg',   1),
    ('Les touche-à-tout', 'Étienne', 'Administrateur',   'https://upload.lgbt-loom.fr/gallery/images/etienne.jpg', 2)
) AS v(group_title, name, role, photo, position)
JOIN public.team_groups g ON g.title = v.group_title
WHERE NOT EXISTS (SELECT 1 FROM public.team_members);

-- 5. Formulaire de contact : statut envoyé par le site -------------------------------------
-- Le formulaire public envoyait status = 'nouveau' alors que la contrainte n'accepte que
-- 'Nouveau' / 'En attente' / 'Répondu' / 'Fermé' : chaque envoi échouait (table vide).
-- Le code de l'étape 5 envoie 'Nouveau' ; on fixe aussi une valeur par défaut.
ALTER TABLE public.contact_tickets ALTER COLUMN status SET DEFAULT 'Nouveau';
