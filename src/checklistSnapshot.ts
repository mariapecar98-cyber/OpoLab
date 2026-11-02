import source from './checklist-source.csv?raw'
import { parseCsv } from './sheets'
import { checklistFromRows } from './checklist'

// Copia estática de la pestaña 593932305. No se vuelve a consultar Google Sheets.
export const checklistSnapshot = checklistFromRows(parseCsv(source))
