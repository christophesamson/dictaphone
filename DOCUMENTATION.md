# Dictaphone — Documentation technique

**URL de l'app :** https://dictaphone-three.vercel.app  
**Repo GitHub :** https://github.com/christophesamson/dictaphone

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture](#2-architecture)
3. [Variables d'environnement Vercel](#3-variables-denvironnement-vercel)
4. [API REST (v1)](#4-api-rest-v1)
5. [CLI Mac](#5-cli-mac)
6. [Intégration Obsidian](#6-intégration-obsidian)
7. [Réinstallation complète](#7-réinstallation-complète)
8. [Diagnostic](#8-diagnostic)

---

## 1. Vue d'ensemble

Application web dictaphone hébergée sur Vercel, permettant d'enregistrer des notes vocales depuis un navigateur et de les récupérer sur Mac.

---

## 2. Architecture

### Stack technique

| Couche | Technologie |
|---|---|
| Framework | Next.js 14 App Router |
| Hébergement | Vercel |
| Stockage audio | Vercel Blob (privé) |
| Métadonnées | Vercel Blob — un fichier JSON par enregistrement dans `metadata/` |
| Auth web | Middleware cookie avec mot de passe (`APP_PASSWORD`) |
| Auth API | Clé API dans header `X-Api-Key` |

### Structure des fichiers

```
app/
  api/
    auth/route.ts               → login/logout cookie
    upload/route.ts             → upload audio vers Blob
    recordings/route.ts         → CRUD métadonnées
    stream/route.ts             → proxy lecture audio privé
    v1/recordings/              → API REST sécurisée par clé API
      route.ts                  → GET liste
      [id]/route.ts             → DELETE
      [id]/download/route.ts    → GET téléchargement
    debug/route.ts              → diagnostic Blob
  login/page.tsx                → page de login
  page.tsx                      → app principale
components/
  Dictaphone.tsx                → enregistreur principal
  Player.tsx                    → lecteur audio
  RecordingList.tsx             → liste des enregistrements
  Waveform.tsx                  → visualiseur audio temps réel
lib/
  storage.ts                    → accès Vercel Blob
  apiAuth.ts                    → vérification clé API
middleware.ts                   → protection par mot de passe
dictaphone.sh                   → CLI Mac
```

### Flux d'un enregistrement

1. L'utilisateur clique sur le bouton rouge → le navigateur demande accès au micro
2. `MediaRecorder` capture l'audio en WebM/Opus
3. `AnalyserNode` affiche la forme d'onde en temps réel
4. À l'arrêt → upload vers `/api/upload` → stocké dans Vercel Blob
5. Les métadonnées (nom, durée, taille, date) sont sauvegardées dans `metadata/{id}.json`
6. La liste se rafraîchit automatiquement

### Flux de lecture

1. Clic sur play → Player charge l'audio via `/api/stream?url=...`
2. `/api/stream` proxie la requête vers Vercel Blob avec le token serveur
3. La barre de progression utilise la durée stockée (workaround — les fichiers WebM enregistrés par `MediaRecorder` ne contiennent pas de métadonnées de durée)

---

## 3. Variables d'environnement Vercel

| Variable | Description |
|---|---|
| `APP_PASSWORD` | Mot de passe de connexion à l'app web |
| `API_KEY` | Clé API pour accès depuis le Mac |
| `BLOB_READ_WRITE_TOKEN` | Token Vercel Blob (ajouté automatiquement lors du rattachement du store) |

---

## 4. API REST (v1)

### Authentification

Toutes les routes `/api/v1/*` nécessitent le header :

```
X-Api-Key: ta-clé-api
```

### Endpoints

| Méthode | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/recordings` | Liste tous les enregistrements |
| `GET` | `/api/v1/recordings/{id}/download` | Télécharge un fichier audio |
| `DELETE` | `/api/v1/recordings/{id}` | Supprime un enregistrement |

### Exemple curl

```bash
# Lister
curl https://dictaphone-three.vercel.app/api/v1/recordings \
  -H "X-Api-Key: ta-clé"

# Télécharger
curl https://dictaphone-three.vercel.app/api/v1/recordings/{id}/download \
  -H "X-Api-Key: ta-clé" -o note.webm

# Supprimer
curl -X DELETE https://dictaphone-three.vercel.app/api/v1/recordings/{id} \
  -H "X-Api-Key: ta-clé"
```

---

## 5. CLI Mac

### Installation

```bash
sudo cp /Users/christophe.samson/dictaphone/dictaphone.sh /usr/local/bin/dictaphone
sudo chmod +x /usr/local/bin/dictaphone
```

### Variables d'environnement

À ajouter dans `~/.bash_profile` :

```bash
export DICTAPHONE_API_KEY="ta-clé-api"
export DICTAPHONE_DIR="/Users/christophe.samson/claude/Inbox/voice_notes"
```

Puis recharger :

```bash
source ~/.bash_profile
```

### Commandes disponibles

| Commande | Description |
|---|---|
| `dictaphone list` | Liste tous les enregistrements |
| `dictaphone sync` | Télécharge les nouveaux enregistrements non encore synchronisés |
| `dictaphone download <id>` | Télécharge un enregistrement spécifique |
| `dictaphone download-all` | Télécharge tous les enregistrements |
| `dictaphone delete <id>` | Supprime un enregistrement |
| `dictaphone play <id>` | Ouvre l'enregistrement dans QuickTime |

### Fichier de suivi des synchronisations

Les IDs déjà téléchargés sont mémorisés dans `~/.dictaphone_synced`.  
Supprimer ce fichier force un re-téléchargement complet :

```bash
rm ~/.dictaphone_synced
dictaphone sync
```

---

## 6. Intégration Obsidian

### Plugin requis : Shell Commands

1. Obsidian → Settings → Community plugins → Browse → **"Shell commands"** → Install & Enable
2. Settings → Shell commands → `+` New command
3. Shell command :

```bash
export DICTAPHONE_API_KEY="ta-clé-api" && \
export DICTAPHONE_DIR="/Users/christophe.samson/claude/Inbox/voice_notes" && \
/usr/local/bin/dictaphone sync
```

4. Alias : `Sync Dictaphone`
5. Cocher **"Show in ribbon"** pour avoir un bouton dans la barre latérale

> **Note :** La clé doit être définie directement dans la commande car Obsidian ne charge pas `~/.bash_profile`.

### Bouton dans une note (plugin Buttons)

```
button
name Sync Dictaphone 🎙️
type command
action Shell commands: Sync Dictaphone
```

---

## 7. Réinstallation complète

### Prérequis

```bash
# Node.js (via nvm ou brew)
brew install node

# jq (parsing JSON en ligne de commande)
brew install jq
```

### Déploiement Vercel

1. Aller sur [vercel.com/new](https://vercel.com/new)
2. Importer le repo `github.com/christophesamson/dictaphone`
3. Dans **Storage** → Create Database → **Blob** (nomme-le `dictaphone-blob`) → Connect to project
4. Dans **Settings** → Environment Variables, ajouter :
   - `APP_PASSWORD` = ton mot de passe
   - `API_KEY` = générer avec `openssl rand -hex 32`
5. **Redéployer** (Deployments → Redeploy)

### Installation CLI Mac

```bash
# Cloner le repo
git clone https://github.com/christophesamson/dictaphone.git ~/dictaphone

# Installer le script
sudo cp ~/dictaphone/dictaphone.sh /usr/local/bin/dictaphone
sudo chmod +x /usr/local/bin/dictaphone

# Ajouter les variables dans ~/.bash_profile
echo 'export DICTAPHONE_API_KEY="ta-clé"' >> ~/.bash_profile
echo 'export DICTAPHONE_DIR="/Users/christophe.samson/claude/Inbox/voice_notes"' >> ~/.bash_profile
source ~/.bash_profile
```

### Test

```bash
dictaphone list
dictaphone sync
```

---

## 8. Diagnostic

### Route `/api/debug`

```
https://dictaphone-three.vercel.app/api/debug
```

Retourne la liste de tous les fichiers présents dans le Blob store avec leur taille et date. Utile pour vérifier que les uploads fonctionnent correctement.

### Problèmes courants

| Problème | Cause | Solution |
|---|---|---|
| "Aucun enregistrement" après upload | `BLOB_READ_WRITE_TOKEN` manquant | Vérifier la variable dans Vercel → Settings → Env Vars |
| Erreur upload `private store` | Store Blob en mode privé | Utiliser `access: 'private'` + proxy `/api/stream` |
| `dictaphone: API KEY manquante` | `.bash_profile` non chargé | Relancer le terminal ou `source ~/.bash_profile` |
| Barre de progression incorrecte | WebM sans métadonnées de durée | Durée prise depuis les métadonnées stockées au moment de l'enregistrement |
| Enregistrement imbriqué dans la liste | Bug ancien code storage | Corrigé — le storage aplatit les tableaux imbriqués |
