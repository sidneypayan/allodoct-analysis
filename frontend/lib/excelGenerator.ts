import * as XLSX from 'xlsx'

interface ExamData {
  name: string
  total: number
  not_found: number
  not_authorized: number
  ids: string[]
}

interface StatData {
  category: string
  total: number
  exam_not_found: number
  exam_not_authorized: number
  all_exams: string
  exams: ExamData[]
}

export function generateExcelFile(statistics: StatData[]): string {
  // Créer un nouveau workbook
  const wb = XLSX.utils.book_new()

  // Onglet Statistiques
  const statsData = statistics.map(stat => ({
    'Catégorie': stat.category,
    'Total': stat.total,
    'Non trouvés': stat.exam_not_found,
    'Non autorisés': stat.exam_not_authorized,
  }))

  const wsStats = XLSX.utils.json_to_sheet(statsData)
  XLSX.utils.book_append_sheet(wb, wsStats, 'Statistiques')

  // Onglets par catégorie
  for (const stat of statistics) {
    if (stat.exams && stat.exams.length > 0) {
      const examData = stat.exams.map((exam, idx) => ({
        '#': idx + 1,
        'Examen': exam.name,
        'Total': exam.total,
        'Non trouvés': exam.not_found,
        'Non autorisés': exam.not_authorized,
      }))

      const ws = XLSX.utils.json_to_sheet(examData)

      // Nom de l'onglet (max 31 caractères pour Excel)
      const sheetName = stat.category.substring(0, 31)
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
