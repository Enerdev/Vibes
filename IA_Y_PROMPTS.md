# Uso de Inteligencia Artificial – Proyecto Vibes (Muévete por Puno)

Archivo requerido por las bases del concurso (Temática: Transporte en la Región Puno).

## 1. Inteligencia Artificial que usamos

| Herramienta | Modelo | Para qué |
|---|---|---|
| Claude (claude.ai, Anthropic) | Claude Opus 5.5 | Lluvia de ideas, definición del MVP, generación del código base (HTML/CSS/JS), algoritmos geográficos y documentación |
| Claude Code (app de escritorio) | Claude Opus 5.5 | Revisión del repo, integración de la función estrella (registro de rutas por GPS), pruebas en navegador, commits |

## 2. Skills utilizados

**Skills del equipo**
- Análisis del problema local: transporte informal de Puno sin datos abiertos de rutas.
- Levantamiento de rutas en campo con GPS (aporte del equipo: registrar desde el celular las rutas y paraderos que no están en ningún mapa, incluidas las lanchas del lago).
- Validación de tarifas y paraderos reales.
- Control de versiones con Git y GitHub.

**Skills técnicos aplicados en el código**
- Geolocalización del navegador (`navigator.geolocation.watchPosition`) para grabar recorridos.
- Filtro de ruido GPS: se descartan lecturas con precisión > 35 m y puntos a < 8 m del anterior.
- Algoritmo **Douglas–Peucker** para simplificar el trazo GPS.
- **Crowdsourcing con validación:** si dos personas graban una ruta similar (≥ 70 % de coincidencia a 60 m), se suma una confirmación en lugar de duplicarla.
- Planificador multimodal: rutas directas y con un transbordo, con caminata, espera, tiempo y costo; penaliza rutas con reportes activos.
- Mapas con Leaflet y OpenStreetMap, mapa de calor (leaflet.heat) y análisis de cobertura (zonas a más de 500 m de un paradero).
- Consumo de API pública (Open-Meteo) para el estado del viento en el lago Titicaca.
- Exportación e importación en GeoJSON (formato de datos abiertos).

**Skills de Claude usados en la sesión**
- Ninguno especializado: el código se generó con las herramientas generales de escritura de archivos.

## 3. Historial de prompts

> Todos los prompts se hicieron durante el horario oficial del concurso.

1. **Prompt 1 (ideación):** el equipo compartió sus ideas iniciales (mapa de combis, taxis, motos, paraderos y barcos del lago; rutas y precios; reportes en tiempo real; pago en la app) y pidió ideas para un proyecto "mega wow". Resultado: el documento *Transporte en Puno: ideas para el proyecto*, con la propuesta de valor "el primer mapa vivo del transporte de Puno, construido por la gente" y un MVP de 5 puntos.
2. **Prompt 2 (construcción):**
   > "asi se llama nuestro repositorio [Enerdev/Vibes]. quiero que todos los cambios los subas ahi y tambien las mejoras y evaluemos juntos la idea principal para nuestro futuro desarrollo de software… hay rutas que no estan registradas, que mediante celular y ubicacion se pueda registrar las rutas del paradero y rutas asi de las lanchas, ese es un aporte de mi compañero"

   También se adjuntaron la rúbrica (Repositorio, Funcionalidad, Creatividad, Calidad técnica, Proyecto publicado, Uso efectivo de IA, Sustentación) y las reglas del concurso. Resultado: la primera versión de la app (MVP) en este repositorio.
3. **Prompt 3:** "te voy a dar permiso, me dio permiso de colaborador, asi que puedes manipular todo" (acceso al repositorio).

4. **Prompt 4 (Claude Code):**
   > "Lee CONTEXTO_CLAUDE_CODE.md y continúa desde el paso 1 de la sección 5. https://github.com/Enerdev/Vibes ese es el repo de mi compañero, ahi debemos ver todos sus cambios y tambien codear todo con las especificaciones del concurso"

   Resultado: se revisó el MVP subido por el compañero (mapa, ¿Cómo llego?, en vivo, lago, reportes, PWA). Se agregó este archivo obligatorio y se integró la **función estrella**: pestaña *Registrar* para grabar rutas y paraderos de combis, mototaxis y lanchas con el GPS del celular (con modo demo tocando el mapa), validación comunitaria y exportación GeoJSON. Se probó en el navegador antes de cada commit.

<!-- Agreguen aquí los siguientes prompts que usen, con su resultado. -->

## 4. Qué hizo la IA y qué hizo el equipo

- **IA:** estructura del proyecto, código base, algoritmos y redacción de la documentación.
- **Equipo:** el problema, la idea central del registro de rutas por GPS, la validación en campo, las pruebas en celulares reales, las decisiones de alcance y la sustentación.
