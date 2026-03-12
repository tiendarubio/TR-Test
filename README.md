# TRLista2.0 — Firebase Histórico (Firestore)

- Persistencia y histórico por día en Firestore (cliente), misma configuración/patrón que TR-Inventario.
- Catálogo se consume por /api/catalogo (Vercel) desde Google Sheets.

## Variables de entorno (Vercel)
GOOGLE_SHEETS_API_KEY=...
GOOGLE_SHEETS_ID=...
GOOGLE_SHEETS_RANGE=bd!A2:D5000


## Desbloqueo temporal de histórico
Se agregó validación de contraseña para habilitar edición temporal de listas históricas.

### Variables de entorno adicionales (Vercel)
GOOGLE_SHEETS_UNLOCK_SHEET_ID=...   # opcional; si no se define usa GOOGLE_SHEETS_ID
GOOGLE_SHEETS_UNLOCK_RANGE=estantes!G2
