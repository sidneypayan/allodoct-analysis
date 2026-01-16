'use client'

import { Download, RotateCcw, TrendingUp, AlertTriangle, CheckCircle, FileSpreadsheet, Clock, Calendar, BarChart3 } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts'
import { AnalysisResult, CategoryStats } from '@/lib/types'
import InteractiveTable from './InteractiveTable'
import { useState } from 'react'

interface DashboardProps {
  data: AnalysisResult
  onReset: () => void
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1']

// Configuration des sous-onglets pour les problèmes
type ProblemsSubTab = 'exam_not_found' | 'exam_not_authorized' | 'availabilies_provided' | 'exam_found' | 'multiple_appointments_cancelled' | 'no_availabilities_found'

const SUBTABS_CONFIG: { key: ProblemsSubTab; label: string; color: string; bgColor: string }[] = [
  { key: 'exam_not_found', label: 'Non trouvés', color: 'text-red-700', bgColor: 'bg-red-100' },
  { key: 'exam_not_authorized', label: 'Non autorisés', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  { key: 'availabilies_provided', label: 'Dispo proposées', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  { key: 'exam_found', label: 'Exam trouvé', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  { key: 'multiple_appointments_cancelled', label: 'RDV annulés', color: 'text-pink-700', bgColor: 'bg-pink-100' },
  { key: 'no_availabilities_found', label: 'Pas de dispo', color: 'text-gray-700', bgColor: 'bg-gray-200' },
]

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
  const { summary, appointments_statistics, excel_file_base64 } = data
  const [activeTab, setActiveTab] = useState<'overview' | 'problems' | 'appointments'>('overview')
  const [activeSubTab, setActiveSubTab] = useState<ProblemsSubTab>('exam_not_found')

  // Préparer les données pour l'histogramme de répartition par tag
  const allTagsData = [
    { name: 'RDV créés', value: summary.appointments_created || 0, color: '#10b981' },
    { name: 'Non trouvés', value: summary.exam_not_found_count || 0, color: '#ef4444' },
    { name: 'Non autorisés', value: summary.exam_not_authorized_count || 0, color: '#f97316' },
    { name: 'Dispo proposées', value: summary.availabilies_provided_count || 0, color: '#3b82f6' },
    { name: 'Exam trouvé', value: summary.exam_found_count || 0, color: '#8b5cf6' },
    { name: 'RDV annulés', value: summary.multiple_appointments_cancelled_count || 0, color: '#ec4899' },
    { name: 'Pas de dispo', value: summary.no_availabilities_found_count || 0, color: '#6b7280' },
  ]

  const totalAllTags = allTagsData.reduce((sum, item) => sum + item.value, 0)

  const allTagsDataWithPercent = allTagsData
    .map(item => ({
      ...item,
      percent: totalAllTags > 0 ? ((item.value / totalAllTags) * 100).toFixed(1) : '0',
      percentNum: totalAllTags > 0 ? (item.value / totalAllTags) * 100 : 0
    }))
    .sort((a, b) => b.value - a.value)

  // Fonction pour obtenir les statistiques du sous-onglet actif
  const getActiveStatistics = (): CategoryStats[] => {
    switch (activeSubTab) {
      case 'exam_not_found':
        return data.exam_not_found_statistics || []
      case 'exam_not_authorized':
        return data.exam_not_authorized_statistics || []
      case 'availabilies_provided':
        return data.availabilies_provided_statistics || []
      case 'exam_found':
        return data.exam_found_statistics || []
      case 'multiple_appointments_cancelled':
        return data.multiple_appointments_cancelled_statistics || []
      case 'no_availabilities_found':
        return data.no_availabilities_found_statistics || []
      default:
        return []
    }
  }

  // Fonction pour obtenir le compteur du sous-onglet
  const getSubTabCount = (key: ProblemsSubTab): number => {
    switch (key) {
      case 'exam_not_found':
        return summary.exam_not_found_count || 0
      case 'exam_not_authorized':
        return summary.exam_not_authorized_count || 0
      case 'availabilies_provided':
        return summary.availabilies_provided_count || 0
      case 'exam_found':
        return summary.exam_found_count || 0
      case 'multiple_appointments_cancelled':
        return summary.multiple_appointments_cancelled_count || 0
      case 'no_availabilities_found':
        return summary.no_availabilities_found_count || 0
      default:
        return 0
    }
  }

  const currentStats = getActiveStatistics()

  // Préparer les données pour les graphiques - PROBLÈMES (sous-onglet actif)
  const problemsCategoryData = currentStats
    .map(stat => ({
      name: stat.category,
      value: stat.total
    }))
    .sort((a, b) => b.value - a.value)

  // Préparer les données pour les graphiques - RENDEZ-VOUS
  const appointmentsCategoryData = appointments_statistics
    .map(stat => ({
      name: stat.category,
      value: stat.total
    }))
    .sort((a, b) => b.value - a.value)

  const handleDownload = () => {
    try {
      const binaryString = atob(excel_file_base64)
      const bytes = new Uint8Array(binaryString.length)

      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }

      const blob = new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })

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

  const currentSubTabConfig = SUBTABS_CONFIG.find(t => t.key === activeSubTab)!

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
            onClick={() => setActiveTab('overview')}
            className={`flex-1 px-6 py-4 text-center font-semibold transition-colors ${
              activeTab === 'overview'
                ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-500'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Vue d'ensemble ({totalAllTags})
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            className={`flex-1 px-6 py-4 text-center font-semibold transition-colors ${
              activeTab === 'appointments'
                ? 'bg-green-50 text-green-700 border-b-2 border-green-500'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Rendez-vous créés ({summary.appointments_created || 0})
          </button>
          <button
            onClick={() => setActiveTab('problems')}
            className={`flex-1 px-6 py-4 text-center font-semibold transition-colors ${
              activeTab === 'problems'
                ? 'bg-red-50 text-red-700 border-b-2 border-red-500'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Rendez-vous non créés ({summary.total_calls || 0})
          </button>
        </div>

        {/* Sub-tabs for problems */}
        {activeTab === 'problems' && (
          <div className="px-4 py-3 bg-gray-50 border-b">
            <div className="flex flex-wrap gap-2">
              {SUBTABS_CONFIG.map((subtab) => {
                const count = getSubTabCount(subtab.key)
                const isActive = activeSubTab === subtab.key
                return (
                  <button
                    key={subtab.key}
                    onClick={() => setActiveSubTab(subtab.key)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      isActive
                        ? `${subtab.bgColor} ${subtab.color} ring-2 ring-offset-1 ring-gray-300`
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {subtab.label} ({count})
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeTab === 'overview' ? (
          <>
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-indigo-500">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 text-sm font-medium">Total des lignes</p>
                <BarChart3 className="w-5 h-5 text-indigo-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{totalAllTags}</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 text-sm font-medium">Rendez-vous créés</p>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{summary.appointments_created || 0}</p>
              <p className="text-sm text-gray-500 mt-1">
                {totalAllTags > 0 ? ((summary.appointments_created / totalAllTags) * 100).toFixed(1) : 0}% du total
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 text-sm font-medium">Problèmes (non créés)</p>
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{summary.total_calls || 0}</p>
              <p className="text-sm text-gray-500 mt-1">
                {totalAllTags > 0 ? ((summary.total_calls / totalAllTags) * 100).toFixed(1) : 0}% du total
              </p>
            </div>
          </>
        ) : activeTab === 'problems' ? (
          <>
            <div className={`bg-white rounded-xl shadow-lg p-6 border-l-4 ${
              activeSubTab === 'exam_not_found' ? 'border-red-500' :
              activeSubTab === 'exam_not_authorized' ? 'border-orange-500' :
              activeSubTab === 'availabilies_provided' ? 'border-blue-500' :
              activeSubTab === 'exam_found' ? 'border-purple-500' :
              activeSubTab === 'multiple_appointments_cancelled' ? 'border-pink-500' :
              'border-gray-500'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 text-sm font-medium">Appels ({currentSubTabConfig.label})</p>
                <FileSpreadsheet className="w-5 h-5 text-gray-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{getSubTabCount(activeSubTab)}</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 text-sm font-medium">Catégories d'examens</p>
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{currentStats.length}</p>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 text-sm font-medium">Intitulés incohérents</p>
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {currentStats.find(s => s.category === 'INTITULES INCOHERENTS')?.total || 0}
              </p>
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
          {activeTab === 'overview' ? (
            <>
              {/* Histogramme de répartition par tag */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  Répartition par tag (%)
                </h3>
                <ResponsiveContainer width="100%" height={450}>
                  <BarChart
                    data={allTagsDataWithPercent}
                    layout="vertical"
                    margin={{ top: 5, right: 80, left: 120, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      tick={{ fontSize: 13 }}
                    />
                    <Tooltip
                      formatter={(value: number, name: string, props: any) => [
                        `${props.payload.value} (${value}%)`,
                        'Lignes'
                      ]}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Bar dataKey="percentNum" radius={[0, 4, 4, 0]}>
                      {allTagsDataWithPercent.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                      <LabelList
                        dataKey="percent"
                        position="right"
                        formatter={(value: string) => `${value}%`}
                        style={{ fontSize: 13, fontWeight: 600 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Tableau récapitulatif */}
              <div className="mt-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Détail par tag</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
                        <th className="px-4 py-3 text-left font-semibold">Tag</th>
                        <th className="px-4 py-3 text-center font-semibold">Nombre</th>
                        <th className="px-4 py-3 text-center font-semibold">Pourcentage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allTagsDataWithPercent.map((item, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-indigo-50' : 'bg-white'}>
                          <td className="px-4 py-3 font-medium flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: item.color }}
                            />
                            {item.name}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold">{item.value}</td>
                          <td className="px-4 py-3 text-center font-semibold">{item.percent}%</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-100 font-bold">
                        <td className="px-4 py-3">Total</td>
                        <td className="px-4 py-3 text-center">{totalAllTags}</td>
                        <td className="px-4 py-3 text-center">100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : activeTab === 'problems' ? (
            <>
              {/* Charts - Problèmes */}
              {currentStats.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Pie Chart - Categories */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">
                        Répartition par catégorie - {currentSubTabConfig.label}
                      </h3>
                      <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                          <Pie
                            data={problemsCategoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={110}
                            labelLine={(props) => {
                              const { percent } = props
                              const pct = percent * 100
                              if (pct < 1) return <path d="" />
                              return (
                                <path
                                  d={props.points ? `M${props.points[0].x},${props.points[0].y}L${props.points[1].x},${props.points[1].y}` : ''}
                                  stroke="#9ca3af"
                                  strokeWidth={1}
                                  fill="none"
                                />
                              )
                            }}
                            label={({ cx, cy, midAngle, outerRadius, percent }) => {
                              const pct = percent * 100
                              if (pct < 1) return null
                              const RADIAN = Math.PI / 180
                              const radius = outerRadius + 20
                              const x = cx + radius * Math.cos(-midAngle * RADIAN)
                              const y = cy + radius * Math.sin(-midAngle * RADIAN)
                              return (
                                <text
                                  x={x}
                                  y={y}
                                  fill="#374151"
                                  textAnchor={x > cx ? 'start' : 'end'}
                                  dominantBaseline="central"
                                  fontSize="13"
                                  fontWeight="600"
                                >
                                  {`${pct.toFixed(0)}%`}
                                </text>
                              )
                            }}
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
                            formatter={(value, entry) => {
                              const total = problemsCategoryData.reduce((sum, item) => sum + item.value, 0)
                              const payloadValue = entry.payload?.value ?? 0
                              const percent = total > 0 ? ((payloadValue / total) * 100).toFixed(1) : '0'
                              return `${value} (${payloadValue} - ${percent}%)`
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Stats par catégorie */}
                    <div className="bg-gray-50 rounded-xl p-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">
                        Détail par catégorie
                      </h3>
                      <div className="space-y-3 mt-6 max-h-[400px] overflow-y-auto">
                        {currentStats
                          .sort((a, b) => b.total - a.total)
                          .map((stat, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3 bg-white rounded-lg">
                              <span className={`font-medium ${stat.category === 'INTITULES INCOHERENTS' ? 'text-red-600' : 'text-gray-700'}`}>
                                {stat.category}
                              </span>
                              <span className="text-lg font-bold text-gray-900">
                                {stat.total}
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>

                  {/* Interactive Table - Problèmes */}
                  <InteractiveTable statistics={currentStats} />
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg">Aucune donnée pour ce tag</p>
                  <p className="text-sm mt-2">Sélectionnez un autre sous-onglet ou vérifiez votre fichier d'entrée</p>
                </div>
              )}
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
                        cy="50%"
                        innerRadius={70}
                        outerRadius={110}
                        labelLine={(props) => {
                          const { percent } = props
                          const pct = percent * 100
                          if (pct < 1) return <path d="" />
                          return (
                            <path
                              d={props.points ? `M${props.points[0].x},${props.points[0].y}L${props.points[1].x},${props.points[1].y}` : ''}
                              stroke="#9ca3af"
                              strokeWidth={1}
                              fill="none"
                            />
                          )
                        }}
                        label={({ cx, cy, midAngle, outerRadius, percent }) => {
                          const pct = percent * 100
                          if (pct < 1) return null
                          const RADIAN = Math.PI / 180
                          const radius = outerRadius + 20
                          const x = cx + radius * Math.cos(-midAngle * RADIAN)
                          const y = cy + radius * Math.sin(-midAngle * RADIAN)
                          return (
                            <text
                              x={x}
                              y={y}
                              fill="#374151"
                              textAnchor={x > cx ? 'start' : 'end'}
                              dominantBaseline="central"
                              fontSize="13"
                              fontWeight="600"
                            >
                              {`${pct.toFixed(0)}%`}
                            </text>
                          )
                        }}
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
                        formatter={(value, entry) => {
                          const total = appointmentsCategoryData.reduce((sum, item) => sum + item.value, 0)
                          const payloadValue = entry.payload?.value ?? 0
                          const percent = total > 0 ? ((payloadValue / total) * 100).toFixed(1) : '0'
                          return `${value} (${payloadValue} - ${percent}%)`
                        }}
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
