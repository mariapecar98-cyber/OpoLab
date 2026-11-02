export const spreadsheetId = '1n7akuyxwfm3t2fLMMRzu_cZti8NGzxbL_FVpcK5FY0E'
export const definitionsSheetId = 5660576
export const demonstrationsSheetId = 563886457

export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], value = '', quoted = false
  text = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i++ }
      else quoted = !quoted
    } else if (!quoted && (char === ',' || char === '\n' || char === '\r')) {
      row.push(value); value = ''
      if (char !== ',') {
        rows.push(row); row = []
        if (char === '\r' && text[i + 1] === '\n') i++
      }
    } else value += char
  }
  if (quoted) throw new Error('La respuesta CSV está incompleta.')
  if (value || row.length) { row.push(value); rows.push(row) }
  return rows
}

export async function readSheet(token?: string, signal?: AbortSignal, targetSheetId = definitionsSheetId): Promise<string[][]> {
  if (!token) {
    const response = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${targetSheetId}`, { signal, credentials: 'omit' })
    if (!response.ok || response.headers.get('content-type')?.includes('text/html')) {
      throw new Error('La hoja requiere autorización de Google.')
    }
    return parseCsv(await response.text())
  }
  const headers = { Authorization: `Bearer ${token}` }
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}`
  const metadata = await fetch(`${base}?fields=sheets.properties`, { headers, signal })
  if (!metadata.ok) throw new Error(metadata.status === 401 ? 'La sesión ha caducado. Vuelve a autorizar Google.' : 'No se puede acceder a la hoja. Comprueba los permisos y la API de Google Sheets.')
  const info = await metadata.json() as { sheets: { properties: { sheetId: number; title: string } }[] }
  const tab = info.sheets.find((sheet) => sheet.properties.sheetId === targetSheetId)
  if (!tab) throw new Error('No se encuentra la pestaña enlazada.')
  const range = encodeURIComponent(`'${tab.properties.title.replace(/'/g, "''")}'`)
  const response = await fetch(`${base}/values/${range}`, { headers, signal })
  if (!response.ok) throw new Error('No se pudieron leer las celdas de la hoja.')
  const data = await response.json() as { values?: (string | number | boolean)[][] }
  return (data.values ?? []).map((row) => row.map(String))
}

interface TokenResponse { access_token?: string; error?: string }
interface GoogleIdentity {
  accounts: { oauth2: { initTokenClient(config: {
    client_id: string; scope: string
    callback: (response: TokenResponse) => void
    error_callback: () => void
  }): { requestAccessToken(): void } } }
}

declare global { interface Window { google?: GoogleIdentity } }
export const googleClientId = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_GOOGLE_CLIENT_ID

let identityLoad: Promise<void> | undefined
export function loadGoogleIdentity(): Promise<void> {
  if (window.google) return Promise.resolve()
  if (!identityLoad) identityLoad = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => { identityLoad = undefined; script.remove(); reject(new Error('No se pudo cargar la autorización de Google.')) }
    document.head.appendChild(script)
  })
  return identityLoad
}

export function authorizeGoogle(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!window.google || !googleClientId) { reject(new Error('Falta configurar la conexión de Google.')); return }
    window.google.accounts.oauth2.initTokenClient({
      client_id: googleClientId,
      scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
      callback: (response) => response.access_token ? resolve(response.access_token) : reject(new Error('Google no ha autorizado el acceso.')),
      error_callback: () => reject(new Error('La autorización se ha cancelado.')),
    }).requestAccessToken()
  })
}
