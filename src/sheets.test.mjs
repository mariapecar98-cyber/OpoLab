import test from 'node:test'
import assert from 'node:assert/strict'
import { parseCsv, readSheet, definitionsSheetId as sheetId, demonstrationsSheetId } from './sheets.ts'

test('CSV conserva comas, saltos de línea, comillas, celdas vacías y Unicode', () => {
  assert.deepEqual(parseCsv('\uFEFFTema,Título,Notas\r\n1,"Álgebra, matrices","Línea 1\n""Línea 2"""\r\n2,,\r\n'), [
    ['Tema', 'Título', 'Notas'], ['1', 'Álgebra, matrices', 'Línea 1\n"Línea 2"'], ['2', '', ''],
  ])
  assert.deepEqual(parseCsv(''), [])
  assert.throws(() => parseCsv('"incompleto'), /incompleta/)
})

test('rechaza HTML de acceso y errores de permisos sin convertirlos en temas', async () => {
  const original = globalThis.fetch
  try {
    globalThis.fetch = async () => new Response('<html>Login</html>', { headers: { 'content-type': 'text/html' } })
    await assert.rejects(readSheet(), /autorización/)
    globalThis.fetch = async () => new Response('', { status: 401 })
    await assert.rejects(readSheet('expired'), /caducado/)
  } finally { globalThis.fetch = original }
})

test('lectura privada usa el gid enlazado y conserva las celdas originales', async () => {
  const original = globalThis.fetch
  const calls = []
  try {
    globalThis.fetch = async (url, options) => {
      calls.push({ url, options })
      return Response.json(calls.length === 1 ? { sheets: [
        { properties: { sheetId: 0, title: 'Otra' } },
        { properties: { sheetId, title: "Plan de María" } },
      ] } : { values: [['Tema', 'Nombre'], [23, 'Título original'], ['', false]] })
    }
    assert.deepEqual(await readSheet('test-token'), [['Tema', 'Nombre'], ['23', 'Título original'], ['', 'false']])
    assert.equal(calls.length, 2)
    assert.match(decodeURIComponent(calls[1].url), /values\/'Plan de María'/)
    assert.equal(calls[1].options.headers.Authorization, 'Bearer test-token')
    assert.equal(calls[1].options.method, undefined)
  } finally { globalThis.fetch = original }
})

test('cada pantalla lee exclusivamente la pestaña que tiene asignada', async () => {
  const original = globalThis.fetch
  const calls = []
  const otherSheetId = demonstrationsSheetId
  try {
    globalThis.fetch = async (url) => {
      calls.push(url)
      if (url.includes('export?')) return new Response('Tema,Nombre,Contenido\n1,Nombre original,Contenido original', { headers: { 'content-type': 'text/csv' } })
      if (url.includes('?fields=')) return Response.json({ sheets: [
        { properties: { sheetId, title: 'Primera' } },
        { properties: { sheetId: otherSheetId, title: 'Segunda' } },
      ] })
      return Response.json({ values: [['1', 'Nombre original', 'Contenido original']] })
    }
    await readSheet(undefined, undefined, otherSheetId)
    assert.equal(new URL(calls[0]).searchParams.get('gid'), String(otherSheetId))
    await readSheet('test-token', undefined, otherSheetId)
    assert.match(decodeURIComponent(calls.at(-1)), /values\/'Segunda'/)
    assert.ok(!calls.some((url) => decodeURIComponent(url).includes("values/'Primera'")))
  } finally { globalThis.fetch = original }
})
