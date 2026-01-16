export interface Exam {
  name: string
  total: number
  not_found: number
  not_authorized: number
  ids: string[]
  duration: number  // Durée totale en secondes
  average_duration?: number  // Durée moyenne en secondes (pour appointments)
}

export interface CategoryStats {
  category: string
  total: number
  exam_not_found: number
  exam_not_authorized: number
  total_duration: number  // Durée totale en secondes
  average_duration?: number  // Durée moyenne en secondes (pour appointments)
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
    total_duration: number  // Durée totale en secondes
    appointments_created: number  // Nombre de rendez-vous créés
    // Compteurs par tag pour les problèmes
    exam_not_found_count: number
    exam_not_authorized_count: number
    availabilies_provided_count: number
    exam_found_count: number
    multiple_appointments_cancelled_count: number
    no_availabilities_found_count: number
  }
  // Statistiques séparées par tag (problèmes)
  exam_not_found_statistics: CategoryStats[]
  exam_not_authorized_statistics: CategoryStats[]
  availabilies_provided_statistics: CategoryStats[]
  exam_found_statistics: CategoryStats[]
  multiple_appointments_cancelled_statistics: CategoryStats[]
  no_availabilities_found_statistics: CategoryStats[]
  // Statistiques pour les rendez-vous créés
  appointments_statistics: CategoryStats[]
  excel_file_base64: string    // Excel encodé en base64
}
