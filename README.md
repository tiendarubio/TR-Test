# TRLista2.0 — Histórico con backend en Vercel

Esta versión mueve el acceso a Firestore desde el navegador hacia funciones `/api/*` en Vercel.
Así se evita que el cliente tenga que conectarse directamente a `firestore.googleapis.com`, que era la causa principal de los bloqueos `ERR_BLOCKED_BY_CLIENT`.

## Variables de entorno requeridas en Vercel

### Google Sheets
GOOGLE_SHEETS_API_KEY=...
GOOGLE_SHEETS_ID=...
GOOGLE_SHEETS_RANGE=bd!A2:D5000

### Desbloqueo temporal de histórico
GOOGLE_SHEETS_UNLOCK_SHEET_ID=...   # opcional; si no se define usa GOOGLE_SHEETS_ID
GOOGLE_SHEETS_UNLOCK_RANGE=estantes!G2

### Firebase Admin SDK (backend)
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...

## Endpoints incluidos
- `/api/catalogo`
- `/api/proveedores`
- `/api/validate-historical-password`
- `/api/checklist-get`
- `/api/checklist-save`
- `/api/checklist-history`

## Notas
- El frontend ya no usa Firebase Firestore directamente.
- El calendario conserva las fechas marcadas desde caché local si el historial no responde momentáneamente.
- Cuando la carga del checklist falla en el backend, la app intenta mostrar una copia local del último dato leído.
