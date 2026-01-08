from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import os
import shutil
from pathlib import Path
import pandas as pd
from analyze import analyze_calls

app = FastAPI(title="Allodoct Analysis API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En production: spécifier les domaines autorisés
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Créer les dossiers nécessaires
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@app.get("/")
async def root():
    return {
        "message": "Allodoct Analysis API",
        "version": "1.0.0",
        "endpoints": {
            "analyze": "/analyze",
            "health": "/health"
        }
    }

@app.get("/health")
async def health():
    return {"status": "healthy"}

@app.post("/analyze")
async def analyze_files(
    not_found: UploadFile = File(...),
    not_authorized: UploadFile = File(...)
):
    """
    Analyse les fichiers Allodoct et retourne les statistiques + fichier Excel en base64
    SÉCURITÉ : Tous les fichiers sont supprimés immédiatement après traitement
    NOTE : Le fichier de référence est stocké dans backend/data/reference_exams.csv
    """
    import uuid
    import base64

    # Créer un dossier temporaire unique
    temp_id = str(uuid.uuid4())
    temp_dir = UPLOAD_DIR / temp_id
    temp_dir.mkdir(exist_ok=True)

    # Fichier de référence stocké localement
    reference_path = Path("data/reference_exams.csv")
    if not reference_path.exists():
        raise HTTPException(
            status_code=500,
            detail="Fichier de référence manquant. Contactez l'administrateur."
        )

    try:
        # Sauvegarder les fichiers dans le dossier temporaire
        not_found_path = temp_dir / not_found.filename
        not_authorized_path = temp_dir / not_authorized.filename

        with open(not_found_path, "wb") as f:
            shutil.copyfileobj(not_found.file, f)

        with open(not_authorized_path, "wb") as f:
            shutil.copyfileobj(not_authorized.file, f)
        
        # Générer le fichier de sortie
        output_path = temp_dir / "allodoct_analysis_result.xlsx"
        
        # Lancer l'analyse
        analyze_calls(
            str(not_found_path),
            str(not_authorized_path),
            str(reference_path),
            str(output_path)
        )
        
        # Lire les statistiques depuis le fichier Excel généré
        # skiprows=1 pour sauter le titre, et on va filtrer la ligne "Type/Nombre" plus tard
        df_stats = pd.read_excel(output_path, sheet_name='Statistiques', skiprows=1)

        # Filtrer les lignes invalides
        df_stats = df_stats[df_stats['Catégorie'] != 'Type']  # Ligne de description
        df_stats = df_stats[df_stats['Catégorie'].notna()]  # Lignes avec NaN
        df_stats = df_stats[~df_stats['Catégorie'].str.contains('exam_', case=False, na=False)]  # exam_not_found, exam_not_authorized

        # Debug: voir les colonnes et TOUTES les lignes
        print("Colonnes:", df_stats.columns.tolist())
        print("Premières lignes:")
        print(df_stats.head(15))  # Voir 15 premières lignes
        print(f"\nNombre total de lignes: {len(df_stats)}")
        print("\nToutes les catégories dans le DataFrame:")
        print(df_stats['Catégorie'].tolist())

        # Formater les statistiques pour l'API
        statistics = []
        for _, row in df_stats.iterrows():
            # Convertir en string d'abord pour éviter les erreurs de type
            total = str(row['Total']) if pd.notna(row['Total']) else "0"
            exam_nf = str(row['exam_not_found']) if pd.notna(row['exam_not_found']) else "0"
            exam_na = str(row['exam_not_authorized']) if pd.notna(row['exam_not_authorized']) else "0"

            # Convertir uniquement si ce sont des nombres valides
            try:
                total_int = int(float(total))
                exam_nf_int = int(float(exam_nf))
                exam_na_int = int(float(exam_na))
            except (ValueError, TypeError):
                print(f"Skipping invalid row: {row.to_dict()}")
                continue

            statistics.append({
                "category": str(row['Catégorie']),
                "total": total_int,
                "exam_not_found": exam_nf_int,
                "exam_not_authorized": exam_na_int,
                "all_exams": str(row['Tous les examens']) if pd.notna(row['Tous les examens']) else ""
            })
        
        # Calculer le résumé
        # Nombre d'appels transférés = nombre de lignes dans les fichiers sources filtrées par "Transféré"
        try:
            df_not_found_temp = pd.read_excel(not_found_path)
            df_not_authorized_temp = pd.read_excel(not_authorized_path)

            count_nf = len(df_not_found_temp[df_not_found_temp['Statut'] == 'Transféré'])
            count_na = len(df_not_authorized_temp[df_not_authorized_temp['Statut'] == 'Transféré'])
            total_calls = count_nf + count_na

            print(f"\n📞 Comptage des appels transférés:")
            print(f"   Not Found (Transféré): {count_nf}")
            print(f"   Not Authorized (Transféré): {count_na}")
            print(f"   TOTAL: {total_calls}")
        except Exception as e:
            print(f"❌ Erreur lors du comptage des appels: {e}")
            total_calls = 0

        bugs_detected = next((stat['total'] for stat in statistics if stat['category'] == 'INTITULES INCOMPRIS'), 0)

        # Compter le nombre d'intitulés distincts (chaque examen compte pour 1, peu importe ses occurrences)
        total_exams = 0
        for stat in statistics:
            # Chaque ligne dans 'all_exams' représente un intitulé distinct
            if stat['all_exams']:
                # Compter le nombre de lignes non vides
                exams_lines = [line for line in stat['all_exams'].split('\n') if line.strip()]
                total_exams += len(exams_lines)

        print(f"\n📊 Calcul des examens distincts:")
        for stat in statistics:
            if stat['all_exams']:
                exams_lines = [line for line in stat['all_exams'].split('\n') if line.strip()]
                print(f"   {stat['category']}: {len(exams_lines)} intitulés distincts")
        print(f"   TOTAL: {total_exams} intitulés distincts")

        # Lire le fichier Excel en base64 pour transfert sécurisé
        with open(output_path, 'rb') as f:
            excel_bytes = f.read()
            excel_base64 = base64.b64encode(excel_bytes).decode('utf-8')

        result = {
            "summary": {
                "total_calls": total_calls,  # Nombre d'appels transférés
                "unique_exams": total_exams,  # Nombre d'intitulés distincts
                "categories_found": len(statistics),
                "bugs_detected": bugs_detected
            },
            "statistics": statistics,
            "excel_file_base64": excel_base64  # Excel en base64, pas d'URL
        }

        print(f"\n✅ Résumé envoyé au frontend:")
        print(f"   total_calls: {total_calls}")
        print(f"   unique_exams (intitulés distincts): {total_exams}")
        print(f"   categories_found: {len(statistics)}")
        print(f"   bugs_detected: {bugs_detected}")

        # SÉCURITÉ : Supprimer IMMÉDIATEMENT tout le dossier temporaire
        shutil.rmtree(temp_dir)

        return result
        
    except Exception as e:
        # Nettoyer même en cas d'erreur
        if temp_dir.exists():
            shutil.rmtree(temp_dir)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
