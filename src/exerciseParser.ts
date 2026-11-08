export interface ParsedExercise { number: string; statement: string; solution: string; page?: number; solutionPage?: number; statementImages?: string[]; solutionImages?: string[]; mockImages?: string[] }

// Only explicit exercise and solution headings are used to avoid guessing answers.
export function parseExercises(text: string): ParsedExercise[] {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const result: ParsedExercise[] = []
  const answers = new Map<string, string[]>()
  let current: ParsedExercise | undefined
  let answer: string[] | undefined
  let finalAnswers = false
  for (const line of lines) {
    if (/^\s*(?:soluciones|respuestas)(?:\s+(?:de los ejercicios|al final))?\s*[:.]?\s*$/i.test(line)) {
      finalAnswers = true; current = undefined; answer = undefined; continue
    }
    const numbered = line.match(/^\s*(?:(?:ejercicio|problema)\s+(\d+)\s*[.):º°-]?|(?:\(?)(\d+)[.)])\s*(.*)$/i)
    const solution = line.match(/^\s*(?:soluci[oó]n|respuesta)(?:\s+(?:(?:del?\s+)?(?:ejercicio|problema)\s+)?(\d+))?\s*[:.)-]?\s*(.*)$/i)
    if (solution) {
      const number = solution[1] ?? current?.number
      answer = number ? (answers.get(number) ?? []) : undefined
      if (number && answer) { answers.set(number, answer); answer.push(solution[2]) }
      current = undefined
    } else if (numbered) {
      const number = numbered[1] ?? numbered[2]
      if (finalAnswers) { answer = answers.get(number) ?? []; answers.set(number, answer); answer.push(numbered[3]) }
      else {
        current = { number, statement: numbered[3], solution: '' }
        result.push(current); answer = undefined
      }
    } else if (answer) answer.push(line)
    else if (current) current.statement += '\n' + line
  }
  const seen = new Set<string>()
  for (const item of result) {
    if (seen.has(item.number)) throw new Error('La numeración se repite. Revisa la ficha original para evitar asociar soluciones incorrectas.')
    seen.add(item.number)
    item.statement = item.statement.trim()
    item.solution = (answers.get(item.number) ?? []).join('\n').trim()
  }
  return result.filter((item) => item.statement)
}
