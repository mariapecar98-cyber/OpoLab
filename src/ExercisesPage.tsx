import { useEffect, useRef, useState } from 'react'
import { authorizeGoogle, googleClientId, loadGoogleIdentity } from './sheets'
import { exerciseLevels, exercisesFolder, listExerciseFiles, readExerciseFile, type ExerciseFile } from './driveExercises'
import { parseExercises, type ParsedExercise } from './exerciseParser'
import exerciseLibrary from './exerciseLibrary.json'
import { ExerciseContent } from './ExerciseContent'

export function ExercisesPage() {
  const [files, setFiles] = useState<ExerciseFile[]>(exerciseLibrary)
  const [level, setLevel] = useState<string>(exerciseLevels[0])
  const [selected, setSelected] = useState<ExerciseFile>()
  const [items, setItems] = useState<ParsedExercise[]>([])
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [ready, setReady] = useState(false)
  const [connected, setConnected] = useState(false)
  const token = useRef('')
  const libraryContent = useRef<Record<string, ParsedExercise[]>>()
  const request = useRef<AbortController>()
  useEffect(() => {
    let active = true
    if (googleClientId) void loadGoogleIdentity().then(() => { if (active) setReady(true) }).catch(() => { if (active) setError('No se pudo cargar la conexión de Google. Recarga la página.') })
    return () => { active = false; request.current?.abort() }
  }, [])
  const startRequest = () => {
    request.current?.abort()
    const controller = new AbortController(); request.current = controller
    setBusy(true); setError(''); setNotice(''); setItems([]); setSelected(undefined)
    return controller
  }
  const refresh = async (connect = false) => {
    const controller = startRequest()
    try {
      if (connect) token.current = await authorizeGoogle('https://www.googleapis.com/auth/drive.readonly')
      if (controller.signal.aborted) return
      setConnected(true)
      const data = await listExerciseFiles(token.current, controller.signal)
      if (controller.signal.aborted) return
      setFiles(data.files.length ? data.files : exerciseLibrary)
      if (data.missing.length) setNotice(`No se han encontrado estas subcarpetas: ${data.missing.join(', ')}.`)
      else if (!data.files.length) setNotice('Las carpetas no contienen fichas.')
    } catch (reason) { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'No se pudieron cargar las fichas.') }
    finally { if (!controller.signal.aborted) setBusy(false) }
  }
  const open = async (file: ExerciseFile) => {
    const controller = startRequest(); setSelected(file)
    try {
      if (file.localUrl) {
        if (!libraryContent.current) {
          const response = await fetch(`${import.meta.env.BASE_URL}exercises/content.json`, { signal: controller.signal })
          if (!response.ok) throw new Error('No se pudieron cargar los ejercicios. Vuelve a seleccionar la ficha.')
          libraryContent.current = await response.json() as Record<string, ParsedExercise[]>
        }
        if (controller.signal.aborted) return
        const parsed = libraryContent.current[file.id] ?? []
        setItems(parsed)
        if (file.id === '19ZZd-NpexYCX1Y3tHMo5kP2Yyi9Qebyz') setNotice('Esta ficha tiene varias secciones con numeración independiente. Se muestran los siete enunciados de la primera sección; el resto y sus soluciones se consultan en el PDF completo.')
        else if (!parsed.length) setNotice('No se han podido separar los ejercicios de esta ficha. Consulta el PDF completo.')
        else if (parsed.some(item => !item.solution)) setNotice('Algunas soluciones no se han podido separar o no están incluidas en la ficha. Consulta el PDF original en esos casos.')
        return
      }
      const text = await readExerciseFile(file, token.current, controller.signal)
      if (controller.signal.aborted) return
      const parsed = parseExercises(text)
      setItems(parsed)
      if (!parsed.length) setNotice('No se han identificado ejercicios numerados. Si la ficha está escaneada, necesita reconocimiento de texto. Consulta el original.')
      else if (parsed.some((item) => !item.solution)) setNotice('Algunos ejercicios no tienen una solución identificada. Puedes consultarla en la ficha original.')
    } catch (reason) { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'No se pudo leer la ficha.') }
    finally { if (!controller.signal.aborted) setBusy(false) }
  }
  const changeLevel = (next: string) => {
    request.current?.abort(); setBusy(false); setLevel(next); setSelected(undefined); setItems([]); setQuery(''); setError(''); setNotice('')
  }
  const filtered = items.filter((item) => `${item.number} ${item.statement}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')))
  return <>
    <div className="page-intro"><h1>Ejercicios</h1></div>
    <p>Elige un nivel y una ficha. Lee cada enunciado y despliega su solución cuando la necesites.</p>
    <div className="sheet-toolbar">
      <button className="button button-primary" disabled={!ready || busy} onClick={() => void refresh(true)}>Conectar Google Drive</button>
      {connected && <button className="button" disabled={busy} onClick={() => void refresh()}>Actualizar fichas</button>}
      <a href={`https://drive.google.com/drive/folders/${exercisesFolder}`} target="_blank" rel="noreferrer">Abrir carpeta en Drive</a>
    </div>
    {googleClientId && <p>Conecta Google Drive si quieres actualizar las fichas desde la carpeta.</p>}
    <div className="count-options exercise-levels" aria-label="Nivel de ejercicios">{exerciseLevels.map((value) => <button key={value} className={level === value ? 'selected' : ''} aria-pressed={level === value} disabled={busy} onClick={() => changeLevel(value)}>{value}</button>)}</div>
    {busy && <p role="status">{selected ? 'Leyendo ejercicios de la ficha…' : 'Cargando fichas de Drive…'}</p>}
    {error && <p role="alert">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <div className="exercise-layout">
      <section className="content-panel exercise-files" aria-label="Fichas">
        <h2>Fichas · {level}</h2>
        {files.filter((file) => file.level === level).map((file) => <button key={file.id} disabled={busy} aria-pressed={selected?.id === file.id} className={`exercise-file ${selected?.id === file.id ? 'selected' : ''}`} onClick={() => void open(file)}>{file.name}</button>)}
        {!busy && !files.some((file) => file.level === level) && <p>{connected ? 'No hay fichas disponibles en este nivel.' : 'Conecta Google Drive para cargar las fichas.'}</p>}
      </section>
      <section aria-label="Enunciados" className="exercise-list">
        {selected ? <><div className="exercise-source"><h2>{selected.name}</h2><a href={`https://drive.google.com/file/d/${selected.id}/view`} target="_blank" rel="noreferrer">Ver ficha original</a></div>
          {selected.localUrl && <><p>Cada ejercicio se muestra como un recorte del PDF, con sus fórmulas y gráficos. Pulsa una imagen para ampliarla.</p><details key={selected.id}><summary>Consultar PDF completo</summary><a href={`${import.meta.env.BASE_URL}${selected.localUrl.slice(1)}`} target="_blank" rel="noreferrer">Abrir PDF</a><iframe className="exercise-pdf" title={`Ejercicios y soluciones: ${selected.name}`} src={`${import.meta.env.BASE_URL}${selected.localUrl.slice(1)}`} /></details></>}
          {!!items.length && <><label className="exercise-search">Buscar enunciado<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Texto o número de ejercicio" /></label><p>{filtered.length} ejercicios</p></>}
          {filtered.map((item) => <article className="content-panel exercise-card" key={`${selected.id}-${item.number}`}><h3>Ejercicio {item.number}</h3>{selected.localUrl && <a href={`${import.meta.env.BASE_URL}${selected.localUrl.slice(1)}#page=${item.page ?? 1}`} target="_blank" rel="noreferrer">Ver página {item.page ?? 1} del PDF</a>}<ExerciseContent images={item.statementImages} text={item.statement} label={`Enunciado del ejercicio ${item.number}`} />{item.solution ? <details><summary>Ver solución</summary>{selected.localUrl && item.solutionPage && <a href={`${import.meta.env.BASE_URL}${selected.localUrl.slice(1)}#page=${item.solutionPage}`} target="_blank" rel="noreferrer">Ver solución en el PDF · página {item.solutionPage}</a>}<div className="exercise-solution"><ExerciseContent images={item.solutionImages} text={item.solution} label={`Solución del ejercicio ${item.number}`} /></div></details> : <p className="exercise-unmatched">Solución no identificada. Consulta la ficha original.</p>}</article>)}
          {!!items.length && !filtered.length && <p>No hay enunciados que coincidan con la búsqueda.</p>}
        </> : <div className="content-panel exercise-card">Selecciona una ficha para ver sus ejercicios.</div>}
      </section>
    </div>
  </>
}
