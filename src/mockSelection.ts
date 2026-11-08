import type { ParsedExercise } from './exerciseParser'

interface Source { id: string; level: string }
export interface MockProblem { id: string; level: string; images: string[] }

function shuffled<T>(items: T[], random: () => number): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index--) {
    const next = Math.floor(random() * (index + 1))
    ;[result[index], result[next]] = [result[next], result[index]]
  }
  return result
}

export function createProblemMock(sources: Source[], content: Record<string, ParsedExercise[]>, random = Math.random): MockProblem[] {
  const unique = new Map<string, MockProblem>()
  for (const source of sources) {
    if (source.level !== 'Nivel oposición' && source.level !== 'Nivel difícil') continue
    for (const item of content[source.id] ?? []) {
      // Only use visually separated statements with anonymous image assets.
      if (!item.mockImages?.length) continue
      const id = `${source.id}:${item.number}`
      unique.set(id, { id, level: source.level, images: item.mockImages })
    }
  }
  const pool = [...unique.values()]
  const opposition = pool.filter(item => item.level === 'Nivel oposición')
  const difficult = pool.filter(item => item.level === 'Nivel difícil')
  if (opposition.length < 4 || difficult.length < 1) throw new Error('No hay suficientes enunciados disponibles para preparar el simulacro: se necesitan 4 de oposición y 1 difícil.')
  return shuffled([...shuffled(opposition, random).slice(0, 4), ...shuffled(difficult, random).slice(0, 1)], random)
}
