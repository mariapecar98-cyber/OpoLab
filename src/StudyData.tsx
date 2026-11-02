import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { studyItemsFromRows, topicsFromItems } from './data'
import { authorizeGoogle, definitionsSheetId, demonstrationsSheetId, googleClientId, loadGoogleIdentity, readSheet } from './sheets'
import type { StudyKind } from './types'

interface SheetState {
  rows: string[][] | null
  loading: boolean
  error: string
  updated: Date | null
}
const kinds: StudyKind[] = ['definition', 'demonstration']
const sheetIds = { definition: definitionsSheetId, demonstration: demonstrationsSheetId }
const initialSheet: SheetState = { rows: null, loading: true, error: '', updated: null }

function useCatalog() {
  const [sheets, setSheets] = useState<Record<StudyKind, SheetState>>({ definition: initialSheet, demonstration: initialSheet })
  const [identityReady, setIdentityReady] = useState(false)
  const [authorizing, setAuthorizing] = useState(false)
  const [authError, setAuthError] = useState('')
  const token = useRef<string>()
  const requests = useRef<Partial<Record<StudyKind, AbortController>>>({})

  const refresh = useCallback(async (kind: StudyKind) => {
    requests.current[kind]?.abort()
    const controller = new AbortController()
    requests.current[kind] = controller
    setSheets((current) => ({ ...current, [kind]: { rows: null, loading: true, error: '', updated: null } }))
    try {
      const rows = await readSheet(token.current, controller.signal, sheetIds[kind])
      if (!controller.signal.aborted) setSheets((current) => ({ ...current, [kind]: { rows, loading: false, error: '', updated: new Date() } }))
    } catch (reason) {
      if (!controller.signal.aborted) {
        const error = reason instanceof TypeError ? 'No se pudo acceder a Google Sheets. Comprueba la conexión y la autorización.' : reason instanceof Error ? reason.message : 'No se pudo leer la hoja.'
        setSheets((current) => ({ ...current, [kind]: { rows: null, loading: false, error, updated: null } }))
      }
    }
  }, [])

  const refreshAll = useCallback(() => Promise.all(kinds.map(refresh)), [refresh])

  useEffect(() => {
    void refreshAll()
    let active = true
    if (googleClientId) void loadGoogleIdentity().then(() => { if (active) setIdentityReady(true) }).catch((reason: Error) => { if (active) setAuthError(reason.message) })
    return () => { active = false; kinds.forEach((kind) => requests.current[kind]?.abort()) }
  }, [refreshAll])

  const connect = async () => {
    setAuthorizing(true); setAuthError('')
    try { token.current = await authorizeGoogle(); await refreshAll() }
    catch (reason) { setAuthError(reason instanceof Error ? reason.message : 'No se pudo autorizar Google.') }
    finally { setAuthorizing(false) }
  }

  const definitions = useMemo(() => studyItemsFromRows(sheets.definition.rows ?? [], 'definition'), [sheets.definition.rows])
  const demonstrations = useMemo(() => studyItemsFromRows(sheets.demonstration.rows ?? [], 'demonstration'), [sheets.demonstration.rows])
  const allItems = useMemo(() => [...definitions, ...demonstrations], [definitions, demonstrations])
  const topics = useMemo(() => topicsFromItems(allItems), [allItems])
  return { sheets, definitions, demonstrations, allItems, topics, refresh, refreshAll, connect, identityReady, authorizing, authError }
}

const StudyDataContext = createContext<ReturnType<typeof useCatalog> | null>(null)

export function StudyDataProvider({ children }: { children: ReactNode }) {
  const catalog = useCatalog()
  return <StudyDataContext.Provider value={catalog}>{children}</StudyDataContext.Provider>
}

export function useStudyData() {
  const value = useContext(StudyDataContext)
  if (!value) throw new Error('Falta el proveedor de datos de estudio.')
  return value
}
