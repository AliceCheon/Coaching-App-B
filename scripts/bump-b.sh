#!/usr/bin/env bash
# Barbell Diva B — bump versione a sorgente unico (app-config-b.js).
# Uso: bash scripts/bump-b.sh "b0.2-nome-scelto" [cartella-repo]
# Aggiorna SOLO app-config-b.js: i file HTML leggono la build da lì (test 01).
set -euo pipefail
nuova="${1:?serve la nuova versione, es. b0.2-nome-scelto}"
repo="${2:-.}"
file="$repo/app-config-b.js"
test -f "$file" || { echo "manca $file"; exit 1; }
sed -i "s|^  build: \".*\"|  build: \"${nuova}\"|" "$file"
echo "build aggiornata in:" && grep -n "build:" "$file" && node --test "$repo/tests/01-versione-unica.test.mjs"
