'use client'

import { useState, Fragment } from 'react'
import { ChevronDown, ChevronUp, Search, Filter, Eye } from 'lucide-react'
import { CategoryStats } from '@/lib/types'

interface InteractiveTableProps {
  statistics: CategoryStats[]
}

// Composant pour afficher un examen avec ses ID externes
function ExamWithIds({ exam, count, ids, isIncompris }: { exam: string, count: string, ids: string[], isIncompris: boolean }) {
  const [showAllIds, setShowAllIds] = useState(false)

  if (!isIncompris || ids.length === 0) {
    // Pour les autres catégories, affichage simple
    return <span>{exam} ({count})</span>
  }

  // Pour INTITULES INCOMPRIS, afficher les IDs
  const displayIds = showAllIds ? ids : ids.slice(0, 1)

  return (
    <div className="flex items-start gap-2">
      <span className="flex-1">{exam} ({count})</span>
      <div className="flex items-center gap-1 text-xs">
        <span className="text-blue-600 font-mono">
          {displayIds.join(', ')}
        </span>
        {ids.length > 1 && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowAllIds(!showAllIds)
            }}
            className="ml-1 px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded flex items-center gap-1 transition-colors"
            title={showAllIds ? 'Masquer les IDs' : `Voir tous les ${ids.length} IDs`}
          >
            <Eye className="w-3 h-3" />
            {showAllIds ? 'Masquer' : `+${ids.length - 1}`}
          </button>
        )}
      </div>
    </div>
  )
}

export default function InteractiveTable({ statistics }: InteractiveTableProps) {
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
            <tr className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <th className="px-4 py-4 text-left font-semibold text-sm"></th>
              <th 
                className="px-4 py-4 text-left font-semibold cursor-pointer hover:bg-blue-800 transition-colors text-sm"
                onClick={() => handleSort('category')}
              >
                Catégorie <SortIcon field="category" />
              </th>
              <th
                className="px-4 py-4 text-center font-semibold cursor-pointer hover:bg-blue-800 transition-colors text-sm"
                onClick={() => handleSort('total')}
              >
                Total <SortIcon field="total" />
              </th>
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
            </tr>
          </thead>
          <tbody>
            {sortedData.map((stat, index) => (
              <Fragment key={stat.category}>
                <tr
                  className={`
                    ${index % 2 === 0 ? 'bg-blue-50' : 'bg-white'}
                    hover:bg-blue-100 transition-colors cursor-pointer
                  `}
                  onClick={() => toggleRow(stat.category)}
                >
                  <td className="px-4 py-4 text-center">
                    {expandedRows.has(stat.category) ? 
                      <ChevronUp className="w-5 h-5 text-gray-600" /> : 
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    }
                  </td>
                  <td className={`px-4 py-4 font-bold ${stat.category === 'INTITULES INCOMPRIS' ? 'text-red-600' : 'text-gray-900'}`}>
                    {stat.category}
                  </td>
                  <td className="px-4 py-4 text-center font-semibold text-gray-900">
                    {stat.total}
                  </td>
                  <td className="px-4 py-4 text-center text-red-600 font-medium">
                    {stat.exam_not_found}
                  </td>
                  <td className="px-4 py-4 text-center text-orange-600 font-medium">
                    {stat.exam_not_authorized}
                  </td>
                </tr>

                {/* Ligne développée avec TOUS les examens */}
                {expandedRows.has(stat.category) && (
                  <tr className="bg-blue-100">
                    <td colSpan={5} className="px-4 py-4">
                      <div className="bg-white rounded-lg p-4 shadow-inner max-h-96 overflow-y-auto">
                        <h4 className="font-semibold text-gray-900 mb-3 sticky top-0 bg-white pb-2">
                          📋 Tous les examens de la catégorie {stat.category} ({stat.total} total)
                        </h4>
                        <div className="space-y-1 text-sm">
                          {stat.all_exams.split('\n').map((examLine, idx) => {
                            // Parser le format: "exam§count§id1|id2|id3"
                            const parts = examLine.split('§')
                            const exam = parts[0] || ''
                            const count = parts[1] || '0'
                            const ids = parts[2] ? parts[2].split('|').filter(id => id.trim()) : []

                            return (
                              <div key={idx} className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded border-b border-gray-100">
                                <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                  {idx + 1}
                                </span>
                                <div className="text-gray-700 flex-1">
                                  <ExamWithIds
                                    exam={exam}
                                    count={count}
                                    ids={ids}
                                    isIncompris={stat.category === 'INTITULES INCOMPRIS'}
                                  />
                                </div>
                              </div>
                            )
                          })}
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
