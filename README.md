# 🤖 Allodoct Web Analysis Platform

Application web complète pour analyser les appels Allodoct et identifier les problèmes de reconnaissance d'examens par le robot vocal.

## 📋 Architecture

```
allodoct-web/
├── frontend/          # Next.js + React + TypeScript
│   ├── app/          # App Router Next.js 15
│   ├── components/   # Composants React réutilisables
│   └── lib/          # Utilitaires
│
├── backend/          # FastAPI + Python
│   ├── main.py      # API principale
│   └── analyze.py   # Script d'analyse Allodoct
│
└── docker-compose.yml  # Pour lancer tout facilement
```

## 🚀 Installation rapide

### Méthode 1 : Docker (Recommandé)

```bash
# Démarrer tout en une commande
docker-compose up

# Accéder à l'app
Frontend: http://localhost:3000
Backend API: http://localhost:8000
```

### Méthode 2 : Manuel

#### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```

#### Backend (FastAPI)
```bash
cd backend
pip install -r requirements.txt
python main.py
```

## 📊 Fonctionnalités

### ✅ Phase 1 (MVP)
- Upload de fichiers (not_found.xlsx, not_authorized.xlsx, reference.csv)
- Dashboard avec statistiques globales
- 3 graphiques interactifs (camemberts)
- Table récapitulative par catégorie
- Export Excel formaté

### 🚧 Phase 2 (À venir)
- Tables interactives avec filtres
- Recherche d'examens
- Comparaison entre périodes
- Historique des analyses

### 🔮 Phase 3 (Future)
- Multi-centres
- Benchmarking
- Détection automatique de patterns
- Suggestions de corrections

## 🛠️ Stack technique

**Frontend:**
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- shadcn/ui
- Recharts

**Backend:**
- FastAPI
- Python 3.12
- pandas
- openpyxl

## 📦 Utilisation

1. Accédez à http://localhost:3000
2. Uploadez vos 3 fichiers (glisser-déposer)
3. Consultez les statistiques en temps réel
4. Téléchargez le rapport Excel formaté

## 🔧 Configuration

### Variables d'environnement

**Frontend (frontend/.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Backend (backend/.env):**
```env
CORS_ORIGINS=http://localhost:3000
UPLOAD_DIR=./uploads
OUTPUT_DIR=./outputs
```

## 📝 Notes de développement

- Le backend réutilise le script d'analyse Python existant
- Les fichiers uploadés sont stockés temporairement
- Les résultats sont générés en JSON + Excel
- L'interface est responsive (mobile, tablet, desktop)

## 🐛 Troubleshooting

**Port déjà utilisé:**
```bash
# Changer le port du frontend
npm run dev -- -p 3001

# Changer le port du backend
uvicorn main:app --port 8001
```

**Erreur de dépendances Python:**
```bash
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

## 📄 Licence

Projet interne Allodoct - Tous droits réservés

## 👥 Auteur

Créé avec Claude AI pour l'analyse des appels Allodoct
