import { useEffect, useState, useRef } from 'react'

export interface PyodideInterface {
  runPythonAsync: (code: string) => Promise<any>
  FS: any
  loadPackage: (packages: string[]) => Promise<void>
  globals: any
}

// Charger Pyodide depuis le CDN
async function loadPyodideFromCDN() {
  // Charger le script Pyodide depuis le CDN
  const script = document.createElement('script')
  script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js'

  await new Promise((resolve, reject) => {
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })

  // @ts-ignore - loadPyodide est chargé globalement
  const pyodide = await window.loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/',
  })

  return pyodide
}

export function usePyodide() {
  const [pyodide, setPyodide] = useState<PyodideInterface | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const initPromise = useRef<Promise<void> | null>(null)

  useEffect(() => {
    // Éviter de charger plusieurs fois
    if (initPromise.current) return

    // Ne charger que côté client
    if (typeof window === 'undefined') return

    initPromise.current = (async () => {
      try {
        setLoading(true)

        console.log('🐍 Chargement de Pyodide depuis le CDN...')
        const pyodideInstance = await loadPyodideFromCDN()

        console.log('📦 Chargement des packages Python (pandas, xlrd)...')
        await pyodideInstance.loadPackage(['pandas', 'xlrd', 'micropip'])

        console.log('✅ Pyodide prêt !')
        setPyodide(pyodideInstance as any)
        setError(null)
      } catch (err) {
        console.error('❌ Erreur lors du chargement de Pyodide:', err)
        setError(err instanceof Error ? err.message : 'Erreur inconnue')
      } finally {
        setLoading(false)
      }
    })()

    return () => {
      // Cleanup si nécessaire
    }
  }, [])

  return { pyodide, loading, error }
}
