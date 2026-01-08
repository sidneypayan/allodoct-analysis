'use client'

import { Download, RotateCcw, TrendingUp, AlertTriangle, CheckCircle, FileSpreadsheet } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { AnalysisResult } from '@/lib/types'
import InteractiveTable from './InteractiveTable'

interface DashboardProps {
  data: AnalysisResult
  onReset: () => void
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1']

export default function Dashboard({ data, onReset }: DashboardProps) {
  const { summary, statistics, excel_file_base64 } = data

  // Préparer les données pour les graphiques (triées par valeur décroissante)
  const categoryData = statistics
    .map(stat => ({
      name: stat.category,
      value: stat.total
    }))
    .sort((a, b) => b.value - a.value)

  const tagData = [
    {
      name: 'Non trouvés',
      value: statistics.reduce((sum, stat) => sum + stat.exam_not_found, 0)
    },
    {
      name: 'Non autorisés',
      value: statistics.reduce((sum, stat) => sum + stat.exam_not_authorized, 0)
    }
  ]

  const handleDownload = () => {
    try {
      // Décoder le base64
      const binaryString = atob(excel_file_base64)
      const bytes = new Uint8Array(binaryString.length)
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      
      // Créer le blob Excel
      const blob = new Blob([bytes], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      
      // Créer un lien de téléchargement
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `allodoct_analysis_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error)
      alert('Erreur lors du téléchargement du fichier')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Résultats de l'analyse</h2>
        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-lg"
          >
            <Download className="w-5 h-5" />
            Télécharger Excel
          </button>
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            Nouvelle analyse
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600 text-sm font-medium">Appels transférés</p>
            <FileSpreadsheet className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{summary.total_calls}</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600 text-sm font-medium">Examens après regroupement</p>
            <TrendingUp className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{summary.unique_exams}</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600 text-sm font-medium">Intitulés incompris</p>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{summary.bugs_detected}</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-600 text-sm font-medium">Catégories</p>
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{summary.categories_found}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart - Categories */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Répartition par catégorie
          </h3>
          <ResponsiveContainer width="100%" height={500}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="40%"
                labelLine={true}
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                outerRadius={130}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend
                verticalAlign="bottom"
                height={60}
                wrapperStyle={{ fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart - Tags */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Non trouvés vs Non autorisés
          </h3>
          <ResponsiveContainer width="100%" height={500}>
            <PieChart>
              <Pie
                data={tagData}
                cx="50%"
                cy="40%"
                labelLine={true}
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                outerRadius={130}
                fill="#8884d8"
                dataKey="value"
              >
                <Cell fill="#ef4444" />
                <Cell fill="#f59e0b" />
              </Pie>
              <Tooltip />
              <Legend
                verticalAlign="bottom"
                height={60}
                wrapperStyle={{ fontSize: '12px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Interactive Table */}
      <InteractiveTable statistics={statistics} />
    </div>
  )
}
