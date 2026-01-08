# Frontend Allodoct Analysis - Next.js

Interface web moderne pour l'analyse des appels Allodoct.

## 🚀 Démarrage rapide

```bash
# Installer les dépendances
npm install

# Lancer en mode développement
npm run dev

# Build pour production
npm run build
npm start
```

L'application sera disponible sur : http://localhost:3000

## 📦 Technologies utilisées

- **Next.js 15** - Framework React avec App Router
- **React 19** - Bibliothèque UI
- **TypeScript** - Typage statique
- **Tailwind CSS** - Styling
- **Recharts** - Graphiques interactifs
- **Lucide React** - Icônes
- **Axios** - Client HTTP

## 🎨 Fonctionnalités

### ✅ Upload de fichiers
- Drag & drop
- Détection automatique du type de fichier
- Validation des 3 fichiers requis

### 📊 Dashboard interactif
- Cartes de statistiques
- 3 graphiques (camemberts + barres)
- Table détaillée par catégorie
- Design responsive

### 💾 Export
- Téléchargement du rapport Excel formaté
- Nouveau analyse en un clic

## 📁 Structure

```
frontend/
├── app/
│   ├── layout.tsx       # Layout principal
│   ├── page.tsx         # Page d'accueil
│   └── globals.css      # Styles globaux
├── components/
│   ├── FileUpload.tsx   # Composant d'upload
│   └── Dashboard.tsx    # Composant dashboard
└── lib/
    └── types.ts         # Types TypeScript
```

## 🔧 Configuration

Créez un fichier `.env.local` :

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 🎨 Personnalisation

### Couleurs (tailwind.config.js)
```javascript
colors: {
  primary: { ... }
}
```

### API URL
Modifiez `NEXT_PUBLIC_API_URL` dans `.env.local`

## 📝 Scripts disponibles

```bash
npm run dev      # Mode développement
npm run build    # Build production
npm start        # Lancer la version production
npm run lint     # Vérifier le code
```

## 🐛 Debugging

**Port déjà utilisé :**
```bash
npm run dev -- -p 3001
```

**Erreurs de build :**
```bash
rm -rf .next node_modules
npm install
npm run dev
```
