export interface Exam {
  name: string
  total: number
  not_found: number
  not_authorized: number
  ids: string[]
}

export interface CategoryStats {
  category: string
  total: number
  exam_not_found: number
  exam_not_authorized: number
  all_exams: string  // Format texte (compatibilité)
  exams: Exam[]  // Format structuré
}

export interface ExamDetail {
  category: string
  exam_name: string
  occurrences: number
  coherent: string
  reason: string
  tag: string
  id_externe: string
}

export interface AnalysisResult {
  summary: {
    total_calls: number  // Nombre d'appels transférés
    unique_exams: number  // Nombre d'examens distincts
    categories_found: number
    bugs_detected: number
  }
  statistics: CategoryStats[]
  excel_file_base64: string  // Excel encodé en base64
}
