#!/usr/bin/env python3
"""
Script pour extraire tous les termes médicaux depuis reference_exams.csv
et créer une liste de termes valides pour la catégorisation.
"""

import pandas as pd
import re
from collections import Counter

# Lire le fichier CSV
df = pd.read_csv('public/data/reference_exams.csv')

# Stocker tous les termes
all_terms = set()

# Mots à exclure (mots vides, prépositions, articles, etc.)
STOPWORDS = {
    'de', 'du', 'des', 'le', 'la', 'les', 'un', 'une',
    'et', 'ou', 'pour', 'avec', 'sans', 'sous', 'sur',
    'dans', 'en', 'par', 'à', 'au', 'aux',
    'd', 'l', '2', '1', '3',
    'bilatérale', 'unilatérale', 'bilateral', 'unilateral',
    'droit', 'droite', 'gauche', 'deux',
    'premier', 'première', 'deuxième', 'troisième',
    'bilan', 'séance', 'consultation', 'contrôle',
    'vue', 'soins', 'pose', 'suivi',
}

# Extraire les termes depuis la colonne "Examen"
for exam in df['Examen'].dropna():
    exam_str = str(exam).lower()

    # Remplacer les caractères spéciaux par des espaces
    exam_str = re.sub(r'[^\w\sàâäéèêëïîôöùûüÿçœæ-]', ' ', exam_str)

    # Séparer les mots
    words = exam_str.split()

    # Ajouter chaque mot non vide
    for word in words:
        word = word.strip('-').strip()
        if word and word not in STOPWORDS and len(word) > 1:
            all_terms.add(word)

# Trier alphabétiquement
sorted_terms = sorted(all_terms)

print(f"Nombre total de termes uniques extraits : {len(sorted_terms)}")
print("\n=== APERÇU DES TERMES EXTRAITS ===\n")
print(", ".join(sorted_terms[:50]))
print("\n...")

# Sauvegarder dans un fichier
output_file = 'scripts/medical_terms_extracted.txt'
with open(output_file, 'w', encoding='utf-8') as f:
    for term in sorted_terms:
        f.write(f"{term}\n")

print(f"\nTermes sauvegardes dans : {output_file}")

# Extraire aussi les types d'examens uniques
exam_types = df['Type Examen'].dropna().unique()
print(f"\n=== TYPES D'EXAMENS ({len(exam_types)}) ===\n")
for exam_type in sorted(exam_types):
    print(f"  - {exam_type}")
