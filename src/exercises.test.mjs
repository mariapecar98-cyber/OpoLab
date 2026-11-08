import test from 'node:test'
import assert from 'node:assert/strict'
import { parseExercises } from './exerciseParser.ts'
import { listFolder, listExerciseFiles } from './driveExercises.ts'
import { readFileSync } from 'node:fs'
import { createProblemMock } from './mockSelection.ts'

test('el simulacro elige 4 de oposición y 1 difícil, sin repetir ni incluir nivel básico', () => {
  const sources = JSON.parse(readFileSync(new URL('./exerciseLibrary.json', import.meta.url)))
  const content = JSON.parse(readFileSync(new URL('../public/exercises/content.json', import.meta.url)))
  for (const value of [0, 0.25, 0.5, 0.99]) {
    const selected = createProblemMock(sources, content, () => value)
    assert.equal(selected.length, 5)
    assert.equal(selected.filter(item => item.level === 'Nivel oposición').length, 4)
    assert.equal(selected.filter(item => item.level === 'Nivel difícil').length, 1)
    assert.equal(new Set(selected.map(item => item.id)).size, 5)
    for (const problem of selected) {
      assert.ok(problem.images.length)
      for (const image of problem.images) {
        assert.match(image, /^\/exercises\/mock\/[a-f0-9]{24}\.webp$/)
        assert.ok(readFileSync(new URL(`../public${image}`, import.meta.url)).length > 0)
      }
      assert.deepEqual(Object.keys(problem).sort(), ['id', 'images', 'level'])
    }
  }
  const before = JSON.stringify(content)
  createProblemMock(sources, content)
  assert.equal(JSON.stringify(content), before)
  assert.throws(() => createProblemMock(sources, {}), /4 de oposición y 1 difícil/)
})

test('las fichas importadas separan enunciados y soluciones y conservan su página', () => {
  const content = JSON.parse(readFileSync(new URL('../public/exercises/content.json', import.meta.url)))
  const complex = content['1tJnASSYAuGYYDRNJ-cMUYsOjYVMEbndB']
  assert.equal(complex.length, 11)
  assert.match(complex[0].statement, /Realiza las siguientes operaciones/)
  assert.doesNotMatch(complex[0].statement, /El módulo de las raíces/)
  assert.match(complex[0].solution, /El módulo de las raíces/)
  const finalAnswers = content['1siU99z_W6G8ZzGTPuhnAoTduy0ITD1W2']
  assert.equal(finalAnswers.length, 17)
  assert.match(finalAnswers[1].solution, /Cat97/)
  assert.ok(finalAnswers[1].solutionPage > finalAnswers[1].page)
  // This source contains statements only: don't manufacture solutions.
  assert.ok(content['1GVEqJMDMH-SeUQtCiStUrTzll6B07d_L'].every(item => !item.solution))
  for (const items of Object.values(content)) {
    assert.equal(new Set(items.map(item => item.number)).size, items.length)
    assert.ok(items.every(item => item.statement && item.page > 0))
    for (const item of items) {
      assert.ok(item.statementImages?.length, `Falta el recorte del ejercicio ${item.number}`)
      if (item.solution) assert.ok(item.solutionImages?.length, `Falta el recorte de la solución ${item.number}`)
      for (const image of [...item.statementImages, ...item.solutionImages ?? []]) {
        const bytes = readFileSync(new URL(`../public${image}`, import.meta.url))
        assert.equal(bytes.toString('ascii', 0, 4), 'RIFF')
        assert.equal(bytes.toString('ascii', 8, 12), 'WEBP')
      }
    }
  }
})

test('asocia soluciones intercaladas sin mostrarlas en el enunciado', () => {
  assert.deepEqual(parseExercises('Ejercicio 1. Calcula x\nSolución: x = 2\nEjercicio 2. Calcula y\nSolución\ny = 3'), [
    { number: '1', statement: 'Calcula x', solution: 'x = 2' },
    { number: '2', statement: 'Calcula y', solution: 'y = 3' },
  ])
})
test('asocia soluciones finales por número, incluso en otro orden', () => {
  assert.deepEqual(parseExercises('1. Calcula x\n2. Calcula y\nSoluciones\n2. y = 3\n1. x = 2').map(x => x.solution), ['x = 2', 'y = 3'])
})
test('no inventa respuestas y rechaza numeración ambigua', () => {
  assert.equal(parseExercises('1. Sin respuesta')[0].solution, '')
  assert.deepEqual(parseExercises('Ficha sin numeración'), [])
  assert.throws(() => parseExercises('1. Primera\n1. Repetida'), /repite/)
})
test('Drive pagina y envía el token solo como cabecera', async () => {
  const original = globalThis.fetch
  const calls = []
  try {
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options })
      return Response.json(calls.length === 1 ? { files: [{ id: 'a' }], nextPageToken: 'next' } : { files: [{ id: 'b' }] })
    }
    assert.equal((await listFolder('folder', 'secret', new AbortController().signal)).length, 2)
    assert.match(calls[1].url, /pageToken=next/)
    assert.equal(calls[0].options.headers.Authorization, 'Bearer secret')
    assert.ok(!calls[0].url.includes('secret'))
  } finally { globalThis.fetch = original }
})
test('Drive distingue carpetas vacías de permisos denegados', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = async () => Response.json({ files: [] })
    assert.equal((await listExerciseFiles('token', new AbortController().signal)).missing.length, 3)
    globalThis.fetch = async () => new Response('', { status: 403 })
    await assert.rejects(listExerciseFiles('token', new AbortController().signal), /denegado/)
  } finally { globalThis.fetch = original }
})
