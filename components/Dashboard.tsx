'use client'

import { Download, RotateCcw, TrendingUp, AlertTriangle, CheckCircle, FileSpreadsheet, Clock, Calendar } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { AnalysisResult } from '@/lib/types'
import InteractiveTable from './InteractiveTable'
import { useState } from 'react'

interface DashboardProps {
  data: AnalysisResult
  onReset: () => void
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1']

// Fonction pour formater la durée en format lisible
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}min ${secs}s`
  } else {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours}h ${minutes}min ${secs}s`
  }
}

export default function Dashboard({ data, onReset }: DashboardProps) {
  const { summary, problems_statistics, appointments_statistics, excel_file_base64 } = data
  const [activeTab, setActiveTab] = useState<'problems' | 'appointments'>('problems')

  // Préparer les données pour les graphiques - PROBLÈMES
  const problemsCategoryData = problems_statistics
    .map(stat => ({
      name: stat.category,
      value: stat.total
    }))
    .sort((a, b) => b.value - a.value)

  const tagData = [
    {
      name: 'Non trouvés',
      value: problems_statistics.reduce((sum, stat) => sum + stat.exam_not_found, 0)
    },
    {
      name: 'Non autorisés',
      value: problems_statistics.reduce((sum, stat) => sum + stat.exam_not_authorized, 0)
    }
  ]

  // Préparer les données pour les graphiques - RENDEZ-VOUS
  const appointmentsCategoryData = appointments_statistics
    .map(stat => ({
      name: stat.category,
      value: stat.total
    }))
    .sort((a, b) => b.value - a.value)

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

      {/* Tabs Navigation */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('problems')}
            className={`flex-1 px-6 py-4 text-center font-semibold transition-colors ${
              activeTab === 'problems'
                ? 'bg-red-50 text-red-700 border-b-2 border-red-500'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Problèmes (exam_not_found / exam_not_authorized)
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            className={`flex-1 px-6 py-4 text-center font-semibold transition-colors ${
              activeTab === 'appointments'
                ? 'bg-green-50 text-green-700 border-b-2 border-green-500'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Succès (Rendez-vous créés)
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeTab === 'problems' ? (
          <>
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 text-sm font-medium">Appels transférés/décrochés</p>
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
          </>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-teal-500">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 text-sm font-medium">Rendez-vous créés</p>
                <Calendar className="w-5 h-5 text-teal-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{summary.appointments_created || 0}</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 text-sm font-medium">Durée totale conversations</p>
                <Clock className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{formatDuration(summary.total_duration || 0)}</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 text-sm font-medium">Catégories</p>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{appointments_statistics.length}</p>
            </div>
          </>
        )}
      </div>

      {/* Charts and Tables */}
      <div className="bg-white rounded-xl shadow-lg">
        <div className="p-6">
          {activeTab === 'problems' ? (
            <>
              {/* Charts - Problèmes */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Pie Chart - Categories */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Répartition par catégorie
                  </h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={problemsCategoryData}
                        cx="50%"
                        cy="40%"
                        labelLine={true}
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        outerRadius={110}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {problemsCategoryData.map((entry, index) => (
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
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Non trouvés vs Non autorisés
                  </h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={tagData}
                        cx="50%"
                        cy="40%"
                        labelLine={true}
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        outerRadius={110}
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

              {/* Interactive Table - Problèmes */}
              <InteractiveTable statistics={problems_statistics} />
            </>
          ) : (
            <>
              {/* Charts - Rendez-vous */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Pie Chart - Categories */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Répartition par catégorie
                  </h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={appointmentsCategoryData}
                        cx="50%"
                        cy="40%"
                        labelLine={true}
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        outerRadius={110}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {appointmentsCategoryData.map((entry, index) => (
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

                {/* Stats - Durée totale */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    Durée totale par catégorie
                  </h3>
                  <div className="space-y-3 mt-6">
                    {appointments_statistics
                      .sort((a, b) => (b.total_duration || 0) - (a.total_duration || 0))
                      .map((stat, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 bg-white rounded-lg">
                          <span className="font-medium text-gray-700">{stat.category}</span>
                          <div className="text-right">
                            <span className="text-lg font-bold text-green-600 block">
                              {formatDuration(stat.total_duration || 0)}
                            </span>
                            <span className="text-xs text-gray-500">
                              Moy: {formatDuration(stat.average_duration || 0)}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Interactive Table - Rendez-vous */}
              <InteractiveTable statistics={appointments_statistics} isAppointments={true} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
