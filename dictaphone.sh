#!/bin/bash
# Dictaphone CLI — accès depuis le Mac
# Usage : dictaphone [list|download <id>|delete <id>|play <id>|download-all]

BASE_URL="${DICTAPHONE_URL:-https://dictaphone-three.vercel.app}"
API_KEY="${DICTAPHONE_API_KEY:-}"

if [[ -z "$API_KEY" ]]; then
  echo "❌ Définis DICTAPHONE_API_KEY dans ton .zshrc :"
  echo "   export DICTAPHONE_API_KEY=ta-clé-secrète"
  exit 1
fi

# Appel API avec affichage de l'erreur brute si non-200
api() {
  local method="${1:-GET}"
  local path="$2"
  local response
  local http_code

  response=$(curl -s -w "\n__HTTP_CODE__%{http_code}" \
    -X "$method" \
    -H "X-Api-Key: $API_KEY" \
    "$BASE_URL$path")

  http_code=$(echo "$response" | tail -n1 | sed 's/__HTTP_CODE__//')
  body=$(echo "$response" | sed '$d')

  if [[ "$http_code" != 2* ]]; then
    echo "❌ Erreur HTTP $http_code"
    echo "$body"
    exit 1
  fi

  echo "$body"
}

cmd="$1"

case "$cmd" in
  list)
    echo "📋 Enregistrements :"
    data=$(api GET /api/v1/recordings)
    if ! echo "$data" | jq . > /dev/null 2>&1; then
      echo "❌ Réponse invalide :"
      echo "$data"
      exit 1
    fi
    count=$(echo "$data" | jq length)
    if [[ "$count" -eq 0 ]]; then
      echo "  Aucun enregistrement"
      exit 0
    fi
    echo "$data" | jq -r '.[] | "  [\(.id[0:8])]  \(.name)  —  \(.duration // 0 | . / 60 | floor | tostring | if length == 1 then "0"+. else . end):\(.duration // 0 % 60 | tostring | if length == 1 then "0"+. else . end)  \(if .size < 1048576 then (.size/1024|floor|tostring)+" Ko" else (.size/1048576*10|floor/10|tostring)+" Mo" end)"'
    ;;

  download)
    id="$2"
    if [[ -z "$id" ]]; then echo "Usage: dictaphone download <id>"; exit 1; fi
    outdir="${DICTAPHONE_DIR:-$HOME/Downloads}"
    mkdir -p "$outdir"
    echo "⬇️  Téléchargement de $id..."
    curl -s -L \
      -H "X-Api-Key: $API_KEY" \
      "$BASE_URL/api/v1/recordings/$id/download" \
      -o "$outdir/${id}.webm"
    echo "✅ Sauvegardé : $outdir/${id}.webm"
    ;;

  download-all)
    echo "⬇️  Téléchargement de tous les enregistrements..."
    data=$(api GET /api/v1/recordings)
    ids=$(echo "$data" | jq -r '.[].id')
    if [[ -z "$ids" ]]; then echo "  Aucun enregistrement"; exit 0; fi
    for id in $ids; do
      "$0" download "$id"
    done
    ;;

  delete)
    id="$2"
    if [[ -z "$id" ]]; then echo "Usage: dictaphone delete <id>"; exit 1; fi
    echo "🗑️  Suppression de $id..."
    api DELETE "/api/v1/recordings/$id"
    echo "✅ Supprimé"
    ;;

  play)
    id="$2"
    if [[ -z "$id" ]]; then echo "Usage: dictaphone play <id>"; exit 1; fi
    tmp=$(mktemp /tmp/dictaphone_XXXXXX.webm)
    echo "▶️  Téléchargement pour lecture..."
    curl -s -L \
      -H "X-Api-Key: $API_KEY" \
      "$BASE_URL/api/v1/recordings/$id/download" \
      -o "$tmp"
    open "$tmp"
    ;;

  *)
    echo "Dictaphone CLI"
    echo ""
    echo "Usage:"
    echo "  dictaphone list                  — liste tous les enregistrements"
    echo "  dictaphone download <id>         — télécharge un enregistrement"
    echo "  dictaphone download-all          — télécharge tous les enregistrements"
    echo "  dictaphone delete <id>           — supprime un enregistrement"
    echo "  dictaphone play <id>             — écoute directement (QuickTime)"
    echo ""
    echo "Variables d'environnement :"
    echo "  DICTAPHONE_API_KEY    — clé API (obligatoire)"
    echo "  DICTAPHONE_URL        — URL de l'app (défaut: https://dictaphone-three.vercel.app)"
    echo "  DICTAPHONE_DIR        — dossier de téléchargement (défaut: ~/Downloads)"
    ;;
esac
