#!/bin/sh
# Déploie les Edge Functions du dépôt dans Supabase auto-hébergé (remplace
# `supabase functions deploy`, qui ne vise que le Supabase en ligne).
#
#   sudo sh /var/www/loom34/deploy/supabase/deploy-functions.sh
#
# Copie chaque dossier de supabase/functions/ du dépôt dans le volume des
# fonctions (/opt/supabase/volumes/functions/), sans toucher au routeur
# officiel `main/` ni à deno.jsonc, puis redémarre le conteneur des fonctions.
set -eu

REPO="${REPO:-/var/www/loom34}"
STACK="${STACK:-/opt/supabase}"
SRC="$REPO/supabase/functions"
DST="$STACK/volumes/functions"

[ -d "$SRC" ] || { echo "Introuvable : $SRC" >&2; exit 1; }
[ -d "$DST/main" ] || { echo "Routeur officiel absent : $DST/main (installation incomplète ?)" >&2; exit 1; }

for dir in "$SRC"/*/; do
    name="$(basename "$dir")"
    [ "$name" = "main" ] && { echo "  ignoré : main (réservé au routeur officiel)"; continue; }
    rm -rf "${DST:?}/$name"
    cp -r "$dir" "$DST/$name"
    echo "  $name"
done

cd "$STACK"
docker compose restart functions
echo "Fonctions déployées."
