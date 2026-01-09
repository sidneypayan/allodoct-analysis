'use client'

import { useState, useCallback } from 'react'
import { Upload, FileSpreadsheet, X, CheckCircle } from 'lucide-react'
import { AnalysisResult } from '@/lib/types'
import { usePyodide } from '@/lib/usePyodide'
import { analyzeWithPyodide } from '@/lib/pyodideAnalyzer'

interface FileUploadProps {
  onAnalysisComplete: (result: AnalysisResult) => void
  onAnalysisStart: () => void
  onAnalysisError: () => void
}

interface UploadedFile {
  name: string
  file: File
  type: 'not_found' | 'not_authorized'
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

  const processFiles = (newFiles: File[]) => {
    const processedFiles: UploadedFile[] = []

    newFiles.forEach(file => {
      const name = file.name.toLowerCase()
      let type: 'not_found' | 'not_authorized' | null = null

      if (name.includes('not_found') || name.includes('not found')) {
        type = 'not_found'
      } else if (name.includes('not_authorized') || name.includes('not authorized')) {
        type = 'not_authorized'
      }

      if (type) {
        // Remplacer si déjà existant
        setFiles(prev => prev.filter(f => f.type !== type))
        processedFiles.push({ name: file.name, file, type })
      }
    })

    setFiles(prev => [...prev, ...processedFiles])
    setError(null)
  }

  const removeFile = (type: string) => {
    setFiles(prev => prev.filter(f => f.type !== type))
  }

  const handleAnalyze = async () => {
    if (files.length !== 2) {
      setError('Veuillez uploader les 2 fichiers requis')
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

      if (!notFoundFile || !notAuthorizedFile) {
        setError('Fichiers manquants')
        return
      }

      // Créer un fichier reference.csv minimal (vide mais valide)
      const referenceContent = 'exam_name,category\n'
      const referenceBlob = new Blob([referenceContent], { type: 'text/csv' })
      const referenceFile = new File([referenceBlob], 'reference.csv', { type: 'text/csv' })

      console.log('🚀 Lancement de l\'analyse avec Pyodide...')
      const result = await analyzeWithPyodide(
        pyodide,
        notFoundFile,
        notAuthorizedFile,
        referenceFile
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
      case 'reference': return 'Examens de référence'
      default: return type
    }
  }

  const hasAllFiles = files.length === 2

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
        disabled={!hasAllFiles || pyodideLoading || !!pyodideError}
        className={`
          w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all
          ${hasAllFiles && !pyodideLoading && !pyodideError
            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }
        `}
      >
        {pyodideLoading
          ? '🐍 Chargement de Python...'
          : hasAllFiles
            ? '🚀 Lancer l\'analyse (100% local)'
            : '⏳ En attente des 2 fichiers...'
        }
      </button>
    </div>
  )
}
