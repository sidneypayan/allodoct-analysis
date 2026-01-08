# 🚀 Guide de démarrage rapide - Allodoct Web

## 📥 Installation

### 1. Extraire le projet

```bash
# Extraire le fichier allodoct-web.zip
# Ouvrir un terminal dans le dossier allodoct-web
cd allodoct-web
```

## ⚡ Méthode 1 : Lancement simple (Recommandé)

### Frontend (Terminal 1)

```bash
cd frontend
npm install
npm run dev
```

✅ Frontend disponible sur : **http://localhost:3000**

### Backend (Terminal 2)

```bash
cd backend
pip install -r requirements.txt
python main.py
```

✅ Backend disponible sur : **http://localhost:8000**

## 🐳 Méthode 2 : Avec Docker

Si vous avez Docker installé :

```bash
docker-compose up
```

Tout démarre automatiquement ! 🎉

## 📊 Utilisation

1. Ouvrez **http://localhost:3000** dans votre navigateur
2. Glissez-déposez vos 3 fichiers :
   - `not_found.xlsx`
   - `not_authorized.xlsx`
   - `types_d_examen_et_examens_existants_dans_la_norme.csv`
3. Cliquez sur **"Lancer l'analyse"**
4. Consultez les statistiques et graphiques
5. Téléchargez le rapport Excel formaté

## 🛠️ Prérequis

### Pour la méthode simple :
- **Node.js 20+** : https://nodejs.org/
- **Python 3.12+** : https://python.org/

### Pour Docker :
- **Docker Desktop** : https://docker.com/

## ❓ Problèmes courants

### Port déjà utilisé (Frontend)
```bash
npm run dev -- -p 3001
```
Puis accédez à http://localhost:3001

### Port déjà utilisé (Backend)
```bash
uvicorn main:app --port 8001
```
Modifiez aussi `.env.local` → `NEXT_PUBLIC_API_URL=http://localhost:8001`

### Erreur "Module not found"
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### Erreur Python
```bash
cd backend
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

## 📁 Structure du projet

```
allodoct-web/
├── frontend/              # Application Next.js
│   ├── app/              # Pages et routes
│   ├── components/       # Composants React
│   └── package.json      # Dépendances
│
├── backend/              # API FastAPI
│   ├── main.py          # API principale
│   ├── analyze.py       # Script d'analyse
│   └── requirements.txt # Dépendances Python
│
└── README.md            # Documentation
```

## 🎯 Prochaines étapes

Une fois le projet lancé :

1. **Testez avec vos données réelles**
2. **Personnalisez les couleurs** (frontend/tailwind.config.js)
3. **Ajoutez des fonctionnalités** selon vos besoins
4. **Déployez en production** (Vercel + Railway)

## 📞 Support

Pour toute question ou problème, créez un ticket ou contactez l'équipe technique.

---

**Bon développement ! 🚀**
