import { ArrowRight } from 'lucide-react'
import { checklistSummary, rowProgress } from './checklist'
import { useStudyData } from './StudyData'
import type { ChecklistState } from './useChecklist'
import type { Page, StudyProgress } from './types'

export function HomePage({ checklist, progress, onNavigate }: { checklist: ChecklistState; progress: StudyProgress; onNavigate: (page: Page) => void }) {
  const { definitions, demonstrations, topics, sheets } = useStudyData()
  const contentTopics = { definition: new Set(definitions.map((item) => item.topicNumber)).size, demonstration: new Set(demonstrations.map((item) => item.topicNumber)).size }
  const summary = checklistSummary(checklist.rows)
  const activeTopics = checklist.rows.filter((row) => row.steps.some((step) => step === 'Hecho' || step === 'En curso'))
    .sort((a, b) => rowProgress(b) - rowProgress(a) || a.number - b.number)
  const inProgress = checklist.rows.reduce((sum, row) => sum + row.steps.filter((step) => step === 'En curso').length, 0)
  const known = progress.answers.filter((answer) => answer.rating === 'known').length
  const partial = progress.answers.filter((answer) => answer.rating === 'partial').length
  const unknown = progress.answers.filter((answer) => answer.rating === 'unknown').length
  const practiceDates = progress.answers.map((answer) => Date.parse(answer.answeredAt)).filter(Number.isFinite)
  const lastPractice = practiceDates.length ? new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Madrid' }).format(practiceDates.reduce((latest, date) => Math.max(latest, date))) : 'Sin prácticas'

  return <div className="overview-page">
    <h1>Inicio</h1>
    {checklist.error && <p role="alert" className="checklist-error">{checklist.error}</p>}
    <section className="content-panel overview-panel" aria-label="Resumen del checklist">
      <div className="overview-heading"><h2>Checklist de temas</h2><button className="text-button" onClick={() => onNavigate('checklist')}>Ver checklist <ArrowRight size={15} /></button></div>
      <div className="overview-progress"><strong>{Math.round(summary.progress * 100)}%</strong><span><b id="home-checklist-completed">{summary.completed}</b> de {summary.total} pasos completados</span></div>
      <div className="progress-track" role="progressbar" aria-label="Progreso del checklist" aria-valuenow={summary.completed} aria-valuemin={0} aria-valuemax={summary.total}><span style={{ width: `${summary.progress * 100}%` }} /></div>
      <dl className="overview-metrics"><div><dt>Temas</dt><dd>{checklist.rows.length}</dd></div><div><dt>Temas con actividad</dt><dd>{activeTopics.length}</dd></div><div><dt>Temas dominados</dt><dd>{summary.mastered}</dd></div><div><dt>Pasos en curso</dt><dd>{inProgress}</dd></div></dl>
    </section>

    <div className="overview-content-grid">
      {([{ kind: 'definition', title: 'Definiciones', page: 'definitions', items: definitions }, { kind: 'demonstration', title: 'Demostraciones', page: 'demonstrations', items: demonstrations }] as const).map(({ kind, title, page, items }) => <section className="content-panel overview-panel" aria-label={`Resumen de ${title.toLocaleLowerCase('es')}`} key={kind}>
        <div className="overview-heading"><h2>{title}</h2><button className="text-button" onClick={() => onNavigate(page)}>Ver <ArrowRight size={15} /></button></div>
        <div className="overview-content-count">{sheets[kind].loading ? 'Cargando…' : sheets[kind].error ? 'No disponible' : items.length}</div>
        {sheets[kind].error ? <p role="status" className="overview-status">{sheets[kind].error}</p> : !sheets[kind].loading && <p className="overview-status">{contentTopics[kind]} {contentTopics[kind] === 1 ? 'tema' : 'temas'} con preguntas completas</p>}
      </section>)}
    </div>

    <section className="content-panel overview-panel" aria-label="Resumen de entrenamientos">
      <div className="overview-heading"><h2>Entrenamientos</h2><button className="text-button" onClick={() => onNavigate('train')}>Entrenar <ArrowRight size={15} /></button></div>
      <dl className="overview-metrics"><div><dt>Respuestas practicadas</dt><dd id="home-practice-total">{progress.answers.length}</dd></div><div><dt>La sabía</dt><dd>{known}</dd></div><div><dt>Regular</dt><dd>{partial}</dd></div><div><dt>No la sabía</dt><dd>{unknown}</dd></div></dl>
      <dl className="overview-details"><div><dt>Definiciones practicadas</dt><dd>{progress.answers.filter((answer) => answer.kind === 'definition').length}</dd></div><div><dt>Demostraciones practicadas</dt><dd>{progress.answers.filter((answer) => answer.kind === 'demonstration').length}</dd></div><div><dt>Última práctica</dt><dd>{lastPractice}</dd></div></dl>
      <div className="overview-available-topics"><span>Temas disponibles para entrenar</span>{topics.length ? topics.map((topic) => <span className="overview-topic-chip" key={topic.number}>{topic.title}</span>) : <span>{sheets.definition.loading || sheets.demonstration.loading ? 'Cargando…' : 'Sin temas cargados'}</span>}</div>
    </section>

    <section className="content-panel overview-panel" aria-label="Temas con actividad">
      <h2>Temas con actividad</h2>
      {activeTopics.length ? <ul className="overview-topic-list">{activeTopics.map((row) => <li key={row.number}><span className="overview-topic-number">{row.number}</span><div><span>{row.title}</span>{row.notes && <p>{row.notes}</p>}</div><span className="overview-topic-progress">{Math.round(rowProgress(row) * 100)}%</span></li>)}</ul> : <p className="overview-status">Sin pasos hechos o en curso.</p>}
    </section>
  </div>
}
