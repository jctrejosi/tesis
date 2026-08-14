1. Resumen del Sistema
Plataforma web para monitorear y controlar un cultivo indoor automatizado con ESP32. Los sensores envían telemetría a un backend NestJS y este expone APIs REST. La web consume esas APIs para mostrar datos en tiempo real, históricos y enviar comandos a actuadores y configuraciones a sensores.

Perfil de usuario: operador agrícola, investigador, técnico de mantenimiento. No se requiere gestión de roles en esta fase.

2. Requisitos Generales de Diseño
Tema oscuro profesional con acentos en verde (#10B981) y azul (#3B82F6), evocando tecnología agrícola.

Tipografía: Inter (moderna, legible). Jerarquía clara: títulos bold, datos numéricos en monoespacio (o con fuente numérica tabular).

Estilo visual: vidrio esmerilado (glassmorphism sutil), tarjetas con bordes redondeados (12px), sombras suaves.

Iconografía: conjunto coherente tipo Phosphor o Feather icons.

Responsive: desktop first (1920x1080 óptimo), tablet (1024px), mobile (768px colapsando menú lateral a bottom tab).

Actualización en tiempo real: los valores deben refrescarse automáticamente cada 5-10 segundos mediante polling a los endpoints /telemetry/:alias/current o /latest. Indicar visualmente cuando un dato está “fresco” (<30s) con un sutil pulso verde.

3. Arquitectura de Información (Mapa del Sitio)
text
├── Dashboard (vista general)
├── Sensores
│   ├── Lista de sensores
│   └── Detalle de sensor (cada alias)
│       ├── Pestaña: Lecturas actuales
│       ├── Pestaña: Gráficos históricos
│       └── Pestaña: Configuración
├── Actuadores
│   ├── Lista de actuadores
│   └── Control individual (relé, ventilador, luz, bomba)
├── Configuración (acceso rápido a todos los sensores/actuadores)
└── Dispositivos (gestión de ESP32)
4. Especificaciones de Páginas
4.1 Dashboard (Vista Principal)
Objetivo: Resumen inmediato del estado del cultivo.

Componentes:

Barra superior: Nombre del dispositivo activo (ej. “GrowBox Principal”) + indicador de conexión (online/offline según último dato recibido, con tiempo relativo “hace 2 min”).

Fila de tarjetas KPI (4-6 en grid responsive):

Temperatura ambiente (último valor de BME680 o DS18B20 aire)

Humedad relativa

CO₂

Iluminación (canal Clear del AS7341 como resumen)

Temperatura del suelo (DS18B20 soil)

Conductividad del suelo (Soil EC)
Cada tarjeta debe mostrar: nombre de la métrica, valor actual grande, unidad, icono representativo, pequeña variación (↑/↓) respecto al valor anterior, y un sparkline miniatura de los últimos 30 minutos (usando el endpoint /telemetry/:alias/metrics/:metricName con límite 10).

Sección de actuadores: Tarjetas pequeñas con nombre del actuador, estado actual (ON/OFF o canal activo), icono, y botón directo para alternar (si es relé, mostrar 4 interruptores rápidos en miniatura).

Acceso rápido: al hacer clic en una tarjeta KPI se navega al detalle del sensor correspondiente.

Datos necesarios:

GET /devices/:id/status → online/última telemetría.

GET /telemetry/:alias/current para todos los alias.

GET /actuators para estados de actuadores.

4.2 Lista de Sensores
Tabla/cuadrícula con cada sensor registrado (GET /sensors).

Columnas: Alias, Nombre, Modelo, Tipo, Última lectura (timestamp relativo), Estado (activo/inactivo según si hay telemetría en la última hora).

Filtro por tipo (environmental, spectral, temperature, co2, soil_ec).

Clic en una fila → navega al detalle del sensor.

4.3 Detalle de Sensor (página dinámica por alias)
Cabecera: Nombre del sensor, modelo, alias, indicador de estado (conectado/desconectado), botón “Solicitar lectura” (llama a POST /config/sensors/:alias/read).

Pestañas:

A) Lecturas Actuales
Grid de métricas disponibles (obtenidas de GET /telemetry/:alias/metrics). Cada métrica en una tarjeta: nombre, valor, unidad, timestamp de la última lectura.

Ejemplo para AS7341: 10 tarjetas (F1-F8, Clear, NIR). Para BME680: 4 tarjetas.

Las tarjetas deben actualizarse automáticamente cada 5 s.

B) Gráficos Históricos
Selector de métrica (dropdown múltiple o single).

Selector de rango de tiempo (última hora, 6h, 24h, 7d, personalizado con datepickers).

Selector de agregación (Raw, Promedio por hora, por día) → se vincula a GET /telemetry/:alias/metrics/:metricName o /aggregated.

Área de gráfico (librería de charts). Línea suave con área sombreada, grid sutil.

Leyenda interactiva, tooltips con valor exacto y hora.

Posibilidad de comparar múltiples métricas en un mismo gráfico (ej. temperatura y humedad) con ejes Y duales si es necesario.

C) Configuración del Sensor
Formulario generado dinámicamente a partir de los campos de configuración del sensor (cargados desde GET /config/sensors/:alias).

Mostrar campos correspondientes al tipo de sensor (campos descritos en la documentación del ESP).

Botones: “Guardar y enviar” (PUT /config/sensors/:alias) y “Restaurar valores por defecto”.

Feedback visual de éxito/error.

Mostrar versión actual de la configuración.

Consideraciones de diseño: Pestañas con diseño limpio, bordes redondeados, activa resaltada con color de acento.

4.4 Actuadores
Lista:

Tarjetas por actuador: nombre, tipo, estado actual (parseado del JSON state).

Para el relé: mostrar 4 canales como interruptores. Si el estado actual indica channel_1: "ON" etc., mostrar toggle en ON.

Para ventilador/luz/bomba: un interruptor simple ON/OFF.

Control:

Al interactuar con un toggle, se envía comando vía POST /actuators/:name/command con el payload adecuado. Ejemplo para relé:

json
{"command": "set", "payload": {"channel": 1, "state": "ON"}}
La interfaz debe conocer la estructura del payload por tipo de actuador (relé vs genérico). Para el relé, mostrar un pequeño formulario con los 4 canales. Para los demás, un simple botón (el backend manejará el comando set con payload apropiado, pero actualmente es genérico; asumimos que el payload será {state: "on"/"off"} o similar).

Después de enviar, esperar actualización vía MQTT (el backend guarda el estado) y refrescar la tarjeta.

Historial de eventos: Tabla opcional de actuator_events mostrando últimos cambios (viejo estado, nuevo, motivo, timestamp).

4.5 Configuración Rápida (página dedicada)
Misma funcionalidad que la pestaña configuración de cada sensor, pero en una vista unificada con tabs/accordion para cada sensor.

Sección aparte para el relé (pines, inversión, simulación), aunque actualmente no hay endpoint específico, se puede manejar como un actuador con comando config. Asumiremos que se expone como una “configuración de actuador” genérica.

4.6 Gestión de Dispositivos
Tabla con dispositivos registrados (GET /devices).

Botón “Agregar dispositivo” con formulario (nombre, tipo, ubicación, metadata).

Clic en un dispositivo muestra detalle con sus sensores y actuadores, y posibilidad de editar/eliminar.

No es esencial para el monitoreo diario, pero sí para configuración inicial.

5. Componentes de Visualización de Datos
Tarjetas de métrica: fondo semitransparente con blur (glass), borde 1px sólido sutil, padding 20px, min-width 180px. Valor actual en 32px, unidad en 14px, icono 24px.

Gráficos: Utilizar una librería como Chart.js o Recharts (para referencia visual). Mostrar ejes etiquetados con formato de tiempo relativo/absoluto, grid lines sutiles.

Sparklines: versión compacta del gráfico sin ejes, solo la línea, en la tarjeta KPI.

Indicador de frescura: un punto verde pulsante junto al valor si el dato tiene <30s. Si >5min, punto amarillo; si >30min, rojo (desconectado).

6. Navegación y Layout
Sidebar izquierdo (ancho 260px colapsable) con logo “CEA GrowBox”, menú de navegación (Dashboard, Sensores, Actuadores, Configuración, Dispositivos), con iconos. Fondo oscuro sólido o con gradiente sutil.

Header superior con breadcrumb dinámico, selector de dispositivo (si múltiples), y un ícono de campana para alertas (futuro).

Área de contenido con padding 32px, scroll vertical. Máximo ancho 1400px centrado.

En móviles, sidebar se convierte en bottom tab bar y header simplificado.

7. Paleta de Colores
Fondo principal: #0F172A (slate 900) o #0B1120.

Fondo de tarjetas: rgba(255,255,255,0.05) con backdrop-blur.

Texto principal: #F8FAFC.

Texto secundario: #94A3B8.

Acento principal (verde): #10B981 → para estados ON, datos frescos.

Acento secundario (azul): #3B82F6 → para enlaces, botones primarios.

Advertencia: #F59E0B (amarillo) para datos antiguos.

Error: #EF4444 (rojo) para desconexión o fallos.

8. Tipografía
Familia: 'Inter', sans-serif.

Escala:

H1: 24px Bold

H2: 20px Semibold

H3: 16px Semibold

Body: 14px Regular

Valores numéricos grandes: 32px Semibold, con font-feature-settings: "tnum" para alineación tabular.

9. Estados y Retroalimentación
Carga inicial: skeleton cards (placeholders animados) mientras se obtienen datos.

Errores: Toast en esquina superior derecha con mensaje (ej. “Error al cargar telemetría”), reintento automático.

Vacío: cuando un sensor no tiene datos, mostrar un estado vacío con ilustración y texto “Sin datos aún”.

Desconectado: cuando un dispositivo no reporta en la última hora, mostrar un banner sutil en la parte superior.

10. Interacciones y Microinteracciones
Hover en tarjetas: ligero aumento de brillo y sombra.

Botones: transición de color 200ms, ripple effect.

Gráficos: al pasar el cursor, línea vertical de guía con tooltip.

Actualización de datos: cambio de valor con una animación sutil (slide up o fade) para no sobresaltar.

11. Consideraciones Técnicas para Implementación Futura
Aunque el diseño no depende de la tecnología, menciona que la web se conectará a una API REST y necesitará polling. Para diseño, basta con que los elementos tengan un indicador de “última actualización”. Si se implementa WebSockets en el futuro, las tarjetas pueden reaccionar a eventos push.

12. Ejemplo Visual (Descripción)
Dashboard:

Sidebar oscuro con iconos. Área principal: fila de 4 tarjetas grandes (Temperatura 24.5°C, Humedad 62%, CO2 812 ppm, Luz 3421) con sparklines. Debajo, dos columnas: izquierda con tarjetas de sensores secundarios (Temp suelo 22.1°C, EC suelo 1.8 mS/cm), derecha con panel de actuadores: “Relé” mostrando 4 toggles (tres OFF, uno ON verde), “Ventilador” con interruptor ON. Al fondo, un sutil degradado radial verde muy opaco.

Página detalle sensor AS7341:

Cabecera: “AS7341 Principal” (estado conectado). Pestañas. En “Lecturas actuales”, grid de 5 columnas con tarjetas pequeñas (F1 415nm: 1234, F2 445nm: 1456, …). Cada tarjeta con nombre de canal, valor y barra de color representativa. En “Gráficos”, selector de canales, rango de tiempo “Últimas 24h”, gráfico de líneas múltiples.

