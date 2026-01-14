import * as XLSX from 'xlsx'
import { AnalysisResult, CategoryStats, Exam } from './types'

export async function parseExcelToAnalysisResult(file: File): Promise<AnalysisResult> {
  try {
    // Lire le fichier Excel
    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })

    // Validation de la structure
    validateExcelStructure(workbook)

    // Parser les feuilles Statistiques (ancienne structure) ou Stats Problèmes/Stats Rendez-vous (nouvelle structure)
    let problems_statistics: CategoryStats[] = []
    let appointments_statistics: CategoryStats[] = []

    if (workbook.Sheets['Stats Problèmes']) {
      // Nouvelle structure avec séparation
      problems_statistics = parseStatistiquesSheet(workbook, 'Stats Problèmes')
      appointments_statistics = parseStatistiquesSheet(workbook, 'Stats Rendez-vous')

      // Parser les feuilles de catégories avec préfixes
      for (const stat of problems_statistics) {
        const sheetName = `P_${stat.category}`.substring(0, 31)
        if (workbook.Sheets[sheetName]) {
          stat.exams = parseCategorySheet(workbook, sheetName, false)
        }
      }

      for (const stat of appointments_statistics) {
        const sheetName = `RDV_${stat.category}`.substring(0, 31)
        if (workbook.Sheets[sheetName]) {
          stat.exams = parseCategorySheet(workbook, sheetName, true)
        }
      }
    } else if (workbook.Sheets['Statistiques']) {
      // Ancienne structure - tout va dans problems_statistics
      problems_statistics = parseStatistiquesSheet(workbook, 'Statistiques')

      for (const stat of problems_statistics) {
        const sheetName = stat.category.substring(0, 31)
        if (workbook.Sheets[sheetName]) {
          stat.exams = parseCategorySheet(workbook, sheetName, false)
        }
      }
    }

    // Lire le summary depuis la feuille Summary si elle existe, sinon le reconstruire
    const summary = workbook.Sheets['Summary']
      ? parseSummarySheet(workbook)
      : reconstructSummary(problems_statistics, appointments_statistics)

    // Convertir le fichier en base64
    const excel_file_base64 = await fileToBase64(file)

    return {
      summary,
      problems_statistics,
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
  // Vérifier la structure (nouvelle ou ancienne)
  const hasNewStructure = workbook.Sheets['Stats Problèmes'] && workbook.Sheets['Stats Rendez-vous']
  const hasOldStructure = workbook.Sheets['Statistiques']

  if (!hasNewStructure && !hasOldStructure) {
    throw new Error("Le fichier ne contient ni 'Stats Problèmes' ni 'Statistiques'")
  }

  // Vérifier les colonnes selon la structure
  const sheetName = hasNewStructure ? 'Stats Problèmes' : 'Statistiques'
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
    all_exams: '', // Sera reconstruit si nécessaire
    exams: [] // Sera rempli par parseCategorySheet
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
    ids: [] // Les IDs ne sont pas stockés dans Excel
  }))
}

function parseSummarySheet(workbook: XLSX.WorkBook) {
  const worksheet = workbook.Sheets['Summary']
  const rows: any[] = XLSX.utils.sheet_to_json(worksheet)

  // Créer un objet clé-valeur à partir des lignes
  const summaryMap: Record<string, number> = {}
  rows.forEach(row => {
    summaryMap[row['Métrique']] = row['Valeur']
  })

  return {
    total_calls: summaryMap['Appels transférés/décrochés'] || summaryMap['Appels transférés'] || 0,
    unique_exams: summaryMap['Examens distincts'] || 0,
    categories_found: summaryMap['Catégories trouvées'] || 0,
    bugs_detected: summaryMap['Intitulés d\'examens incohérents'] || summaryMap['Intitulés incompris'] || 0,
    total_duration: summaryMap['Durée totale conversations (secondes)'] || 0,
    appointments_created: summaryMap['Rendez-vous créés'] || 0
  }
}

function reconstructSummary(problems_statistics: CategoryStats[], appointments_statistics: CategoryStats[]) {
  const total_calls = problems_statistics.reduce((sum, stat) => sum + stat.total, 0)
  const unique_exams = problems_statistics.reduce((sum, stat) => sum + stat.exams.length, 0)
  const categories_found = problems_statistics.length
  const bugsCategory = problems_statistics.find(s => s.category === 'INTITULES INCOHERENTS')
  const bugs_detected = bugsCategory ? bugsCategory.total : 0
  const total_duration = appointments_statistics.reduce((sum, stat) => sum + (stat.total_duration || 0), 0)
  const appointments_created = appointments_statistics.reduce((sum, stat) => sum + stat.total, 0)

  return {
    total_calls,
    unique_exams,
    categories_found,
    bugs_detected,
    total_duration,
    appointments_created
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
