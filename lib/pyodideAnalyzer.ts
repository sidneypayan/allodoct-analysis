import { PyodideInterface } from './usePyodide'
import { generateExcelFile } from './excelGenerator'
import { AnalysisResult } from './types'

export async function analyzeWithPyodide(
  pyodide: PyodideInterface,
  dataFile: File
): Promise<AnalysisResult> {
  try {
    console.log('📊 Début de l\'analyse avec Pyodide...')

    // Charger le fichier unique dans le système de fichiers virtuel de Pyodide
    const dataBuffer = await dataFile.arrayBuffer()
    pyodide.FS.writeFile('data.xlsx', new Uint8Array(dataBuffer))

    console.log('✅ Fichier chargé dans Pyodide')

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

# Liste consolidée de tous les termes médicaux/anatomiques valides
# Extraits depuis reference_exams.csv - Un intitulé est VALIDE s'il contient AU MOINS UN de ces termes
TERMES_MEDICAUX_VALIDES = [
    # Types d'examens
    'irm', 'scanner', 'tdm', 'cone beam', 'conebeam', 'radio', 'radiographie', 'echographie', 'échographie',
    'doppler', 'mammographie', 'mammo', 'eos', 'ostéodensitométrie', 'densitométrie',
    'arthroscanner', 'angioscanner', 'coroscanner', 'dentascanner',

    # Termes anatomiques et médicaux extraits de reference_exams.csv
    'abdo', 'abdo-pelvienne', 'abdomen', 'abdominal', 'abdominale', 'abdomino', 'abdomino-pelvien',
    'abdomino-pelvienne', 'abdomino-rénale', 'achille', 'acide', 'acromiale', 'acromio',
    'acromio-claviculaire', 'adducteurs', 'aisselle', 'anal', 'angio-irm', 'anus', 'aorte', 'aortique',
    'artériel', 'artérielle', 'artérioveineux', 'artères', 'arthrographie', 'articulaire', 'articulation',
    'articulations', 'atm', 'auditifs', 'avant-bras', 'axillaire', 'bassin', 'biceps', 'biliaire',
    'biliaires', 'biopsie', 'brachial', 'bras', 'bébé', 'cai', 'calcaneum', 'calcanéums', 'calcique',
    'canal', 'cancer', 'cardiaque', 'cardiologie', 'carotide', 'carotides', 'cavum', 'cervical',
    'cervicale', 'cervicales', 'cervico', 'cervico-dorsal', 'cervico-dorso-lombaire',
    'cervico-encéphalique', 'cervico-lombaire', 'cervico-thoracique', 'cheville', 'chevilles',
    'chirurgie', 'cholangiographie', 'cholesteatome', 'cimentoplastie', 'claviculaire', 'clavicule',
    'coccygienne', 'coccyx', 'cochléaire', 'coeur', 'col', 'colon', 'colonne', 'coloscanner',
    'coloscopie', 'conduits', 'coronaires', 'costal', 'costale', 'cou', 'coude', 'coudes', 'creux',
    'croissance', 'cryothérapie', 'crâne', 'crânienne', 'cubitus', 'cuisse', 'cystographie',
    'cytoponction', 'cérébral', 'cérébrale', 'côtes', 'dacryoscanner', 'datation', 'densitométrie',
    'dentaire', 'dentaires', 'dents', 'diffusion', 'disque', 'doigt', 'dorsal', 'dorsale', 'dorsaux',
    'dorso', 'dorso-lombaire', 'dorsolombaire', 'dos', 'duodénal', 'dynamique', 'déféco-irm',
    'défécographie', 'dépistage', 'ecg', 'echocardiographie', 'effort', 'electrocardiogramme',
    'electromyogramme', 'encéphale', 'encéphalique', 'endométriose', 'endométrioses', 'endovaginale',
    'entero', 'entero-irm', 'entier', 'entéro-scanner', 'epaule', 'estomac', 'face', 'facial',
    'faciale', 'femme', 'ferrique', 'fesse', 'fessier', 'fessiers', 'fessière', 'fibroscan',
    'fistule', 'fistulographie', 'foie', 'fontanelles', 'foraminale', 'fosse', 'fossettes', 'frontale',
    'fullspine', 'féminin', 'fémur', 'galactographie', 'ganglion', 'gastro', 'gastrographine',
    'genou', 'genoux', 'glande', 'glandes', 'glutéale', 'goniométrie', 'gonométrie', 'gorge', 'greffon',
    'gril', 'grill', 'gros', 'grossesse', 'grêle', 'gémellaire', 'hanche', 'hanches', 'hemochromatose',
    'holorachis', 'homme', 'huber', 'humerus', 'humérus', 'hyaluronique', 'hydrosolubles', 'hypophysaire',
    'hypophyse', 'hysterosonographie', 'hystérographie', 'hystérosalpingographie', 'hémi-squelette',
    'hépatique', 'hépatobiliaire', 'iliaque', 'iliaques', 'implant', 'implantation', 'implants',
    'impulsionnelle', 'infertilité', 'infiltration', 'inférieur', 'inférieurs', 'inguinal', 'inguinale',
    'injection', 'internes', 'intestin', 'intra', 'intra-articulaire', 'intraveineuse', 'irmpelvien',
    'ischio', 'ischio-jambiers', 'isocinétisme', 'ivg', 'jambe', 'joue', 'kiné', 'kyste', 'l4', 'l5',
    'lacrymales', 'laser', 'lavement', 'ligamentaire', 'lipome', 'lombaire', 'lombaires', 'lèvre',
    'machoire', 'macrobiopsie', 'main', 'mains', 'mamelon', 'mammaire', 'mandibulaire', 'mandibulaires',
    'mapa', 'masculin', 'massif', 'maxillaire', 'membre', 'membres', 'menton', 'mesure', 'moelle',
    'molles', 'mollet', 'monitorage', 'morphologique', 'mou', 'mous', 'moyen', 'moyenne', 'muscle',
    'muscles', 'musculaire', 'myocardique', 'médiastinale', 'médullaire', 'nerfs', 'nez', 'nuque',
    'obstétrique', 'occipitale', 'oculaire', 'oesogastroduodénal', 'oil', 'omoplate', 'ongles',
    'ophtalmologie', 'opn', 'orbites', 'oreille', 'orl', 'orteil', 'orteils', 'orthodontique',
    'orthopantomogramme', 'os', 'osophagien', 'osseuse', 'osseux', 'osthéopathie', 'ostéo-articulaire',
    'ovaires', 'ovarienne', 'ovulation', 'oxygénothérapie', 'pancréas', 'pancréatique', 'pangonogramme',
    'pangonométrie', 'panoramique', 'paramètres', 'parathyroïde', 'pariétale', 'paroi', 'parotide',
    'parotidienne', 'parties', 'peau', 'pelvi', 'pelvien', 'pelvienne', 'pelvimétrie', 'pelvis',
    'penis', 'pharyngo', 'pharyngographie', 'pharyngé', 'pharynx', 'pied', 'pieds', 'plaquettes',
    'plasma', 'plexus', 'pneumo', 'pneumothorax', 'podologique', 'podométrie', 'poignet', 'poignets',
    'poitrine', 'ponction', 'postural', 'postérieure', 'pouce', 'poumons', 'pression', 'profil',
    'propres', 'prostate', 'prostatique', 'prp', 'prélévement', 'préparation', 'pubienne', 'pulmonaire',
    'pylore', 'pédiatrique', 'pénis', 'périnéale', 'péroné', 'rachidiens', 'rachis', 'radiculographie',
    'rate', 'rectum', 'rein', 'reins', 'releveur', 'renal', 'rhino', 'rhumatologique', 'riche',
    'rochers', 'région', 'rénal', 'rénale', 'rénales', 'réno', 'rétrograde', 'rééducation',
    'saccoradiculographie', 'sacro', 'sacro-coccygienens', 'sacrum', 'sacré', 'salivaires', 'scoliose',
    'score', 'scrotal', 'scrotale', 'scrotum', 'sein', 'seins', 'semaines', 'sialographie', 'sinus',
    'sinusien', 'sous-maxillaire', 'spirométrie', 'squelette', 'statique', 'sternum', 'stress',
    'stérilet', 'stéréotaxique', 'supra', 'supra-aortiques', 'supro', 'supérieur', 'supérieurs',
    'surcharge', 'surrenales', 'surrenalien', 'surrénales', 'sus', 'système', 'sénologique',
    'sésamoïdes', 'talon', 'tap', 'tavi', 'telécrâne', 'temporal', 'temporo', 'temporo-mandibulaire',
    'temporo-mandibulaires', 'tendineux', 'tendinopathie', 'tendon', 'test', 'testiculaire', 'testicules',
    'thoracique', 'thoraco', 'thoraco-abdominal', 'thoraco-abdomino-pelvien', 'thoraco-pelvienne',
    'thorax', 'thyroïde', 'thyroïdien', 'thyroïdienne', 'tibia', 'tissu', 'tissus', 'togd', 'totale',
    'totalité', 'tractions', 'trans', 'transcatheter', 'transcrânien', 'transfontanellaire', 'transit',
    'trapèze', 'triceps', 'trimestre', 'trituration', 'trochanter', 'trompes', 'tronc', 'troncs', 'tsa',
    'tuméfaction', 'télé', 'télécrane', 'télécrâne', 'télérachis', 'téléradiographie', 'tête', 'uiv',
    'urinaire', 'urinaires', 'urographie', 'uroscanner', 'utérus', 'vaisseaux', 'valgus', 'valve',
    'varus', 'vdmi', 'veineux', 'ventre', 'verge', 'vertébral', 'vertébrale', 'vesico', 'vessie',
    'virtuelle', 'visage', 'voies', 'végétations', 'vésicale', 'vésiculaire', 'vésicule', 'yeux',
    'âge', 'élastographie', 'élastométrie', 'épaule', 'épaules', 'épidurale', 'épreuve', 'étude',
]

def is_valid_exam(exam_text):
    """
    Vérifie si l'intitulé est un examen valide.

    REGLE SIMPLE : Un intitulé est VALIDE s'il contient AU MOINS UN terme médical/anatomique
    de la liste TERMES_MEDICAUX_VALIDES.

    Sinon → INTITULES INCOHERENTS
    """
    if pd.isna(exam_text) or not str(exam_text).strip():
        return False

    exam_lower = str(exam_text).lower().strip()

    # Vérifier si l'intitulé contient au moins un terme médical valide
    for terme in TERMES_MEDICAUX_VALIDES:
        if terme in exam_lower:
            return True

    return False

def categorize_exam(exam_text, apply_filter=True):
    """Catégorise un examen"""
    if pd.isna(exam_text) or not str(exam_text).strip():
        return 'INCONNU'

    exam_lower = str(exam_text).lower().strip()

    # Si l'examen n'est pas valide (type d'examen sans terme anatomique, ou rien de médical)
    # Seulement pour les problèmes (not_found, not_authorized), pas pour les rendez-vous créés
    if apply_filter and not is_valid_exam(exam_text):
        return 'INTITULES INCOHERENTS'

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

# Charger le fichier unique
print("📊 Chargement des données depuis le fichier unique...")
import os

# Créer des DataFrames vides avec les colonnes nécessaires
empty_columns = ['Id', 'Id Externe', 'Statut', 'Tag', 'Examen Identifié', 'Durée']

# Charger le fichier data.xlsx
if os.path.exists('data.xlsx'):
    df_all_data = pd.read_excel('data.xlsx')
    print(f"✅ Fichier chargé: {len(df_all_data)} lignes au total")

    # Filtrer par Tag pour créer les 3 dataframes
    # Pour not_found et not_authorized: on filtre aussi par Statut (Transféré ou Décroché)
    df_not_found = df_all_data[
        (df_all_data['Tag'] == 'exam_not_found') &
        (df_all_data['Statut'].isin(['Transféré', 'Décroché']))
    ].copy()

    df_not_authorized = df_all_data[
        (df_all_data['Tag'] == 'exam_not_authorized') &
        (df_all_data['Statut'].isin(['Transféré', 'Décroché']))
    ].copy()

    # Pour appointment_created: on prend TOUTES les lignes (pas de filtre Statut)
    df_appointment_created = df_all_data[
        df_all_data['Tag'] == 'appointment_created'
    ].copy()

else:
    print("⚠️ Fichier data.xlsx absent - création de DataFrames vides")
    df_not_found = pd.DataFrame(columns=empty_columns)
    df_not_authorized = pd.DataFrame(columns=empty_columns)
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
valid_categories = list(CATEGORIES.keys()) + ['INTITULES INCOHERENTS', 'AUTRE', 'INCONNU']

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
    # Pas de catégorie INTITULES INCOHERENTS pour les rendez-vous créés
    if category == 'INTITULES INCOHERENTS':
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
# Compter les examens affichés dans les tableaux (hors INTITULES INCOHERENTS)
unique_exams = sum(len(stat['exams']) for stat in problems_stats if stat['category'] != 'INTITULES INCOHERENTS')
bugs_detected = len(df_detailed_problems[df_detailed_problems['Catégorie'] == 'INTITULES INCOHERENTS'])
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
