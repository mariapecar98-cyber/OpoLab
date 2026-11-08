import fs from 'node:fs'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { createCanvas } from '@napi-rs/canvas'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'

// This importer is specific to the layout of the bundled ViMat worksheets.
// Coordinates distinguish exercise labels from numbers inside formulas.
const library = JSON.parse(fs.readFileSync('src/exerciseLibrary.json', 'utf8'))
const output = {}
for (const file of library) {
  const pdf = await getDocument({ data: new Uint8Array(fs.readFileSync(`public${file.localUrl}`)), verbosity: 0,
    standardFontDataUrl: pathToFileURL(path.resolve('node_modules/pdfjs-dist/standard_fonts') + path.sep).href,
    useSystemFonts: true }).promise
  const chunks = []
  for (let page = 1; page <= pdf.numPages; page++) {
    const content = await (await pdf.getPage(page)).getTextContent()
    const items = content.items.filter(item => 'str' in item && item.str.trim() && item.transform[5] > 75 && item.transform[5] < 775)
    let line = null
    for (const item of items) {
      const x = item.transform[4], y = item.transform[5]
      if (!line || Math.abs(y - line.y) > 3) {
        line = { text: '', x, y, top: y + item.height + 5, page, first: item.str.trim(), firstWidth: item.width }
        chunks.push(line)
      }
      const gap = line.lastRight === undefined ? 0 : x - line.lastRight
      line.text += (line.text && gap > 1 ? ' ' : '') + item.str
      line.lastRight = x + item.width
      line.top = Math.max(line.top, y + item.height + 5)
    }
  }
  const result = [], solutions = new Map()
  const spans = []
  let span
  const boundary = line => ({ page: line.page, y: line.top })
  const finish = end => { if (span) { span.end = end; spans.push(span); span = undefined } }
  let current, mode = 'statement', lastNumber = 0, lastSolution = 0
  const separate = chunks.some(line => /^Soluciones\s+ficha/i.test(line.text.trim()))
  for (const line of chunks) {
    // A0 continues with diagrams and other independently numbered sections.
    // Keep only its first statement section until those layouts are reviewed.
    if (file.id === '19ZZd-NpexYCX1Y3tHMo5kP2Yyi9Qebyz' && line.page > 2) { finish({ page: 2, y: 75 }); break }
    const text = line.text.replace(/\s+/g, ' ').trim()
    if (/^Soluciones\s+ficha/i.test(text)) { finish(boundary(line)); mode = 'final'; current = undefined; continue }
    const heading = line.x < 78 && /^(\d{1,2})(?:\s+(.+))?$/.exec(text)
    if (heading && /^\d+(?:\s|$)/.test(line.first)) {
      const number = Number(heading[1])
      // Final solutions must follow the numbering of the statement section.
      const accepted = mode === 'final'
        ? number === lastSolution + 1 && result.some(item => Number(item.number) === number)
        : number === lastNumber + 1 || (number === 20 && lastNumber === 14 && file.id === '1VDIIeHxR_JBVuCanvWIJCFsIFQDC0Qki')
      if (accepted) {
        finish(boundary(line))
        if (mode === 'final') {
          lastSolution = number
          current = { text: heading[2] || '', page: line.page }
          solutions.set(String(number), current)
        } else {
          lastNumber = number
          mode = 'statement'
          current = { number: String(number), statement: heading[2] || '', solution: '', page: line.page }
          result.push(current)
        }
        span = { number: String(number), kind: mode === 'final' ? 'solution' : 'statement', start: boundary(line) }
        continue
      }
    }
    if (!current) continue
    if (mode === 'final') { current.text += '\n' + text; continue }
    const answer = /^(?:\d+\.\s*)?Soluci[oó]n(?:\s+(?:alternativa|sencilla))?(?:\s+\d+)?\s*(?::\s*(.*)|$)/i.exec(text)
    if (answer && !separate) {
      if (mode !== 'solution') {
        finish(boundary(line))
        span = { number: current.number, kind: 'solution', start: boundary(line) }
        current.solutionPage = line.page; mode = 'solution'
      }
      current.solution += '\n' + (answer[1] || '')
    } else current[mode] += '\n' + text
  }
  finish({ page: pdf.numPages, y: 75 })
  for (const item of result) {
    const answer = solutions.get(item.number)
    if (answer) { item.solution = answer.text; item.solutionPage = answer.page }
    item.statement = item.statement.trim()
    item.solution = item.solution.trim()
  }
  const imageDir = `public/exercises/images/${file.id}`
  fs.mkdirSync(imageDir, { recursive: true })
  fs.mkdirSync('public/exercises/mock', { recursive: true })
  const cropsByPage = new Map()
  for (const region of spans) {
    const item = result.find(item => item.number === region.number)
    const key = region.kind === 'statement' ? 'statementImages' : 'solutionImages'
    item[key] ??= []
    for (let page = region.start.page; page <= region.end.page; page++) {
      if (page === region.end.page && region.end.y >= 775) continue
      const filename = `${region.number}-${region.kind}-${page}.webp`
      const crop = { top: page === region.start.page ? region.start.y : 775,
        bottom: page === region.end.page ? region.end.y : 75, filename, region, item }
      if (crop.top - crop.bottom < 2) continue
      item[key].push(`/exercises/images/${file.id}/${filename}`)
      if (region.kind === 'statement' && item.solution && file.level !== 'Nivel básico') {
        crop.mockName = createHash('sha256').update(`${file.id}/${filename}`).digest('hex').slice(0, 24) + '.webp'
        item.mockImages ??= []
        item.mockImages.push(`/exercises/mock/${crop.mockName}`)
      }
      if (!cropsByPage.has(page)) cropsByPage.set(page, [])
      cropsByPage.get(page).push(crop)
    }
  }
  for (const [number, crops] of cropsByPage) {
    const page = await pdf.getPage(number)
    const scale = 2
    const viewport = page.getViewport({ scale })
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height))
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
    const content = await page.getTextContent()
    for (const crop of crops) {
      const y = Math.max(0, Math.floor(viewport.height - crop.top * scale))
      const height = Math.min(canvas.height - y, Math.ceil((crop.top - crop.bottom) * scale))
      const image = createCanvas(canvas.width - 60, height)
      image.getContext('2d').drawImage(canvas, 30, y, image.width, height, 0, 0, image.width, height)
      fs.writeFileSync(`${imageDir}/${crop.filename}`, image.toBuffer('image/webp'))
      if (crop.mockName) {
        const ctx = image.getContext('2d')
        ctx.fillStyle = '#fff'
        // Permanently remove worksheet headings, references, and the original
        // exercise label from the pixels, including the enlarged image.
        for (const line of chunks.filter(line => line.page === number)) {
          if (/ficha|vimat|www\.|revisado|revisi[oó]n/i.test(line.text)) {
            const top = viewport.height - line.top * scale - y
            ctx.fillRect(0, top - 3, image.width, (line.top - line.y + 5) * scale + 6)
          }
        }
        if (number === crop.region.start.page) {
          const heading = chunks.find(line => line.page === number && line.top === crop.region.start.y)
          if (heading) {
            const labelItems = content.items.filter(item => 'str' in item && /^\d+$/.test(item.str.trim()) && Math.abs(item.transform[5] - heading.y) < 2 && item.transform[4] < 78)
            for (const label of labelItems) {
              ctx.fillRect(label.transform[4] * scale - 30 - 2, viewport.height - (label.transform[5] + label.height) * scale - y - 2, label.width * scale + 4, label.height * scale + 6)
            }
          }
        }
        fs.writeFileSync(`public/exercises/mock/${crop.mockName}`, image.toBuffer('image/webp'))
      }
    }
    page.cleanup()
  }
  output[file.id] = result
  console.log(`${file.name}: ${result.length} ejercicios, ${result.filter(item => item.solution).length} soluciones`)
  await pdf.destroy()
}
fs.mkdirSync('public/exercises', { recursive: true })
fs.writeFileSync('public/exercises/content.json', JSON.stringify(output))
