# Backend Allodoct Analysis - FastAPI

API REST pour l'analyse des fichiers Allodoct.

## 🚀 Installation

```bash
# Installer les dépendances
pip install -r requirements.txt

# Lancer le serveur
python main.py
```

L'API sera disponible sur : http://localhost:8000

## 📡 Endpoints

### `POST /analyze`

Analyse les fichiers Allodoct et retourne les statistiques.

**Paramètres (multipart/form-data):**
- `not_found`: Fichier Excel des examens non trouvés
- `not_authorized`: Fichier Excel des examens non autorisés  
- `reference`: Fichier CSV des examens de référence

**Réponse:**
```json
{
  "summary": {
    "total_exams": 2019,
    "unique_exams": 1047,
    "categories_found": 7,
    "bugs_detected": 28
  },
  "statistics": [...],
  "excel_file_url": "/outputs/allodoct_analysis_result.xlsx"
}
```

### `GET /health`

Vérification de l'état du serveur.

### `GET /outputs/{filename}`

Téléchargement du fichier Excel généré.

## 📁 Structure

```
backend/
├── main.py          # API FastAPI
├── analyze.py       # Script d'analyse
├── requirements.txt # Dépendances Python
├── uploads/         # Fichiers temporaires (auto-créé)
└── outputs/         # Fichiers générés (auto-créé)
```

## 🔧 Configuration

Variables d'environnement (optionnel):
```bash
export UPLOAD_DIR=./uploads
export OUTPUT_DIR=./outputs
export PORT=8000
```

## 📝 Notes

- Les fichiers uploadés sont supprimés après traitement
- Les fichiers générés restent dans `outputs/`
- CORS activé pour tous les domaines (à restreindre en production)
