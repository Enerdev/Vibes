# Vibes · Muévete por Puno — Informe de negocio, técnico y de ingeniería

27 de noviembre de 2026 · Equipo Vibes (Ingeniería de Sistemas, UNA Puno)

> Versión editable del informe: https://claude.ai/artifact/WgajYVLdi1yrGJNpxvPcfU

## Resumen ejecutivo

Vibes es el primer mapa vivo del transporte de la región Puno, construido por los propios pasajeros. Resuelve un problema concreto: combis, mototaxis, lanchas del lago Titicaca y colectivos interprovinciales funcionan "de boca en boca", sin mapa oficial ni datos abiertos de rutas, paraderos o tarifas.

La solución es una aplicación web progresiva (PWA) que funciona en celulares de gama baja y sin señal. Su función central permite que cualquier pasajero **grabe con el GPS** las rutas y paraderos que no existen en ningún mapa; la comunidad las valida con confirmaciones. Sobre esa red, un **grafo con el algoritmo de Dijkstra** calcula la ruta óptima y se adapta a los reportes en tiempo real.

| Dato | Valor |
| --- | --- |
| Repositorio | [github.com/Enerdev/Vibes](https://github.com/Enerdev/Vibes) |
| Proyecto publicado | [vibes.lapreperu.com](https://vibes.lapreperu.com) (Plesk, HTTPS, despliegue automático desde GitHub) |
| Módulos de código | 12 archivos JavaScript + 3 de datos |
| Pruebas automatizadas | 7 de 7 aprobadas (`npm test`) |
| Datos abiertos | 52 paraderos, terminales y muelles de OpenStreetMap |
| Cobertura territorial | 13 provincias y 15 distritos de la provincia de Puno |
| Desarrollo | Concurso de vibe coding, 27 de noviembre de 2026, con IA (Claude) |

## Lean Canvas

El modelo apuesta por un activo que hoy nadie tiene: los datos del transporte informal de Puno, generados por la comunidad y monetizados con instituciones y comercios, no con el pasajero.

| Bloque | Contenido |
| --- | --- |
| 1. Problema | Rutas de combis, mototaxis y lanchas sin mapa ni datos abiertos. Tarifas y horarios desconocidos para turistas y nuevos residentes. Bloqueos, paros y granizadas sin aviso. Las autoridades planifican sin datos de demanda real. |
| 2. Segmentos de clientes | Pasajeros urbanos de Puno y Juliaca (estudiantes, trabajadores). Turistas nacionales y extranjeros (lago, Uros, Taquile). Municipalidades, SUTRAN y Capitanía del lago. Empresas de transporte y comercios. **Early adopters:** estudiantes de la UNA Puno. |
| 3. Propuesta única de valor | "El primer mapa vivo del transporte de Puno, construido por la gente": saber qué combi tomar, cuánto cuesta y si hay bloqueos, incluso sin señal. |
| 4. Solución | Registro de rutas y paraderos por GPS con validación comunitaria. "¿Cómo llego?" multimodal con grafo y Dijkstra. Reportes en vivo. Estado del lago y salidas de lanchas. App instalable y offline. |
| 5. Canales | Comunidad universitaria (UNA Puno), redes sociales y grupos de WhatsApp, códigos QR en paraderos y combis, alianzas con hostales y agencias de turismo, la municipalidad. |
| 6. Fuentes de ingresos | Plan institucional (panel de datos para municipalidades y SUTRAN). Publicidad local geolocalizada (comercios cerca de paraderos). Comisión por reserva de lanchas y tours. Plan premium para agencias de turismo. La app es gratuita para el pasajero. |
| 7. Estructura de costos | Hosting y dominio (Plesk), base de datos en la nube, APIs de mapas a gran escala, levantamiento de datos en campo, difusión y soporte. Hoy el costo es casi cero: sitio estático y APIs gratuitas. |
| 8. Métricas clave | Rutas registradas y validadas (2+ confirmaciones), kilómetros mapeados, usuarios activos semanales, viajes planificados, reportes por día, cobertura de paraderos por distrito. |
| 9. Ventaja injusta | Datos de rutas informales que no existen en Google Maps ni en ninguna fuente oficial, generados y validados por la comunidad local; efecto red: cada pasajero que graba mejora la app para todos. Equipo local que conoce el territorio. |

## Modelo de negocio

Vibes es una plataforma de dos lados: el pasajero usa la app gratis y aporta datos; instituciones, comercios y turismo pagan por el valor que esos datos generan.

**Fuentes de ingreso propuestas** (montos referenciales, a validar con clientes):

| Fuente | Cliente | Qué recibe | Modelo |
| --- | --- | --- | --- |
| Panel de gestión | Municipalidades, SUTRAN | Mapa de calor de demanda, zonas sin cobertura, puntos de accidentes, datos en GeoJSON | Suscripción anual |
| Publicidad local | Comercios, restaurantes, hostales | Anuncio cerca de paraderos y rutas | Pago por mes o por clic |
| Reservas del lago | Lancheros y agencias | Venta de pasajes a Uros, Taquile y Amantaní | Comisión por reserva |
| Plan turismo | Agencias de viaje | Itinerarios y rutas destacadas | Suscripción mensual |
| Pasajero | Usuarios | Todo el uso básico | Gratis siempre |

**Por qué gratis para el pasajero:** el valor del producto crece con cada ruta grabada. Cobrar al pasajero frenaría el efecto red que alimenta todo el modelo.

**Hoja de ruta del negocio:**

1. **Piloto (0–3 meses):** Puno ciudad con estudiantes de la UNA; meta de 30 rutas validadas.
2. **Validación (3–6 meses):** convenio con la Municipalidad Provincial de Puno; primer panel de gestión.
3. **Expansión (6–12 meses):** Juliaca y capitales de provincia; reservas de lanchas.
4. **Escala (12+ meses):** otras regiones del sur andino con transporte informal (Cusco, Arequipa).

## Informe técnico

La arquitectura es una **aplicación web progresiva 100 % cliente, en capas y modular (ES Modules)**, que consume servicios externos por API. Se eligió porque el altiplano tiene señal irregular y celulares de gama baja: sin framework ni compilación la app carga rápido, funciona offline y se publica como sitio estático a costo casi cero.

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Presentación   index.html · css/app.css · css/tema.css · js/app.js       │
└───────────────────────────────────┬──────────────────────────────────────┘
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Lógica         grafo.js (Dijkstra) · registro.js (GPS, Douglas–Peucker)  │
│                planificador.js · usuario.js · reportes.js · lago.js ·    │
│                osm.js · envivo.js · red.js                               │
└───────────────────────────────────┬──────────────────────────────────────┘
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Datos          data/puno.js · data/osm-puno.js · data/region.js ·        │
│                localStorage (rutas, reportes, cuentas)                   │
└───────────────────────────────────┬──────────────────────────────────────┘
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Servicios      Geolocation · OpenStreetMap / Esri · OSRM · Overpass ·    │
│                Open-Meteo · Web Crypto · Service Worker                  │
└──────────────────────────────────────────────────────────────────────────┘
```

La capa de lógica concentra el valor técnico: el grafo y el registro GPS. Si una API externa falla, las capas de arriba siguen con los datos locales.

**Tecnologías y APIs**

| Componente | Tecnología | Uso en Vibes |
| --- | --- | --- |
| Lenguaje | HTML5, CSS3, JavaScript ES Modules | Interfaz y lógica, sin dependencias de compilación |
| Mapa | Leaflet 1.9.4 | Capas, marcadores, polilíneas |
| Mapas base | OpenStreetMap y Esri (sin clave) | Vista clara, satélite y oscura |
| Ubicación | Geolocation API (`watchPosition`) | Grabar rutas, "usar mi ubicación" |
| Ruteo por calles | OSRM | Ajustar las líneas de combi a las calles reales |
| Datos abiertos | Overpass API (OpenStreetMap) | 52 paraderos, terminales y muelles reales |
| Clima | Open-Meteo | Viento y ráfagas del lago Titicaca |
| Base de datos | MySQL / MariaDB + API PHP 8 (PDO) | Rutas, reportes y cuentas compartidos entre usuarios |
| Seguridad | bcrypt en servidor, SHA-256 en modo local | PIN de las cuentas, nunca en texto plano |
| Offline | Service Worker + Web App Manifest | App instalable que abre sin señal |
| Formato abierto | GeoJSON | Exportar e importar rutas |
| Pruebas | Node.js test runner | 7 pruebas unitarias del núcleo |

**Algoritmos**

| Algoritmo | Módulo | Para qué | Complejidad |
| --- | --- | --- | --- |
| Haversine | `geo.js` | Distancia real entre coordenadas | O(1) |
| Filtro de ruido GPS | `registro.js` | Descarta precisión > 35 m (70 m en el lago) y saltos < 8 m | O(1) por lectura |
| Douglas–Peucker | `registro.js` | Simplifica el trazo GPS con tolerancia de 8 m | O(n log n) promedio |
| Similitud de trazos | `registro.js` | Detecta rutas repetidas (70 % de puntos a 60 m o menos) | O(n · m) |
| Dijkstra con montículo binario | `grafo.js` | Ruta más rápida en la red multimodal | O((V + E) log V) |

**El grafo de transporte.** Cada paradero de cada línea (base y comunidad) es un nodo, más dos nodos virtuales, origen y destino. Las aristas son de viaje (paradero siguiente), transbordo (400 m o menos a pie, más espera) y acceso (900 m o menos a pie). El peso es el tiempo en minutos; cada reporte activo a menos de 150 m de un tramo suma 10 minutos, así la ruta óptima cambia con la ciudad. En la prueba, con reportes en la línea L2, el camino pasó de L4 → L2 (41 min) a L4 → L1 → L2.

**Pruebas.** `npm test` ejecuta 7 casos y aprueban los 7: Haversine, Douglas–Peucker (línea recta y esquina), similitud de trazos, transbordo en el grafo, penalización por reportes y caso sin ruta. Además se verificó cada función en un navegador real, en escritorio y en móvil.

## Ingeniería de software

El desarrollo siguió un **proceso iterativo e incremental** con entregas pequeñas: cada funcionalidad se programó, se probó en el navegador y se subió en su propio commit, con commits trazables en el repositorio.

**Actores**

| Actor | Objetivo |
| --- | --- |
| Pasajero | Consultar rutas, planificar viajes, reportar incidentes |
| Pasajero colaborador | Grabar rutas y paraderos con GPS; confirmar rutas de otros |
| Usuario registrado | Guardar lugares, rutas y filtros de transporte propios |
| Turista | Consultar lanchas, estado del lago y salidas interprovinciales |
| Municipalidad / SUTRAN (fase 2) | Usar los datos abiertos para planificar |

**Requerimientos funcionales**

| ID | Requerimiento | Módulo |
| --- | --- | --- |
| RF01 | Mostrar líneas, paraderos y unidades en vivo | `app.js`, `red.js`, `envivo.js` |
| RF02 | Planificar viaje origen → destino con tiempo y costo | `planificador.js` |
| RF03 | Calcular la ruta óptima en un grafo con pesos dinámicos | `grafo.js` |
| RF04 | Grabar rutas y paraderos con GPS (combi, mototaxi, lancha) | `registro.js` |
| RF05 | Validar rutas por la comunidad | `registro.js` |
| RF06 | Exportar e importar rutas en GeoJSON | `registro.js` |
| RF07 | Reportar incidentes que caducan a las 6 h | `reportes.js` |
| RF08 | Mostrar estado del lago y salidas de lanchas | `lago.js` |
| RF09 | Mostrar datos abiertos de OpenStreetMap | `osm.js` |
| RF10 | Segmentar la región en provincias y distritos | `data/region.js` |
| RF11 | Iniciar sesión y guardar favoritos y filtros | `usuario.js` |

**Requerimientos no funcionales**

| ID | Requerimiento | Cómo se cumple |
| --- | --- | --- |
| RNF01 | Rendimiento en celulares de gama baja | JavaScript sin framework ni compilación |
| RNF02 | Disponibilidad sin señal | PWA con service worker |
| RNF03 | Interoperabilidad | GeoJSON y OpenStreetMap (licencia ODbL) |
| RNF04 | Privacidad | La ubicación y el PIN no salen del celular |
| RNF05 | Seguridad | PIN con hash SHA-256 y sal |
| RNF06 | Tolerancia a fallos | Copias locales si una API no responde |
| RNF07 | Usabilidad | Interfaz responsive, móvil primero, tema claro |
| RNF08 | Mantenibilidad | Un módulo por responsabilidad; datos separados del código |

**Caso de uso principal: Registrar ruta (RF04)**

1. El pasajero abre la pestaña Registrar y elige el tipo de transporte.
2. Escribe el nombre de la ruta y la tarifa, y toca Iniciar.
3. El sistema lee el GPS y descarta lecturas imprecisas.
4. El pasajero marca cada paradero durante el viaje.
5. Al terminar, el sistema simplifica el trazo y calcula la velocidad real.
6. Si existe una ruta parecida, suma una confirmación; si no, guarda una ruta nueva.

**Calidad y buenas prácticas:** separación en capas, módulos con interfaz pública mínima, nombres en español del dominio, pruebas unitarias, control de versiones con commits atómicos y documentación en el repositorio (`README.md`, `docs/INGENIERIA.md`, `docs/SUSTENTACION.md`, `IA_Y_PROMPTS.md`).

## Sistemas de información

Vibes es un **sistema de información geográfica (SIG) colaborativo**: captura datos del territorio con los celulares de los ciudadanos, los procesa con algoritmos y los difunde como mapa, recomendaciones de viaje y datos abiertos.

**Tipo de sistema.** En su versión actual es un sistema de procesamiento de transacciones para el pasajero (registrar, reportar, consultar). En la fase 2 suma un sistema de apoyo a la decisión para la municipalidad, con mapas de calor y zonas sin cobertura.

**Ciclo del dato**

1. **Captura:** el pasajero graba con GPS, reporta un incidente o importa un GeoJSON; Overpass y Open-Meteo aportan datos externos.
2. **Validación:** filtro de precisión GPS, simplificación del trazo y deduplicación por similitud; confirmaciones de la comunidad.
3. **Almacenamiento:** `localStorage` en el celular (funciona sin señal) y **MySQL** en el servidor, sincronizados cada 30 s.
4. **Procesamiento:** grafo y Dijkstra para planificar; caducidad de reportes a las 6 horas.
5. **Difusión:** mapa, "¿Cómo llego?", cinta EN VIVO y exportación GeoJSON como dato abierto.

**Modelo de datos**

| Entidad | Atributos principales | Dónde vive |
| --- | --- | --- |
| Línea | id, nombre, color, frecuencia, horario, paradas | `data/puno.js` |
| Paradero | id, nombre, posición (lat, lng) | `data/puno.js`, `data/osm-puno.js` |
| RutaComunidad | id, nombre, tipo, tarifa, velocidad, trazo, paradas, confirmaciones, fecha | MySQL `rutas` + `localStorage` |
| Reporte | id, tipo, posición, texto, fecha, votos | MySQL `reportes` + `localStorage` |
| Usuario | nombre, hash bcrypt del PIN, token, lugares, rutas, filtros | MySQL `usuarios` |
| Provincia / Distrito | nombre, capital, posición, distancia, transporte | `data/region.js` |

**Seguridad y privacidad.** La ubicación no se envía a ningún servidor propio. El PIN se guarda como hash SHA-256 con sal aleatoria. El sitio debe servirse con HTTPS, requisito del navegador para el GPS y el modo offline. Para producción se aplicará la Ley 29733 de Protección de Datos Personales con consentimiento explícito de ubicación.

## Limitaciones, riesgos y plan a producción

Ya existe una base de datos MySQL con API PHP que comparte rutas, reportes y cuentas. Llevarlo a producción requiere moderación de aportes, datos de campo y tiempo real.

| Limitación o riesgo | Impacto | Acción para producción |
| --- | --- | --- |
| Backend mínimo | Sin consultas espaciales ni tiempo real | PostGIS para consultas geográficas y WebSockets para reportes |
| Login con PIN | Sin recuperación de cuenta; el token no expira | Expiración de tokens y recuperación por correo |
| Datos de demostración | Rutas, tarifas y coordenadas aproximadas | Levantamiento en campo y convenio con la municipalidad |
| "En vivo" simulado | Las llegadas de combis son estimadas | GPS en unidades por convenio con empresas; predicción con historial |
| Calidad de aportes | Rutas erróneas o malintencionadas | Consenso de varias grabaciones, reputación de usuarios, moderación |
| APIs externas lentas o caídas | Overpass tarda hasta 35 s | Copias locales (ya implementado) y servidores propios de tiles y ruteo |
| Idiomas | Quechua y aymara parciales, sin voz | Traducción completa y avisos por voz |
| Pruebas limitadas | Solo pruebas unitarias del núcleo | Pruebas E2E con Playwright y CI en GitHub Actions |
| Marco legal | Tratamiento de datos de ubicación | Política de privacidad conforme a la Ley 29733 |

**Uso de inteligencia artificial.** El proyecto se desarrolló con Claude (Opus 5.5): en claude.ai para la ideación y el MVP, y con Claude Code para revisar el repositorio, programar, probar en un navegador real y hacer commits. El equipo definió el problema, la idea central del registro por GPS y las decisiones de alcance. El historial completo de prompts está en `IA_Y_PROMPTS.md` del repositorio.

## Fuentes

- Repositorio del proyecto: [github.com/Enerdev/Vibes](https://github.com/Enerdev/Vibes)
- Datos de paraderos: [OpenStreetMap](https://www.openstreetmap.org/copyright), licencia ODbL, vía la API Overpass
- Clima del lago: [Open-Meteo](https://open-meteo.com/)
- Coordenadas de capitales provinciales y distritales: aproximadas, a validar con el INEI
