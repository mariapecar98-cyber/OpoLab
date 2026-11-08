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

## Ejercicios de Google Drive

Se incluyen 22 fichas PDF completas en `public/exercises`, indexadas en
`src/exerciseLibrary.json`: 8 de nivel básico, 7 de oposición y 7 de nivel difícil.
Están disponibles al abrir Ejercicios sin autorizar Google. El visor muestra
el PDF original con sus ejercicios y soluciones, conservando fórmulas y gráficos.
Se ha comprobado que los 22 PDF se pueden leer; algunas fichas solo contienen
enunciados o tienen soluciones sin un encabezado reconocible.
La conexión opcional de Drive permite consultar las fichas actuales de la carpeta.

La vista por ejercicios utiliza `public/exercises/content.json`, generado con
`node scripts/extract-exercises.mjs`. La importación actual separa 334 enunciados
y 279 soluciones identificadas. Cada tarjeta enlaza a su página del PDF y oculta
la solución hasta desplegarla. La búsqueda filtra enunciados y números.
Cada tarjeta muestra recortes WebP del PDF original, conservando fórmulas,
colores y gráficos. Los ejercicios y soluciones de varias páginas se muestran
en varias imágenes; pulsar una imagen la abre ampliada. Las imágenes se cargan
bajo demanda y el texto extraído queda disponible en un desplegable y para buscar.
El importador requiere `@napi-rs/canvas` y regenera también las imágenes en
`public/exercises/images` a escala 2. La importación actual contiene 940 recortes.
No se inventan las soluciones ausentes o no identificadas.
La ficha A0 tiene varias secciones con numeración independiente: de momento solo
se separan los siete enunciados de su primera sección, sin asociar soluciones.

En Entrenar, «Simulacro de problemas» sortea cuatro problemas de nivel oposición
y uno de nivel difícil, sin repetidos, y mezcla el orden de los cinco. Muestra
solo los enunciados como imágenes, numerados del 1 al 5. Los recortes específicos
de `public/exercises/mock` tapan las referencias a la ficha y el número original;
sus nombres no contienen el identificador de la ficha. No se muestran soluciones,
texto extraído ni enlaces a la ficha durante el simulacro. «Nuevo simulacro» hace
otro sorteo. Se utilizan los enunciados que tienen una separación identificada
de su solución para evitar mostrar respuestas dentro del recorte.

La pestaña Ejercicios lee la carpeta `1nUvvf-JGeIjr1YGoiFAvuyumWXtC0pHo`
y sus subcarpetas Nivel básico, Nivel oposición y Nivel difícil. Incluye las
fichas de carpetas anidadas. El usuario pulsa Conectar Google Drive y concede
lectura con su cuenta de Google. Habilitar Google Drive API en el mismo proyecto
OAuth y configurar VITE_GOOGLE_CLIENT_ID como se describe arriba. No se escriben
archivos ni se guarda el token en el navegador; se conserva solo en memoria.
La conexión de Drive del chat y la autorización de la app son independientes.

Admite PDF con texto, DOCX, texto plano y Google Docs. Descarga y analiza la ficha
seleccionada en el navegador. Los lectores PDF y Word se cargan bajo demanda.
Reconoce encabezados Ejercicio/Problema y numeración 1. o 1), con Solución/Respuesta
intercalada o un bloque Soluciones/Respuestas al final, asociado por número.
Rechaza números de ejercicio repetidos y avisa de soluciones no identificadas.
Mantiene el enlace al original para revisar la extracción. Los PDF escaneados
requieren OCR; las imágenes, diagramas y fórmulas sin texto no se reproducen con
fidelidad mediante esta extracción. La biblioteca incluida utiliza el PDF completo
para evitar pérdidas de formato o asociaciones incorrectas de soluciones.
