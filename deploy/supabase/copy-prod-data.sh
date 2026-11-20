#!/usr/bin/env bash
# Copie les DONNÉES du Supabase en ligne (prod) vers Supabase auto-hébergé (VPS).
# À lancer depuis le poste, à la racine du dépôt :
#
#   bash deploy/supabase/copy-prod-data.sh
#
# Ce qui est copié : toutes les tables de `public` (sauf helloasso_token, propre à
# chaque instance) et, dans `auth`, seulement `users` + `identities` (comptes et
# mots de passe chiffrés). Sessions, journaux d'audit, etc. ne sont pas copiés :
# tout le monde se reconnecte. Le Vault et le cron ne sont pas touchés.
#
# ⚠ Les données déjà présentes sur le VPS (public + comptes) sont EFFACÉES avant
# la copie. La prod n'est que lue.
#
# Les triggers sont désactivés pendant la restauration (pas d'e-mail de
# notification pour les anciens messages, pas de redirection de slug parasite).
# Tout se fait dans une transaction : en cas d'erreur, le VPS reste comme avant.
# Le fichier intermédiaire (données personnelles) vit dans un dossier privé
# temporaire, supprimé à la fin quoi qu'il arrive.
set -euo pipefail

VPS="${VPS:-ubuntu@54.37.159.129}"
AUTH_EXCLUDE="auth.audit_log_entries,auth.custom_oauth_providers,auth.flow_state,auth.instances,auth.mfa_amr_claims,auth.mfa_challenges,auth.mfa_factors,auth.oauth_authorizations,auth.oauth_client_states,auth.oauth_clients,auth.oauth_consents,auth.one_time_tokens,auth.refresh_tokens,auth.saml_providers,auth.saml_relay_states,auth.schema_migrations,auth.sessions,auth.sso_domains,auth.sso_providers"

work="$(mktemp -d)"
chmod 700 "$work"
trap 'rm -rf "$work"' EXIT
start=$(date +%s)

echo "1/3 Lecture de la prod (supabase db dump --remote)…"
supabase db dump --remote --data-only -s auth -x "$AUTH_EXCLUDE" -f "$work/auth.sql" >/dev/null
supabase db dump --remote --data-only -s public -x public.helloasso_token -f "$work/public.sql" >/dev/null

{
    echo "\\set ON_ERROR_STOP on"
    echo "BEGIN;"
    echo "SET session_replication_role = replica;"
    # Vider le VPS (les formulaires sandbox importés par le cron, comptes de test…)
    echo "DO \$\$ DECLARE t text; BEGIN
            FOR t IN SELECT format('%I.%I', schemaname, tablename) FROM pg_tables WHERE schemaname = 'public' LOOP
                EXECUTE 'TRUNCATE ' || t || ' CASCADE';
            END LOOP;
            TRUNCATE auth.identities, auth.sessions, auth.refresh_tokens, auth.mfa_factors, auth.one_time_tokens, auth.flow_state CASCADE;
            DELETE FROM auth.users;
          END \$\$;"
    cat "$work/auth.sql"
    cat "$work/public.sql"
    echo "COMMIT;"
} > "$work/restore.sql"

echo "2/3 Écriture sur le VPS ($VPS, par SSH)…"
ssh "$VPS" "sudo -n docker exec -i supabase-db psql -U postgres -q" < "$work/restore.sql" >/dev/null

echo "3/3 Contrôle…"
ssh "$VPS" "sudo -n docker exec supabase-db psql -U postgres -At -c \"SELECT
    (SELECT count(*) FROM auth.users) || ' comptes, ' ||
    (SELECT count(*) FROM public.profiles WHERE is_admin) || ' admins, ' ||
    (SELECT count(*) FROM public.events) || ' événements, ' ||
    (SELECT count(*) FROM public.articles) || ' articles, ' ||
    (SELECT count(*) FROM public.partners) || ' partenaires, ' ||
    (SELECT count(*) FROM public.contact_tickets) || ' messages'\""

echo "Terminé en $(( $(date +%s) - start )) s. Fichiers intermédiaires supprimés."
