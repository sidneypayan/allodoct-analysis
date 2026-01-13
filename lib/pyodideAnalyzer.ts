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

# Types d'examens (modalités)
TYPES_EXAMENS = [
    'irm', 'scanner', 'tdm', 'tomodensitometrie', 'tomodensitométrie',
    'radio', 'radiographie', 'rx', 'teleradiographie', 'téléradiographie',
    'echo', 'écho', 'echographie', 'échographie', 'doppler',
    'mammographie', 'mammo',
    'cone beam', 'conebeam',
    'panoramique', 'orthopantomogramme',
    'scintigraphie', 'pet', 'tep', 'spect',
    'osteodensitometrie', 'ostéodensitométrie', 'densitometrie', 'densitométrie',
    'angiographie', 'arteriographie', 'artériographie', 'coroscanner', 'angioscanner',
    'coro', 'coronaro', 'coronarographie',
]

# Termes anatomiques et médicaux valides (hors types d'examens)
TERMES_ANATOMIQUES = [
    # Termes médicaux spécifiques
    'calcique', 'calcification', 'calcium',
    'dentaire', 'dent', 'dents', 'molaire', 'incisive', 'canine',

    # Tête et cou
    'tete', 'tête', 'crane', 'crâne', 'cerveau', 'cerebral', 'cérébral', 'encephale', 'encéphale',
    'sinus', 'facial', 'face', 'machoire', 'mâchoire', 'mandibule', 'maxillaire',
    'orbite', 'oeil', 'œil', 'yeux', 'oreille', 'rocher', 'atm', 'temporo',
    'hypophyse', 'selle turcique', 'cou', 'cervical', 'cervicale', 'larynx', 'thyroide', 'thyroïde',
    'parotide', 'glande', 'salivaire',

    # Rachis / Colonne
    'rachis', 'colonne', 'vertebr', 'vertébr', 'lombaire', 'dorsal', 'thoracique',
    'sacr', 'coccyx', 'sacro', 'iliaque', 'medullaire', 'médullaire', 'moelle',

    # Thorax
    'thorax', 'thoracique', 'poumon', 'pulmonaire', 'plevre', 'plèvre', 'pleural',
    'mediastin', 'médiastin', 'bronch', 'trachee', 'trachée',

    # Cœur et vaisseaux
    'coeur', 'cœur', 'cardiaque', 'cardiac', 'coronaire', 'aorte', 'aortique',
    'vasculaire', 'veine', 'veineux', 'artere', 'artère', 'arteriel', 'artériel',
    'carotide', 'jugulaire', 'angio', 'anévrisme', 'anevrisme',

    # Abdomen
    'abdomen', 'abdominal', 'abdomino', 'ventre', 'digestif',
    'foie', 'hepat', 'hépat', 'vesicule', 'vésicule', 'biliaire', 'voies biliaires',
    'pancreas', 'pancréas', 'pancreat', 'pancréat',
    'rate', 'splen', 'splén',
    'estomac', 'gastri', 'intestin', 'grele', 'grêle', 'colon', 'côlon', 'colique',
    'rectum', 'rectal', 'anus', 'anal', 'appendice',
    'peritoine', 'péritoine', 'retroperitoine', 'rétropéritoine',

    # Reins et urinaire
    'rein', 'renal', 'rénal', 'nephro', 'néphro', 'surrenale', 'surrénale',
    'urinaire', 'vessie', 'vesical', 'vésical', 'uretre', 'urètre', 'uretere', 'uretère',
    'uro', 'pyelon', 'pyélon',

    # Pelvis et génital
    'pelvis', 'pelvien', 'pelvienne', 'bassin',
    'prostate', 'prostatique', 'vesicule seminale', 'vésicule séminale',
    'testicule', 'testiculaire', 'scrotum', 'scrotal', 'penis', 'pénis', 'verge',
    'uterus', 'utérus', 'uterin', 'utérin', 'ovaire', 'ovarien', 'trompe',
    'endometre', 'endomètre', 'vagin', 'vaginal', 'vulve', 'perinee', 'périnée',

    # Sein
    'sein', 'mammaire', 'mammo',

    # Membres supérieurs
    'epaule', 'épaule', 'scapul', 'clavicule', 'acromio', 'omoplate',
    'bras', 'humer', 'humér', 'coude', 'cubital',
    'avant-bras', 'radius', 'ulna', 'cubitus', 'radial',
    'poignet', 'carpe', 'carpien', 'main', 'doigt', 'phalang', 'metacarp', 'métacarp',

    # Membres inférieurs
    'hanche', 'coxo', 'femoral', 'fémoral', 'femur', 'fémur',
    'cuisse', 'quadriceps', 'ischio',
    'genou', 'rotule', 'patell', 'menisque', 'ménisque', 'ligament', 'croise', 'croisé',
    'jambe', 'tibia', 'tibial', 'perone', 'péroné', 'fibula', 'fibulaire',
    'cheville', 'malleol', 'malléol', 'talo', 'astragale',
    'pied', 'tarse', 'metatars', 'métatars', 'orteil', 'calcaneum', 'calcanéum', 'talon',

    # Os et articulations généraux
    'os', 'osseux', 'osseuse', 'squelette', 'articul', 'articulaire',
    'tendon', 'ligament', 'muscle', 'musculaire', 'cartilage',
    'synovial', 'bursite', 'enthese', 'enthèse',

    # Peau et tissus mous
    'peau', 'cutane', 'cutané', 'sous-cutan', 'sous-cutané', 'dermato',
    'tissu', 'mou', 'graisse', 'adipeux', 'lipome',

    # Termes médicaux généraux pertinents
    'biopsie', 'ponction', 'infiltration', 'injection', 'arthro',
    'tumeur', 'tumoral', 'cancer', 'metastase', 'métastase', 'nodule', 'kyste', 'masse',
    'fracture', 'entorse', 'luxation', 'rupture', 'dechirure', 'déchirure',
    'hernie', 'discale', 'stenose', 'sténose', 'arthrose', 'arthrite',
    'inflammation', 'infection', 'abces', 'abcès',
    'corps entier', 'total body', 'body scan',
]

def contains_exam_type(exam_text):
    """Vérifie si l'intitulé contient un type d'examen (IRM, Scanner, etc.)"""
    if pd.isna(exam_text) or not str(exam_text).strip():
        return False

    exam_lower = str(exam_text).lower()

    for type_exam in TYPES_EXAMENS:
        if type_exam in exam_lower:
            return True

    return False

def contains_anatomical_term(exam_text):
    """Vérifie si l'intitulé contient au moins un terme anatomique"""
    if pd.isna(exam_text) or not str(exam_text).strip():
        return False

    exam_lower = str(exam_text).lower()

    for terme in TERMES_ANATOMIQUES:
        if terme in exam_lower:
            return True

    return False

def is_valid_exam(exam_text):
    """Vérifie si l'intitulé est un examen valide"""
    if pd.isna(exam_text) or not str(exam_text).strip():
        return False

    exam_lower = str(exam_text).lower().strip()

    # Mots/patterns qui rendent l'intitulé invalide (clairement non médicaux)
    invalid_patterns = [
        # Temporel
        'soir', 'matin', 'apres-midi', 'après-midi', 'demain', 'aujourd',
        'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche',
        'janvier', 'fevrier', 'février', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'aout', 'août', 'septembre', 'octobre', 'novembre', 'decembre', 'décembre',
        # Salutations et phrases non médicales
        'bonjour', 'bonsoir', 'salut', 'merci', 'svp', 'il vous plait',
        # Références personnelles
        'ma mere', 'ma mère', 'mon pere', 'mon père', 'ma femme', 'mon mari',
        'mon fils', 'ma fille', 'mon enfant',
        # Autres
        'je veux', 'je voudrais', 'ai besoin', 'aimerais',
    ]

    # Si contient un pattern invalide → INCOMPRIS
    for pattern in invalid_patterns:
        if pattern in exam_lower:
            return False

    # Valide si contient au moins un type d'examen OU un terme anatomique
    return contains_exam_type(exam_text) or contains_anatomical_term(exam_text)

def categorize_exam(exam_text, apply_filter=True):
    """Catégorise un examen"""
    if pd.isna(exam_text) or not str(exam_text).strip():
        return 'INCONNU'

    exam_lower = str(exam_text).lower().strip()

    # Si l'examen n'est pas valide (type d'examen sans terme anatomique, ou rien de médical)
    # Seulement pour les problèmes (not_found, not_authorized), pas pour les rendez-vous créés
    if apply_filter and not is_valid_exam(exam_text):
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

def clean_exam_name(exam_str):
    """Nettoie un nom d'examen pour l'affichage : supprime la ponctuation"""
    if pd.isna(exam_str):
        return ''

    # Supprimer la ponctuation (virgules, points, points-virgules)
    cleaned = str(exam_str).replace(',', '').replace('.', '').replace(';', '')

    return cleaned.strip()

def is_exam_too_vague(exam_str):
    """Vérifie si un intitulé d'examen est trop vague (un seul mot significatif)"""
    if pd.isna(exam_str) or not str(exam_str).strip():
        return True

    text = str(exam_str).lower().strip()

    # Supprimer la ponctuation
    text = text.replace(',', ' ').replace('.', ' ').replace(';', ' ')

    # Phrases à retirer complètement (ordre important: plus longues d'abord)
    phrases_to_remove = [
        'prendre un rendez-vous',
        'prendre rendez-vous',
        'un rendez-vous de',
        'un rendez-vous pour',
        'rendez-vous pour',
        'rendez-vous de',
        'rendez-vous',
        'rdv pour',
        'rdv de',
        'rdv',
    ]

    for phrase in phrases_to_remove:
        text = text.replace(phrase, ' ')

    # Mots non significatifs à retirer
    stop_words = ['un', 'une', 'le', 'la', 'les', "l'", 'de', 'du', 'des', 'pour', 'avec', 'et', 'au', 'aux', 'en', 'sur', 'a', 'à']

    # Séparer en mots et filtrer
    words = text.split()
    significant_words = [w for w in words if w not in stop_words and len(w) > 1]

    # Si un seul mot significatif ou moins, c'est trop vague
    return len(significant_words) <= 1

def normalize_exam_name(exam_str):
    """Normalise un nom d'examen : minuscules + sans accents + sans ponctuation"""
    if pd.isna(exam_str):
        return ''

    # Convertir en minuscules
    normalized = str(exam_str).lower()

    # Supprimer les accents avec unicodedata (méthode standard)
    nfd = unicodedata.normalize('NFD', normalized)
    without_accents = ''.join(char for char in nfd if unicodedata.category(char) != 'Mn')

    # Supprimer la ponctuation (virgules, points, points-virgules)
    without_punctuation = without_accents.replace(',', '').replace('.', '').replace(';', '')

    return without_punctuation.strip()

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
# PAS DE FILTRE pour les rendez-vous créés - toutes les lignes sont valides
for idx, row in df_appointment_created.iterrows():
    call_id = str(row.get('Id', ''))
    duration = row.get('Durée', 0)  # Durée directe du fichier appointment_created

    # Prendre le premier examen pour déterminer la catégorie de l'appel
    exams = parse_exam_identified(row['Examen Identifié'])
    first_exam = exams[0] if exams else ''
    category = categorize_exam(first_exam, apply_filter=False)

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

        # Prendre le nom original le plus fréquent (pour l'affichage) et le nettoyer
        original_name = clean_exam_name(df_exam_group['Examen Identifié'].mode()[0])

        # Ignorer les intitulés trop vagues pour l'affichage
        if is_exam_too_vague(original_name):
            continue

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
    # Pas de catégorie INTITULES INCOMPRIS pour les rendez-vous créés
    if category == 'INTITULES INCOMPRIS':
        continue

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

        original_name = clean_exam_name(df_exam_group['Examen Identifié'].mode()[0])
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
# Compter les examens affichés dans les tableaux (hors INTITULES INCOMPRIS)
unique_exams = sum(len(stat['exams']) for stat in problems_stats if stat['category'] != 'INTITULES INCOMPRIS')
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
