import { PyodideInterface } from './usePyodide'
import { generateExcelFile } from './excelGenerator'
import { AnalysisResult } from './types'

export async function analyzeWithPyodide(
  pyodide: PyodideInterface,
  notFoundFile?: File,
  notAuthorizedFile?: File,
  appointmentCreatedFile?: File
): Promise<AnalysisResult> {
  try {
    console.log('📊 Début de l\'analyse avec Pyodide...')

    // Charger les fichiers dans le système de fichiers virtuel de Pyodide
    if (notFoundFile) {
      const notFoundBuffer = await notFoundFile.arrayBuffer()
      pyodide.FS.writeFile('not_found.xlsx', new Uint8Array(notFoundBuffer))
    }

    if (notAuthorizedFile) {
      const notAuthorizedBuffer = await notAuthorizedFile.arrayBuffer()
      pyodide.FS.writeFile('not_authorized.xlsx', new Uint8Array(notAuthorizedBuffer))
    }

    if (appointmentCreatedFile) {
      const appointmentCreatedBuffer = await appointmentCreatedFile.arrayBuffer()
      pyodide.FS.writeFile('appointment_created.xlsx', new Uint8Array(appointmentCreatedBuffer))
    }

    console.log('✅ Fichiers chargés dans Pyodide')

    // Le code Python d'analyse (copié depuis analyze.py)
    const pythonCode = `
import pandas as pd
import json
import re
import unicodedata

# Catégories d'examens
CATEGORIES = {
    'IRM': ['irm', 'imagerie par résonance magnétique'],
    'SCANNER': ['scanner', 'tdm', 'tomodensitométrie', 'ct', 'coroscanner', 'angioscanner'],
    'RADIOGRAPHIE': ['radio', 'radiographie', 'rx', 'téléradiographie'],
    'MAMMOGRAPHIE': ['mammographie', 'mammo'],
    'ECHOGRAPHIE': ['échographie', 'echographie', 'écho', 'echo', 'doppler'],
    'CONE BEAM': ['cone beam', 'conebeam'],
    'DENTAIRE': ['dentaire', 'panoramique dentaire', 'orthopantomogramme']
}

def categorize_exam(exam_text):
    """Catégorise un examen"""
    if pd.isna(exam_text) or not str(exam_text).strip():
        return 'INCONNU'

    exam_lower = str(exam_text).lower().strip()

    # Vérifier intitulés incompris
    incomprehensible_patterns = [
        r'ma mère', r'ma femme', r'mon mari', r'mon père',
        r'un.*pour', r'je veux', r'j\\'ai besoin',
        r'\\d+\\s*ans', r'bonjour', r'consultation',
    ]

    for pattern in incomprehensible_patterns:
        if re.search(pattern, exam_lower):
            return 'INTITULES INCOMPRIS'

    # Déterminer la catégorie
    for category, keywords in CATEGORIES.items():
        for keyword in keywords:
            if keyword in exam_lower:
                return category

    return 'AUTRE'

def parse_exam_identified(exam_str):
    """Parse la colonne 'Examen Identifié'"""
    if pd.isna(exam_str):
        return []
    return [e.strip() for e in str(exam_str).split(';') if e.strip()]

def normalize_exam_name(exam_str):
    """Normalise un nom d'examen : minuscules + sans accents"""
    if pd.isna(exam_str):
        return ''

    # Convertir en minuscules
    normalized = str(exam_str).lower()

    # Supprimer les accents avec unicodedata (méthode standard)
    nfd = unicodedata.normalize('NFD', normalized)
    without_accents = ''.join(char for char in nfd if unicodedata.category(char) != 'Mn')

    return without_accents.strip()

# Charger les fichiers
print("📊 Chargement des données...")
import os

# Créer des DataFrames vides avec les colonnes nécessaires
empty_columns = ['Id', 'Id Externe', 'Statut', 'Tag', 'Examen Identifié', 'Durée']

# Charger not_found ou créer un DataFrame vide
if os.path.exists('not_found.xlsx'):
    df_not_found = pd.read_excel('not_found.xlsx')
    df_not_found = df_not_found[df_not_found['Statut'].isin(['Transféré', 'Décroché'])].copy()
else:
    print("⚠️ Fichier not_found.xlsx absent - création d'un DataFrame vide")
    df_not_found = pd.DataFrame(columns=empty_columns)

# Charger not_authorized ou créer un DataFrame vide
if os.path.exists('not_authorized.xlsx'):
    df_not_authorized = pd.read_excel('not_authorized.xlsx')
    df_not_authorized = df_not_authorized[df_not_authorized['Statut'].isin(['Transféré', 'Décroché'])].copy()
else:
    print("⚠️ Fichier not_authorized.xlsx absent - création d'un DataFrame vide")
    df_not_authorized = pd.DataFrame(columns=empty_columns)

# Charger appointment_created ou créer un DataFrame vide
if os.path.exists('appointment_created.xlsx'):
    df_appointment_created = pd.read_excel('appointment_created.xlsx')
else:
    print("⚠️ Fichier appointment_created.xlsx absent - création d'un DataFrame vide")
    df_appointment_created = pd.DataFrame(columns=empty_columns)

# PAS DE FILTRE pour appointment_created - on prend TOUTES les lignes pour le calcul de durée
print(f"Not Found (Transféré + Décroché): {len(df_not_found)} appels")
print(f"Not Authorized (Transféré + Décroché): {len(df_not_authorized)} appels")
print(f"Appointment Created (TOUTES les lignes): {len(df_appointment_created)} appels")

# Vérifier si la colonne Durée existe et la convertir en nombre
# IMPORTANT: La durée est extraite depuis TOUTES les lignes de appointment_created
for df in [df_not_found, df_not_authorized]:
    df['Durée'] = 0

if 'Durée' in df_appointment_created.columns:
    df_appointment_created['Durée'] = pd.to_numeric(df_appointment_created['Durée'], errors='coerce').fillna(0)
else:
    df_appointment_created['Durée'] = 0

# Créer un dictionnaire de mapping Id -> Durée depuis TOUTES les lignes de appointment_created
duration_map = {}
for idx, row in df_appointment_created.iterrows():
    call_id = str(row.get('Id', ''))
    if call_id:
        duration_map[call_id] = row.get('Durée', 0)

print(f"Durées extraites pour {len(duration_map)} appels uniques")

# Ajouter les tags
df_not_found['tag_type'] = 'exam_not_found'
df_not_authorized['tag_type'] = 'exam_not_authorized'

# Combiner UNIQUEMENT not_found et not_authorized pour l'analyse des examens
df_all = pd.concat([df_not_found, df_not_authorized], ignore_index=True)

print("🔍 Analyse des examens...")

# Créer deux listes détaillées séparées : une pour les problèmes, une pour les succès
detailed_results_problems = []
detailed_results_appointments = []

# Analyser les problèmes (not_found et not_authorized)
# On compte les appels, pas les examens individuels
for idx, row in df_all.iterrows():
    # Récupérer la durée depuis duration_map basé sur l'Id de l'appel
    call_id = str(row.get('Id', ''))
    duration = duration_map.get(call_id, 0)

    # Prendre le premier examen pour déterminer la catégorie de l'appel
    exams = parse_exam_identified(row['Examen Identifié'])
    first_exam = exams[0] if exams else ''
    category = categorize_exam(first_exam)

    detailed_results_problems.append({
        'Examen Identifié': first_exam,
        'Examen Normalisé': normalize_exam_name(first_exam),
        'Catégorie': category,
        'Tag': row['tag_type'],
        'Id Appel': row['Id'],
        'Id Externe': row['Id Externe'],
        'Durée': duration
    })

# Analyser les rendez-vous créés (appointment_created)
# On compte les appels, pas les examens individuels
for idx, row in df_appointment_created.iterrows():
    call_id = str(row.get('Id', ''))
    duration = row.get('Durée', 0)  # Durée directe du fichier appointment_created

    # Prendre le premier examen pour déterminer la catégorie de l'appel
    exams = parse_exam_identified(row['Examen Identifié'])
    first_exam = exams[0] if exams else ''
    category = categorize_exam(first_exam)

    detailed_results_appointments.append({
        'Examen Identifié': first_exam,
        'Examen Normalisé': normalize_exam_name(first_exam),
        'Catégorie': category,
        'Tag': 'appointment_created',
        'Id Appel': row['Id'],
        'Id Externe': row['Id Externe'],
        'Durée': duration
    })

df_detailed_problems = pd.DataFrame(detailed_results_problems)
df_detailed_appointments = pd.DataFrame(detailed_results_appointments)

# S'assurer que les DataFrames ont les colonnes nécessaires même s'ils sont vides
if df_detailed_problems.empty:
    df_detailed_problems = pd.DataFrame(columns=['Examen Identifié', 'Examen Normalisé', 'Catégorie', 'Tag', 'Id Appel', 'Id Externe', 'Durée'])

if df_detailed_appointments.empty:
    df_detailed_appointments = pd.DataFrame(columns=['Examen Identifié', 'Examen Normalisé', 'Catégorie', 'Tag', 'Id Appel', 'Id Externe', 'Durée'])

print("📈 Génération des statistiques...")

# Générer les statistiques pour LES PROBLÈMES (not_found et not_authorized)
problems_stats = []
valid_categories = list(CATEGORIES.keys()) + ['INTITULES INCOMPRIS', 'AUTRE', 'INCONNU']

for category in valid_categories:
    df_cat = df_detailed_problems[df_detailed_problems['Catégorie'] == category]

    total = len(df_cat)
    if total == 0:
        continue

    not_found = len(df_cat[df_cat['Tag'] == 'exam_not_found'])
    not_authorized = len(df_cat[df_cat['Tag'] == 'exam_not_authorized'])
    total_duration = int(df_cat['Durée'].sum())

    # Regrouper les examens par nom normalisé (ignorer casse et accents)
    exams_list = []
    exams_with_ids = []

    # Grouper par 'Examen Normalisé'
    for normalized_name, df_exam_group in df_cat.groupby('Examen Normalisé'):
        if not normalized_name:  # Ignorer les vides
            continue

        # Prendre le nom original le plus fréquent (pour l'affichage)
        original_name = df_exam_group['Examen Identifié'].mode()[0]

        count = len(df_exam_group)
        nf_count = len(df_exam_group[df_exam_group['Tag'] == 'exam_not_found'])
        na_count = len(df_exam_group[df_exam_group['Tag'] == 'exam_not_authorized'])
        exam_duration = int(df_exam_group['Durée'].sum())

        ids = df_exam_group['Id Externe'].dropna().astype(str).tolist()

        exams_list.append({
            'name': original_name,
            'total': int(count),
            'not_found': int(nf_count),
            'not_authorized': int(na_count),
            'ids': ids,
            'duration': exam_duration
        })

        ids_str = '|'.join(ids)
        exams_with_ids.append(f"{original_name}§{count} (NF:{nf_count}|NA:{na_count})§{ids_str}")

    # Trier par total décroissant
    exams_list.sort(key=lambda x: x['total'], reverse=True)
    exams_with_ids.sort(key=lambda x: int(x.split('§')[1].split(' ')[0]), reverse=True)

    all_exams_str = '\\n'.join(exams_with_ids)

    problems_stats.append({
        'category': category,
        'total': int(total),
        'exam_not_found': int(not_found),
        'exam_not_authorized': int(not_authorized),
        'total_duration': total_duration,
        'all_exams': all_exams_str,
        'exams': exams_list
    })

# Générer les statistiques pour LES RENDEZ-VOUS CRÉÉS (appointment_created)
appointments_stats = []

for category in valid_categories:
    df_cat = df_detailed_appointments[df_detailed_appointments['Catégorie'] == category]

    total = len(df_cat)
    if total == 0:
        continue

    total_duration = int(df_cat['Durée'].sum())
    average_duration = int(df_cat['Durée'].mean()) if total > 0 else 0

    # Regrouper les examens par nom normalisé
    exams_list = []

    for normalized_name, df_exam_group in df_cat.groupby('Examen Normalisé'):
        if not normalized_name:
            continue

        original_name = df_exam_group['Examen Identifié'].mode()[0]
        count = len(df_exam_group)
        exam_duration = int(df_exam_group['Durée'].sum())
        exam_avg_duration = int(df_exam_group['Durée'].mean()) if count > 0 else 0
        ids = df_exam_group['Id Externe'].dropna().astype(str).tolist()

        exams_list.append({
            'name': original_name,
            'total': int(count),
            'not_found': 0,  # Pas de not_found pour les succès
            'not_authorized': 0,  # Pas de not_authorized pour les succès
            'ids': ids,
            'duration': exam_duration,
            'average_duration': exam_avg_duration
        })

    # Trier par total décroissant
    exams_list.sort(key=lambda x: x['total'], reverse=True)

    appointments_stats.append({
        'category': category,
        'total': int(total),
        'exam_not_found': 0,
        'exam_not_authorized': 0,
        'total_duration': total_duration,
        'average_duration': average_duration,
        'all_exams': '',
        'exams': exams_list
    })

# Calculer le résumé
total_calls = len(df_not_found) + len(df_not_authorized)
unique_exams = len(df_detailed_problems['Examen Normalisé'].unique())
bugs_detected = len(df_detailed_problems[df_detailed_problems['Catégorie'] == 'INTITULES INCOMPRIS'])
# Calculer la durée totale UNIQUEMENT depuis appointment_created
total_duration = int(df_appointment_created['Durée'].sum())
# Calculer le nombre de rendez-vous créés (nombre de lignes dans appointment_created)
appointments_created = len(df_appointment_created)

summary = {
    'total_calls': int(total_calls),
    'unique_exams': int(unique_exams),
    'categories_found': len(problems_stats),
    'bugs_detected': int(bugs_detected),
    'total_duration': total_duration,
    'appointments_created': int(appointments_created)
}

print("✅ Analyse terminée !")

# Résultat JSON (Excel sera généré côté JavaScript)
result = {
    'summary': summary,
    'problems_statistics': problems_stats,
    'appointments_statistics': appointments_stats
}

json.dumps(result)
`

    console.log('🐍 Exécution du code Python...')
    const resultJson = await pyodide.runPythonAsync(pythonCode)
    const result = JSON.parse(resultJson)

    console.log('📊 Génération du fichier Excel avec JavaScript...')
    const excelBase64 = generateExcelFile(result.problems_statistics, result.appointments_statistics, result.summary)

    const finalResult: AnalysisResult = {
      ...result,
      excel_file_base64: excelBase64
    }

    console.log('✅ Analyse terminée !', finalResult.summary)

    return finalResult
  } catch (error) {
    console.error('❌ Erreur lors de l\'analyse:', error)
    throw error
  }
}
