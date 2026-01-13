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
}

export function generateExcelFile(problemsStats: StatData[], appointmentsStats: StatData[], summary?: SummaryData): string {
  // Créer un nouveau workbook
  const wb = XLSX.utils.book_new()

  // Onglet Summary (si fourni)
  if (summary) {
    const summaryData = [
      { 'Métrique': 'Appels transférés/décrochés', 'Valeur': summary.total_calls },
      { 'Métrique': 'Examens distincts', 'Valeur': summary.unique_exams },
      { 'Métrique': 'Catégories trouvées', 'Valeur': summary.categories_found },
      { 'Métrique': 'Intitulés incompris', 'Valeur': summary.bugs_detected },
      { 'Métrique': 'Durée totale conversations (secondes)', 'Valeur': summary.total_duration || 0 },
      { 'Métrique': 'Rendez-vous créés', 'Valeur': summary.appointments_created || 0 }
    ]
    const wsSummary = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')
  }

  // Onglet Statistiques PROBLÈMES
  const problemsStatsData = problemsStats.map(stat => ({
    'Catégorie': stat.category,
    'Total': stat.total,
    'Non trouvés': stat.exam_not_found,
    'Non autorisés': stat.exam_not_authorized,
    'Durée (secondes)': stat.total_duration || 0
  }))

  const wsProblemsStats = XLSX.utils.json_to_sheet(problemsStatsData)
  XLSX.utils.book_append_sheet(wb, wsProblemsStats, 'Stats Problèmes')

  // Onglet Statistiques RENDEZ-VOUS
  const appointmentsStatsData = appointmentsStats.map(stat => ({
    'Catégorie': stat.category,
    'Total': stat.total,
    'Durée totale (s)': stat.total_duration || 0,
    'Durée moyenne (s)': stat.average_duration || 0
  }))

  const wsAppointmentsStats = XLSX.utils.json_to_sheet(appointmentsStatsData)
  XLSX.utils.book_append_sheet(wb, wsAppointmentsStats, 'Stats Rendez-vous')

  // Onglets par catégorie - PROBLÈMES
  for (const stat of problemsStats) {
    if (stat.exams && stat.exams.length > 0) {
      const examData = stat.exams.map((exam, idx) => ({
        '#': idx + 1,
        'Examen': exam.name,
        'Total': exam.total,
        'Non trouvés': exam.not_found,
        'Non autorisés': exam.not_authorized,
        'Durée (secondes)': exam.duration || 0
      }))

      const ws = XLSX.utils.json_to_sheet(examData)

      // Nom de l'onglet (max 31 caractères pour Excel) avec préfixe P_
      const sheetName = `P_${stat.category}`.substring(0, 31)
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
    }
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

      // Nom de l'onglet (max 31 caractères pour Excel) avec préfixe RDV_
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
