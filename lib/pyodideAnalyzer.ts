import { PyodideInterface } from './usePyodide'
import { generateExcelFile } from './excelGenerator'

export interface AnalysisResult {
  summary: {
    total_calls: number
    unique_exams: number
    categories_found: number
    bugs_detected: number
  }
  statistics: Array<{
    category: string
    total: number
    exam_not_found: number
    exam_not_authorized: number
    all_exams: string
    exams: Array<{
      name: string
      total: number
      not_found: number
      not_authorized: number
      ids: string[]
    }>
  }>
  excel_file_base64: string
}

export async function analyzeWithPyodide(
  pyodide: PyodideInterface,
  notFoundFile: File,
  notAuthorizedFile: File,
  referenceFile: File
): Promise<AnalysisResult> {
  try {
    console.log('📊 Début de l\'analyse avec Pyodide...')

    // Charger les fichiers dans le système de fichiers virtuel de Pyodide
    const notFoundBuffer = await notFoundFile.arrayBuffer()
    const notAuthorizedBuffer = await notAuthorizedFile.arrayBuffer()
    const referenceBuffer = await referenceFile.arrayBuffer()

    pyodide.FS.writeFile('not_found.xlsx', new Uint8Array(notFoundBuffer))
    pyodide.FS.writeFile('not_authorized.xlsx', new Uint8Array(notAuthorizedBuffer))
    pyodide.FS.writeFile('reference.csv', new Uint8Array(referenceBuffer))

    console.log('✅ Fichiers chargés dans Pyodide')

    // Le code Python d'analyse (copié depuis analyze.py)
    const pythonCode = `
import pandas as pd
import json
import re

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

# Charger les fichiers
print("📊 Chargement des données...")
df_not_found = pd.read_excel('not_found.xlsx')
df_not_authorized = pd.read_excel('not_authorized.xlsx')

# Filtrer uniquement les "Transféré"
df_not_found = df_not_found[df_not_found['Statut'] == 'Transféré'].copy()
df_not_authorized = df_not_authorized[df_not_authorized['Statut'] == 'Transféré'].copy()

print(f"Not Found (Transféré): {len(df_not_found)} appels")
print(f"Not Authorized (Transféré): {len(df_not_authorized)} appels")

# Ajouter les tags
df_not_found['tag_type'] = 'exam_not_found'
df_not_authorized['tag_type'] = 'exam_not_authorized'

# Combiner
df_all = pd.concat([df_not_found, df_not_authorized], ignore_index=True)

print("🔍 Analyse des examens...")

# Créer la liste détaillée
detailed_results = []

for idx, row in df_all.iterrows():
    exams = parse_exam_identified(row['Examen Identifié'])

    for exam in exams:
        category = categorize_exam(exam)

        detailed_results.append({
            'Examen Identifié': exam,
            'Catégorie': category,
            'Tag': row['tag_type'],
            'Id Appel': row['Id'],
            'Id Externe': row['Id Externe']
        })

df_detailed = pd.DataFrame(detailed_results)

print("📈 Génération des statistiques...")

# Statistiques
stats_data = []
valid_categories = list(CATEGORIES.keys()) + ['INTITULES INCOMPRIS', 'AUTRE', 'INCONNU']

for category in valid_categories:
    df_cat = df_detailed[df_detailed['Catégorie'] == category]

    total = len(df_cat)
    if total == 0:
        continue

    not_found = len(df_cat[df_cat['Tag'] == 'exam_not_found'])
    not_authorized = len(df_cat[df_cat['Tag'] == 'exam_not_authorized'])

    # Tous les examens avec leur répartition
    all_exams = df_cat['Examen Identifié'].value_counts()
    exams_list = []
    exams_with_ids = []

    for exam, count in all_exams.items():
        df_exam = df_cat[df_cat['Examen Identifié'] == exam]

        nf_count = len(df_exam[df_exam['Tag'] == 'exam_not_found'])
        na_count = len(df_exam[df_exam['Tag'] == 'exam_not_authorized'])

        ids = df_exam['Id Externe'].dropna().astype(str).tolist()

        exams_list.append({
            'name': exam,
            'total': int(count),
            'not_found': int(nf_count),
            'not_authorized': int(na_count),
            'ids': ids
        })

        ids_str = '|'.join(ids)
        exams_with_ids.append(f"{exam}§{count} (NF:{nf_count}|NA:{na_count})§{ids_str}")

    all_exams_str = '\\n'.join(exams_with_ids)

    stats_data.append({
        'category': category,
        'total': int(total),
        'exam_not_found': int(not_found),
        'exam_not_authorized': int(not_authorized),
        'all_exams': all_exams_str,
        'exams': exams_list
    })

# Calculer le résumé
total_calls = len(df_not_found) + len(df_not_authorized)
unique_exams = len(df_detailed['Examen Identifié'].unique())
bugs_detected = len(df_detailed[df_detailed['Catégorie'] == 'INTITULES INCOMPRIS'])

summary = {
    'total_calls': int(total_calls),
    'unique_exams': int(unique_exams),
    'categories_found': len(stats_data),
    'bugs_detected': int(bugs_detected)
}

print("✅ Analyse terminée !")

# Résultat JSON (Excel sera généré côté JavaScript)
result = {
    'summary': summary,
    'statistics': stats_data,
}

json.dumps(result)
`

    console.log('🐍 Exécution du code Python...')
    const resultJson = await pyodide.runPythonAsync(pythonCode)
    const result = JSON.parse(resultJson)

    console.log('📊 Génération du fichier Excel avec JavaScript...')
    const excelBase64 = generateExcelFile(result.statistics)

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
