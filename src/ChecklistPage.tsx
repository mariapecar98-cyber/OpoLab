import { checklistSnapshot } from './checklistSnapshot'
import { checklistSummary, masteryLevels, rowProgress, stepStates, type MasteryLevel, type StepState } from './checklist'
import type { ChecklistState } from './useChecklist'

export function ChecklistPage({ checklist }: { checklist: ChecklistState }) {
  const { rows, error, updateRow, updateStep } = checklist
  const summary = checklistSummary(rows)
  const values = [summary.started, summary.mastered, summary.completed, summary.total, `${Math.round(summary.progress * 100)}%`]

  return <section className="checklist-page" aria-label="Checklist de temas">
    <h1 className="checklist-title">{checklistSnapshot.title}</h1>
    <p className="checklist-instruction">{checklistSnapshot.instruction}</p>
    {error && <p role="alert" className="checklist-error">{error}</p>}
    <dl className="checklist-summary">{checklistSnapshot.summaryLabels.map((label, index) => <div key={label}><dt>{label}</dt><dd>{values[index]}</dd></div>)}</dl>
    <div className="checklist-scroll" tabIndex={0} role="region" aria-label="Tabla del checklist de temas">
      <table className="checklist-table">
        <caption className="sr-only">{checklistSnapshot.title}</caption>
        <colgroup><col className="checklist-number-column" /><col className="checklist-title-column" /><col className="checklist-week-column" />{Array.from({ length: 15 }, (_, index) => <col className="checklist-step-column" key={index} />)}<col className="checklist-progress-column" /><col className="checklist-mastery-column" /><col className="checklist-notes-column" /></colgroup>
        <thead><tr>{checklistSnapshot.columns.map((label, index) => <th scope="col" key={index}>{label}</th>)}</tr></thead>
        <tbody>{rows.map((row) => <tr key={row.number}>
          <th scope="row">{row.number}</th><td className="checklist-topic-title">{row.title}</td>
          <td><input className="checklist-week-input" aria-label={`Semana del tema ${row.number}`} value={row.week} onChange={(event) => updateRow(row.number, (current) => ({ ...current, week: event.target.value }))} /></td>
          {row.steps.map((step, index) => <td className={step === 'Hecho' ? 'checklist-done' : step === 'En curso' ? 'checklist-in-progress' : ''} key={index}>
            <div className="checklist-step-control">
              <input type="checkbox" checked={step === 'Hecho'} ref={(element) => { if (element) element.indeterminate = step === 'En curso' }} aria-label={`Marcar como hecho: tema ${row.number}, ${checklistSnapshot.columns[index + 3]}`} onChange={(event) => updateStep(row.number, index, event.target.checked ? 'Hecho' : 'Pendiente')} />
              <select aria-label={`Estado: tema ${row.number}, ${checklistSnapshot.columns[index + 3]}`} value={step} onChange={(event) => updateStep(row.number, index, event.target.value as StepState)}>{stepStates.map((value) => <option value={value} key={value}>{value}</option>)}</select>
            </div>
          </td>)}
          <td className="checklist-row-progress">{Math.round(rowProgress(row) * 100)}%</td>
          <td className={row.mastery === 'Dominado' ? 'checklist-done' : ''}><select className="checklist-mastery-input" aria-label={`Nivel de dominio del tema ${row.number}`} value={row.mastery} onChange={(event) => updateRow(row.number, (current) => ({ ...current, mastery: event.target.value as MasteryLevel }))}>{masteryLevels.map((value) => <option value={value} key={value}>{value}</option>)}</select></td>
          <td><textarea className="checklist-notes-input" rows={2} aria-label={`Próxima mejora / errores del tema ${row.number}`} value={row.notes} onChange={(event) => updateRow(row.number, (current) => ({ ...current, notes: event.target.value }))} /></td>
        </tr>)}</tbody>
      </table>
    </div>
  </section>
}
