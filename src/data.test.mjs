import test from 'node:test'
import assert from 'node:assert/strict'
import { selectedTopicNumbers, studyItemsFromRows, topicsFromItems, trainingItems } from './data.ts'

const header = ['Número de tema', 'Nombre', 'Contenido']
const definitions = studyItemsFromRows([header, ['8', 'Definición de prueba', 'Contenido original\nSegunda línea']], 'definition')
const demonstrations = studyItemsFromRows([header, ['8', 'Demostración de prueba', 'Demostración original']], 'demonstration')
const items = [...definitions, ...demonstrations]

test('el catálogo toma A, B y C, omite el encabezado y conserva el contenido', () => {
  assert.equal(definitions.length, 1)
  assert.deepEqual({ ...definitions[0], id: undefined }, {
    id: undefined, kind: 'definition', topicNumber: 8, title: 'Definición de prueba', content: 'Contenido original\nSegunda línea',
  })
  assert.equal(demonstrations[0].kind, 'demonstration')
  assert.deepEqual(studyItemsFromRows([header, [], ['', '', ''], ['8', '', ''], ['Tema', 'Texto', 'Texto'], ['-1', 'Texto', 'Texto']], 'definition'), [])
})

test('el tema 8 aparece una sola vez aunque exista en ambas pestañas', () => {
  const topics = topicsFromItems(items)
  assert.deepEqual(topics.map((topic) => topic.number), [8])
  assert.deepEqual(selectedTopicNumbers(topics, 'all'), [8])
  assert.equal(trainingItems(items, topics, [8], ['definition', 'demonstration']).length, 2)
})

test('Todos incluye nuevos temas tras actualizar y la selección manual se conserva', () => {
  const added = studyItemsFromRows([header, ['12', 'Otro contenido', 'Respuesta'], ['3', 'Contenido anterior', 'Respuesta']], 'definition')
  const updatedItems = [...items, ...added]
  const topics = topicsFromItems(updatedItems)
  assert.deepEqual(selectedTopicNumbers(topics, 'all'), [3, 8, 12])
  assert.equal(trainingItems(updatedItems, topics, 'all', ['definition', 'demonstration']).length, 4)
  assert.deepEqual(trainingItems(updatedItems, topics, [8], ['definition', 'demonstration']).map((item) => item.topicNumber), [8, 8])
  assert.deepEqual(selectedTopicNumbers(topicsFromItems(added), [8]), [])
})

test('las preguntas respetan los temas y los tipos de contenido seleccionados', () => {
  const topics = topicsFromItems(items)
  assert.deepEqual(trainingItems(items, topics, [8], ['definition']), definitions)
  assert.deepEqual(trainingItems(items, topics, 'all', ['demonstration']), demonstrations)
  assert.deepEqual(trainingItems(items, topics, [], ['definition', 'demonstration']), [])
  assert.deepEqual(trainingItems(items, topics, 'all', []), [])
  assert.deepEqual(trainingItems([], [], 'all', ['definition']), [])
})

test('añadir o reordenar filas no cambia la identidad de las preguntas existentes', () => {
  const updated = studyItemsFromRows([header, ['12', 'Nuevo', 'Nuevo contenido'], ['8', 'Definición de prueba', 'Contenido original\nSegunda línea']], 'definition')
  assert.equal(updated[1].id, definitions[0].id)
})
