# TR · Flujo de Efectivo

Aplicación web para sustituir los libros mensuales de Excel por una fuente única de datos, manteniendo una captura sencilla y agregando análisis comparativo, trazabilidad, importación histórica y exportaciones.

## Estado de esta entrega

La misma interfaz funciona en dos modos:

- **Demo:** si Firebase no está configurado, carga el histórico 2026 incluido y guarda nuevas pruebas/importaciones en `localStorage`.
- **Producción:** al configurar Firebase en Vercel, exige inicio de sesión, carga `movements` desde Firestore y guarda mediante APIs de servidor con validación y bitácora.

## Módulos

- **Inicio:** KPIs, corte real del periodo, distribución y lecturas rápidas.
- **Movimientos:** búsqueda, filtros y captura.
- **Comparar:** mes contra mes, mismo corte y rangos personalizados; agrupación por categoría, proveedor o grupo; métricas de valor, conteo, promedio y descuentos.
- **Reportes:** CSV, XLSX y PDF.
- **Importar histórico (Administrador):** Excel individual, múltiples Excel o ZIP; vista previa, validación, detección de duplicados, corrección de fechas inválidas y reversión por lote.
- **Configuración:** estado de la fuente de datos, rol y clasificación actual de categorías.

## Roles

- `admin`: lectura, captura, edición, importaciones y operaciones administrativas.
- `contabilidad`: lectura, captura y edición.
- `consulta`: solo lectura y análisis.
- `sin_acceso`: no puede entrar.

Los roles se asignan en `/api/assign-role` con las variables `ROLE_ADMIN_EMAILS`, `ROLE_ACCOUNTING_EMAILS` y `ROLE_VIEWER_EMAILS`.

## Importar los Excel existentes

En producción, ingresa como Administrador y abre **Importar histórico**.

1. Selecciona un `.xlsx`, varios Excel o un `.zip` que los contenga.
2. Presiona **Analizar archivos**.
3. Revisa:
   - archivos y periodos detectados;
   - cantidad de movimientos;
   - duplicados;
   - errores bloqueantes;
   - advertencias de fechas fuera del periodo nominal.
4. Corrige fechas inválidas directamente en la vista previa cuando corresponda.
5. Presiona **Importar registros nuevos**.

La importación no escribe a Firestore hasta que se completa la vista previa. Los registros inválidos se excluyen y los duplicados no se vuelven a cargar.

Cada movimiento importado conserva:

- archivo de origen;
- hoja;
- fila;
- periodo nominal detectado;
- lote de importación;
- usuario que realizó la importación;
- fecha/hora del servidor.

### Revertir una importación

El Administrador puede usar **Historial de importaciones → Revertir**. Solo se eliminan movimientos cuyo `importBatchId` pertenece a ese lote; movimientos creados manualmente u otros lotes no se afectan. La reversión queda registrada en `activity_log`.

## Seguridad de movimientos

El navegador **no tiene permiso de escritura directa** sobre `movements`, `activity_log` ni `import_batches`.

- Altas/ediciones manuales: `/api/movements`.
- Importaciones/reversiones: `/api/imports`.
- Ambas rutas validan Firebase Authentication y rol antes de usar Firebase Admin SDK.

## Migración inicial alternativa por script

Se conserva `scripts/import-historical.mjs` como herramienta administrativa alternativa. Para la operación normal se recomienda usar el módulo **Importar histórico**, porque permite revisar datos antes de insertarlos.

```bash
npm install
npm run migrate:2026
```

## Incidencias conocidas del histórico 2026

El ZIP analizado contiene dos registros que no deben importarse silenciosamente sin corrección:

- Abril / Energía / $214.15: fecha vacía.
- Mayo / Compras al contado / $94.00: fecha Excel equivalente a un año fuera del rango permitido.

También existen movimientos con fecha válida pero fuera del mes nominal del libro. El importador los muestra como **advertencias**, no los corrige automáticamente.

## Despliegue en Vercel

1. Subir esta carpeta a un repositorio.
2. Importar el repositorio en Vercel.
3. Crear un proyecto Firebase y habilitar **Email/Password** en Authentication.
4. Crear Firestore.
5. Configurar las variables de `.env.example` en Vercel.
6. Publicar `firestore.rules`.
7. Crear los usuarios autorizados en Firebase Authentication.
8. Entrar como Administrador y cargar el histórico desde **Importar histórico**.

## Colecciones

- `movements`: fuente única de movimientos.
- `categories`: catálogo y clasificación.
- `activity_log`: auditoría inmutable.
- `import_batches`: control de lotes importados y revertidos.
- `users`: rol sincronizado por usuario.
- `budgets`: reservado para comparación real vs presupuesto.
- `system`: metadatos de mantenimiento/migraciones administrativas.

## Próximas extensiones previstas

El modelo deja espacio para presupuesto por categoría, comparaciones interanuales, cierre de periodos, edición/eliminación completa desde UI y una vista dedicada de auditoría.
