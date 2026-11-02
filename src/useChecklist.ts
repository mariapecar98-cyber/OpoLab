import { useState } from 'react'
import { checklistSnapshot } from './checklistSnapshot'
import { checklistStorageKey, decodeChecklist, encodeChecklist, type ChecklistRow, type StepState } from './checklist'

function loadChecklist() {
  try { return { rows: decodeChecklist(checklistSnapshot.rows, localStorage.getItem(checklistStorageKey)), error: '' } }
  catch { return { rows: decodeChecklist(checklistSnapshot.rows, null), error: 'No se pudo recuperar el checklist guardado. Se muestra la copia original.' } }
}

export function useChecklist() {
  const [state, setState] = useState(loadChecklist)

  function updateRow(number: number, update: (row: ChecklistRow) => ChecklistRow) {
    const nextRows = state.rows.map((row) => row.number === number ? update(row) : row)
    try {
      localStorage.setItem(checklistStorageKey, encodeChecklist(nextRows))
      setState({ rows: nextRows, error: '' })
    } catch {
      setState({ rows: nextRows, error: 'No se pudieron guardar los cambios. Esta modificación solo está disponible mientras la página siga abierta.' })
    }
  }

  function updateStep(number: number, index: number, value: StepState) {
    updateRow(number, (row) => ({ ...row, steps: row.steps.map((step, stepIndex) => stepIndex === index ? value : step) }))
  }

  return { ...state, updateRow, updateStep }
}

export type ChecklistState = ReturnType<typeof useChecklist>
