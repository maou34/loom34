#!/bin/sh
# Reporte des réglages KEY=VALUE dans le .env de Supabase auto-hébergé.
#
#   sh apply-env.sh <fichier de réglages> <.env cible>
#
# Chaque ligne KEY=VALUE du fichier de réglages remplace la ligne KEY= du .env
# (ou est ajoutée à la fin si elle n'existe pas). Les lignes vides, les
# commentaires et les valeurs encore à remplir (<…>) sont ignorés : on ne peut
# donc pas écraser un secret généré par setup.sh avec un modèle.
set -eu

src="$1"
dst="$2"
[ -f "$src" ] || { echo "Introuvable : $src" >&2; exit 1; }
[ -f "$dst" ] || { echo "Introuvable : $dst" >&2; exit 1; }

cp "$dst" "$dst.avant-loom"
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

grep -E '^[A-Z_][A-Z0-9_]*=' "$src" | while IFS= read -r line; do
    key="${line%%=*}"
    value="${line#*=}"
    case "$value" in
        *"<"*">"*) echo "  ignoré (à remplir) : $key"; continue ;;
    esac
    if grep -q "^${key}=" "$dst"; then
        # Remplacement littéral de la ligne (awk : pas d'interprétation de la valeur)
        awk -v k="$key" -v l="$line" 'index($0, k "=") == 1 { print l; next } { print }' "$dst" > "$tmp"
        cat "$tmp" > "$dst"
    else
        printf '%s\n' "$line" >> "$dst"
    fi
    echo "  $key"
done

chmod 600 "$dst"
echo "Fait. Ancienne version gardée dans $dst.avant-loom"
