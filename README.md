# TR Cotizaciones — listo para Vercel

Aplicación estática con una Serverless Function en `/api/catalogo` para leer el catálogo desde Google Sheets sin exponer la API key en el navegador.

## Deploy en Vercel

1. Importá/subí esta carpeta como proyecto en Vercel.
2. En **Project Settings → Environment Variables** agregá:

```text
GOOGLE_SHEETS_API_KEY=tu_api_key
GOOGLE_SHEETS_ID=id_de_la_hoja
GOOGLE_SHEETS_RANGE=bd!A2:H5000
```

`GOOGLE_SHEETS_RANGE` es opcional; si no se define se usa `bd!A2:H5000`.

3. Hacé **Redeploy** después de guardar las variables.

No hace falta configurar Build Command, Output Directory ni Install Command.

## Requisitos de Google Sheets

- Google Sheets API debe estar habilitada para el proyecto de la API key.
- La API key debe poder utilizar Google Sheets API desde la función de Vercel.
- La hoja debe ser accesible para la API key según la configuración usada.

## Verificación local de sintaxis

```bash
npm run check
```
