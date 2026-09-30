# Arquitectura productiva

## Lectura

Navegador -> Firebase Authentication -> Firestore (`movements`, `categories`) -> Dashboard / filtros / comparaciones.

## Escritura manual

Navegador -> token Firebase -> `/api/movements` en Vercel -> Firebase Admin SDK -> batch `movement + activity_log`.

El cliente no puede escribir directamente en `movements`.

## Importación histórica

Navegador -> SheetJS/JSZip -> parser local -> vista previa -> `/api/imports` -> Firebase Admin SDK -> `movements + import_batches + activity_log`.

El archivo se analiza primero en el navegador. Solo los registros normalizados se envían a la API.

### Parser

El importador reconoce:

1. la estructura histórica actual, donde cada hoja representa una categoría;
2. un formato genérico que incluya las columnas `Fecha`, `Categoría`, `Proveedor`, `Documento`, `Valor`, `Descuento` (opcional) y `Detalle` (opcional).

No depende de una fila fija: busca los encabezados dentro de las primeras filas de cada hoja. Esto permite absorber diferencias como `SERVICIOS BASICOS` y los cambios de tamaño de `COMPRAS AL CONTADO`.

### Validación

Errores bloqueantes:

- fecha ausente/inválida;
- categoría no reconocida;
- proveedor ausente;
- valor no positivo;
- descuento inválido.

Advertencias no bloqueantes:

- fecha fuera del mes/año nominal detectado en el nombre del archivo.

La aplicación no corrige automáticamente esas advertencias.

### Duplicados

Los registros se comparan por una firma canónica que incluye fecha, categoría, proveedor, documento, valor, descuento y detalle. Se conserva un ordinal de ocurrencia para no confundir dos movimientos legítimamente idénticos dentro del mismo conjunto.

Los IDs de importación son determinísticos. Reimportar el mismo conjunto mediante este módulo no crea otra copia.

## Lotes y reversión

Cada importación crea un documento en `import_batches`. Todos los movimientos insertados reciben `importBatchId`.

La reversión consulta únicamente ese lote y elimina esos documentos. Luego cambia el lote a `reverted` y registra el evento en `activity_log`.

## Comparaciones

La fuente de cálculo es siempre el conjunto de movimientos filtrado. No existen fórmulas de celdas ni totales guardados como verdad primaria.

Los agregados se reconstruyen por:

- categoría;
- proveedor;
- grupo;
- valor total;
- cantidad de movimientos;
- promedio por movimiento;
- descuentos.

Para un periodo incompleto, `mismo corte` limita ambos meses al menor día cargado.

## Trazabilidad

Cada movimiento conserva creador/origen y timestamps. Las mutaciones productivas y las importaciones crean eventos separados en `activity_log` con el actor y la entidad afectada.
