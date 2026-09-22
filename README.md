# TR · Flujo de Efectivo

Aplicación web para sustituir los libros mensuales de Excel por una fuente única de datos, manteniendo una captura sencilla y agregando análisis comparativo, trazabilidad y exportaciones.

## Estado de esta entrega

La misma interfaz funciona en dos modos:

- **Demo:** si Firebase no está configurado, carga el histórico 2026 incluido y guarda nuevas pruebas en `localStorage`.
- **Producción:** al configurar Firebase en Vercel, exige inicio de sesión, carga `movements` desde Firestore y guarda mediante `/api/movements` con validación y bitácora.

## Módulos

- **Inicio:** KPIs, corte real del periodo, distribución y lecturas rápidas.
- **Movimientos:** búsqueda, filtros y captura.
- **Comparar:** mes contra mes, mismo corte, rangos personalizados; agrupación por categoría, proveedor o grupo; métricas de valor, conteo, promedio y descuentos.
- **Reportes:** CSV, XLSX y PDF.
- **Configuración:** estado de la fuente de datos, rol y clasificación actual de categorías.

## Roles

- `admin`: lectura, captura, edición y operaciones administrativas.
- `contabilidad`: lectura, captura y edición.
- `consulta`: solo lectura y análisis.
- `sin_acceso`: no puede entrar.

Los roles se asignan en `/api/assign-role` con las variables `ROLE_ADMIN_EMAILS`, `ROLE_ACCOUNTING_EMAILS` y `ROLE_VIEWER_EMAILS`.

## Seguridad de movimientos

El navegador **no tiene permiso de escritura directa** sobre `/movements`. Las altas y ediciones pasan por `/api/movements`, que:

1. verifica el token de Firebase;
2. valida el rol;
3. valida fecha, categoría, proveedor, valor y descuento;
4. escribe el movimiento;
5. escribe un registro inmutable en `activity_log` dentro del mismo batch.

`firestore.rules` mantiene `activity_log` sin update/delete desde el cliente.

## Migrar el histórico 2026

El archivo `data/historico-2026.json` contiene los movimientos extraídos de enero a septiembre de 2026. Una vez configuradas las variables Admin SDK:

```bash
npm install
npm run migrate:2026
```

La migración usa IDs determinísticos derivados del contenido, por lo que puede repetirse sin crear duplicados. También carga las categorías iniciales.

### Incidencias históricas conocidas

No se migran silenciosamente fechas inválidas. Se mantienen identificados dos registros para revisión manual:

- Abril / Energía / $214.15: fecha vacía.
- Mayo / Compras al contado / $94.00: fecha Excel inválida `119216`.

## Despliegue en Vercel

1. Subir esta carpeta a un repositorio.
2. Importar el repositorio en Vercel.
3. Crear un proyecto Firebase y habilitar **Email/Password** en Authentication.
4. Crear Firestore.
5. Configurar las variables de `.env.example` en Vercel.
6. Publicar las reglas contenidas en `firestore.rules` desde Firebase Console o Firebase CLI.
7. Crear los usuarios autorizados en Firebase Authentication.
8. Ejecutar la migración histórica desde un entorno seguro con las credenciales Admin SDK.
9. Desplegar nuevamente si cambias variables de entorno.

## Colecciones

- `movements`: fuente única de movimientos.
- `categories`: catálogo y clasificación.
- `activity_log`: auditoría inmutable.
- `users`: rol sincronizado por usuario.
- `budgets`: reservado para comparación real vs presupuesto.
- `system`: metadatos de migraciones y mantenimiento.

## Próximas extensiones previstas

El modelo ya deja espacio para presupuesto por categoría, comparaciones interanuales, cierre de periodos, edición/eliminación desde UI con permisos y una vista completa de auditoría.
