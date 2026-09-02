# TR Cotizaciones

App para cotizaciones con catálogo desde Google Sheets y PDF con formato Reyes Rochez / Tienda Rubio.

## Variables de entorno

```bash
GOOGLE_SHEETS_API_KEY=...
GOOGLE_SHEETS_ID=...
GOOGLE_SHEETS_RANGE=bd!A2:H5000
```

## Revisión

```bash
npm run check
```

## Corrección de histórico (2026-09-02)

Se endureció la lectura de `tr_cotizaciones_history_v1` para soportar valores `null`,
JSON inválido o datos antiguos con una estructura distinta. El historial siempre se
normaliza a un arreglo antes de usar `.length`, `.map`, `.filter` o `.find`.
También se añadió versionado al `app.js` en `index.html` para evitar que el navegador
reutilice una copia anterior en caché después del despliegue.
