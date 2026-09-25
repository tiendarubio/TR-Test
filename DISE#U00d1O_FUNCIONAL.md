# Diseño funcional — TR Flujo de Efectivo

## Objetivo
Reemplazar los libros mensuales de Excel por una aplicación web simple de operar, con trazabilidad y capacidad de análisis superior.

## Módulos
1. **Inicio**: resumen del periodo, fecha real de corte, movimiento total, gastos fijos, imprevistos, distribución por categoría y lecturas rápidas.
2. **Movimientos**: una sola fuente de datos para todas las categorías; filtros por fecha, categoría, proveedor y documento; alta mediante formulario corto y campos condicionales.
3. **Comparar**: periodo contra periodo, mismo corte, rangos personalizados, agrupación por categoría/proveedor/grupo y métricas de valor, número de movimientos, promedio y descuentos.
4. **Reportes**: exportaciones CSV, XLSX y PDF.
5. **Importar histórico**: exclusivo para Administrador; Excel/ZIP, vista previa, validación, duplicados, corrección de fechas, lotes y reversión.
6. **Configuración**: fuente de datos, rol y clasificación de categorías.

## Reglas de comparación
- Por defecto se usa **mismo corte** cuando el periodo actual está incompleto.
- Variación absoluta = Periodo A - Periodo B.
- Variación porcentual = (A - B) / B × 100.
- Si B = 0 y A > 0, se muestra **Nuevo** en vez de un porcentaje infinito.
- La selección de periodos ya utiliza `AAAA-MM`, por lo que el modelo no está limitado a 2026.
- Todos los resultados por categoría permiten drill-down hacia los movimientos.

## Modelo productivo
Colección principal `movements` con fecha, periodo, categoría, proveedor, documento, valor, descuento, detalle, origen, usuario, lote de importación y timestamps.

Colecciones auxiliares:
- `categories`
- `activity_log`
- `import_batches`
- `users`
- `budgets` (reservada para Real vs Presupuesto)

## Importación histórica
El usuario no importa a ciegas. El flujo obligatorio es:

**Seleccionar archivos → Analizar → Revisar errores/advertencias/duplicados → Importar → Registrar lote.**

Los errores bloqueantes nunca se insertan. Las advertencias se conservan sin modificar el dato fuente.

La reversión trabaja por `importBatchId`, por lo que no afecta altas manuales ni otros lotes.

## Seguridad
- Firebase Authentication controla acceso.
- Firestore es lectura directa para los roles autorizados.
- Escrituras financieras pasan por APIs de Vercel con Firebase Admin SDK.
- `activity_log` e `import_batches` no admiten escritura directa desde el navegador.
- Solo `admin` puede importar o revertir lotes.

## Validación del histórico entregado
El ZIP enero-septiembre 2026 produce 2,810 filas candidatas: 2,808 válidas y 2 con error de fecha. Adicionalmente existen 11 movimientos con fecha válida fuera del periodo nominal; se presentan como advertencias.
