# Arquitectura productiva

## Flujo de lectura

Navegador -> Firebase Authentication -> Firestore (`movements`, `categories`) -> Dashboard / filtros / comparaciones.

## Flujo de escritura

Navegador -> token Firebase -> `/api/movements` en Vercel -> Firebase Admin SDK -> batch `movement + activity_log`.

Esto evita que una escritura financiera legítima pueda omitir la auditoría.

## Comparaciones

La fuente de cálculo es siempre el conjunto de movimientos filtrado. No existen fórmulas de celdas ni totales guardados como verdad primaria. Los agregados se reconstruyen por periodo y dimensión:

- categoría;
- proveedor;
- grupo;
- valor total;
- cantidad de movimientos;
- promedio por movimiento;
- descuentos.

Para un periodo incompleto, `mismo corte` limita ambos meses al menor día cargado, evitando comparar 8 días contra un mes completo.

## Trazabilidad

Cada movimiento nuevo conserva creador y timestamps. Las mutaciones productivas crean un evento separado en `activity_log` con `before` / `after`, actor, entidad y fecha del servidor.
