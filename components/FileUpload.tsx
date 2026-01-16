'use client'

import { useState, useCallback } from 'react'
import { Upload, FileSpreadsheet, X, CheckCircle } from 'lucide-react'
import { AnalysisResult } from '@/lib/types'
import { usePyodide } from '@/lib/usePyodide'
import { analyzeWithPyodide } from '@/lib/pyodideAnalyzer'
import * as XLSX from 'xlsx'

interface FileUploadProps {
  onAnalysisComplete: (result: AnalysisResult) => void
  onAnalysisStart: () => void
  onAnalysisError: () => void
}

interface UploadedFile {
  name: string
  file: File
  stats: {
    appointment_created: number
    exam_not_found: number
    exam_not_authorized: number
    availabilies_provided: number
    exam_found: number
    multiple_appointments_cancelled: number
    no_availabilities_found: number
  }
}

export default function FileUpload({ onAnalysisComplete, onAnalysisStart, onAnalysisError }: FileUploadProps) {
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { pyodide, loading: pyodideLoading, error: pyodideError } = usePyodide()

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    processFiles(droppedFiles)
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files)
      processFiles(selectedFiles)
    }
  }

  const validateAndCountTags = async (file: File): Promise<UploadedFile['stats'] | null> => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const data: any[] = XLSX.utils.sheet_to_json(worksheet)

      if (data.length === 0) {
        return null
      }

      // Compter les occurrences de chaque tag
      const stats = {
        appointment_created: 0,
        exam_not_found: 0,
        exam_not_authorized: 0,
        availabilies_provided: 0,
        exam_found: 0,
        multiple_appointments_cancelled: 0,
        no_availabilities_found: 0
      }

      for (const row of data) {
        if (row.Tag === 'appointment_created') {
          stats.appointment_created++
        } else if (row.Tag === 'exam_not_found') {
          stats.exam_not_found++
        } else if (row.Tag === 'exam_not_authorized') {
          stats.exam_not_authorized++
        } else if (row.Tag === 'availabilies_provided') {
          stats.availabilies_provided++
        } else if (row.Tag === 'exam_found') {
          stats.exam_found++
        } else if (row.Tag === 'multiple_appointments_cancelled') {
          stats.multiple_appointments_cancelled++
        } else if (row.Tag === 'no_availabilities_found') {
          stats.no_availabilities_found++
        }
      }

      // Vérifier qu'au moins un tag valide a été trouvé
      const totalTags = stats.appointment_created + stats.exam_not_found + stats.exam_not_authorized +
        stats.availabilies_provided + stats.exam_found + stats.multiple_appointments_cancelled + stats.no_availabilities_found
      if (totalTags === 0) {
        return null
      }

      return stats
    } catch (err) {
      console.error('Erreur lors de la validation du fichier:', err)
      return null
    }
  }

  const processFiles = async (newFiles: File[]) => {
    setError(null)

    if (newFiles.length === 0) {
      return
    }

    // Prendre seulement le premier fichier
    const file = newFiles[0]

    // Vérifier que c'est un fichier Excel
    const name = file.name.toLowerCase()
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      setError('Seuls les fichiers Excel (.xlsx, .xls) sont acceptés')
      return
    }

    // Valider et compter les tags
    const stats = await validateAndCountTags(file)

    if (stats) {
      setUploadedFile({ name: file.name, file, stats })
    } else {
      setError('Impossible de valider le fichier. Vérifiez que la colonne "Tag" contient des valeurs valides.')
    }
  }

  const removeFile = () => {
    setUploadedFile(null)
  }

  const handleAnalyze = async () => {
    if (!uploadedFile) {
      setError('Veuillez uploader un fichier')
      return
    }

    if (!pyodide) {
      setError('Python n\'est pas encore chargé. Veuillez patienter...')
      return
    }

    if (pyodideError) {
      setError(`Erreur de chargement Python: ${pyodideError}`)
      return
    }

    try {
      onAnalysisStart()
      setError(null)

      console.log('🚀 Lancement de l\'analyse avec Pyodide...')
      const result = await analyzeWithPyodide(
        pyodide,
        uploadedFile.file
      )

      onAnalysisComplete(result)
    } catch (err: any) {
      console.error('Erreur lors de l\'analyse:', err)
      onAnalysisError()
      setError(err.message || 'Erreur lors de l\'analyse')
    }
  }

  const hasFile = uploadedFile !== null

  return (
    <div className="space-y-4">
      {/* Pyodide Loading Status */}
      {pyodideLoading && !pyodide && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800">
            🐍 Chargement de Python dans le navigateur... (cela peut prendre quelques secondes la première fois)
          </p>
        </div>
      )}

      {pyodideError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">❌ Erreur: {pyodideError}</p>
        </div>
      )}

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-xl p-12 text-center transition-all
          ${isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-blue-400 bg-gray-50'
          }
        `}
      >
        <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
        <p className="text-lg font-medium text-gray-700 mb-2">
          Glissez-déposez votre fichier Excel ici
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Fichier unique contenant toutes les données avec la colonne "Tag"
        </p>
        <input
          type="file"
          onChange={handleFileInput}
          accept=".xlsx,.xls"
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
        >
          Sélectionner des fichiers
        </label>
      </div>

      {/* Uploaded File */}
      {uploadedFile && (
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900">Fichier uploadé :</h3>
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">{uploadedFile.name}</p>
                </div>
              </div>
              <button
                onClick={removeFile}
                className="p-2 hover:bg-green-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="mt-3 pt-3 border-t border-green-300">
              <div className="grid grid-cols-4 gap-2 mb-2">
                <div className="text-center p-2 bg-green-100 rounded">
                  <p className="text-xs text-gray-600 mb-1">RDV créés</p>
                  <p className="text-lg font-bold text-green-700">{uploadedFile.stats.appointment_created}</p>
                </div>
                <div className="text-center p-2 bg-red-100 rounded">
                  <p className="text-xs text-gray-600 mb-1">Non trouvés</p>
                  <p className="text-lg font-bold text-red-700">{uploadedFile.stats.exam_not_found}</p>
                </div>
                <div className="text-center p-2 bg-orange-100 rounded">
                  <p className="text-xs text-gray-600 mb-1">Non autorisés</p>
                  <p className="text-lg font-bold text-orange-700">{uploadedFile.stats.exam_not_authorized}</p>
                </div>
                <div className="text-center p-2 bg-blue-100 rounded">
                  <p className="text-xs text-gray-600 mb-1">Dispo proposées</p>
                  <p className="text-lg font-bold text-blue-700">{uploadedFile.stats.availabilies_provided}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-purple-100 rounded">
                  <p className="text-xs text-gray-600 mb-1">Exam trouvé</p>
                  <p className="text-lg font-bold text-purple-700">{uploadedFile.stats.exam_found}</p>
                </div>
                <div className="text-center p-2 bg-pink-100 rounded">
                  <p className="text-xs text-gray-600 mb-1">RDV annulés</p>
                  <p className="text-lg font-bold text-pink-700">{uploadedFile.stats.multiple_appointments_cancelled}</p>
                </div>
                <div className="text-center p-2 bg-gray-200 rounded">
                  <p className="text-xs text-gray-600 mb-1">Pas de dispo</p>
                  <p className="text-lg font-bold text-gray-700">{uploadedFile.stats.no_availabilities_found}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Analyze Button */}
      <button
        onClick={handleAnalyze}
        disabled={!hasFile || pyodideLoading || !!pyodideError}
        className={`
          w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all
          ${hasFile && !pyodideLoading && !pyodideError
            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }
        `}
      >
        {pyodideLoading
          ? '🐍 Chargement de Python...'
          : hasFile
            ? '🚀 Lancer l\'analyse'
            : '⏳ Veuillez ajouter un fichier...'
        }
      </button>
    </div>
  )
}
