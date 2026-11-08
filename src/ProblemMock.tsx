import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Dices, RotateCcw } from 'lucide-react'
import library from './exerciseLibrary.json'
import type { ParsedExercise } from './exerciseParser'
import { createProblemMock, type MockProblem } from './mockSelection'
import { ExerciseImage } from './ExerciseContent'

export function ProblemMock({ onBack }: { onBack: () => void }) {
  const [problems, setProblems] = useState<MockProblem[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const content = useRef<Record<string, ParsedExercise[]>>()
  const request = useRef<AbortController>()
  useEffect(() => () => request.current?.abort(), [])

  const start = async () => {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setBusy(true); setError('')
    try {
      if (!content.current) {
        const response = await fetch(`${import.meta.env.BASE_URL}exercises/content.json`, { signal: controller.signal })
        if (!response.ok) throw new Error('No se pudieron cargar los problemas. Vuelve a intentarlo.')
        content.current = await response.json() as Record<string, ParsedExercise[]>
      }
      if (!controller.signal.aborted) {
        setProblems(createProblemMock(library, content.current))
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } catch (reason) {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'No se pudo preparar el simulacro.')
    } finally { if (!controller.signal.aborted) setBusy(false) }
  }

  return <div className="problem-mock">
    <button className="back-button" onClick={onBack}><ArrowLeft size={16} /> Volver a Entrenar</button>
    <div className="page-intro"><h1>Simulacro de problemas</h1></div>
    <p>4 problemas de nivel oposición y 1 de nivel difícil, elegidos al azar y mezclados. Solo verás los enunciados, sin identificar su ficha de origen.</p>
    <button className="button button-primary" disabled={busy} onClick={() => void start()}>
      {problems.length ? <RotateCcw size={17} /> : <Dices size={17} />}{problems.length ? 'Nuevo simulacro' : 'Empezar simulacro'}
    </button>
    {busy && <p role="status">Preparando los cinco problemas…</p>}
    {error && <p role="alert">{error}</p>}
    {!!problems.length && <div className="mock-problems" aria-label="Problemas del simulacro">
      {problems.map((problem, index) => <article className="content-panel exercise-card" key={problem.id}>
        <h2>Problema {index + 1}</h2>
        {problem.images.map((src, part) => <ExerciseImage key={src} src={src} label={`Enunciado del problema ${index + 1}${problem.images.length > 1 ? ` · parte ${part + 1} de ${problem.images.length}` : ''}`} />)}
      </article>)}
    </div>}
  </div>
}
