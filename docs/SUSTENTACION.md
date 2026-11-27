# Vibes · Guía de sustentación

## 1. ¿Qué problema resuelve?
En la región Puno el transporte (combis, mototaxis, lanchas del lago, colectivos interprovinciales) funciona "de boca en boca": no hay mapa oficial ni datos abiertos de rutas, paraderos o tarifas. Vibes es **el primer mapa vivo del transporte de Puno, construido por la gente**: el pasajero consulta cómo llegar y, con el GPS de su celular, **registra las rutas que no existen en ningún mapa**.

## 2. ¿Qué arquitectura y por qué?
**Aplicación web progresiva (PWA) 100 % cliente, en capas y modular (ES Modules), con servicios externos por API.**

```
Presentación  index.html · css/app.css · css/tema.css · js/app.js (eventos, pestañas, mapa)
Lógica        planificador.js · grafo.js · registro.js · usuario.js · envivo.js · reportes.js · lago.js · osm.js
Datos         data/puno.js · data/osm-puno.js · data/region.js · localStorage (por usuario)
Servicios     Geolocation API · Leaflet · OSM/Esri tiles · OSRM · Overpass · Open-Meteo · Web Crypto
```
Por qué:
- **Celulares de gama baja y mala señal** (altiplano, lago): sin framework ni build, carga rápida y **funciona offline** (service worker).
- **Costo cero y despliegue simple:** sitio estático; se publica en Plesk o GitHub Pages sin servidor de aplicaciones.
- **Separación de responsabilidades:** un módulo por función; los datos están separados del código (corregir una ruta = editar `data/`).
- **Privacidad:** la ubicación y el PIN nunca salen del celular.
- **Degradación elegante:** si una API falla, la app sigue con copias locales (OSM, trazos, ubicación de prueba).
- **Lista para crecer:** la capa de datos se reemplaza por un backend sin tocar la presentación.

## 3. Tecnologías
HTML5, CSS3, JavaScript (ES Modules) · Leaflet 1.9.4 · OpenStreetMap y Esri (mapas sin clave) · **Geolocation API** (`watchPosition`) · OSRM (trazos por calles) · **Overpass API** (dataset abierto de paraderos) · Open-Meteo (viento del lago) · Web Crypto (SHA-256) · Service Worker + Web App Manifest (PWA) · localStorage · GeoJSON · Git/GitHub · Plesk (publicación).

## 4. ¿Cómo usaron la IA?
- **Claude (Opus 5.5)** en claude.ai para la ideación y el MVP, y **Claude Code** para revisar el repo, programar, probar en un navegador real y hacer commits.
- La IA programó; el equipo definió el problema, la idea central (registro por GPS), validó en campo y tomó las decisiones.
- La IA **detectó y corrigió bugs reales** (mapa CARTO con "API KEY REQUIRED") y **verificó cada función en el navegador** antes de subirla.
- Todo el historial está en [`IA_Y_PROMPTS.md`](../IA_Y_PROMPTS.md).

## 5. Funcionalidades
| Módulo | Qué hace |
|---|---|
| Explorar | Líneas de combi, paraderos, unidades en vivo, salidas interprovinciales |
| ¿Cómo llego? | Compara caminar, combi directa, transbordo, taxi y mototaxi con tiempo y costo; medio pasaje |
| **Grafo + Dijkstra** | Ruta óptima en una red multimodal; los pesos cambian con los reportes activos |
| ⭐ **Registrar ruta** | Graba con GPS rutas y paraderos (combi, mototaxi, lancha); filtro de ruido, Douglas–Peucker, validación comunitaria, GeoJSON |
| Lago | Viento real y "conviene / no conviene salir"; salidas a Uros, Taquile, Amantaní |
| Reportes | Accidentes, bloqueos, granizo; radar animado y cinta EN VIVO; caducan a las 6 h |
| Datos OSM | 52 paraderos, terminales y muelles reales de OpenStreetMap |
| Región | 13 provincias y 15 distritos de la provincia de Puno |
| Cuenta | Login con PIN cifrado; lugares y rutas favoritas; filtros de transporte por usuario |
| PWA | Instalable y funciona sin señal |

## 6. Limitaciones
- **Backend mínimo:** API PHP + MySQL que comparte rutas, reportes y cuentas; falta moderación, tiempo real (WebSockets) y escalar.
- **Datos de demostración:** rutas, tarifas, horarios y coordenadas de la región son aproximados; falta levantarlos en campo.
- El "en vivo" de las combis es **simulado** (no hay GPS en las unidades).
- El login usa PIN con bcrypt y token; falta recuperación de cuenta.
- Quechua y aymara solo parcialmente; sin voz todavía.
- La API Overpass es lenta (hasta 35 s), por eso se usa una copia local.

## 7. ¿Qué harían para llevarlo a producción?
1. **Base de datos:** ya hay API PHP + MySQL (`api/index.php`, `database/schema.sql`). Para escalar: PostGIS para consultas espaciales, índices geográficos y tokens con expiración.
2. **Moderación y calidad de datos:** consenso de varias grabaciones (clustering de trayectorias), reputación del usuario, panel de validación.
3. **Tiempo real:** WebSockets para reportes; GPS en unidades (convenio con empresas) para el "en vivo" real; predicción de llegadas con historial.
4. **Calidad:** ya hay 7 pruebas unitarias (`npm test`); faltan pruebas E2E (Playwright), CI en GitHub Actions y linter.
5. **Seguridad y legal:** HTTPS, política de privacidad y consentimiento de ubicación (Ley 29733 de datos personales), límites de uso de APIs.
6. **Operación:** monitoreo de errores, respaldos, CDN, servidor propio de tiles/ruteo si crece el uso.
7. **Alianzas:** Municipalidad de Puno, SUTRAN y la Capitanía del lago para datos oficiales; publicar el dataset como datos abiertos.
