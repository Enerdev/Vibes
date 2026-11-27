// ============================================================
//  Registrar ruta con GPS (función estrella del equipo)
//  Cualquier pasajero graba el recorrido de una combi, mototaxi
//  o lancha del lago y marca sus paraderos. Si otra persona ya
//  grabó una ruta parecida, se suma una confirmación (validación
//  comunitaria) en vez de duplicarla.
// ============================================================
import { distancia, longitud } from './geo.js';

const KEY = 'vibes:comunidad:v1';
const PRECISION_MAX = 35;   // m: se descartan lecturas GPS peores (en el lago se relaja)
const PASO_MIN = 8;         // m: ignora puntos casi iguales (vehículo detenido)
const TOLERANCIA = 8;       // m: simplificación Douglas–Peucker
const UMBRAL_SIMILAR = 0.7; // 70 % de puntos a menos de 60 m en ambos sentidos
const CONFIRMADA = 2;       // confirmaciones para considerar la ruta validada

export const TIPOS = {
  combi: { emoji: '🚐', label: 'Combi', color: '#22c55e' },
  mototaxi: { emoji: '🛺', label: 'Mototaxi', color: '#eab308' },
  lancha: { emoji: '⛵', label: 'Lancha (lago)', color: '#38bdf8' },
};

// ---------------- Algoritmos ----------------

/** Distancia de p al segmento a–b en metros (proyección plana local, suficiente a escala ciudad). */
function distSegmento(p, a, b) {
  const k = Math.cos((p[0] * Math.PI) / 180);
  const ax = a[1] * k, ay = a[0], bx = b[1] * k, by = b[0], px = p[1] * k, py = p[0];
  const dx = bx - ax, dy = by - ay;
  const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
  return distancia(p, [ay + t * dy, (ax + t * dx) / k]);
}

/** Douglas–Peucker: quita puntos que no cambian la forma del trazo más de `tol` metros. */
export function simplificar(linea, tol = TOLERANCIA) {
  if (linea.length < 3) return linea.slice();
  let max = 0, idx = 0;
  for (let i = 1; i < linea.length - 1; i++) {
    const d = distSegmento(linea[i], linea[0], linea[linea.length - 1]);
    if (d > max) { max = d; idx = i; }
  }
  if (max <= tol) return [linea[0], linea[linea.length - 1]];
  const izq = simplificar(linea.slice(0, idx + 1), tol);
  return izq.slice(0, -1).concat(simplificar(linea.slice(idx), tol));
}

/** Distancia mínima de p a la polilínea. */
function distLinea(p, linea) {
  if (linea.length === 1) return distancia(p, linea[0]);
  let min = Infinity;
  for (let i = 1; i < linea.length; i++) min = Math.min(min, distSegmento(p, linea[i - 1], linea[i]));
  return min;
}

/** Fracción de puntos de A que quedan a menos de `radio` m de B. */
export function similitud(a, b, radio = 60) {
  if (!a.length || !b.length) return 0;
  return a.filter((p) => distLinea(p, b) <= radio).length / a.length;
}

// ---------------- Almacenamiento ----------------
function leer() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}
function guardar(lista) {
  try { localStorage.setItem(KEY, JSON.stringify(lista)); } catch { /* sin almacenamiento */ }
}

export class RutasComunidad {
  constructor() { this.lista = leer(); }

  /** Guarda una ruta nueva o, si ya existe una parecida del mismo tipo, suma una confirmación. */
  agregar(ruta) {
    const igual = this.lista.find((r) => r.tipo === ruta.tipo &&
      similitud(ruta.trazo, r.trazo) >= UMBRAL_SIMILAR && similitud(r.trazo, ruta.trazo) >= UMBRAL_SIMILAR);
    if (igual) {
      igual.confirmaciones += 1;
      guardar(this.lista);
      return { ruta: igual, nueva: false };
    }
    const r = { ...ruta, id: 'c' + Date.now().toString(36), confirmaciones: 1, creado: Date.now() };
    this.lista.push(r);
    guardar(this.lista);
    return { ruta: r, nueva: true };
  }

  confirmar(id) {
    const r = this.lista.find((x) => x.id === id);
    if (r) { r.confirmaciones += 1; guardar(this.lista); }
    return r;
  }

  borrar(id) {
    this.lista = this.lista.filter((x) => x.id !== id);
    guardar(this.lista);
  }

  /** GeoJSON (formato de datos abiertos): una LineString por ruta y un Point por paradero. */
  aGeoJSON() {
    const features = [];
    for (const r of this.lista) {
      const props = { id: r.id, nombre: r.nombre, tipo: r.tipo, tarifa: r.tarifa, velocidad_kmh: r.velocidad, confirmaciones: r.confirmaciones };
      features.push({ type: 'Feature', properties: props, geometry: { type: 'LineString', coordinates: r.trazo.map(([la, lo]) => [lo, la]) } });
      r.paradas.forEach((p, i) => features.push({
        type: 'Feature', properties: { ruta: r.id, paradero: i + 1 }, geometry: { type: 'Point', coordinates: [p[1], p[0]] },
      }));
    }
    return { type: 'FeatureCollection', features };
  }

  /** Importa rutas de un GeoJSON exportado por la app (u otro con LineStrings). Devuelve cuántas entraron. */
  deGeoJSON(gj) {
    let n = 0;
    const paradas = {};
    for (const f of gj.features || []) {
      if (f.geometry?.type === 'Point' && f.properties?.ruta) {
        (paradas[f.properties.ruta] ||= []).push([f.geometry.coordinates[1], f.geometry.coordinates[0]]);
      }
    }
    for (const f of gj.features || []) {
      if (f.geometry?.type !== 'LineString') continue;
      const p = f.properties || {};
      const trazo = f.geometry.coordinates.map(([lo, la]) => [la, lo]);
      if (trazo.length < 2) continue;
      this.agregar({
        nombre: String(p.nombre || 'Ruta importada').slice(0, 60),
        tipo: TIPOS[p.tipo] ? p.tipo : 'combi',
        tarifa: Number(p.tarifa) || 0,
        velocidad: Number(p.velocidad_kmh) || 15,
        trazo,
        paradas: paradas[p.id] || [],
      });
      n++;
    }
    return n;
  }
}

// ---------------- Grabadora ----------------

/** Graba un recorrido desde el GPS (o tocando el mapa en modo demo). */
export class Grabadora {
  constructor(alCambiar) {
    this.alCambiar = alCambiar;
    this.reset();
  }

  reset() {
    this.puntos = [];       // [lat, lng]
    this.tiempos = [];      // ms de cada punto
    this.paradas = [];
    this.descartados = 0;
    this.activa = false;
    this.demo = false;
    this.tipo = 'combi';
    if (this.watchId != null) navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null;
  }

  iniciar({ demo, tipo }) {
    this.reset();
    this.activa = true;
    this.demo = demo;
    this.tipo = tipo;
    if (!demo) {
      // En el lago la señal GPS suele ser peor: aceptamos lecturas menos precisas.
      const precisionMax = tipo === 'lancha' ? PRECISION_MAX * 2 : PRECISION_MAX;
      this.watchId = navigator.geolocation.watchPosition(
        (p) => {
          if (p.coords.accuracy > precisionMax) { this.descartados++; this.alCambiar('ruido'); return; }
          this.agregarPunto([p.coords.latitude, p.coords.longitude], p.timestamp);
        },
        (err) => this.alCambiar('error', err),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
      );
    }
    this.alCambiar('inicio');
  }

  agregarPunto(pos, t = Date.now()) {
    if (!this.activa) return;
    const ult = this.puntos[this.puntos.length - 1];
    if (ult && distancia(ult, pos) < PASO_MIN) return;
    this.puntos.push(pos);
    this.tiempos.push(t);
    this.alCambiar('punto', pos);
  }

  marcarParadero() {
    const ult = this.puntos[this.puntos.length - 1];
    if (!ult) return false;
    if (!this.paradas.some((p) => distancia(p, ult) < 30)) this.paradas.push(ult);
    this.alCambiar('paradero', ult);
    return true;
  }

  get metros() { return longitud(this.puntos); }

  /** Termina la grabación y devuelve la ruta lista para guardar (o null si es muy corta). */
  terminar({ nombre, tarifa }) {
    if (this.watchId != null) navigator.geolocation.clearWatch(this.watchId);
    this.watchId = null;
    this.activa = false;
    if (this.puntos.length < 2 || this.metros < 100) return null;
    const trazo = simplificar(this.puntos);
    // Velocidad real medida; en modo demo se usa una típica del tipo de vehículo.
    const tipicas = { combi: 15, mototaxi: 18, lancha: 12 };
    const seg = (this.tiempos[this.tiempos.length - 1] - this.tiempos[0]) / 1000;
    const real = seg > 60 ? (this.metros / seg) * 3.6 : 0;
    const velocidad = Math.round(!this.demo && real > 2 && real < 80 ? real : tipicas[this.tipo]);
    // Cada paradero se reubica sobre el punto más cercano del trazo simplificado.
    const paradas = this.paradas.map((p) => trazo.reduce((m, q) => (distancia(p, q) < distancia(p, m) ? q : m)));
    return { nombre, tipo: this.tipo, tarifa, velocidad, trazo, paradas, metros: Math.round(longitud(trazo)) };
  }
}

export const CONFIRMACIONES_VALIDADA = CONFIRMADA;
