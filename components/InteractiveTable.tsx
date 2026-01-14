'use client'

import { useState, Fragment } from 'react'
import { ChevronDown, ChevronUp, Search, Filter } from 'lucide-react'
import { CategoryStats } from '@/lib/types'

interface InteractiveTableProps {
  statistics: CategoryStats[]
  isAppointments?: boolean
}

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

export default function InteractiveTable({ statistics, isAppointments = false }: InteractiveTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<keyof CategoryStats>('total')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Filtrer les données
  const filteredData = statistics.filter(stat =>
    stat.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Trier les données
  const sortedData = [...filteredData].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue
    }
    
    return 0
  })

  const handleSort = (field: keyof CategoryStats) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const toggleRow = (category: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedRows(newExpanded)
  }

  const SortIcon = ({ field }: { field: keyof CategoryStats }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4 inline ml-1" /> : 
      <ChevronDown className="w-4 h-4 inline ml-1" />
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Header avec recherche */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-gray-900">
          Analyse détaillée par catégorie
        </h3>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Rechercher une catégorie..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table responsive */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className={`bg-gradient-to-r ${isAppointments ? 'from-green-600 to-green-700' : 'from-blue-600 to-blue-700'} text-white`}>
              <th className="px-4 py-4 text-left font-semibold text-sm"></th>
              <th
                className={`px-4 py-4 text-left font-semibold cursor-pointer ${isAppointments ? 'hover:bg-green-800' : 'hover:bg-blue-800'} transition-colors text-sm`}
                onClick={() => handleSort('category')}
              >
                Catégorie <SortIcon field="category" />
              </th>
              <th
                className={`px-4 py-4 text-center font-semibold cursor-pointer ${isAppointments ? 'hover:bg-green-800' : 'hover:bg-blue-800'} transition-colors text-sm`}
                onClick={() => handleSort('total')}
              >
                Total <SortIcon field="total" />
              </th>
              {!isAppointments && (
                <>
                  <th
                    className="px-4 py-4 text-center font-semibold cursor-pointer hover:bg-blue-800 transition-colors text-sm"
                    onClick={() => handleSort('exam_not_found')}
                  >
                    Non trouvés <SortIcon field="exam_not_found" />
                  </th>
                  <th
                    className="px-4 py-4 text-center font-semibold cursor-pointer hover:bg-blue-800 transition-colors text-sm"
                    onClick={() => handleSort('exam_not_authorized')}
                  >
                    Non autorisés <SortIcon field="exam_not_authorized" />
                  </th>
                </>
              )}
              {isAppointments && (
                <>
                  <th
                    className="px-4 py-4 text-center font-semibold cursor-pointer hover:bg-green-800 transition-colors text-sm"
                    onClick={() => handleSort('total_duration')}
                  >
                    Durée totale <SortIcon field="total_duration" />
                  </th>
                  <th
                    className="px-4 py-4 text-center font-semibold cursor-pointer hover:bg-green-800 transition-colors text-sm"
                    onClick={() => handleSort('average_duration')}
                  >
                    Durée moyenne <SortIcon field="average_duration" />
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((stat, index) => (
              <Fragment key={stat.category}>
                <tr
                  className={`
                    ${index % 2 === 0 ? (isAppointments ? 'bg-green-50' : 'bg-blue-50') : 'bg-white'}
                    ${isAppointments ? 'hover:bg-green-100' : 'hover:bg-blue-100'} transition-colors cursor-pointer
                  `}
                  onClick={() => toggleRow(stat.category)}
                >
                  <td className="px-4 py-4 text-center">
                    {expandedRows.has(stat.category) ?
                      <ChevronUp className="w-5 h-5 text-gray-600" /> :
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    }
                  </td>
                  <td className={`px-4 py-4 font-bold ${stat.category === 'INTITULES INCOHERENTS' ? 'text-red-600' : 'text-gray-900'}`}>
                    {stat.category}
                  </td>
                  <td className="px-4 py-4 text-center font-semibold text-gray-900">
                    {stat.total}
                  </td>
                  {!isAppointments && (
                    <>
                      <td className="px-4 py-4 text-center text-red-600 font-medium">
                        {stat.exam_not_found}
                      </td>
                      <td className="px-4 py-4 text-center text-orange-600 font-medium">
                        {stat.exam_not_authorized}
                      </td>
                    </>
                  )}
                  {isAppointments && (
                    <>
                      <td className="px-4 py-4 text-center text-green-600 font-medium">
                        {formatDuration(stat.total_duration || 0)}
                      </td>
                      <td className="px-4 py-4 text-center text-green-700 font-medium">
                        {formatDuration(stat.average_duration || 0)}
                      </td>
                    </>
                  )}
                </tr>

                {/* Ligne développée avec TOUS les examens */}
                {expandedRows.has(stat.category) && (
                  <tr className={isAppointments ? 'bg-green-100' : 'bg-blue-100'}>
                    <td colSpan={5} className="p-0">
                      <div className="bg-white overflow-y-auto max-h-[600px]">
                        {/* Tableau des examens avec colonnes alignées */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-100 border-b-2 border-gray-300">
                                <th className="px-3 py-2 text-left font-semibold text-gray-700 w-12">#</th>
                                <th className="px-3 py-2 text-left font-semibold text-gray-700">Examen</th>
                                <th className="px-3 py-2 text-center font-semibold text-gray-700 whitespace-nowrap w-24">Total</th>
                                {!isAppointments && (
                                  <>
                                    <th className="px-3 py-2 text-center font-semibold text-gray-700 whitespace-nowrap w-32">Non trouvés</th>
                                    <th className="px-3 py-2 text-center font-semibold text-gray-700 whitespace-nowrap w-32">Non autorisés</th>
                                  </>
                                )}
                                {isAppointments && (
                                  <>
                                    <th className="px-3 py-2 text-center font-semibold text-gray-700 whitespace-nowrap w-32">Durée totale</th>
                                    <th className="px-3 py-2 text-center font-semibold text-gray-700 whitespace-nowrap w-32">Durée moyenne</th>
                                  </>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {stat.exams && stat.exams.map((exam, idx) => (
                                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                                  <td className="px-3 py-2 text-center">
                                    <span className={`inline-flex items-center justify-center w-6 h-6 ${isAppointments ? 'bg-green-600' : 'bg-blue-600'} text-white rounded-full text-xs font-bold`}>
                                      {idx + 1}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-gray-800">
                                    {exam.name}
                                    {!isAppointments && stat.category === 'INTITULES INCOHERENTS' && exam.ids.length > 0 && (
                                      <span className="ml-2 text-xs text-blue-600 font-mono">
                                        ({exam.ids.slice(0, 2).join(', ')}{exam.ids.length > 2 ? `...` : ''})
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-center font-semibold text-gray-900">
                                    {exam.total}
                                  </td>
                                  {!isAppointments && (
                                    <>
                                      <td className="px-3 py-2 text-center font-medium text-red-600">
                                        {exam.not_found}
                                      </td>
                                      <td className="px-3 py-2 text-center font-medium text-orange-600">
                                        {exam.not_authorized}
                                      </td>
                                    </>
                                  )}
                                  {isAppointments && (
                                    <>
                                      <td className="px-3 py-2 text-center font-medium text-green-600">
                                        {formatDuration(exam.duration || 0)}
                                      </td>
                                      <td className="px-3 py-2 text-center font-medium text-green-700">
                                        {formatDuration(exam.average_duration || 0)}
                                      </td>
                                    </>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer avec stats */}
      <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
        <div>
          Affichage de <span className="font-semibold">{sortedData.length}</span> catégorie(s)
          {searchTerm && ` sur ${statistics.length} total`}
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <span>Cliquez sur une ligne pour voir le détail</span>
        </div>
      </div>
    </div>
  )
}
