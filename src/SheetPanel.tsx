import { useState } from 'react'
import { googleClientId, spreadsheetId } from './sheets'
import { useStudyData } from './StudyData'
import type { StudyKind } from './types'

export function SheetPanel({ kind, targetSheetId }: { kind: StudyKind; targetSheetId?: number }) {
  const title = kind === 'definition' ? 'Definiciones' : 'Demostraciones'
  const contentTitle = kind === 'definition' ? 'Definición' : 'Demostración'
  const sourceUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit${targetSheetId === undefined ? '' : `?gid=${targetSheetId}`}`
  const { sheets, refresh, connect, identityReady, authorizing, authError } = useStudyData()
  const { rows: sourceRows, error, loading, updated } = sheets[kind]
  const rows = sourceRows?.slice(1) ?? null
  const [query, setQuery] = useState('')

  const entries = (rows ?? []).map((row, index) => ({ row: row.slice(0, 3), index }))
  const search = query.trim().toLocaleLowerCase('es')
  const visibleRows = entries.filter(({ row }) => !search || row.some((cell) => cell.toLocaleLowerCase('es').includes(search)))
  return <section className="content-panel sheet-panel">
    <div className="sheet-toolbar"><h1>{title}</h1><a href={sourceUrl} target="_blank" rel="noreferrer">Abrir hoja</a>
      <button className="button button-primary" disabled={loading || authorizing || targetSheetId === undefined} onClick={() => void refresh(kind)}>Actualizar</button>
      {googleClientId && targetSheetId !== undefined && <button className="button" disabled={!identityReady || authorizing} onClick={() => void connect()}>Autorizar Google</button>}
    </div>
    {loading && <p role="status">Cargando hoja…</p>}
    {error && <div role="alert"><p>{error}</p>{!googleClientId && <p>Acceso privado pendiente de configurar.</p>}</div>}
    {authError && <p role="alert">{authError}</p>}
    {targetSheetId === undefined && <p role="status">Falta indicar la pestaña de {title.toLocaleLowerCase('es')}.</p>}
    <label className="search-field">Buscar<input value={query} onChange={(event) => setQuery(event.target.value)} aria-label={`Buscar ${title.toLocaleLowerCase('es')} por tema, nombre o contenido`} /></label>
    <div className="sheet-scroll"><table className="sheet-table"><caption className="sr-only">{title}</caption>
      <thead><tr><th scope="col">Número de tema</th><th scope="col">Nombre</th><th scope="col">{contentTitle}</th></tr></thead>
      <tbody>{visibleRows.map(({ row, index }) => <tr key={index}><td>{row[0] ?? ''}</td><td>{row[1] ?? ''}</td><td>{row[2] ?? ''}</td></tr>)}</tbody>
    </table></div>
    {rows && <>
      {updated && <p className="small-muted">Lectura: {updated.toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid' })} · Solo lectura</p>}
      {!rows.length && <p>Hoja vacía.</p>}
      {rows.length > 0 && !visibleRows.length && <p>Sin coincidencias.</p>}
    </>}
  </section>
}
