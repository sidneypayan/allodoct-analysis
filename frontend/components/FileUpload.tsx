'use client'

import { useState, useCallback } from 'react'
import { Upload, FileSpreadsheet, X, CheckCircle } from 'lucide-react'
import axios from 'axios'
import { AnalysisResult } from '@/lib/types'

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

    const formData = new FormData()
    
    files.forEach(({ file, type }) => {
      formData.append(type, file)
    })

    try {
      onAnalysisStart()
      setError(null)

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const response = await axios.post(`${API_URL}/analyze`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 300000 // 5 minutes timeout
      })

      onAnalysisComplete(response.data)
    } catch (err: any) {
      onAnalysisError() // Stop loading on error

      if (err.code === 'ECONNABORTED') {
        setError('L\'analyse a pris trop de temps. Veuillez réessayer.')
      } else if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        setError('Impossible de se connecter au serveur backend. Vérifiez que le backend est démarré sur http://localhost:8000')
      } else {
        setError(err.response?.data?.detail || 'Erreur lors de l\'analyse')
      }
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
        disabled={!hasAllFiles}
        className={`
          w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all
          ${hasAllFiles
            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }
        `}
      >
        {hasAllFiles ? '🚀 Lancer l\'analyse' : '⏳ En attente des 2 fichiers...'}
      </button>
    </div>
  )
}
