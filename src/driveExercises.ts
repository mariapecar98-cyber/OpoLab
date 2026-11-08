export const exercisesFolder = '1nUvvf-JGeIjr1YGoiFAvuyumWXtC0pHo'
export const exerciseLevels = ['Nivel básico', 'Nivel oposición', 'Nivel difícil'] as const
export interface DriveFile { id: string; name: string; mimeType: string }
export interface ExerciseFile extends DriveFile { level: string; localUrl?: string }
const folderMime = 'application/vnd.google-apps.folder'

async function driveFetch(url: string, token: string, signal: AbortSignal) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/${url}`, { headers: { Authorization: `Bearer ${token}` }, signal })
  if (!response.ok) throw new Error(response.status === 401 ? 'La sesión ha caducado. Vuelve a conectar Google Drive.' : response.status === 403 ? 'Google Drive ha denegado el acceso. Comprueba los permisos de la carpeta y que Google Drive API esté habilitada.' : 'No se pudo leer Google Drive. Comprueba el acceso a la carpeta.')
  return response
}

export async function listFolder(id: string, token: string, signal: AbortSignal): Promise<DriveFile[]> {
  const files: DriveFile[] = []
  let pageToken = ''
  do {
    const params = new URLSearchParams({ q: `'${id}' in parents and trashed = false`, fields: 'nextPageToken,files(id,name,mimeType)', pageSize: '100', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true' })
    if (pageToken) params.set('pageToken', pageToken)
    const data = await (await driveFetch(`files?${params}`, token, signal)).json() as { files?: DriveFile[]; nextPageToken?: string }
    files.push(...data.files ?? []); pageToken = data.nextPageToken ?? ''
  } while (pageToken)
  return files
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
export async function listExerciseFiles(token: string, signal: AbortSignal) {
  const folders = await listFolder(exercisesFolder, token, signal)
  const files: ExerciseFile[] = []
  const missing: string[] = []
  async function walk(id: string, level: string): Promise<void> {
    for (const file of await listFolder(id, token, signal)) {
      if (file.mimeType === folderMime) await walk(file.id, level)
      else files.push({ ...file, level })
    }
  }
  for (const level of exerciseLevels) {
    const folder = folders.find((file) => file.mimeType === folderMime && normalize(file.name) === normalize(level))
    if (folder) await walk(folder.id, level)
    else missing.push(level)
  }
  return { files: files.sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true })), missing }
}

export async function readExerciseFile(file: DriveFile, token: string, signal: AbortSignal): Promise<string> {
  if (file.mimeType === 'application/vnd.google-apps.document') {
    return (await driveFetch(`files/${file.id}/export?mimeType=text%2Fplain`, token, signal)).text()
  }
  if (!(/\.pdf$/i.test(file.name) || /\.docx$/i.test(file.name) || file.mimeType === 'text/plain' || file.mimeType === 'application/pdf')) throw new Error('Este formato no admite lectura automática. Abre la ficha original.')
  const response = await driveFetch(`files/${file.id}?alt=media`, token, signal)
  if (file.mimeType === 'text/plain') return response.text()
  const buffer = await response.arrayBuffer()
  if (/\.docx$/i.test(file.name)) {
    const mammoth = await import('mammoth/mammoth.browser')
    return (await mammoth.extractRawText({ arrayBuffer: buffer })).value
  }
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href
  const task = pdfjs.getDocument({ data: buffer })
  const cancel = () => { void task.destroy() }
  signal.addEventListener('abort', cancel, { once: true })
  try {
    const pdf = await task.promise
    let text = ''
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number)
      const content = await page.getTextContent()
      let lastY: number | undefined
      for (const item of content.items) {
        if (!('str' in item)) continue
        const y = item.transform[5]
        if (lastY !== undefined && Math.abs(y - lastY) > 3) text += '\n'
        text += item.str + (item.hasEOL ? '\n' : ' ')
        lastY = item.hasEOL ? undefined : y
      }
      text += '\n'
    }
    return text
  } finally { signal.removeEventListener('abort', cancel); await task.destroy() }
}
