'use client'

import { Download, RotateCcw, TrendingUp, AlertTriangle, CheckCircle, FileSpreadsheet, Clock, Calendar, BarChart3, PieChartIcon } from 'lucide-react'
import { Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList, PieChart, Pie, Legend } from 'recharts'
import { AnalysisResult, CategoryStats } from '@/lib/types'
import InteractiveTable from './InteractiveTable'
import { useState } from 'react'

interface DashboardProps {
  data: AnalysisResult
  onReset: () => void
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1']

// Configuration des labels et couleurs pour tous les tags
const ALL_TAGS_CONFIG: Record<string, { label: string; color: string }> = {
  appointment_created: { label: 'RDV créés', color: '#10b981' },
  appointment_creation_failed: { label: 'Création RDV échouée', color: '#ef4444' },
  availabilities_provided: { label: 'Dispo proposées', color: '#3b82f6' },
  availability_fetch_failed: { label: 'Récup. dispo échouée', color: '#f97316' },
  availability_selected: { label: 'Dispo sélectionnée', color: '#14b8a6' },
  availability_selection_failed: { label: 'Sélection dispo échouée', color: '#f59e0b' },
  call_start: { label: 'Début appel', color: '#6366f1' },
  caller_ask_multiple_exams: { label: 'Examens multiples', color: '#8b5cf6' },
  exam_additional_question: { label: 'Question additionnelle', color: '#a855f7' },
  exam_found: { label: 'Exam trouvé', color: '#22c55e' },
  exam_not_authorized: { label: 'Non autorisés', color: '#fb923c' },
  exam_not_found: { label: 'Non trouvés', color: '#dc2626' },
  multiple_appointments_cancelled: { label: 'RDV annulés', color: '#ec4899' },
  no_availabilities_found: { label: 'Pas de dispo', color: '#6b7280' },
  no_upcoming_appointments: { label: 'Pas de RDV à venir', color: '#94a3b8' },
  patient_not_found: { label: 'Patient non trouvé', color: '#be185d' },
  upcoming_appointments_found: { label: 'RDV à venir trouvés', color: '#0ea5e9' },
}

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
  const [chartViewMode, setChartViewMode] = useState<'count' | 'percent'>('count')
  const [chartType, setChartType] = useState<'bar' | 'pie'>('bar')

  // Préparer les données pour l'histogramme de répartition par tag (dynamique)
  // Utilise les labels français
  const allTagsData = Object.entries(summary.all_tags_counts || {})
    .map(([tag, count]) => {
      const config = ALL_TAGS_CONFIG[tag] || { label: tag, color: '#9ca3af' }
      return {
        name: config.label,  // Label en français
        value: count,
        color: config.color
      }
    })
    .filter(item => item.value > 0)

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
  const problemsTotal = currentStats.reduce((sum, stat) => sum + stat.total, 0)
  const problemsCategoryData = currentStats
    .map((stat, index) => ({
      name: stat.category,
      value: stat.total,
      percent: problemsTotal > 0 ? ((stat.total / problemsTotal) * 100).toFixed(1) : '0',
      percentNum: problemsTotal > 0 ? (stat.total / problemsTotal) * 100 : 0,
      color: COLORS[index % COLORS.length]
    }))
    .sort((a, b) => b.value - a.value)

  // Préparer les données pour les graphiques - RENDEZ-VOUS
  const appointmentsTotal = appointments_statistics.reduce((sum, stat) => sum + stat.total, 0)
  const appointmentsCategoryData = appointments_statistics
    .map((stat, index) => ({
      name: stat.category,
      value: stat.total,
      percent: appointmentsTotal > 0 ? ((stat.total / appointmentsTotal) * 100).toFixed(1) : '0',
      percentNum: appointmentsTotal > 0 ? (stat.total / appointmentsTotal) * 100 : 0,
      color: COLORS[index % COLORS.length]
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
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-600 text-sm font-medium">Rendez-vous non créés</p>
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{summary.total_calls || 0}</p>
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
              {/* Graphique de répartition par tag */}
              <div className="bg-gray-50 rounded-xl p-6">
                <div className="flex items-center justify-end mb-4 gap-3">
                  {/* Toggle chart type */}
                  <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                    <button
                      onClick={() => setChartType('bar')}
                      className={`p-2 rounded-md transition-colors ${
                        chartType === 'bar'
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      title="Histogramme"
                    >
                      <BarChart3 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setChartType('pie')}
                      className={`p-2 rounded-md transition-colors ${
                        chartType === 'pie'
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      title="Camembert"
                    >
                      <PieChartIcon className="w-5 h-5" />
                    </button>
                  </div>
                  {/* Toggle count/percent */}
                  <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                    <button
                      onClick={() => setChartViewMode('count')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        chartViewMode === 'count'
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Nombre
                    </button>
                    <button
                      onClick={() => setChartViewMode('percent')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        chartViewMode === 'percent'
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Pourcentage
                    </button>
                  </div>
                </div>
                {chartType === 'bar' ? (
                  <ResponsiveContainer width="100%" height={Math.max(450, allTagsDataWithPercent.length * 45)}>
                    <BarChart
                      data={allTagsDataWithPercent}
                      layout="vertical"
                      margin={{ top: 5, right: 60, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis
                        type="number"
                        domain={chartViewMode === 'percent' ? [0, 100] : [0, 'auto']}
                        tickFormatter={(value) => chartViewMode === 'percent' ? `${value}%` : value.toLocaleString()}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={220}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        formatter={(value: number, name: string, props: any) => [
                          chartViewMode === 'percent'
                            ? `${props.payload.value} appels (${value.toFixed(1)}%)`
                            : `${value.toLocaleString()} appels (${props.payload.percent}%)`,
                          ''
                        ]}
                        labelFormatter={(label) => label}
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      />
                      <Bar dataKey={chartViewMode === 'percent' ? 'percentNum' : 'value'} radius={[0, 4, 4, 0]}>
                        {allTagsDataWithPercent.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                        <LabelList
                          dataKey={chartViewMode === 'percent' ? 'percent' : 'value'}
                          position="right"
                          formatter={(value: number | string) => chartViewMode === 'percent' ? `${value}%` : value.toLocaleString()}
                          style={{ fontSize: 13, fontWeight: 600 }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={450}>
                    <PieChart>
                      <Pie
                        data={allTagsDataWithPercent}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={140}
                        dataKey={chartViewMode === 'percent' ? 'percentNum' : 'value'}
                        label={({ name, percent, value }) =>
                          chartViewMode === 'percent'
                            ? `${(percent * 100).toFixed(0)}%`
                            : value.toLocaleString()
                        }
                        labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
                      >
                        {allTagsDataWithPercent.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string, props: any) => [
                          `${props.payload.value} appels (${props.payload.percent}%)`,
                          props.payload.name
                        ]}
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      />
                      <Legend
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        wrapperStyle={{ fontSize: '12px', paddingLeft: '20px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
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
                  {/* Chart - Categories */}
                  <div className="bg-gray-50 rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold text-gray-900">
                        Répartition par catégorie - {currentSubTabConfig.label}
                      </h3>
                      <div className="flex items-center gap-3">
                        {/* Toggle chart type */}
                        <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                          <button
                            onClick={() => setChartType('bar')}
                            className={`p-2 rounded-md transition-colors ${
                              chartType === 'bar'
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                            title="Histogramme"
                          >
                            <BarChart3 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setChartType('pie')}
                            className={`p-2 rounded-md transition-colors ${
                              chartType === 'pie'
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                            title="Camembert"
                          >
                            <PieChartIcon className="w-5 h-5" />
                          </button>
                        </div>
                        {/* Toggle count/percent */}
                        <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                          <button
                            onClick={() => setChartViewMode('count')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                              chartViewMode === 'count'
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            Nombre
                          </button>
                          <button
                            onClick={() => setChartViewMode('percent')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                              chartViewMode === 'percent'
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            Pourcentage
                          </button>
                        </div>
                      </div>
                    </div>
                    {chartType === 'bar' ? (
                      <ResponsiveContainer width="100%" height={Math.max(300, problemsCategoryData.length * 40)}>
                        <BarChart
                          data={problemsCategoryData}
                          layout="vertical"
                          margin={{ top: 5, right: 60, left: 10, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                          <XAxis
                            type="number"
                            domain={chartViewMode === 'percent' ? [0, 100] : [0, 'auto']}
                            tickFormatter={(value) => chartViewMode === 'percent' ? `${value}%` : value.toLocaleString()}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={150}
                            tick={{ fontSize: 12 }}
                          />
                          <Tooltip
                            formatter={(value: number, name: string, props: any) => [
                              chartViewMode === 'percent'
                                ? `${props.payload.value} appels (${value.toFixed(1)}%)`
                                : `${value.toLocaleString()} appels (${props.payload.percent}%)`,
                              ''
                            ]}
                            labelFormatter={(label) => label}
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                          />
                          <Bar dataKey={chartViewMode === 'percent' ? 'percentNum' : 'value'} radius={[0, 4, 4, 0]}>
                            {problemsCategoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                            <LabelList
                              dataKey={chartViewMode === 'percent' ? 'percent' : 'value'}
                              position="right"
                              formatter={(value: number | string) => chartViewMode === 'percent' ? `${value}%` : Number(value).toLocaleString()}
                              style={{ fontSize: 12, fontWeight: 600 }}
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <ResponsiveContainer width="100%" height={400}>
                        <PieChart>
                          <Pie
                            data={problemsCategoryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={120}
                            dataKey={chartViewMode === 'percent' ? 'percentNum' : 'value'}
                            label={({ name, percent, value }) =>
                              chartViewMode === 'percent'
                                ? `${(percent * 100).toFixed(0)}%`
                                : value.toLocaleString()
                            }
                            labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
                          >
                            {problemsCategoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number, name: string, props: any) => [
                              `${props.payload.value} appels (${props.payload.percent}%)`,
                              props.payload.name
                            ]}
                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                          />
                          <Legend
                            layout="vertical"
                            align="right"
                            verticalAlign="middle"
                            wrapperStyle={{ fontSize: '12px', paddingLeft: '20px' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
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
              {/* Chart - Categories */}
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Répartition par catégorie
                  </h3>
                  <div className="flex items-center gap-3">
                    {/* Toggle chart type */}
                    <div className="flex items-center gap-1 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                      <button
                        onClick={() => setChartType('bar')}
                        className={`p-2 rounded-md transition-colors ${
                          chartType === 'bar'
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        title="Histogramme"
                      >
                        <BarChart3 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setChartType('pie')}
                        className={`p-2 rounded-md transition-colors ${
                          chartType === 'pie'
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        title="Camembert"
                      >
                        <PieChartIcon className="w-5 h-5" />
                      </button>
                    </div>
                    {/* Toggle count/percent */}
                    <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                      <button
                        onClick={() => setChartViewMode('count')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          chartViewMode === 'count'
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        Nombre
                      </button>
                      <button
                        onClick={() => setChartViewMode('percent')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          chartViewMode === 'percent'
                            ? 'bg-indigo-600 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        Pourcentage
                      </button>
                    </div>
                  </div>
                </div>
                {chartType === 'bar' ? (
                  <ResponsiveContainer width="100%" height={Math.max(300, appointmentsCategoryData.length * 40)}>
                    <BarChart
                      data={appointmentsCategoryData}
                      layout="vertical"
                      margin={{ top: 5, right: 60, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis
                        type="number"
                        domain={chartViewMode === 'percent' ? [0, 100] : [0, 'auto']}
                        tickFormatter={(value) => chartViewMode === 'percent' ? `${value}%` : value.toLocaleString()}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={150}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        formatter={(value: number, name: string, props: any) => [
                          chartViewMode === 'percent'
                            ? `${props.payload.value} rendez-vous (${value.toFixed(1)}%)`
                            : `${value.toLocaleString()} rendez-vous (${props.payload.percent}%)`,
                          ''
                        ]}
                        labelFormatter={(label) => label}
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      />
                      <Bar dataKey={chartViewMode === 'percent' ? 'percentNum' : 'value'} radius={[0, 4, 4, 0]}>
                        {appointmentsCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                        <LabelList
                          dataKey={chartViewMode === 'percent' ? 'percent' : 'value'}
                          position="right"
                          formatter={(value: number | string) => chartViewMode === 'percent' ? `${value}%` : Number(value).toLocaleString()}
                          style={{ fontSize: 12, fontWeight: 600 }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <PieChart>
                      <Pie
                        data={appointmentsCategoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={120}
                        dataKey={chartViewMode === 'percent' ? 'percentNum' : 'value'}
                        label={({ name, percent, value }) =>
                          chartViewMode === 'percent'
                            ? `${(percent * 100).toFixed(0)}%`
                            : value.toLocaleString()
                        }
                        labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
                      >
                        {appointmentsCategoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number, name: string, props: any) => [
                          `${props.payload.value} rendez-vous (${props.payload.percent}%)`,
                          props.payload.name
                        ]}
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      />
                      <Legend
                        layout="vertical"
                        align="right"
                        verticalAlign="middle"
                        wrapperStyle={{ fontSize: '12px', paddingLeft: '20px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
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
