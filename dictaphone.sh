#!/bin/bash
# Dictaphone CLI — accès depuis le Mac
# Usage : ./dictaphone.sh [list|download <id>|delete <id>|play <id>]

BASE_URL="${DICTAPHONE_URL:-https://dictaphone-three.vercel.app}"
API_KEY="${DICTAPHONE_API_KEY:-}"

if [[ -z "$API_KEY" ]]; then
  echo "❌ Définis DICTAPHONE_API_KEY dans ton .zshrc"
  echo "   export DICTAPHONE_API_KEY=ta-clé-secrète"
  exit 1
fi

cmd="$1"

case "$cmd" in
  list)
    echo "📋 Enregistrements :"
    curl -s "$BASE_URL/api/v1/recordings" \
      -H "X-Api-Key: $API_KEY" | \
      python3 -c "
import json, sys
recs = json.load(sys.stdin)
if not recs:
    print('  Aucun enregistrement')
for r in recs:
    dur = int(r.get('duration', 0))
    m, s = dur // 60, dur % 60
    size = r.get('size', 0)
    sz = f'{size/1024:.0f} Ko' if size < 1048576 else f'{size/1048576:.1f} Mo'
    print(f\"  [{r['id'][:8]}]  {r['name']}  —  {m:02d}:{s:02d}  {sz}\")
"
    ;;

  download)
    id="$2"
    if [[ -z "$id" ]]; then echo "Usage: $0 download <id>"; exit 1; fi
    outdir="${DICTAPHONE_DIR:-$HOME/Downloads}"
    echo "⬇️  Téléchargement de $id..."
    filename=$(curl -sI "$BASE_URL/api/v1/recordings/$id/download" \
      -H "X-Api-Key: $API_KEY" | \
      grep -i content-disposition | sed 's/.*filename="//;s/".*//' | tr -d '\r')
    [[ -z "$filename" ]] && filename="${id}.webm"
    curl -s "$BASE_URL/api/v1/recordings/$id/download" \
      -H "X-Api-Key: $API_KEY" \
      -o "$outdir/$filename"
    echo "✅ Sauvegardé : $outdir/$filename"
    ;;

  download-all)
    echo "⬇️  Téléchargement de tous les enregistrements..."
    outdir="${DICTAPHONE_DIR:-$HOME/Downloads}"
    ids=$(curl -s "$BASE_URL/api/v1/recordings" \
      -H "X-Api-Key: $API_KEY" | \
      python3 -c "import json,sys; [print(r['id']) for r in json.load(sys.stdin)]")
    for id in $ids; do
      "$0" download "$id"
    done
    ;;

  delete)
    id="$2"
    if [[ -z "$id" ]]; then echo "Usage: $0 delete <id>"; exit 1; fi
    echo "🗑️  Suppression de $id..."
    curl -s -X DELETE "$BASE_URL/api/v1/recordings/$id" \
      -H "X-Api-Key: $API_KEY"
    echo ""
    echo "✅ Supprimé"
    ;;

  play)
    id="$2"
    if [[ -z "$id" ]]; then echo "Usage: $0 play <id>"; exit 1; fi
    tmp=$(mktemp /tmp/dictaphone_XXXXXX.webm)
    echo "▶️  Téléchargement pour lecture..."
    curl -s "$BASE_URL/api/v1/recordings/$id/download" \
      -H "X-Api-Key: $API_KEY" -o "$tmp"
    open "$tmp"  # Ouvre avec QuickTime sur Mac
    ;;

  *)
    echo "Dictaphone CLI"
    echo ""
    echo "Usage:"
    echo "  $0 list                  — liste tous les enregistrements"
    echo "  $0 download <id>         — télécharge un enregistrement"
    echo "  $0 download-all          — télécharge tous les enregistrements"
    echo "  $0 delete <id>           — supprime un enregistrement"
    echo "  $0 play <id>             — écoute directement (QuickTime)"
    echo ""
    echo "Variables d'environnement :"
    echo "  DICTAPHONE_API_KEY       — clé API (obligatoire)"
    echo "  DICTAPHONE_URL           — URL de l'app (défaut: https://dictaphone-three.vercel.app)"
    echo "  DICTAPHONE_DIR           — dossier de téléchargement (défaut: ~/Downloads)"
    ;;
esac
