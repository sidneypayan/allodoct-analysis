#!/usr/bin/env python3
"""
Script pour analyser le fichier Excel et comprendre les tags
"""

import pandas as pd

# Chemin du fichier
file_path = 'c:/Users/Sidney/Downloads/Allodoct_Export-20260112_20260114.xls'

print("Chargement du fichier Excel...")
df = pd.read_excel(file_path)

print(f"\nFichier charge: {len(df)} lignes au total")
print(f"Colonnes disponibles: {list(df.columns)}")

# Analyser la colonne Tag
print("\n" + "="*60)
print("ANALYSE DE LA COLONNE 'Tag'")
print("="*60)

if 'Tag' in df.columns:
    tag_counts = df['Tag'].value_counts()
    print(f"\nNombre de tags differents: {len(tag_counts)}")
    print(f"\nDetail de tous les tags:")
    for tag, count in tag_counts.items():
        print(f"  {repr(tag):45s} : {count:5d} lignes")

    # Analyser spécifiquement appointment_created
    print("\n" + "="*60)
    print("ANALYSE DETAILLEE: 'appointment_created'")
    print("="*60)

    df_appt = df[df['Tag'] == 'appointment_created']
    print(f"\nLignes avec Tag == 'appointment_created': {len(df_appt)}")

    # Vérifier s'il y a des variantes
    print("\nRecherche de variantes du tag 'appointment_created':")
    for tag in tag_counts.index:
        if 'appointment' in str(tag).lower() and 'creat' in str(tag).lower():
            print(f"  - {repr(tag)}: {tag_counts[tag]} lignes")

    # Chercher tous les tags contenant "appointment"
    print("\nTous les tags contenant 'appointment':")
    for tag in tag_counts.index:
        if 'appointment' in str(tag).lower():
            print(f"  - {repr(tag)}: {tag_counts[tag]} lignes")

    # Analyser la colonne Statut si elle existe
    if 'Statut' in df.columns:
        print("\n" + "="*60)
        print("ANALYSE DE LA COLONNE 'Statut'")
        print("="*60)
        statut_counts = df['Statut'].value_counts()
        print(f"\nStatuts trouves:")
        for statut, count in statut_counts.items():
            print(f"  {repr(statut):30s} : {count:5d} lignes")

        # Croiser Tag et Statut pour appointment_created
        print("\nStatuts pour les lignes avec Tag = 'appointment_created':")
        appt_statuts = df_appt['Statut'].value_counts()
        for statut, count in appt_statuts.items():
            print(f"  {repr(statut):30s} : {count:5d} lignes")

else:
    print("ATTENTION: La colonne 'Tag' n'existe pas dans le fichier !")

print("\n" + "="*60)
print("Analyse terminee !")
print("="*60)
