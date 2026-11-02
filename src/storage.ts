import type { StudyProgress } from './types'

const STORAGE_KEY = 'trazo-sheet-1n7akuyxwfm3t2fLMMRzu_cZti8NGzxbL_FVpcK5FY0E-v1'

export function createInitialProgress(): StudyProgress {
  return {
    checklist: {},
    answers: [],
  }
}

export function loadProgress(): StudyProgress {
  const initial = createInitialProgress()
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return initial

    const parsed: unknown = JSON.parse(stored)
    if (!parsed || typeof parsed !== 'object') return initial
    const candidate = parsed as Partial<StudyProgress>
    const checklist: StudyProgress['checklist'] = {}

    if (candidate.checklist && typeof candidate.checklist === 'object') {
      for (const [number, saved] of Object.entries(candidate.checklist)) {
        if (Array.isArray(saved)) {
          checklist[Number(number)] = saved.map((value) => value === true)
        }
      }
    }

    return {
      checklist,
      answers: Array.isArray(candidate.answers) ? candidate.answers : [],
    }
  } catch (error) {
    console.error('No se pudo leer el progreso guardado.', error)
    return initial
  }
}

export function saveProgress(progress: StudyProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch (error) {
    console.error('No se pudo guardar el progreso.', error)
  }
}
