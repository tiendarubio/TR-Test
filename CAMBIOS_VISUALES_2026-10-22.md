# Adaptación visual de TR-Finanzas / Cuentas por pagar

- Fuente: diseño visual ProductFinderSV-main.zip (referencia), adaptado a la aplicación original basada en Bootstrap.
- Acento corporativo: **#4B9CD3** (RGB 75,156,211), color predominante del logotipo proporcionado.
- Se conservan colores semánticos de riesgo, advertencia y éxito.
- Nueva hoja de estilos `assets/css/tr-brand.css`, cargada después del CSS original.
- Nuevo controlador `assets/js/tr-theme.js` con selector claro/oscuro y persistencia local.
- Sin cambios en endpoints, Firestore, cálculos, deudas, movimientos ni lógica financiera.
- Base: `TR-Test_CuentasPorPagar_Manual_2026-10-21.zip`.

## Validaciones sugeridas antes del despliegue

1. Comprobar contraste y tablas en tema claro y oscuro en móvil y escritorio.
2. Verificar alta, edición y abonos de cuentas por pagar contra entorno Firebase de prueba.
3. Validar modales, filtros y fechas, y vistas de reportes/exportación.
