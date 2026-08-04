CREATE TABLE site_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    hero_image TEXT,
    hero_link TEXT,
    shop_url TEXT,
    membership_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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
