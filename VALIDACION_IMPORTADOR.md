# Validación del importador contra el ZIP 2026

Fuente probada: `RESUMEN FLUJO DE EFECTIVO 2026.zip`.

## Resultado esperado

- Libros Excel: **9** (enero-septiembre 2026)
- Filas candidatas de movimientos: **2,810**
- Registros válidos sin corrección: **2,808**
- Registros con error de fecha: **2**
- Registros válidos con advertencia de periodo: **11**
- Total monetario de los 2,808 movimientos válidos: **$3,341,369.09**

## Registros bloqueados hasta corregir fecha

1. Abril / `ENERGIA` / fila 8 / REYES ROCHEZ SA DE CV / $214.15 / fecha vacía.
2. Mayo / `COMPRAS AL CONTADO` / fila 111 / INVERSIONES OP SA DE CV / $94.00 / fecha Excel fuera del rango permitido.

## Control mensual de los registros válidos

| Periodo | Registros | Total |
|---|---:|---:|
| Enero 2026 | 276 | $328,398.78 |
| Febrero 2026 | 303 | $358,863.96 |
| Marzo 2026 | 320 | $478,773.39 |
| Abril 2026 | 374 | $399,992.10 |
| Mayo 2026 | 379 | $454,650.03 |
| Junio 2026 | 346 | $418,422.94 |
| Julio 2026 | 364 | $414,572.20 |
| Agosto 2026 | 375 | $412,990.70 |
| Septiembre 2026 | 71 | $74,704.99 |

Las advertencias de periodo se conservan para revisión porque modificar automáticamente la fecha cambiaría el dato original sin evidencia suficiente.
