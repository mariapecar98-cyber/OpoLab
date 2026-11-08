import { useMemo, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Dices,
  Flame,
  Lightbulb,
  ListChecks,
  Menu,
  RotateCcw,
  X,
} from 'lucide-react'
import { selectedTopicNumbers, trainingItems, type TopicSelection } from './data'
import { StudyDataProvider, useStudyData } from './StudyData'
import { SheetPanel } from './SheetPanel'
import { ChecklistPage } from './ChecklistPage'
import { HomePage } from './HomePage'
import { ExercisesPage } from './ExercisesPage'
import { ProblemMock } from './ProblemMock'
import { useChecklist } from './useChecklist'
import { definitionsSheetId, demonstrationsSheetId, googleClientId } from './sheets'
import { loadProgress, saveProgress } from './storage'
import type { AnswerRecord, Page, SelfRating, StudyItem, StudyKind, StudyProgress } from './types'

const navigation: { id: Page; label: string; icon: typeof BookOpen }[] = [
  { id: 'home', label: 'Inicio', icon: BookOpen },
  { id: 'definitions', label: 'Definiciones', icon: BookOpen },
  { id: 'demonstrations', label: 'Demostraciones', icon: Lightbulb },
  { id: 'exercises', label: 'Ejercicios', icon: BookOpen },
  { id: 'checklist', label: 'Checklist de temas', icon: ListChecks },
  { id: 'train', label: 'Entrenar', icon: Dices },
]

const pageTitles: Record<Page, string> = {
  home: 'Inicio',
  definitions: 'Definiciones',
  demonstrations: 'Demostraciones',
  exercises: 'Ejercicios',
  checklist: 'Checklist de temas',
  train: 'Entrenar',
}

function shuffleItems(items: StudyItem[]): StudyItem[] {
  const shuffled = [...items]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled
}

function useProgress() {
  const [progress, setProgress] = useState<StudyProgress>(loadProgress)

  const updateProgress = (updater: (current: StudyProgress) => StudyProgress) => {
    setProgress((current) => {
      const next = updater(current)
      saveProgress(next)
      return next
    })
  }

  return { progress, updateProgress }
}

function AppContent() {
  const [page, setPage] = useState<Page>('home')
  const { progress, updateProgress } = useProgress()
  const checklist = useChecklist()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const goTo = (nextPage: Page) => {
    setPage(nextPage)
    setMobileMenuOpen(false)
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand />
        <div className="sidebar-label">TU PREPARACIÓN</div>
        <nav className="side-nav" aria-label="Navegación principal">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <button
                className={`nav-link ${page === item.id ? 'active' : ''}`}
                key={item.id}
                onClick={() => goTo(item.id)}
                aria-current={page === item.id ? 'page' : undefined}
              >
                <Icon size={19} strokeWidth={1.9} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>

      <main className="main-column">
        <header className="topbar">
          <div className="mobile-brand"><Brand /></div>
          <div className="breadcrumb"><span>Preparación</span><ChevronRight size={14} /><strong>{pageTitles[page]}</strong></div>
          <div className="topbar-right">
            <button
              className="mobile-menu-button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label={mobileMenuOpen ? 'Cerrar navegación' : 'Abrir navegación'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </header>
        {mobileMenuOpen && (
          <nav className="mobile-menu" aria-label="Navegación móvil">
            {navigation.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => goTo(id)} className={page === id ? 'selected' : ''}>
                <Icon size={18} />{label}
              </button>
            ))}
          </nav>
        )}
        <div className="page-content">
          {page === 'home' && <HomePage checklist={checklist} progress={progress} onNavigate={goTo} />}
          <div hidden={page !== 'definitions'}><SheetPanel kind="definition" targetSheetId={definitionsSheetId} /></div>
          <div hidden={page !== 'demonstrations'}><SheetPanel kind="demonstration" targetSheetId={demonstrationsSheetId} /></div>
          {page === 'checklist' && <ChecklistPage checklist={checklist} />}
          <div hidden={page !== 'exercises'}><ExercisesPage /></div>
          {page === 'train' && <TrainPage progress={progress} updateProgress={updateProgress} />}
        </div>
      </main>
      <nav className="mobile-tabbar" aria-label="Navegación inferior">
        {navigation.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => goTo(id)} className={page === id ? 'selected' : ''} aria-current={page === id ? 'page' : undefined}>
            <Icon size={19} strokeWidth={page === id ? 2.2 : 1.8} /><span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

function Brand() {
  return (
    <div className="brand-lockup">
      <div className="brand-mark"><span /><span /><span /><span /></div>
      <div><span className="brand-name">OpoLab</span></div>
    </div>
  )
}

function PageIntro({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="page-intro"><h1>{title}</h1>{children && <div className="intro-actions">{children}</div>}</div>
}

function TrainPage({ progress, updateProgress }: { progress: StudyProgress; updateProgress: (updater: (current: StudyProgress) => StudyProgress) => void }) {
  const [mode, setMode] = useState<'theory' | 'mock'>('theory')
  const { topics, definitions, demonstrations, allItems, sheets, refreshAll, connect, identityReady, authorizing, authError } = useStudyData()
  const [topicSelection, setTopicSelection] = useState<TopicSelection>('all')
  const selectedTopics = selectedTopicNumbers(topics, topicSelection)
  const loading = sheets.definition.loading || sheets.demonstration.loading
  const [selectedKinds, setSelectedKinds] = useState<StudyKind[]>(['definition', 'demonstration'])
  const [questionCount, setQuestionCount] = useState(5)
  const [questions, setQuestions] = useState<StudyItem[]>([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [sessionRatings, setSessionRatings] = useState<SelfRating[]>([])
  const [answer, setAnswer] = useState('')
  const [sessionStarted, setSessionStarted] = useState(false)

  const filteredItems = useMemo(() => trainingItems(allItems, topics, topicSelection, selectedKinds), [allItems, topics, topicSelection, selectedKinds])
  const currentQuestion = questions[questionIndex]
  const progressPercent = questions.length ? Math.round((questionIndex / questions.length) * 100) : 0

  const toggleTopic = (number: number) => setTopicSelection((current) => {
    const selected = selectedTopicNumbers(topics, current)
    return selected.includes(number) ? selected.filter((value) => value !== number) : [...selected, number]
  })
  const toggleKind = (kind: StudyKind) => setSelectedKinds((current) => current.includes(kind) ? current.filter((value) => value !== kind) : [...current, kind])
  const startTraining = () => {
    if (!filteredItems.length) return
    const shuffled = shuffleItems(filteredItems).slice(0, Math.min(questionCount, filteredItems.length))
    setQuestions(shuffled)
    setQuestionIndex(0)
    setSessionRatings([])
    setRevealed(false)
    setAnswer('')
    setSessionStarted(true)
  }
  const rateAnswer = (rating: SelfRating) => {
    if (!currentQuestion) return
    const kind = currentQuestion.kind
    const record: AnswerRecord = { itemId: currentQuestion.id, topicNumber: currentQuestion.topicNumber, kind, rating, answeredAt: new Date().toISOString() }
    updateProgress((current) => ({ ...current, answers: [...current.answers, record] }))
    const nextRatings = [...sessionRatings, rating]
    setSessionRatings(nextRatings)
    setAnswer('')
    if (questionIndex + 1 >= questions.length) {
      setQuestionIndex(questions.length)
    } else {
      setQuestionIndex((index) => index + 1)
      setRevealed(false)
    }
  }
  const restart = () => {
    setSessionStarted(false)
    setQuestions([])
    setQuestionIndex(0)
    setSessionRatings([])
    setAnswer('')
    setRevealed(false)
  }

  if (mode === 'mock') return <ProblemMock onBack={() => setMode('theory')} />

  if (sessionStarted && questionIndex >= questions.length) {
    const known = sessionRatings.filter((rating) => rating === 'known').length
    const partial = sessionRatings.filter((rating) => rating === 'partial').length
    const unknown = sessionRatings.filter((rating) => rating === 'unknown').length
    return <TrainingResults ratings={{ known, partial, unknown }} total={questions.length} onAgain={filteredItems.length ? startTraining : restart} onSetup={restart} />
  }

  if (sessionStarted && currentQuestion) {
    const isDefinition = currentQuestion.kind === 'definition'
    return <TrainingSession question={currentQuestion} questionNumber={questionIndex + 1} total={questions.length} progressPercent={progressPercent} isDefinition={isDefinition} revealed={revealed} setRevealed={setRevealed} answer={answer} setAnswer={setAnswer} onRate={rateAnswer} onExit={restart} />
  }

  return (
    <>
      <PageIntro title="Entrenar" />
      <div className="count-options training-modes" aria-label="Tipo de entrenamiento">
        <button className="selected" aria-pressed="true">Definiciones y demostraciones</button>
        <button aria-pressed="false" onClick={() => setMode('mock')}>Simulacro de problemas</button>
      </div>
      <div className="sheet-toolbar">
        <button className="button button-primary" onClick={() => void refreshAll()} disabled={loading || authorizing}>Actualizar temas</button>
        {googleClientId && <button className="button" onClick={() => void connect()} disabled={!identityReady || authorizing}>Autorizar Google</button>}
      </div>
      {loading && <p role="status">Cargando temas…</p>}
      {sheets.definition.error && <p role="alert">Definiciones: {sheets.definition.error}</p>}
      {sheets.demonstration.error && <p role="alert">Demostraciones: {sheets.demonstration.error}</p>}
      {authError && <p role="alert">{authError}</p>}
      <div className="training-layout">
        <section className="training-setup content-panel">
          <div className="setup-heading"><div className="training-icon"><Dices size={20} /></div><div><h2>Prepara tu sesión</h2></div></div>
          <div className="setup-section">
            <span className="setup-label">1. TEMAS</span>
            <div className="count-options">
              <button className={topicSelection === 'all' ? 'selected' : ''} aria-pressed={topicSelection === 'all'} onClick={() => setTopicSelection('all')}>Todos</button>
              <button className={topicSelection !== 'all' ? 'selected' : ''} aria-pressed={topicSelection !== 'all'} onClick={() => setTopicSelection((current) => current === 'all' ? [] : current)}>Elegir temas</button>
            </div>
            <div className="topic-chip-list">{topics.map((topic) => <button key={topic.number} className={`topic-chip ${selectedTopics.includes(topic.number) ? 'selected' : ''}`} aria-pressed={selectedTopics.includes(topic.number)} onClick={() => toggleTopic(topic.number)}>{topic.title}</button>)}</div>
            {!loading && !topics.length && <p role="status">No hay temas cargados con preguntas completas.</p>}
          </div>
          <div className="setup-section"><span className="setup-label">2. CONTENIDO</span><div className="kind-options"><button className={`kind-option ${selectedKinds.includes('definition') ? 'selected' : ''}`} aria-pressed={selectedKinds.includes('definition')} onClick={() => toggleKind('definition')}><span className="kind-check">{selectedKinds.includes('definition') && <Check size={12} />}</span><span className="kind-symbol definition-symbol"><BookOpen size={19} /></span><span className="kind-copy"><strong>Definiciones</strong><small>{definitions.filter((item) => selectedTopics.includes(item.topicNumber)).length} preguntas disponibles</small></span></button><button className={`kind-option ${selectedKinds.includes('demonstration') ? 'selected' : ''}`} aria-pressed={selectedKinds.includes('demonstration')} onClick={() => toggleKind('demonstration')}><span className="kind-check">{selectedKinds.includes('demonstration') && <Check size={12} />}</span><span className="kind-symbol demo-symbol"><Lightbulb size={19} /></span><span className="kind-copy"><strong>Demostraciones</strong><small>{demonstrations.filter((item) => selectedTopics.includes(item.topicNumber)).length} preguntas disponibles</small></span></button></div></div>
          <div className="setup-section question-count-section"><span className="setup-label">3. NÚMERO DE PREGUNTAS</span><div className="count-options">{[5, 10, 15].map((count) => <button key={count} className={questionCount === count ? 'selected' : ''} aria-pressed={questionCount === count} onClick={() => setQuestionCount(count)}>{count}</button>)}</div><span className="count-note">Hasta {Math.min(filteredItems.length, questionCount)} preguntas con esta selección</span></div>
          <button className="button button-primary start-button" onClick={startTraining} disabled={loading || authorizing || !filteredItems.length}><Dices size={17} /> Empezar sesión <ArrowRight size={16} /></button>
          {!loading && topics.length > 0 && !filteredItems.length && <p className="validation-note">No hay preguntas para la selección de temas y contenido.</p>}
        </section>
        <aside className="training-aside">
          <div className="training-history content-panel"><div className="panel-heading"><div><h2>Tus prácticas</h2></div><Flame size={18} className="history-flame" /></div><div className="history-stats"><div><strong>{progress.answers.length}</strong><span>respuestas</span></div><div><strong>{progress.answers.filter((item) => item.rating === 'known').length}</strong><span>ya las sabes</span></div></div></div>
        </aside>
      </div>
    </>
  )
}

function TrainingSession({ question, questionNumber, total, progressPercent, isDefinition, revealed, setRevealed, answer, setAnswer, onRate, onExit }: { question: StudyItem; questionNumber: number; total: number; progressPercent: number; isDefinition: boolean; revealed: boolean; setRevealed: (value: boolean) => void; answer: string; setAnswer: (value: string) => void; onRate: (rating: SelfRating) => void; onExit: () => void }) {
  return (
    <div className="session-wrap">
      <div className="session-top"><button className="back-button" onClick={onExit}><ArrowLeft size={16} /> Salir del entrenamiento</button><span>{questionNumber} de {total}</span></div>
      <div className="session-progress"><span style={{ width: `${progressPercent}%` }} /></div>
      <section className="question-card">
        <div className="question-meta"><span className={`question-kind ${isDefinition ? 'definition' : 'demonstration'}`}>{isDefinition ? <BookOpen size={14} /> : <Lightbulb size={14} />}{isDefinition ? 'DEFINICIÓN' : 'DEMOSTRACIÓN'}</span><span className="question-topic">TEMA {question.topicNumber}</span></div>
        <h1>{question.title}</h1>
        <div className="answer-prompt"><span>Escribe lo que recuerdas</span></div>
        <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} rows={5} aria-label="Tu respuesta" />
        {revealed && <div className="revealed-answer"><div className="revealed-title"><CheckCircle2 size={16} />{isDefinition ? 'Definición' : question.hint ? 'Pista para la demostración' : 'Demostración'}</div><p>{isDefinition ? question.content : question.hint ?? question.content}</p>{!isDefinition && question.hint && <details><summary>Ver enunciado completo</summary><p>{question.content}</p></details>}</div>}
        {!revealed ? <button className="button reveal-button" onClick={() => setRevealed(true)}><Lightbulb size={16} /> Revelar respuesta o pista</button> : <div className="rating-area"><span className="rating-title">¿Cómo te ha salido?</span><div className="rating-options"><button onClick={() => onRate('unknown')}><span className="rating-dot unknown" /><span>No la sabía</span></button><button onClick={() => onRate('partial')}><span className="rating-dot partial" /><span>Regular</span></button><button onClick={() => onRate('known')}><span className="rating-dot known" /><span>La sabía</span></button></div></div>}
      </section>
      <div className="session-footnote"><RotateCcw size={14} /> Tu autoevaluación queda guardada para consultar tu progreso.</div>
    </div>
  )
}

function TrainingResults({ ratings, total, onAgain, onSetup }: { ratings: { known: number; partial: number; unknown: number }; total: number; onAgain: () => void; onSetup: () => void }) {
  const knownPercent = total ? Math.round((ratings.known / total) * 100) : 0
  return <div className="results-wrap"><div className="results-mark"><CheckCircle2 size={30} /></div><span className="eyebrow">SESIÓN COMPLETADA</span><h1>Resultados</h1><div className="results-score"><div className="score-ring" style={{ background: `conic-gradient(var(--purple) ${knownPercent}%, #eee9f2 0)` }}><strong>{knownPercent}<small>%</small></strong></div><div><strong>{ratings.known} de {total} preguntas</strong></div></div><div className="results-breakdown"><div><i className="legend-dot known" /><span>La sabía</span><strong>{ratings.known}</strong></div><div><i className="legend-dot partial" /><span>Regular</span><strong>{ratings.partial}</strong></div><div><i className="legend-dot unknown" /><span>No la sabía</span><strong>{ratings.unknown}</strong></div></div><div className="results-actions"><button className="button button-primary" onClick={onAgain}><RotateCcw size={16} /> Practicar otra vez</button><button className="button button-outline" onClick={onSetup}>Volver a preparar</button></div></div>
}

export default function App() {
  return <StudyDataProvider><AppContent /></StudyDataProvider>
}
