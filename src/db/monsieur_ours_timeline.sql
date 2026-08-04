CREATE TABLE monsieur_ours_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Migration des lauréats historiques, jusqu'ici codés en dur dans
-- src/pages/MonsieurOurs.tsx. Les années sans photo confirmée restent NULL.
INSERT INTO monsieur_ours_timeline (year, title, description, image) VALUES
    (2026, 'Georges-Alexandre Lopes', 'Monsieur Ours élu en 2026', 'gallery/images/Georges-Alexandre.JPG'),
    (2025, 'Sébastien Rosier', 'Monsieur Ours élu en 2025', 'gallery/images/sebastien1.jpg'),
    (2024, 'Antonio Gabriel', 'Monsieur Ours élu en 2024', NULL),
    (2023, 'Lucas Milani', 'Monsieur Ours élu en 2023', NULL),
    (2022, 'Pierre Marty Cardin', 'Monsieur Ours élu en 2022', NULL),
    (2019, 'Romain Tertrais', 'Monsieur Ours élu en 2019', NULL),
    (2018, 'Cédric François', 'Monsieur Ours élu en 2018', NULL);

CREATE TRIGGER update_monsieur_ours_timeline_updated_at
    BEFORE UPDATE ON monsieur_ours_timeline
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Sécurité au niveau ligne (RLS)
ALTER TABLE monsieur_ours_timeline ENABLE ROW LEVEL SECURITY;

-- Lecture publique : nécessaire pour la page /monsieur-ours, consultée par
-- les visiteurs non connectés.
DROP POLICY IF EXISTS "Public can read monsieur ours timeline" ON monsieur_ours_timeline;
CREATE POLICY "Public can read monsieur ours timeline"
    ON monsieur_ours_timeline
    FOR SELECT
    USING (true);

-- Écriture réservée aux administrateurs (mêmes droits que pour les autres
-- tables gérées depuis /admin).
DROP POLICY IF EXISTS "Admins can manage monsieur ours timeline" ON monsieur_ours_timeline;
CREATE POLICY "Admins can manage monsieur ours timeline"
    ON monsieur_ours_timeline
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
