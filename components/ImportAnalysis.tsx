'use client'

import { useState, useCallback } from 'react'
import { FileSpreadsheet, X, CheckCircle } from 'lucide-react'
import { AnalysisResult } from '@/lib/types'
import { parseExcelToAnalysisResult } from '@/lib/excelParser'

interface ImportAnalysisProps {
  onAnalysisComplete: (result: AnalysisResult) => void
  onAnalysisStart: () => void
  onAnalysisError: () => void
}

export default function ImportAnalysis({ onAnalysisComplete, onAnalysisStart, onAnalysisError }: ImportAnalysisProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

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
    if (droppedFiles.length > 0) {
      processFile(droppedFiles[0])
    }
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0])
    }
  }

  const processFile = (file: File) => {
    const name = file.name.toLowerCase()

    // Vérifier l'extension
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      setError('Le fichier doit être au format Excel (.xlsx ou .xls)')
      setSelectedFile(null)
      return
    }

    setSelectedFile(file)
    setError(null)
  }

  const removeFile = () => {
    setSelectedFile(null)
    setError(null)
  }

  const handleImport = async () => {
    if (!selectedFile) return

    try {
      onAnalysisStart()
      setError(null)

      console.log('🚀 Import du fichier Excel...')
      const result = await parseExcelToAnalysisResult(selectedFile)

      console.log('✅ Import réussi')
      onAnalysisComplete(result)
    } catch (err: any) {
      console.error('Erreur lors de l\'import:', err)
      onAnalysisError()
      setError(err.message || 'Erreur lors de l\'import')
    }
  }

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
        <FileSpreadsheet className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
        <p className="text-lg font-medium text-gray-700 mb-2">
          Glissez-déposez votre fichier Excel ici
        </p>
        <p className="text-sm text-gray-500 mb-4">
          ou cliquez pour sélectionner
        </p>
        <input
          type="file"
          onChange={handleFileInput}
          accept=".xlsx,.xls"
          className="hidden"
          id="excel-import"
        />
        <label
          htmlFor="excel-import"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
        >
          Sélectionner un fichier
        </label>
      </div>

      {/* Selected File Display */}
      {selectedFile && (
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-900">Fichier sélectionné :</h3>
          <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-600">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <button
              onClick={removeFile}
              className="p-2 hover:bg-green-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Import Button */}
      <button
        onClick={handleImport}
        disabled={!selectedFile}
        className={`
          w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all
          ${selectedFile
            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }
        `}
      >
        {selectedFile
          ? '📥 Importer l\'analyse'
          : '⏳ Sélectionnez un fichier Excel...'
        }
      </button>
    </div>
  )
}
