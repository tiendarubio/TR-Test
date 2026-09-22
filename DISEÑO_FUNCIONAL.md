# Diseño funcional — TR Flujo de Efectivo

## Objetivo
Reemplazar los libros mensuales de Excel por una aplicación web simple de operar, con trazabilidad y capacidad de análisis superior.

## Módulos
1. **Inicio**: resumen del periodo, fecha real de corte, movimiento total, gastos fijos, imprevistos, distribución por categoría y lecturas rápidas.
2. **Movimientos**: una sola fuente de datos para todas las categorías; filtros por fecha, categoría, proveedor y documento; alta mediante formulario corto y campos condicionales.
3. **Comparar**: mes contra mes, mismo corte, rangos personalizados, agrupación por categoría/proveedor/grupo y métricas de valor, número de movimientos, promedio y descuentos.
4. **Reportes**: exportaciones; en el prototipo se incluye CSV. En producción se agregan XLSX y PDF.
5. **Configuración** (producción): categorías, grupos, usuarios, roles y parámetros.

## Reglas de comparación
- Por defecto se usa **mismo corte** cuando el periodo actual está incompleto.
- Variación absoluta = Periodo A - Periodo B.
- Variación porcentual = (A - B) / B × 100.
- Si B = 0 y A > 0, se muestra **Nuevo** en vez de un porcentaje infinito.
- Todos los resultados permiten drill-down hacia los movimientos que forman el total.

## Modelo productivo recomendado
Colección principal `movements` con: fecha, categoría, proveedor, documento, valor, descuento, detalle, origen, usuario creador/modificador y timestamps. Colecciones auxiliares: `categories`, `providers`, `activity_log`, y posteriormente `budgets`.

## Validación histórica detectada
La extracción encontró 2 registros que deben revisarse antes de una migración definitiva: abril / ENERGIA / $214.15 sin fecha y mayo / COMPRAS AL CONTADO / $94.00 con fecha Excel inválida `119216`. La aplicación productiva debe impedir guardar una fecha vacía o inválida.

## Producción
La siguiente etapa es sustituir `localStorage` por Firebase Authentication + Firestore, reutilizando el patrón técnico de TR-Lista, añadir reglas por rol y bitácora inmutable, y construir exportaciones XLSX/PDF desde la base de datos.
