#!/bin/bash
# Dictaphone CLI — accès depuis le Mac
# Usage : dictaphone [list|sync|download <id>|delete <id>|play <id>|download-all]

BASE_URL="${DICTAPHONE_URL:-https://dictaphone-three.vercel.app}"
API_KEY="${DICTAPHONE_API_KEY:-}"
VOICE_NOTES_DIR="${DICTAPHONE_DIR:-/Users/christophe.samson/claude/Inbox/voice_notes}"
SYNCED_FILE="$HOME/.dictaphone_synced"

if [[ -z "$API_KEY" ]]; then
  echo "❌ Définis DICTAPHONE_API_KEY dans ton .zshrc :"
  echo "   export DICTAPHONE_API_KEY=ta-clé-secrète"
  exit 1
fi

# Appel API avec affichage de l'erreur brute si non-200
api() {
  local method="${1:-GET}"
  local path="$2"
  local response http_code body

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
      echo "❌ Réponse invalide :"; echo "$data"; exit 1
    fi
    count=$(echo "$data" | jq '[.[] | if type == "array" then .[] else . end] | length')
    if [[ "$count" -eq 0 ]]; then echo "  Aucun enregistrement"; exit 0; fi
    echo "$data" | jq -r '[.[] | if type == "array" then .[] else . end] | .[] | "  [\(.id[0:8])]  \(.name)  —  \(.duration // 0 | . / 60 | floor | tostring | if length == 1 then "0"+. else . end):\(.duration // 0 % 60 | tostring | if length == 1 then "0"+. else . end)  \((.size // 0) as $s | if $s < 1048576 then ($s/1024|floor|tostring)+" Ko" else ($s/1048576*10|floor/10|tostring)+" Mo" end)"'
    ;;

  sync)
    echo "🔄 Synchronisation vers $VOICE_NOTES_DIR..."
    mkdir -p "$VOICE_NOTES_DIR"
    touch "$SYNCED_FILE"

    data=$(api GET /api/v1/recordings)
    recordings=$(echo "$data" | jq -c '[.[] | if type == "array" then .[] else . end] | .[]')

    new=0
    while IFS= read -r rec; do
      id=$(echo "$rec" | jq -r '.id')
      name=$(echo "$rec" | jq -r '.name')
      created=$(echo "$rec" | jq -r '.createdAt')

      # Déjà téléchargé ?
      if grep -qF "$id" "$SYNCED_FILE" 2>/dev/null; then
        continue
      fi

      # Nom de fichier propre avec date
      date_fmt=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${created%.*}" "+%Y%m%d_%H%M%S" 2>/dev/null || echo "$id")
      safe_name=$(echo "$name" | sed 's/[^a-zA-Z0-9 _-]/_/g' | sed 's/ /_/g')
      filename="${date_fmt}_${safe_name}.webm"

      echo "⬇️  $name"
      curl -s -L \
        -H "X-Api-Key: $API_KEY" \
        "$BASE_URL/api/v1/recordings/$id/download" \
        -o "$VOICE_NOTES_DIR/$filename"

      echo "$id" >> "$SYNCED_FILE"
      new=$((new + 1))
    done <<< "$recordings"

    if [[ $new -eq 0 ]]; then
      echo "✅ Tout est déjà synchronisé"
    else
      echo "✅ $new nouveau(x) fichier(s) téléchargé(s) dans $VOICE_NOTES_DIR"
    fi
    ;;

  download)
    id="$2"
    if [[ -z "$id" ]]; then echo "Usage: dictaphone download <id>"; exit 1; fi
    mkdir -p "$VOICE_NOTES_DIR"
    echo "⬇️  Téléchargement de $id..."
    curl -s -L \
      -H "X-Api-Key: $API_KEY" \
      "$BASE_URL/api/v1/recordings/$id/download" \
      -o "$VOICE_NOTES_DIR/${id}.webm"
    echo "✅ Sauvegardé : $VOICE_NOTES_DIR/${id}.webm"
    ;;

  download-all)
    echo "⬇️  Téléchargement de tous les enregistrements..."
    data=$(api GET /api/v1/recordings)
    ids=$(echo "$data" | jq -r '[.[] | if type == "array" then .[] else . end] | .[].id')
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
    echo "  dictaphone list              — liste tous les enregistrements"
    echo "  dictaphone sync              — télécharge les nouveaux enregistrements"
    echo "  dictaphone download <id>     — télécharge un enregistrement"
    echo "  dictaphone download-all      — télécharge tous les enregistrements"
    echo "  dictaphone delete <id>       — supprime un enregistrement"
    echo "  dictaphone play <id>         — écoute directement (QuickTime)"
    echo ""
    echo "Variables d'environnement :"
    echo "  DICTAPHONE_API_KEY    — clé API (obligatoire)"
    echo "  DICTAPHONE_URL        — URL de l'app (défaut: https://dictaphone-three.vercel.app)"
    echo "  DICTAPHONE_DIR        — dossier de sync (défaut: ~/claude/Inbox/voice_notes)"
    ;;
esac
