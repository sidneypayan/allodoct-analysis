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
  type: 'not_found' | 'not_authorized' | 'appointment_created'
}

export default function FileUpload({ onAnalysisComplete, onAnalysisStart, onAnalysisError }: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
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

  const detectFileType = async (file: File): Promise<'not_found' | 'not_authorized' | 'appointment_created' | null> => {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const data: any[] = XLSX.utils.sheet_to_json(worksheet)

      if (data.length === 0) {
        return null
      }

      // Vérifier la colonne Tag dans la première ligne
      const firstRow = data[0]
      if (firstRow.Tag === 'exam_not_found') {
        return 'not_found'
      } else if (firstRow.Tag === 'exam_not_authorized') {
        return 'not_authorized'
      } else if (firstRow.Tag === 'appointment_created') {
        return 'appointment_created'
      }

      return null
    } catch (err) {
      console.error('Erreur lors de la détection du type de fichier:', err)
      return null
    }
  }

  const processFiles = async (newFiles: File[]) => {
    setError(null)

    for (const file of newFiles) {
      // Vérifier que c'est un fichier Excel
      const name = file.name.toLowerCase()
      if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
        setError('Seuls les fichiers Excel (.xlsx, .xls) sont acceptés')
        continue
      }

      // Détecter automatiquement le type via la colonne Tag
      const type = await detectFileType(file)

      if (type) {
        // Remplacer si déjà existant
        setFiles(prev => prev.filter(f => f.type !== type))
        setFiles(prev => [...prev, { name: file.name, file, type }])
      } else {
        setError('Impossible de détecter le type de fichier. Vérifiez que la colonne "Tag" contient "exam_not_found", "exam_not_authorized" ou "appointment_created"')
      }
    }
  }

  const removeFile = (type: string) => {
    setFiles(prev => prev.filter(f => f.type !== type))
  }

  const handleAnalyze = async () => {
    if (files.length === 0) {
      setError('Veuillez uploader au moins un fichier')
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

      const notFoundFile = files.find(f => f.type === 'not_found')?.file
      const notAuthorizedFile = files.find(f => f.type === 'not_authorized')?.file
      const appointmentCreatedFile = files.find(f => f.type === 'appointment_created')?.file

      console.log('🚀 Lancement de l\'analyse avec Pyodide...')
      const result = await analyzeWithPyodide(
        pyodide,
        notFoundFile,
        notAuthorizedFile,
        appointmentCreatedFile
      )

      onAnalysisComplete(result)
    } catch (err: any) {
      console.error('Erreur lors de l\'analyse:', err)
      onAnalysisError()
      setError(err.message || 'Erreur lors de l\'analyse')
    }
  }

  const getFileTypeLabel = (type: string) => {
    switch (type) {
      case 'not_found': return 'Examens non trouvés'
      case 'not_authorized': return 'Examens non autorisés'
      case 'appointment_created': return 'Rendez-vous créés'
      case 'reference': return 'Examens de référence'
      default: return type
    }
  }

  const hasAtLeastOneFile = files.length > 0

  return (
    <div className="space-y-4">
      {/* Pyodide Loading Status */}
      {pyodideLoading && (
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
          Glissez-déposez vos fichiers ici
        </p>
        <p className="text-sm text-gray-500 mb-4">
          ou cliquez pour sélectionner
        </p>
        <input
          type="file"
          multiple
          onChange={handleFileInput}
          accept=".xlsx,.xls,.csv"
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

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-900">Fichiers uploadés :</h3>
          {files.map(({ name, type }) => (
            <div
              key={type}
              className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">{name}</p>
                  <p className="text-sm text-gray-600">{getFileTypeLabel(type)}</p>
                </div>
              </div>
              <button
                onClick={() => removeFile(type)}
                className="p-2 hover:bg-green-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          ))}
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
        disabled={!hasAtLeastOneFile || pyodideLoading || !!pyodideError}
        className={`
          w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all
          ${hasAtLeastOneFile && !pyodideLoading && !pyodideError
            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }
        `}
      >
        {pyodideLoading
          ? '🐍 Chargement de Python...'
          : hasAtLeastOneFile
            ? `🚀 Lancer l'analyse (${files.length} fichier${files.length > 1 ? 's' : ''})`
            : '⏳ Veuillez ajouter au moins un fichier...'
        }
      </button>
    </div>
  )
}
