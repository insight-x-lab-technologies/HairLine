#!/usr/bin/env bash
# Publica as specs SDD desta pasta como GitHub Issues (uma por arquivo).
# Requer: gh CLI autenticado (`gh auth login`).
# Uso: ./docs/issues/publish.sh [P4-02b]   (prefixo opcional para filtrar)
set -euo pipefail

REPO="insight-x-lab-technologies/HairLine"
DIR="$(cd "$(dirname "$0")" && pwd)"
PREFIX="${1:-}"

for f in "$DIR"/${PREFIX}*.md; do
  [ -e "$f" ] || { echo "nenhum arquivo casa com '${PREFIX}*.md'"; exit 1; }
  title="$(head -1 "$f" | sed 's/^# *//')"
  echo "criando: $title"
  tail -n +2 "$f" | gh issue create -R "$REPO" \
    --title "$title" \
    --label "spec,fase-4" \
    --body-file -
done
echo "feito. veja: gh issue list -R $REPO --label spec"
