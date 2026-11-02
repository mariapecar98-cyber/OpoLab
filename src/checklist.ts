export const stepStates = ['', 'Pendiente', 'En curso', 'Hecho'] as const
export const masteryLevels = ['', 'Sin empezar', 'Reconocimiento', 'Recuperación', 'Dominado'] as const
export type StepState = typeof stepStates[number]
export type MasteryLevel = typeof masteryLevels[number]

export interface ChecklistRow {
  number: number
  title: string
  week: string
  steps: StepState[]
  mastery: MasteryLevel
  notes: string
}

export interface ChecklistSnapshot {
  title: string
  instruction: string
  summaryLabels: string[]
  columns: string[]
  rows: ChecklistRow[]
}

export const checklistStorageKey = 'trazo-checklist-593932305-v1'

export function checklistFromRows(source: string[][]): ChecklistSnapshot {
  const columns = source[7]?.slice(0, 21)
  if (columns?.length !== 21 || columns[0] !== 'N.º') throw new Error('El formato de la copia del checklist no es válido.')
  const rows = source.slice(8).filter((row) => row.some((cell) => cell !== '')).map((row): ChecklistRow => {
    const steps = Array.from({ length: 15 }, (_, index) => row[index + 3] ?? '')
    const mastery = row[19] ?? ''
    if (!/^\d+$/.test(row[0]) || !row[1] || steps.some((step) => !stepStates.includes(step as StepState)) || !masteryLevels.includes(mastery as MasteryLevel)) throw new Error('Hay valores no reconocidos en la copia del checklist.')
    return { number: Number(row[0]), title: row[1], week: row[2] ?? '', steps: steps as StepState[], mastery: mastery as MasteryLevel, notes: row[20] ?? '' }
  })
  return { title: source[0][0], instruction: source[1][0], summaryLabels: source[3].slice(0, 5), columns, rows }
}

export function rowProgress(row: ChecklistRow): number {
  return row.steps.length ? row.steps.filter((step) => step === 'Hecho').length / row.steps.length : 0
}

export function checklistSummary(rows: ChecklistRow[]) {
  const completed = rows.reduce((sum, row) => sum + row.steps.filter((step) => step === 'Hecho').length, 0)
  const total = rows.reduce((sum, row) => sum + row.steps.length, 0)
  // La fórmula original de «Temas iniciados» cuenta los títulos no vacíos.
  return { started: rows.filter((row) => row.title !== '').length, mastered: rows.filter((row) => row.mastery === 'Dominado').length, completed, total, progress: total ? completed / total : 0 }
}

export function encodeChecklist(rows: ChecklistRow[]): string {
  return JSON.stringify({ version: 1, rows })
}

export function decodeChecklist(baseRows: ChecklistRow[], stored: string | null): ChecklistRow[] {
  if (stored === null) return baseRows.map((row) => ({ ...row, steps: [...row.steps] }))
  const data: unknown = JSON.parse(stored)
  if (!data || typeof data !== 'object' || !('version' in data) || data.version !== 1 || !('rows' in data) || !Array.isArray(data.rows)) throw new Error('La copia guardada del checklist no es válida.')
  const saved = new Map<number, Partial<ChecklistRow>>()
  for (const entry of data.rows) {
    if (!entry || typeof entry !== 'object' || typeof entry.number !== 'number') throw new Error('La copia guardada del checklist no es válida.')
    saved.set(entry.number, entry)
  }
  return baseRows.map((base) => {
    const row = saved.get(base.number)
    if (!row) return { ...base, steps: [...base.steps] }
    if (typeof row.week !== 'string' || typeof row.notes !== 'string' || !masteryLevels.includes(row.mastery as MasteryLevel) || !Array.isArray(row.steps) || row.steps.length !== base.steps.length || row.steps.some((step) => !stepStates.includes(step))) throw new Error('La copia guardada del checklist no es válida.')
    return { ...base, week: row.week, notes: row.notes, mastery: row.mastery as MasteryLevel, steps: [...row.steps] }
  })
}
