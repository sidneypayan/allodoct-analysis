import * as XLSX from 'xlsx'
import { AnalysisResult, CategoryStats, Exam } from './types'

// Configuration des tags avec leurs labels pour l'import
const TAG_SHEET_CONFIG = {
  exam_not_found: { prefix: 'NF', statsSheet: 'Stats Non trouvés' },
  exam_not_authorized: { prefix: 'NA', statsSheet: 'Stats Non autorisés' },
  availabilies_provided: { prefix: 'DP', statsSheet: 'Stats Dispo proposées' },
  exam_found: { prefix: 'EF', statsSheet: 'Stats Exam trouvé' },
  multiple_appointments_cancelled: { prefix: 'AC', statsSheet: 'Stats RDV annulés' },
  no_availabilities_found: { prefix: 'PD', statsSheet: 'Stats Pas de dispo' }
} as const

type TagKey = keyof typeof TAG_SHEET_CONFIG

export async function parseExcelToAnalysisResult(file: File): Promise<AnalysisResult> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })

    validateExcelStructure(workbook)

    // Initialiser les statistiques vides pour chaque tag
    const statsByTag: Record<TagKey, CategoryStats[]> = {
      exam_not_found: [],
      exam_not_authorized: [],
      availabilies_provided: [],
      exam_found: [],
      multiple_appointments_cancelled: [],
      no_availabilities_found: []
    }

    let appointments_statistics: CategoryStats[] = []

    // Essayer d'abord la nouvelle structure (avec tags séparés)
    const hasNewTagStructure = Object.values(TAG_SHEET_CONFIG).some(
      config => workbook.Sheets[config.statsSheet]
    )

    if (hasNewTagStructure) {
      // Nouvelle structure avec tags séparés
      for (const [tagKey, config] of Object.entries(TAG_SHEET_CONFIG)) {
        if (workbook.Sheets[config.statsSheet]) {
          statsByTag[tagKey as TagKey] = parseStatistiquesSheet(workbook, config.statsSheet)

          // Parser les feuilles de catégories avec préfixes
          for (const stat of statsByTag[tagKey as TagKey]) {
            const sheetName = `${config.prefix}_${stat.category}`.substring(0, 31)
            if (workbook.Sheets[sheetName]) {
              stat.exams = parseCategorySheet(workbook, sheetName, false)
            }
          }
        }
      }

      // Parser les rendez-vous
      if (workbook.Sheets['Stats Rendez-vous']) {
        appointments_statistics = parseStatistiquesSheet(workbook, 'Stats Rendez-vous')
        for (const stat of appointments_statistics) {
          const sheetName = `RDV_${stat.category}`.substring(0, 31)
          if (workbook.Sheets[sheetName]) {
            stat.exams = parseCategorySheet(workbook, sheetName, true)
          }
        }
      }
    } else if (workbook.Sheets['Stats Problèmes']) {
      // Ancienne structure avec Stats Problèmes combinés
      const combined_problems = parseStatistiquesSheet(workbook, 'Stats Problèmes')

      // Mettre tout dans exam_not_found par défaut
      statsByTag.exam_not_found = combined_problems

      for (const stat of statsByTag.exam_not_found) {
        const sheetName = `P_${stat.category}`.substring(0, 31)
        if (workbook.Sheets[sheetName]) {
          stat.exams = parseCategorySheet(workbook, sheetName, false)
        }
      }

      if (workbook.Sheets['Stats Rendez-vous']) {
        appointments_statistics = parseStatistiquesSheet(workbook, 'Stats Rendez-vous')
        for (const stat of appointments_statistics) {
          const sheetName = `RDV_${stat.category}`.substring(0, 31)
          if (workbook.Sheets[sheetName]) {
            stat.exams = parseCategorySheet(workbook, sheetName, true)
          }
        }
      }
    } else if (workbook.Sheets['Statistiques']) {
      // Très ancienne structure
      statsByTag.exam_not_found = parseStatistiquesSheet(workbook, 'Statistiques')

      for (const stat of statsByTag.exam_not_found) {
        const sheetName = stat.category.substring(0, 31)
        if (workbook.Sheets[sheetName]) {
          stat.exams = parseCategorySheet(workbook, sheetName, false)
        }
      }
    }

    // Lire le summary depuis la feuille Summary si elle existe
    const summary = workbook.Sheets['Summary']
      ? parseSummarySheet(workbook)
      : reconstructSummary(statsByTag, appointments_statistics)

    // Convertir le fichier en base64
    const excel_file_base64 = await fileToBase64(file)

    return {
      summary,
      exam_not_found_statistics: statsByTag.exam_not_found,
      exam_not_authorized_statistics: statsByTag.exam_not_authorized,
      availabilies_provided_statistics: statsByTag.availabilies_provided,
      exam_found_statistics: statsByTag.exam_found,
      multiple_appointments_cancelled_statistics: statsByTag.multiple_appointments_cancelled,
      no_availabilities_found_statistics: statsByTag.no_availabilities_found,
      appointments_statistics,
      excel_file_base64
    }
  } catch (err: any) {
    if (err.message.includes('Structure invalide') || err.message.includes('feuille')) {
      throw err
    }
    throw new Error('Erreur lors de la lecture du fichier. Le fichier est peut-être corrompu.')
  }
}

function validateExcelStructure(workbook: XLSX.WorkBook): void {
  // Vérifier la structure (nouvelle avec tags, ancienne séparée, ou très ancienne)
  const hasNewTagStructure = Object.values(TAG_SHEET_CONFIG).some(
    config => workbook.Sheets[config.statsSheet]
  )
  const hasOldSplitStructure = workbook.Sheets['Stats Problèmes'] && workbook.Sheets['Stats Rendez-vous']
  const hasVeryOldStructure = workbook.Sheets['Statistiques']

  if (!hasNewTagStructure && !hasOldSplitStructure && !hasVeryOldStructure) {
    throw new Error("Structure de fichier non reconnue. Fichier d'analyse invalide.")
  }

  // Vérifier les colonnes selon la structure
  let sheetName = ''
  if (hasNewTagStructure) {
    // Trouver la première feuille de stats disponible
    for (const config of Object.values(TAG_SHEET_CONFIG)) {
      if (workbook.Sheets[config.statsSheet]) {
        sheetName = config.statsSheet
        break
      }
    }
  } else if (hasOldSplitStructure) {
    sheetName = 'Stats Problèmes'
  } else {
    sheetName = 'Statistiques'
  }

  if (sheetName) {
    const statsSheet = workbook.Sheets[sheetName]
    const statsData = XLSX.utils.sheet_to_json(statsSheet)

    if (statsData.length === 0) {
      throw new Error(`La feuille '${sheetName}' est vide`)
    }

    const firstRow: any = statsData[0]
    const requiredColumns = ['Catégorie', 'Total']

    for (const col of requiredColumns) {
      if (!(col in firstRow)) {
        throw new Error(`Structure invalide: colonne '${col}' manquante dans '${sheetName}'`)
      }
    }
  }
}

function parseStatistiquesSheet(workbook: XLSX.WorkBook, sheetName: string): CategoryStats[] {
  const worksheet = workbook.Sheets[sheetName]
  if (!worksheet) return []

  const rows: any[] = XLSX.utils.sheet_to_json(worksheet)

  return rows.map(row => ({
    category: row['Catégorie'],
    total: row['Total'],
    exam_not_found: row['Non trouvés'] || 0,
    exam_not_authorized: row['Non autorisés'] || 0,
    total_duration: row['Durée totale (s)'] || row['Durée (secondes)'] || 0,
    average_duration: row['Durée moyenne (s)'] || 0,
    all_exams: '',
    exams: []
  }))
}

function parseCategorySheet(workbook: XLSX.WorkBook, sheetName: string, isAppointments: boolean): Exam[] {
  const worksheet = workbook.Sheets[sheetName]
  if (!worksheet) {
    return []
  }

  const rows: any[] = XLSX.utils.sheet_to_json(worksheet)

  return rows.map(row => ({
    name: row['Examen'] || '',
    total: row['Total'] || 0,
    not_found: row['Non trouvés'] || 0,
    not_authorized: row['Non autorisés'] || 0,
    duration: row['Durée totale (s)'] || row['Durée (secondes)'] || 0,
    average_duration: isAppointments ? (row['Durée moyenne (s)'] || 0) : undefined,
    ids: []
  }))
}

function parseSummarySheet(workbook: XLSX.WorkBook) {
  const worksheet = workbook.Sheets['Summary']
  const rows: any[] = XLSX.utils.sheet_to_json(worksheet)

  const summaryMap: Record<string, number> = {}
  rows.forEach(row => {
    if (row['Valeur'] !== '' && row['Valeur'] !== undefined) {
      summaryMap[row['Métrique']] = row['Valeur']
    }
  })

  return {
    total_calls: summaryMap['Appels transférés/décrochés (total)'] || summaryMap['Appels transférés/décrochés'] || summaryMap['Appels transférés'] || 0,
    unique_exams: summaryMap['Examens distincts'] || 0,
    categories_found: summaryMap['Catégories trouvées'] || 0,
    bugs_detected: summaryMap['Intitulés d\'examens incohérents'] || summaryMap['Intitulés incompris'] || 0,
    total_duration: summaryMap['Durée totale conversations (secondes)'] || 0,
    appointments_created: summaryMap['Rendez-vous créés'] || 0,
    exam_not_found_count: summaryMap['Non trouvés'] || 0,
    exam_not_authorized_count: summaryMap['Non autorisés'] || 0,
    availabilies_provided_count: summaryMap['Dispo proposées'] || 0,
    exam_found_count: summaryMap['Exam trouvé'] || 0,
    multiple_appointments_cancelled_count: summaryMap['RDV annulés'] || 0,
    no_availabilities_found_count: summaryMap['Pas de dispo'] || 0
  }
}

function reconstructSummary(
  statsByTag: Record<TagKey, CategoryStats[]>,
  appointments_statistics: CategoryStats[]
) {
  const countTotal = (stats: CategoryStats[]) => stats.reduce((sum, stat) => sum + stat.total, 0)
  const countExams = (stats: CategoryStats[]) => stats.reduce((sum, stat) => sum + stat.exams.length, 0)
  const countCategories = (stats: CategoryStats[]) => stats.length

  const total_calls = Object.values(statsByTag).reduce((sum, stats) => sum + countTotal(stats), 0)
  const unique_exams = Object.values(statsByTag).reduce((sum, stats) => sum + countExams(stats), 0)
  const categories_found = Object.values(statsByTag).reduce((sum, stats) => sum + countCategories(stats), 0)

  const bugsDetected = Object.values(statsByTag).reduce((sum, stats) => {
    const bugsCategory = stats.find(s => s.category === 'INTITULES INCOHERENTS')
    return sum + (bugsCategory ? bugsCategory.total : 0)
  }, 0)

  const total_duration = appointments_statistics.reduce((sum, stat) => sum + (stat.total_duration || 0), 0)
  const appointments_created = appointments_statistics.reduce((sum, stat) => sum + stat.total, 0)

  return {
    total_calls,
    unique_exams,
    categories_found,
    bugs_detected: bugsDetected,
    total_duration,
    appointments_created,
    exam_not_found_count: countTotal(statsByTag.exam_not_found),
    exam_not_authorized_count: countTotal(statsByTag.exam_not_authorized),
    availabilies_provided_count: countTotal(statsByTag.availabilies_provided),
    exam_found_count: countTotal(statsByTag.exam_found),
    multiple_appointments_cancelled_count: countTotal(statsByTag.multiple_appointments_cancelled),
    no_availabilities_found_count: countTotal(statsByTag.no_availabilities_found)
  }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'))
    reader.readAsDataURL(file)
  })
}
