# Cambios aplicados a TRInventario

## Objetivo
Agregar a TRInventario un desbloqueo del histórico para edición, usando la misma contraseña y el mismo endpoint que TRLista.

## Archivos incluidos
- `index.html`
- `assets/js/inventario.js`
- `assets/js/app.js`
- `api/validate-historical-password.js`

## Comportamiento
- En fechas anteriores, al abrir un inventario histórico aparece el botón **Desbloquear histórico**.
- La validación usa `/api/validate-historical-password`.
- Una vez desbloqueado:
  - se habilita la edición del inventario histórico,
  - se pueden modificar campos, agregar y eliminar productos,
  - el botón **Guardar avance** guarda los cambios manteniendo el estado original del inventario.
- Por seguridad, **Finalizar** y **Cancelar** siguen deshabilitados en histórico.

## Nota
Asegúrate de tener este archivo publicado en Vercel:
- `api/validate-historical-password.js`

y las variables de entorno usadas por ese endpoint:
- `GOOGLE_SHEETS_API_KEY`
- `GOOGLE_SHEETS_UNLOCK_SHEET_ID` o `GOOGLE_SHEETS_ID`
- `GOOGLE_SHEETS_UNLOCK_RANGE` (opcional)
