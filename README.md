# OpoLab

React, TypeScript y Vite. Ejecutar `npm install` y `npm run dev`.
Verificar con `npm run build`.

## Publicar con Git y Netlify

El repositorio local utiliza la rama `main`. Crear un repositorio privado vacío
en GitHub (sin generar README, licencia ni `.gitignore`, que ya están en el
proyecto) y conectar su URL como remoto `origin` antes del primer push.

En Netlify: Add new project → Import an existing project → GitHub → seleccionar
el repositorio. `netlify.toml` configura `npm run build` y la carpeta `dist`.
Los pushes a la rama de producción activan un nuevo despliegue.

El repositorio excluye `node_modules`, `dist`, `.tmp` y los archivos `.env`,
excepto `.env.example`. El guardado del progreso sigue siendo local al navegador;
publicar desde Git no añade sincronización entre dispositivos.

## Google Sheets

Definiciones: https://docs.google.com/spreadsheets/d/1n7akuyxwfm3t2fLMMRzu_cZti8NGzxbL_FVpcK5FY0E/edit?gid=5660576

Demostraciones: https://docs.google.com/spreadsheets/d/1n7akuyxwfm3t2fLMMRzu_cZti8NGzxbL_FVpcK5FY0E/edit?gid=563886457

La hoja requiere autorización (comprobado: HTTP 401). No se incluyen temas,
preguntas ni sesiones de ejemplo. «Definiciones» y «Demostraciones» son pantallas
separadas, cada una con su buscador. Muestran la columna A como número de tema,
la B como nombre y la C como definición o demostración, respectivamente.
La primera fila de cada pestaña es el encabezado y se excluye de los datos.
Cada buscador consulta las tres columnas de su pantalla a partir de la segunda fila.
Las fuentes están asignadas en `src/sheets.ts`: Definiciones usa el `gid`
`5660576` y Demostraciones usa el `gid` `563886457`.
No se infiere el tipo de contenido a partir del texto ni se duplica la fuente
de Definiciones en Demostraciones.
Inicio resume el checklist, los contenidos disponibles y las respuestas de
entrenamiento. El resumen del checklist cambia al marcar pasos y comparte los
datos guardados con su tabla. Calendario y Estadísticas no aparecen en el menú.

Entrenar comparte los datos cargados por Definiciones y Demostraciones. Los
temas disponibles se obtienen de la columna A de ambas pestañas, sin duplicados
y ordenados por número. Solo se usan filas con número de tema entero positivo,
nombre y contenido. La primera fila se omite siempre.

«Todos» incluye todos los temas disponibles, también los que aparezcan después
al pulsar «Actualizar temas». «Elegir temas» permite marcar temas concretos y
conserva esa selección al actualizar. Se puede filtrar por definiciones,
demostraciones o ambas. La autorización de Google se comparte entre las tres
pantallas y permite cargar ambas pestañas de una vez.

## Checklist de temas

La pantalla «Checklist de temas» sustituye a la pestaña `593932305` con una copia
estática en `src/checklist-source.csv`: los 71 temas, 15 pasos por tema, los
21 encabezados, los estados existentes, los niveles de dominio y las notas.
No consulta ni modifica esa pestaña durante el uso de la app.

El checkbox marca «Hecho» o devuelve a «Pendiente». El desplegable permite
conservar también «En curso» o la celda vacía. Semana, nivel de dominio y notas
son editables. Los porcentajes y los totales reproducen las fórmulas originales;
«Temas iniciados» cuenta las filas con título, igual que en la hoja.

Los cambios se guardan en el navegador con la clave
`trazo-checklist-593932305-v1`, separados de las respuestas de Entrenar. Se
conservan al recargar y cambiar de pantalla en ese navegador y origen. No hay
sincronización entre dispositivos. Si el guardado falla, la página lo indica.

## Autorizar Google Sheets

Para autorizar la app local con una hoja privada:

1. Habilitar Google Sheets API en un proyecto de Google Cloud.
2. Configurar el consentimiento OAuth y un cliente de tipo aplicación web.
3. Autorizar como origen JavaScript `http://127.0.0.1:5173` (o el origen real).
4. Copiar `.env.example` a `.env.local` y rellenar `VITE_GOOGLE_CLIENT_ID`
   con el ID de cliente. No se necesita un secreto de cliente.
5. Reiniciar Vite y pulsar «Autorizar Google» en la app.

La autorización solo solicita lectura. El token se conserva únicamente en
memoria, no en localStorage ni en archivos. «Actualizar» vuelve a leer Google.
Si el token caduca, hay que autorizar de nuevo. No se escribe en la hoja.
La conexión del plugin de Google Drive en el chat permite inspeccionar la hoja
desde el asistente, pero no sustituye la autorización OAuth del navegador.

Referencias: [autorización Google](https://developers.google.com/identity/oauth2/web/guides/use-token-model),
[lectura de celdas](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/get).
