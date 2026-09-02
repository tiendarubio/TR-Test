# TR Cotizaciones

App para cotizaciones con catálogo desde Google Sheets y PDF con formato Reyes Rochez / Tienda Rubio.

## Despliegue en Vercel

El proyecto es una aplicación estática con una Vercel Function en `api/catalogo.js`.
No se debe declarar `nodejs22.x` como runtime dentro de `functions` en `vercel.json`;
Vercel selecciona automáticamente el runtime oficial de Node para funciones JavaScript.
La versión de Node usada por el proyecto se fija desde `package.json` en `22.x`.

## Variables de entorno requeridas

Configurar en Vercel > Project Settings > Environment Variables, al menos para Production:

```bash
GOOGLE_SHEETS_API_KEY=...
GOOGLE_SHEETS_ID=...
GOOGLE_SHEETS_RANGE=bd!A2:H5000
```

`GOOGLE_SHEETS_RANGE` es opcional; si no existe se usa `bd!A2:H5000`.

## Revisión local

```bash
npm run check
```
