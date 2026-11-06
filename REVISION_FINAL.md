# TR-Lista — optimización 2026-11-06

## Cambios respecto del paquete original
- Se conserva el soporte de multiplicaciones en cantidades (12×4, 12x4, 12*4, decimales con punto/coma) en móvil y escritorio.
- Se corrige la cantidad histórica exportada a Excel, evitando que `12×4` se interprete como `124`.
- La carga masiva de filas se inserta como un único fragmento de DOM y se renumera una sola vez, en vez de renumerar cada fila.
- Las tarjetas móviles se construyen fuera del documento y se insertan en un único paso. Las solicitudes de reconstrucción se agrupan por fotograma (requestAnimationFrame) para reducir trabajo repetido.
- Se omite la actualización de metadatos de búsqueda en cada tecla del campo cantidad: la búsqueda es por producto/código, no por cantidad.
- Se evita recorrer todos los inputs de cantidades cada vez que cambia el tamaño de la ventana.
- Los avisos transitorios utilizan el mismo contenedor ligero en escritorio y móvil, con máximo dos simultáneos y deduplicación; se desactiva el toast de éxito de autoguardado y se mantiene el estado persistente de guardado.
- El overlay de carga se retrasa 250 ms para no parpadear en operaciones instantáneas.

## Compatibilidad
Se mantienen la estructura de archivos, rutas API, configuración de Firebase, reglas Firestore, nombres de documentos y controles de permisos existentes. No se eliminan datos ni se modifican credenciales.

## Comprobaciones ejecutadas
- `node --check` sobre los archivos JavaScript del proyecto.
- `node --test tests/*.test.cjs`: pruebas unitarias de cantidades, exportación y guardas de optimización.

## Limitaciones de la verificación
No se han realizado pruebas de extremo a extremo contra el Firebase ni las Google Sheets reales, ni un ensayo de carga en el hardware de las tiendas. Probar antes de desplegar, idealmente con una copia de datos o entorno de staging. No se puede garantizar ausencia total de regresiones.
