# Vibes · Muévete por Puno 🚌⛵

Mapa vivo del transporte de Puno: rutas de combis, paraderos, mototaxis, taxis,
lanchas del Lago Titicaca y reportes de la comunidad en tiempo real.

> ⚠️ **Datos de demostración.** Las rutas, coordenadas, horarios y tarifas de
> `data/puno.js` son aproximados. El siguiente paso del equipo es levantarlos en campo.

## Qué hace el MVP

| Módulo | Descripción |
|---|---|
| 🗺️ **Mapa de rutas** | 4 líneas de combi con paraderos. Los trazos se ajustan a las calles reales usando OSRM (y quedan guardados en el navegador). |
| 📡 **En vivo** | Combis moviéndose en el mapa y tiempo estimado de llegada a cada paradero (simulación; en producción vendría del GPS). |
| 🧭 **¿Cómo llego?** | Compara caminar, combi directa, combi con transbordo, taxi y mototaxi: tiempo, costo y pasos. Incluye medio pasaje estudiantil. |
| ⛵ **Lago** | Estado del lago con viento real (Open-Meteo) y próximas salidas a Uros, Taquile y Amantaní. |
| ⚠️ **Reportes** | Accidentes, bloqueos/paros, obras, granizo/helada. La comunidad confirma "sigue ahí" o "ya no está"; caducan a las 6 h. |
| 🚐 **Salir de Puno** | Salidas a Juliaca, aeropuerto, Ilave, Juli, Desaguadero, Lampa, Cusco y Arequipa. |
| 📴 **Offline** | Es PWA: se instala en el celular y abre sin señal con las rutas y el mapa ya visto. |

## Cómo correrlo

No necesita instalar nada. Solo hay que servirlo por HTTP (los módulos JS no funcionan con `file://`):

```bash
cd Vibes
python3 -m http.server 8080
# abrir http://localhost:8080
```

**En el servidor Plesk:** sube la carpeta completa al `httpdocs` del dominio. Debe ir con **HTTPS**
para que funcionen la ubicación y el modo offline.

## Estructura

```
index.html            Interfaz
css/app.css           Estilos (desktop = panel lateral, móvil = hoja inferior)
data/puno.js          ⭐ Todos los datos: lugares, rutas, tarifas, lanchas, interprovincial
js/app.js             Mapa, capas y pantallas
js/red.js             Red de rutas + trazos por calles (OSRM)
js/planificador.js    Algoritmo de "¿Cómo llego?"
js/envivo.js          Simulación de unidades y tiempos de llegada
js/lago.js            Clima del lago y próximas salidas
js/reportes.js        Reportes de la comunidad
sw.js                 Service worker (offline)
```

## Agregar o corregir una ruta

Edita `data/puno.js`:

1. Si el paradero no existe, agrégalo en `LUGARES` con su `id` y coordenadas `[lat, lng]`
   (clic derecho en Google Maps → copiar coordenadas).
2. Agrega la línea en `RUTAS` con las paradas **en orden de recorrido**:

```js
{ id: 'L5', nombre: 'Línea 5 · Origen ⇄ Destino', color: '#00e0ff',
  frecuencia: 7, horario: '06:00 – 21:00', unidades: 3,
  paradas: ['plaza', 'pino', 'bellavista'] },
```

3. Si cambias el recorrido de una ruta existente, borra el caché del navegador
   (`localStorage` → `vibes:trazos:v1`) para que se vuelva a trazar.

## Fase 2 (ideas del equipo)

- Backend (Node/Express o Laravel + MySQL) para compartir los reportes entre usuarios en tiempo real.
- Rutas aprendidas automáticamente con el GPS de los pasajeros (crowdsourcing).
- App en quechua, aymara e inglés; avisos por voz.
- Panel para municipalidad / SUTRAN: mapa de calor de demanda y accidentes.
- Pago con Yape/Plin por QR y pasaje estudiantil digital.
- Modo Candelaria: rutas alternas y calles cerradas durante la fiesta.
- Verificación de placas y botón de pánico / compartir viaje.

## Créditos

Mapa © OpenStreetMap y CARTO · Ruteo: OSRM · Clima: Open-Meteo · Leaflet.
