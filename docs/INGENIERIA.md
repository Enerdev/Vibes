# Vibes · Ingeniería de software y sistema de información

## 1. Problema y objetivo
En la región Puno casi no hay datos abiertos de transporte: combis, mototaxis y lanchas del lago funcionan "de boca en boca".
**Objetivo:** un sistema de información geográfica (SIG) colaborativo que **capture** (GPS de los pasajeros), **procese** (grafos, limpieza de trazos), **almacene** y **difunda** (mapa, GeoJSON) la información de transporte de la región.

## 2. Actores
| Actor | Qué hace |
|---|---|
| Pasajero | Consulta rutas, planifica viajes, reporta incidentes |
| Pasajero colaborador | Graba rutas y paraderos con el GPS; confirma rutas de otros |
| Turista | Consulta lanchas, estado del lago y salidas interprovinciales |
| Municipalidad / SUTRAN (fase 2) | Usa los datos abiertos (GeoJSON) para planificar |

## 3. Requerimientos
**Funcionales**
| ID | Requerimiento | Módulo |
|---|---|---|
| RF01 | Mostrar rutas de combi, paraderos y unidades en vivo | `app.js`, `red.js`, `envivo.js` |
| RF02 | Planificar viaje origen→destino con tiempo y costo | `planificador.js` |
| RF03 | Calcular la ruta óptima en un grafo con pesos dinámicos | `grafo.js` |
| RF04 | Grabar ruta y paraderos con GPS (combi, mototaxi, lancha) | `registro.js` |
| RF05 | Validar rutas por la comunidad (confirmaciones) | `registro.js` |
| RF06 | Exportar / importar rutas en GeoJSON | `registro.js` |
| RF07 | Reportar incidentes que caducan a las 6 h | `reportes.js` |
| RF08 | Estado del lago (viento real) y salidas de lanchas | `lago.js` |
| RF09 | Capa de datos abiertos OSM (paraderos, terminales, muelles) | `osm.js` |
| RF10 | Segmentación territorial: 13 provincias y 15 distritos | `data/region.js` |

**No funcionales**
| ID | Requerimiento | Cómo se cumple |
|---|---|---|
| RNF01 | Funciona en celulares de gama baja | JS vanilla, sin framework ni build |
| RNF02 | Funciona sin señal | PWA con service worker (`sw.js`) |
| RNF03 | Datos abiertos e interoperables | GeoJSON, OpenStreetMap (ODbL) |
| RNF04 | Privacidad | La ubicación no sale del celular; nada se envía a servidores propios |
| RNF05 | Tolerancia a fallos de APIs | Copia local de OSM, caché de trazos OSRM, ubicación de prueba |
| RNF06 | Mantenibilidad | Un módulo por responsabilidad; datos separados del código (`data/`) |

## 4. Arquitectura (cliente, por capas)
```
Presentación   index.html · css/app.css · js/app.js (pestañas, mapa, eventos)
Lógica         planificador.js · grafo.js · registro.js · envivo.js · reportes.js · lago.js
Datos          data/puno.js · data/osm-puno.js · data/region.js · localStorage
Servicios      Geolocation API · Leaflet · OSM/Esri tiles · OSRM · Overpass · Open-Meteo
```
- **Patrón módulo (ES Modules):** cada archivo exporta solo su interfaz pública.
- **Separación datos/lógica:** corregir una ruta es editar `data/`, no el código.
- **Degradación elegante:** si una API falla, la app sigue con datos locales.

## 5. Algoritmos
| Algoritmo | Dónde | Para qué | Complejidad |
|---|---|---|---|
| Haversine | `geo.js` | Distancia real entre coordenadas | O(1) |
| Douglas–Peucker | `registro.js` | Simplificar el trazo GPS (tolerancia 8 m) | O(n log n) promedio |
| Similitud de trazos | `registro.js` | Detectar rutas repetidas (≥70 % a ≤60 m) | O(n·m) |
| Dijkstra + montículo | `grafo.js` | Ruta más rápida en la red multimodal | O((V+E) log V) |
| Filtro de ruido GPS | `registro.js` | Descartar precisión > 35 m (70 m en el lago) y saltos < 8 m | O(1) por lectura |

**Grafo de transporte:** nodos = paraderos de cada línea (base y comunidad) + ORIGEN + DESTINO.
Aristas: viaje (paradero siguiente), transbordo (≤400 m a pie + espera) y acceso (≤900 m a pie).
Peso = minutos; cada reporte activo a <150 m suma 10 min → la ruta óptima cambia con la ciudad.

## 6. Modelo de datos (entidades)
```
Linea(id, nombre, color, frecuencia, horario, paradas[])      data/puno.js
Paradero(id, nombre, pos[lat,lng])                            data/puno.js, data/osm-puno.js
RutaComunidad(id, nombre, tipo, tarifa, velocidad, trazo[], paradas[], confirmaciones, creado)
Reporte(id, tipo, pos, texto, creado, sigue, yaNo)
Provincia(id, nombre, capital, pos, km, transporte) · Distrito(nombre, pos)
```

## 7. Ciclo del dato (sistema de información)
1. **Captura:** el pasajero graba con GPS (o importa un GeoJSON).
2. **Validación:** filtro de precisión y simplificación; deduplicación por similitud.
3. **Almacenamiento:** `localStorage` (fase 2: base de datos compartida, p. ej. Supabase).
4. **Procesamiento:** grafo + Dijkstra para planificar.
5. **Difusión:** mapa, "¿Cómo llego?" y exportación GeoJSON como dato abierto.

## 8. Pruebas realizadas
- **Pruebas unitarias automatizadas** (`npm test`, 7 casos, 7 aprobados): Haversine, Douglas–Peucker (línea recta y esquina), similitud de trazos, Dijkstra con transbordo, pesos dinámicos por reportes y caso sin ruta. Archivo: `tests/nucleo.test.js`.
- `node --check` en todos los módulos.
- En navegador: grabar ruta en modo demo (4 puntos, 1 paradero → 790 m); grabar la misma ruta otra vez suma confirmación (✓ 2) sin duplicar.
- Grafo: Plaza de Armas → Jayllihuaya = L4 + L2 (41 min, 30 nodos, 81 aristas); con reportes en L2 cambia a L4 → L1 → L2.
- Capa OSM: 52 marcadores; capa Región: 13 provincias + 14 distritos.

## 9. Limitaciones y fase 2
- Los datos de rutas son de demostración y las coordenadas de la región son referenciales.
- Las rutas grabadas viven en cada celular: falta un backend compartido.
- Predicción de llegada con historial de grabaciones; quechua y aymara completos; panel para la municipalidad.
