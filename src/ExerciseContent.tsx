import { useState } from 'react'

export function ExerciseImage({ src, label }: { src: string; label: string }) {
  const [failed, setFailed] = useState(false)
  const url = `${import.meta.env.BASE_URL}${src.replace(/^\//, '')}`
  return failed ? <p role="status">No se pudo cargar este recorte. Consulta la página del PDF original.</p> :
    <a className="exercise-image-link" href={url} target="_blank" rel="noreferrer" aria-label={`${label}. Abrir imagen ampliada`}>
      <img className="exercise-image" src={url} alt={label} loading="lazy" decoding="async" onError={() => setFailed(true)} />
    </a>
}

export function ExerciseContent({ images, text, label }: { images?: string[]; text: string; label: string }) {
  if (!images?.length) return <div className="exercise-text">{text}</div>
  return <div className="exercise-captures">
    {images.map((src, index) => <ExerciseImage key={src} src={src} label={`${label}${images.length > 1 ? ` · parte ${index + 1} de ${images.length}` : ''}`} />)}
    <details className="exercise-transcript"><summary>Consultar texto extraído</summary><div className="exercise-text">{text}</div></details>
  </div>
}
