import * as XLSX from 'xlsx'

interface ExamData {
  name: string
  total: number
  not_found: number
  not_authorized: number
  ids: string[]
  duration: number
  average_duration?: number
}

interface StatData {
  category: string
  total: number
  exam_not_found: number
  exam_not_authorized: number
  total_duration: number
  average_duration?: number
  all_exams: string
  exams: ExamData[]
}

interface SummaryData {
  total_calls: number
  unique_exams: number
  categories_found: number
  bugs_detected: number
  total_duration: number
  appointments_created: number
  exam_not_found_count: number
  exam_not_authorized_count: number
  availabilies_provided_count: number
  exam_found_count: number
  multiple_appointments_cancelled_count: number
  no_availabilities_found_count: number
}

interface AnalysisData {
  summary: SummaryData
  exam_not_found_statistics: StatData[]
  exam_not_authorized_statistics: StatData[]
  availabilies_provided_statistics: StatData[]
  exam_found_statistics: StatData[]
  multiple_appointments_cancelled_statistics: StatData[]
  no_availabilities_found_statistics: StatData[]
  appointments_statistics: StatData[]
}

// Configuration des tags avec leurs labels pour Excel
const TAG_CONFIG = {
  exam_not_found: { prefix: 'NF', label: 'Non trouvés' },
  exam_not_authorized: { prefix: 'NA', label: 'Non autorisés' },
  availabilies_provided: { prefix: 'DP', label: 'Dispo proposées' },
  exam_found: { prefix: 'EF', label: 'Exam trouvé' },
  multiple_appointments_cancelled: { prefix: 'AC', label: 'RDV annulés' },
  no_availabilities_found: { prefix: 'PD', label: 'Pas de dispo' }
} as const

export function generateExcelFile(data: AnalysisData, summary?: SummaryData): string {
  const wb = XLSX.utils.book_new()

  // Onglet Summary
  if (summary) {
    const summaryData = [
      { 'Métrique': 'Appels transférés/décrochés (total)', 'Valeur': summary.total_calls },
      { 'Métrique': 'Examens distincts', 'Valeur': summary.unique_exams },
      { 'Métrique': 'Catégories trouvées', 'Valeur': summary.categories_found },
      { 'Métrique': 'Intitulés d\'examens incohérents', 'Valeur': summary.bugs_detected },
      { 'Métrique': 'Durée totale conversations (secondes)', 'Valeur': summary.total_duration || 0 },
      { 'Métrique': 'Rendez-vous créés', 'Valeur': summary.appointments_created || 0 },
      { 'Métrique': '--- Par tag ---', 'Valeur': '' },
      { 'Métrique': 'Non trouvés', 'Valeur': summary.exam_not_found_count || 0 },
      { 'Métrique': 'Non autorisés', 'Valeur': summary.exam_not_authorized_count || 0 },
      { 'Métrique': 'Dispo proposées', 'Valeur': summary.availabilies_provided_count || 0 },
      { 'Métrique': 'Exam trouvé', 'Valeur': summary.exam_found_count || 0 },
      { 'Métrique': 'RDV annulés', 'Valeur': summary.multiple_appointments_cancelled_count || 0 },
      { 'Métrique': 'Pas de dispo', 'Valeur': summary.no_availabilities_found_count || 0 }
    ]
    const wsSummary = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')
  }

  // Fonction helper pour générer les feuilles de stats pour un tag
  const generateStatsSheet = (stats: StatData[], tagKey: keyof typeof TAG_CONFIG) => {
    const config = TAG_CONFIG[tagKey]

    // Feuille résumé du tag
    if (stats.length > 0) {
      const statsData = stats.map(stat => ({
        'Catégorie': stat.category,
        'Total': stat.total,
        'Durée (secondes)': stat.total_duration || 0
      }))
      const wsStats = XLSX.utils.json_to_sheet(statsData)
      XLSX.utils.book_append_sheet(wb, wsStats, `Stats ${config.label}`.substring(0, 31))
    }

    // Feuilles détaillées par catégorie
    for (const stat of stats) {
      if (stat.exams && stat.exams.length > 0) {
        const examData = stat.exams.map((exam, idx) => ({
          '#': idx + 1,
          'Examen': exam.name,
          'Total': exam.total,
          'Durée (secondes)': exam.duration || 0
        }))

        const ws = XLSX.utils.json_to_sheet(examData)
        const sheetName = `${config.prefix}_${stat.category}`.substring(0, 31)
        XLSX.utils.book_append_sheet(wb, ws, sheetName)
      }
    }
  }

  // Générer les feuilles pour chaque tag de problème
  generateStatsSheet(data.exam_not_found_statistics, 'exam_not_found')
  generateStatsSheet(data.exam_not_authorized_statistics, 'exam_not_authorized')
  generateStatsSheet(data.availabilies_provided_statistics, 'availabilies_provided')
  generateStatsSheet(data.exam_found_statistics, 'exam_found')
  generateStatsSheet(data.multiple_appointments_cancelled_statistics, 'multiple_appointments_cancelled')
  generateStatsSheet(data.no_availabilities_found_statistics, 'no_availabilities_found')

  // Onglet Statistiques RENDEZ-VOUS
  const appointmentsStats = data.appointments_statistics
  if (appointmentsStats.length > 0) {
    const appointmentsStatsData = appointmentsStats.map(stat => ({
      'Catégorie': stat.category,
      'Total': stat.total,
      'Durée totale (s)': stat.total_duration || 0,
      'Durée moyenne (s)': stat.average_duration || 0
    }))
    const wsAppointmentsStats = XLSX.utils.json_to_sheet(appointmentsStatsData)
    XLSX.utils.book_append_sheet(wb, wsAppointmentsStats, 'Stats Rendez-vous')
  }

  // Onglets par catégorie - RENDEZ-VOUS
  for (const stat of appointmentsStats) {
    if (stat.exams && stat.exams.length > 0) {
      const examData = stat.exams.map((exam, idx) => ({
        '#': idx + 1,
        'Examen': exam.name,
        'Total': exam.total,
        'Durée totale (s)': exam.duration || 0,
        'Durée moyenne (s)': exam.average_duration || 0
      }))

      const ws = XLSX.utils.json_to_sheet(examData)
      const sheetName = `RDV_${stat.category}`.substring(0, 31)
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
    }
  }

  // Générer le fichier Excel en base64
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' })
  return wbout
}

export function downloadExcel(base64Data: string, filename: string = 'allodoct_analysis_result.xlsx') {
  // Convertir base64 en blob
  const binaryString = atob(base64Data)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  const blob = new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

  // Télécharger le fichier
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
