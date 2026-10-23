# Sugeridos de reposición — TR-Lista (23-10-2026)

## Qué se implementó

- Botón **Ver sugeridos** por sucursal dentro de TR-Lista y en el menú móvil.
- Lectura de ventas diarias de **tres hojas** del libro `BASE DE DATOS`, sin alterar columnas:
  - `VENTAS-DIARIAS-MORAZAN`
  - `VENTAS-DIARIAS-COMERCIAL`
  - `VENTAS-DIARIAS-SEXTA`
- Formato reconocido: `B = Código`, `C = Descripción`, `G = Cantidad vendida`, `J = Importe vendido` (importe opcional). Encabezado en fila 1. Códigos con cero inicial conservados.
- Captura de la versión diaria en Firestore mediante `POST /api/daily-sales-sync` (administradores); guarda por `sucursal + fecha` en `sales_daily`, con firma SHA-256 para evitar capturas repetidas. `sales_sources` mantiene la referencia de la última carga por tienda.
- Tarea programada en Vercel: `GET /api/daily-sales-sync` a las **21:00 UTC (15:00 El Salvador)** cada día con autenticación `CRON_SECRET`.
- Motor `GET /api/replenishment?storeKey=...`: combina hasta 28 fechas recientes archivadas y hasta 120 días de solicitudes para calcular consumo por día, intervalo típico, cantidad media, tendencia y confianza.
- Selección/edición/importación a tabla: agrega nuevos productos; si ya existen en la lista, **suma** la cantidad indicada. Descuenta la cantidad que ya está en la lista al presentar la propuesta. No inventa productos y omite códigos ambiguos o desconocidos.
- Los operadores solo consultan su propia sucursal (validación en backend con Firebase ID Token). Solo el administrador sincroniza. El supervisor puede consultar según el contexto y sus permisos actuales.

## Variables para Vercel

1. `GOOGLE_SHEETS_API_KEY`: API key válida para lectura del libro por Sheets API (ya usada por el catálogo si coincide).
2. **`GOOGLE_SHEETS_SALES_ID`**: ID del libro `BASE DE DATOS` que contiene las tres pestañas de ventas diarias; añadir explícitamente aunque exista `GOOGLE_SHEETS_ID` porque el catálogo podría estar en otro libro.
3. `CRON_SECRET`: cadena aleatoria larga, privada, para que Vercel autorice la tarea programada; configurarla en el entorno del despliegue. **No compartirla en el frontend**.
4. Variables existentes de Firebase Admin: `FIREBASE_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY`; sin ellas no se podrá escribir ni consultar Firestore desde los endpoints.

No hay credenciales incrustadas en código o ZIP. La API key requiere permisos de lectura: una Google Sheet privada no se vuelve legible por el mero hecho de tener una API key. Si el libro es privado, habrá que implementar acceso con cuenta de servicio autorizada o compartirlo según la política de acceso aprobada.

## Operación diaria

1. Reemplazar cada mañana el contenido de la hoja de cada sucursal con las ventas **del día anterior**, manteniendo el encabezado B1:M1. No es necesario acumular filas ni introducir la fecha por cada producto.
2. Recomendado: escribir una fecha en **A1** como `2026-10-22` o `FECHA: 2026-10-22` para evitar interpretaciones incorrectas si se carga tarde. Esto es **opcional**, no cambia la tabla.
3. Si no se usa A1, la tarea automática supone que la hoja es **del día anterior a la ejecución**. Por eso es indispensable actualizarla **antes de las 15:00 hora de El Salvador**, o utilizar **Sincronizar ventas** desde una cuenta admin, indicando manualmente la fecha correspondiente.
4. El admin puede pulsar **Sincronizar ventas** para archivar/rectificar el contenido de las tres hojas sin esperar a la tarea diaria. El sistema indica si se guardó, actualizó, si ya existía o si la hoja está igual que la del día anterior. Una hoja no renovada no se marca como nuevo día.
5. Cada sucursal ve **Ver sugeridos**, selecciona productos y ajusta cantidades. La lista debe estar iniciada y editable para poder importar. Guardado automático de TR-Lista se conserva.

## Limitaciones expresas del pronóstico

- **No se asume inventario disponible.** Las solicitudes, despachos y recepciones marcadas no equivalen a un conteo físico. La cantidad propuesta es una *cantidad objetivo orientativa por ciclo*, NO un faltante real confirmado.
- Aunque el sistema consulta solicitudes, aún no descuenta existencias físicas ni entradas validadas. Para precisión más cercana a la realidad se necesita un inventario inicial por sucursal y movimientos recibidos verificables, incluidas mermas y devoluciones.
- No se conecta todavía con las 21 hojas mensuales de TR-ABC como un flujo de importación separado: el pronóstico inicial se apoya en **ventas diarias archivadas** y **solicitudes históricas** que sí están en TR-Lista. La demanda mensual es una mejora posterior si se configura su extracción sin duplicar datos.
- Los productos sin historial de solicitudes necesitan **al menos cuatro fechas de ventas archivadas** para sugerirse; una venta aislada no justifica un pedido.
- Cada hoja reemplazada antes de archivarse pierde los datos de ese día. El cron solo se ejecuta una vez al día: no constituye una garantía de captura si se actualizan las hojas fuera del horario. El botón de admin permite capturas adicionales.
- El sistema **no** garantiza fechas de archivo correctas si el contenido no incluye A1 y fue actualizado con retraso; en ese caso se debe indicar manualmente la fecha desde administración.
- Códigos duplicados/ambiguos del catálogo, cantidades existentes escritas como texto y listas bloqueadas no se modifican.

## Verificación previa al despliegue

```bash
npm test
node --check assets/js/checklist.js
node --check api/replenishment.js
node --check api/daily-sales-sync.js
```

Las pruebas locales verifican cálculo y estructura sobre muestras de datos. Para validar en producción, un administrador debe desplegar la app con las variables reales, pulsar **Sincronizar ventas** y verificar que los tres registros aparecen archivados en Firestore antes de reemplazar las hojas al día siguiente. No se han ejecutado pruebas integradas contra Firebase ni Google Sheets reales desde este entorno.
