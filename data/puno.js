// ============================================================
//  DATOS DE DEMOSTRACIÓN — PUNO
//  Coordenadas, rutas, horarios y tarifas son APROXIMADOS.
//  Reemplazar con datos levantados en campo por el equipo.
//  Formato de coordenadas: [latitud, longitud]
// ============================================================

export const CIUDAD = {
  nombre: 'Puno',
  centro: [-15.8402, -70.0219],
  zoom: 14,
  limites: [[-15.95, -70.12], [-15.60, -69.60]],
};

// Tarifas de referencia (S/.) — validar en campo
export const TARIFAS = {
  combiUrbana: 1.0,
  combiEstudiante: 0.5,
  taxiBase: 5.0,       // carrera mínima dentro de la ciudad
  taxiPorKm: 1.2,
  mototaxiBase: 2.0,
  mototaxiPorKm: 1.0,
};

export const VELOCIDADES = {   // km/h promedio
  caminar: 4.5,
  combi: 16,
  taxi: 24,
  mototaxi: 15,
};

// ---------- Lugares conocidos (para buscar) ----------
export const LUGARES = [
  { id: 'plaza',      nombre: 'Plaza de Armas',               pos: [-15.8406, -70.0280], tipo: 'centro' },
  { id: 'mcentral',   nombre: 'Mercado Central',               pos: [-15.8420, -70.0262], tipo: 'mercado' },
  { id: 'pino',       nombre: 'Parque Pino',                   pos: [-15.8445, -70.0257], tipo: 'centro' },
  { id: 'bellavista', nombre: 'Mercado Bellavista',            pos: [-15.8478, -70.0228], tipo: 'mercado' },
  { id: 'arco',       nombre: 'Arco Deustua',                  pos: [-15.8381, -70.0303], tipo: 'turismo' },
  { id: 'kunturwasi', nombre: 'Mirador Kuntur Wasi',           pos: [-15.8378, -70.0345], tipo: 'turismo' },
  { id: 'huajsapata', nombre: 'Mirador Huajsapata',            pos: [-15.8433, -70.0306], tipo: 'turismo' },
  { id: 'una',        nombre: 'Universidad Nacional del Altiplano', pos: [-15.8240, -70.0165], tipo: 'educacion' },
  { id: 'estadio',    nombre: 'Estadio Enrique Torres Belón',  pos: [-15.8317, -70.0180], tipo: 'otro' },
  { id: 'hospital',   nombre: 'Hospital Regional',             pos: [-15.8337, -70.0222], tipo: 'salud' },
  { id: 'tterrestre', nombre: 'Terminal Terrestre',            pos: [-15.8389, -70.0172], tipo: 'terminal' },
  { id: 'tzonal',     nombre: 'Terminal Zonal',                pos: [-15.8262, -70.0213], tipo: 'terminal' },
  { id: 'puerto',     nombre: 'Puerto / Muelle Turístico',     pos: [-15.8355, -70.0150], tipo: 'puerto' },
  { id: 'altopuno',   nombre: 'Alto Puno',                     pos: [-15.8035, -70.0255], tipo: 'barrio' },
  { id: 'chanu',      nombre: 'Chanu Chanu',                   pos: [-15.8110, -70.0205], tipo: 'barrio' },
  { id: 'llavini',    nombre: 'Barrio Llavini',                pos: [-15.8330, -70.0330], tipo: 'barrio' },
  { id: 'huascar',    nombre: 'Barrio Huáscar',                pos: [-15.8560, -70.0225], tipo: 'barrio' },
  { id: 'salcedo',    nombre: 'Salcedo',                       pos: [-15.8770, -70.0040], tipo: 'barrio' },
  { id: 'jayllihuaya',nombre: 'Jayllihuaya',                   pos: [-15.8850, -69.9930], tipo: 'barrio' },
];

// ---------- Rutas de combis (DEMO) ----------
// Las paradas van en orden de recorrido (ida). La vuelta usa el mismo trazo.
export const RUTAS = [
  {
    id: 'L1', nombre: 'Línea 1 · Alto Puno ⇄ Salcedo', color: '#ff3d7f',
    frecuencia: 6, horario: '05:30 – 21:30', unidades: 4,
    paradas: ['altopuno', 'chanu', 'tzonal', 'hospital', 'mcentral', 'pino', 'bellavista', 'huascar', 'salcedo'],
  },
  {
    id: 'L2', nombre: 'Línea 2 · UNA ⇄ Jayllihuaya', color: '#ffc531',
    frecuencia: 8, horario: '06:00 – 21:00', unidades: 3,
    paradas: ['una', 'estadio', 'tterrestre', 'pino', 'bellavista', 'salcedo', 'jayllihuaya'],
  },
  {
    id: 'L3', nombre: 'Línea 3 · Llavini ⇄ Puerto', color: '#22d3a6',
    frecuencia: 10, horario: '06:00 – 20:00', unidades: 3,
    paradas: ['llavini', 'arco', 'plaza', 'mcentral', 'tterrestre', 'puerto'],
  },
  {
    id: 'L4', nombre: 'Línea 4 · Alto Puno ⇄ Huáscar', color: '#8b7bff',
    frecuencia: 9, horario: '05:45 – 21:00', unidades: 3,
    paradas: ['altopuno', 'tzonal', 'una', 'estadio', 'hospital', 'plaza', 'pino', 'huascar'],
  },
];

// ---------- Paraderos de mototaxi y taxi (DEMO) ----------
export const PARADEROS_EXTRA = [
  { tipo: 'mototaxi', nombre: 'Mototaxis Bellavista',   pos: [-15.8484, -70.0236] },
  { tipo: 'mototaxi', nombre: 'Mototaxis Salcedo',      pos: [-15.8762, -70.0052] },
  { tipo: 'mototaxi', nombre: 'Mototaxis Alto Puno',    pos: [-15.8042, -70.0245] },
  { tipo: 'mototaxi', nombre: 'Mototaxis Huáscar',      pos: [-15.8552, -70.0236] },
  { tipo: 'taxi',     nombre: 'Taxis Plaza de Armas',   pos: [-15.8412, -70.0274] },
  { tipo: 'taxi',     nombre: 'Taxis Terminal Terrestre', pos: [-15.8384, -70.0178] },
  { tipo: 'taxi',     nombre: 'Taxis Puerto',           pos: [-15.8360, -70.0162] },
  { tipo: 'taxi',     nombre: 'Taxis UNA',              pos: [-15.8248, -70.0172] },
];

// ---------- Lago Titicaca: salidas en lancha (DEMO) ----------
export const LAGO = {
  puerto: 'puerto',
  destinos: [
    { id: 'uros', nombre: 'Islas flotantes de los Uros', pos: [-15.8183, -69.9720],
      duracion: 30, precioLocal: 10, precioTurista: 25,
      salidas: ['06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00','11:00','12:00','13:00','14:00','15:00','16:00'] },
    { id: 'taquile', nombre: 'Isla Taquile', pos: [-15.7740, -69.6860],
      duracion: 180, precioLocal: 30, precioTurista: 50,
      salidas: ['07:00','07:30'] },
    { id: 'amantani', nombre: 'Isla Amantaní', pos: [-15.6640, -69.7180],
      duracion: 210, precioLocal: 30, precioTurista: 50,
      salidas: ['08:00'] },
  ],
};

// ---------- Interprovincial (DEMO) ----------
export const INTERPROVINCIAL = [
  { destino: 'Juliaca',      desde: 'tzonal',     tipo: 'Combi / minivan', frecuencia: 'cada 5–10 min', precio: 5,  duracion: 50 },
  { destino: 'Aeropuerto Juliaca', desde: 'tterrestre', tipo: 'Shuttle / taxi colectivo', frecuencia: 'según vuelos', precio: 15, duracion: 60 },
  { destino: 'Ilave',        desde: 'tzonal',     tipo: 'Combi',           frecuencia: 'cada 15 min',   precio: 5,  duracion: 60 },
  { destino: 'Juli',         desde: 'tzonal',     tipo: 'Combi',           frecuencia: 'cada 20 min',   precio: 8,  duracion: 90 },
  { destino: 'Desaguadero',  desde: 'tzonal',     tipo: 'Combi',           frecuencia: 'cada 30 min',   precio: 12, duracion: 150 },
  { destino: 'Lampa',        desde: 'tzonal',     tipo: 'Combi',           frecuencia: 'cada 30 min',   precio: 8,  duracion: 90 },
  { destino: 'Cusco',        desde: 'tterrestre', tipo: 'Bus',             frecuencia: 'varias al día', precio: 40, duracion: 420 },
  { destino: 'Arequipa',     desde: 'tterrestre', tipo: 'Bus',             frecuencia: 'varias al día', precio: 35, duracion: 360 },
];

// ---------- Reportes iniciales (DEMO) ----------
export const REPORTES_DEMO = [
  { tipo: 'obra',      pos: [-15.8460, -70.0240], texto: 'Trabajos de pista, un carril cerrado', minutos: 40 },
  { tipo: 'bloqueo',   pos: [-15.8300, -70.0195], texto: 'Movilización en la avenida, tránsito lento', minutos: 15 },
  { tipo: 'clima',     pos: [-15.8060, -70.0250], texto: 'Granizada, pista resbalosa', minutos: 8 },
];

export const TIPOS_REPORTE = {
  accidente: { label: 'Accidente',          emoji: '💥', color: '#ff4d4d' },
  bloqueo:   { label: 'Bloqueo / paro',     emoji: '⛔', color: '#ff8a3d' },
  obra:      { label: 'Obra / mantenimiento', emoji: '🚧', color: '#ffc531' },
  clima:     { label: 'Granizo / helada',   emoji: '🌨️', color: '#7cc7ff' },
  trafico:   { label: 'Tráfico pesado',     emoji: '🐢', color: '#c58bff' },
  otro:      { label: 'Otro',               emoji: '📍', color: '#9aa4b2' },
};
