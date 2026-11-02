import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseCsv } from './sheets.ts'
import { checklistFromRows, checklistSummary, decodeChecklist, encodeChecklist, rowProgress } from './checklist.ts'

const source = parseCsv(readFileSync(new URL('./checklist-source.csv', import.meta.url), 'utf8'))
const snapshot = checklistFromRows(source)

test('la copia conserva los 71 temas, los 21 encabezados y los estados de la hoja', () => {
  assert.equal(snapshot.title, 'OPOSICIONES · CONTROL DE TEMAS')
  assert.deepEqual(snapshot.columns, source[7])
  assert.equal(snapshot.rows.length, 71)
  for (const [index, row] of snapshot.rows.entries()) {
    const original = source[index + 8]
    assert.equal(row.number, Number(original[0]))
    assert.equal(row.title, original[1])
    assert.equal(row.week, original[2])
    assert.deepEqual(row.steps, original.slice(3, 18))
    assert.equal(row.mastery, original[19])
    assert.equal(row.notes, original[20])
    assert.equal(`${Math.round(rowProgress(row) * 100)}%`, original[18])
  }
  assert.equal(snapshot.rows[7].title, 'Sucesiones. Términos general y forma recurrente. Progresiones aritméticas y geométricas. Aplicaciones.')
  assert.equal(snapshot.rows[27].steps[8], 'En curso')
})

test('los totales coinciden con las fórmulas y los valores de la pestaña original', () => {
  const summary = checklistSummary(snapshot.rows)
  assert.deepEqual([summary.started, summary.mastered, summary.completed, summary.total, `${Math.round(summary.progress * 100)}%`].map(String), source[4].slice(0, 5))
  assert.equal(summary.completed, 48)
  assert.equal(summary.total, 1065)
})

test('marcar, desmarcar y editar se conserva al volver a cargar la copia local', () => {
  const rows = decodeChecklist(snapshot.rows, null)
  rows[7].steps[4] = 'Hecho'
  rows[7].steps[5] = 'En curso'
  rows[7].week = '3'
  rows[7].notes = 'Revisar el apartado final'
  rows[7].mastery = 'Dominado'
  const restored = decodeChecklist(snapshot.rows, encodeChecklist(rows))
  assert.deepEqual(restored, rows)
  assert.equal(checklistSummary(restored).completed, 49)
  assert.equal(checklistSummary(restored).mastered, 1)
  assert.equal(rowProgress(restored[7]), 5 / 15)
  restored[7].steps[4] = 'Pendiente'
  assert.equal(checklistSummary(decodeChecklist(snapshot.rows, encodeChecklist(restored))).completed, 48)
  assert.equal(snapshot.rows[7].steps[4], '')
  assert.equal(snapshot.rows[7].mastery, '')
})

test('el guardado no puede sustituir los títulos originales y rechaza datos inválidos', () => {
  const rows = decodeChecklist(snapshot.rows, null)
  rows[0].title = 'Título modificado fuera de la app'
  assert.equal(decodeChecklist(snapshot.rows, encodeChecklist(rows))[0].title, snapshot.rows[0].title)
  assert.throws(() => decodeChecklist(snapshot.rows, '{'), SyntaxError)
  assert.throws(() => decodeChecklist(snapshot.rows, '{"version":2,"rows":[]}'), /no es válida/)
  rows[0].steps[0] = 'estado desconocido'
  assert.throws(() => decodeChecklist(snapshot.rows, encodeChecklist(rows)), /no es válida/)
})
