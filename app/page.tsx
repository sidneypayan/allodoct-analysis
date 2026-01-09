'use client'

import { useState } from 'react'
import { Upload, FileSpreadsheet, Download, BarChart3 } from 'lucide-react'
import FileUpload from '@/components/FileUpload'
import Dashboard from '@/components/Dashboard'
import { AnalysisResult } from '@/lib/types'

export default function Home() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleAnalysisComplete = (result: AnalysisResult) => {
    setAnalysisResult(result)
    setIsLoading(false)
  }

  const handleAnalysisStart = () => {
    setIsLoading(true)
  }

  const handleAnalysisError = () => {
    setIsLoading(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-600 rounded-lg">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">
                Allodoct Analysis
              </h1>
              <p className="text-gray-600 mt-1">
                Analysez les appels et identifiez les problèmes du robot vocal
              </p>
            </div>
          </div>
        </header>

        {/* Upload Section */}
        {!analysisResult && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <div className="flex items-center gap-2 mb-6">
              <Upload className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-semibold text-gray-900">
                Upload des fichiers
              </h2>
            </div>
            
            <FileUpload
              onAnalysisComplete={handleAnalysisComplete}
              onAnalysisStart={handleAnalysisStart}
              onAnalysisError={handleAnalysisError}
            />

            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">
                📋 Fichiers requis :
              </h3>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>• <strong>not_found.xlsx</strong> - Examens non trouvés</li>
                <li>• <strong>not_authorized.xlsx</strong> - Examens non autorisés</li>
              </ul>
              <p className="mt-2 text-xs text-blue-700">
                ℹ️ Le fichier de référence est stocké dans le backend
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 text-lg">Analyse en cours...</p>
            <p className="text-gray-500 text-sm mt-2">
              Traitement des fichiers et génération des statistiques
            </p>
          </div>
        )}

        {/* Dashboard */}
        {analysisResult && !isLoading && (
          <Dashboard 
            data={analysisResult} 
            onReset={() => setAnalysisResult(null)}
          />
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-gray-600 text-sm">
          <p>Allodoct Analysis Platform • Créé avec Next.js et FastAPI</p>
        </footer>
      </div>
    </main>
  )
}
