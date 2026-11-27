// Construye la red de transporte: rutas con su trazo, paradas y distancias.
import { LUGARES, RUTAS } from '../data/puno.js';
import { distancia, acumuladas } from './geo.js';

export const lugarPorId = Object.fromEntries(LUGARES.map((l) => [l.id, l]));

const CACHE_KEY = 'vibes:trazos:v1';
const OSRM = 'https://router.project-osrm.org/route/v1/driving/';

function leerCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
}
function guardarCache(c) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch { /* sin almacenamiento */ }
}

/** Pide a OSRM el trazo por calles que pasa por todas las paradas. */
async function trazoPorCalles(puntos) {
  const coords = puntos.map((p) => `${p[1].toFixed(5)},${p[0].toFixed(5)}`).join(';');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(`${OSRM}${coords}?overview=full&geometries=geojson`, { signal: ctrl.signal });
    if (!r.ok) throw new Error('OSRM ' + r.status);
    const j = await r.json();
    if (!j.routes?.length) throw new Error('sin ruta');
    return j.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  } finally {
    clearTimeout(t);
  }
}

/** Distancia a lo largo del trazo para cada parada (búsqueda monótona). */
function ubicarParadas(trazo, acc, paradas) {
  const res = [];
  let desde = 0;
  for (const p of paradas) {
    let best = desde, bestD = Infinity;
    for (let i = desde; i < trazo.length; i++) {
      const d = distancia(trazo[i], p.pos);
      if (d < bestD) { bestD = d; best = i; }
    }
    res.push(acc[best]);
    desde = best;
  }
  return res;
}

function armarRuta(def, trazo, porCalles) {
  const paradas = def.paradas.map((id) => lugarPorId[id]);
  const acc = acumuladas(trazo);
  return {
    ...def,
    paradas,
    trazo,
    acc,
    largo: acc[acc.length - 1],
    distParadas: ubicarParadas(trazo, acc, paradas),
    porCalles,
  };
}

/**
 * Devuelve las rutas de inmediato con trazo recto entre paradas,
 * y llama a `alMejorar(rutas)` cuando consigue los trazos por calles.
 */
export function cargarRed(alMejorar) {
  const cache = leerCache();
  const rutas = RUTAS.map((def) => {
    const enCache = cache[def.id];
    const puntos = def.paradas.map((id) => lugarPorId[id].pos);
    return enCache ? armarRuta(def, enCache, true) : armarRuta(def, puntos, false);
  });

  const pendientes = rutas.filter((r) => !r.porCalles);
  if (pendientes.length && navigator.onLine !== false) {
    (async () => {
      let cambio = false;
      for (const r of pendientes) {
        try {
          const trazo = await trazoPorCalles(r.paradas.map((p) => p.pos));
          cache[r.id] = trazo.map(([a, b]) => [+a.toFixed(5), +b.toFixed(5)]);
          Object.assign(r, armarRuta(RUTAS.find((d) => d.id === r.id), cache[r.id], true));
          cambio = true;
        } catch (e) {
          console.warn('No se pudo trazar por calles', r.id, e.message);
        }
      }
      if (cambio) { guardarCache(cache); alMejorar?.(rutas); }
    })();
  }
  return rutas;
}

/** Paraderos únicos con las líneas que pasan por cada uno. */
export function paraderos(rutas) {
  const mapa = new Map();
  for (const r of rutas) {
    r.paradas.forEach((p) => {
      if (!mapa.has(p.id)) mapa.set(p.id, { ...p, lineas: [] });
      mapa.get(p.id).lineas.push(r);
    });
  }
  return [...mapa.values()];
}
