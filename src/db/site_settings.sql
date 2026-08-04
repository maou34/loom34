CREATE TABLE IF NOT EXISTS site_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    hero_image TEXT,
    hero_link TEXT,
    shop_url TEXT,
    membership_url TEXT,
    monsieur_ours_hero_image TEXT,
    hero_image_width INTEGER,
    hero_image_height INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Idempotent : ajoute la colonne si la table existait déjà avant son ajout
-- au CREATE TABLE ci-dessus (cas de la prod, table créée avant ce champ).
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS monsieur_ours_hero_image TEXT;

-- Dimensions naturelles de hero_image, capturées à l'upload dans l'admin
-- (HomeSettings.tsx) pour réserver le bon ratio côté front et éviter un
-- Cumulative Layout Shift quand l'image charge.
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS hero_image_width INTEGER;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS hero_image_height INTEGER;

-- Ligne unique contenant les réglages actuels (valeurs par défaut du site)
INSERT INTO site_settings (id, hero_image, hero_link, shop_url, membership_url)
VALUES (
    1,
    '/gallery/images/montpell_bears_2026-full.jpeg',
    '/articles/montpell-bears-2026',
    'https://www.helloasso.com/associations/les-ours-occitanie-montpellier/boutiques/t-shirt-bleu',
    'https://www.helloasso.com/associations/les-ours-occitanie-montpellier/adhesions/adhesion-2025-2026'
)
ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS update_site_settings_updated_at ON site_settings;
CREATE TRIGGER update_site_settings_updated_at
    BEFORE UPDATE ON site_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Sécurité au niveau ligne (RLS)
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Lecture publique : nécessaire pour la navbar, l'accueil et les redirections
-- /shop et /membership, consultées par les visiteurs non connectés.
DROP POLICY IF EXISTS "Public can read site settings" ON site_settings;
CREATE POLICY "Public can read site settings"
    ON site_settings
    FOR SELECT
    USING (true);

-- Écriture réservée aux administrateurs (mêmes droits que pour les autres
-- tables gérées depuis /admin).
DROP POLICY IF EXISTS "Admins can manage site settings" ON site_settings;
CREATE POLICY "Admins can manage site settings"
    ON site_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.is_admin = true
        )
    );
