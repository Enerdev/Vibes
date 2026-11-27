// Capa de datos abiertos de OpenStreetMap (paraderos, terminales y muelles reales de Puno).
// Primero usa la copia del repo (data/osm-puno.js) y luego intenta actualizarla
// en vivo con la API Overpass; el resultado se guarda en el navegador.
import { OSM_PUNO } from '../data/osm-puno.js';

const KEY = 'vibes:osm:v1';
const BBOX = '-15.90,-70.08,-15.78,-69.98';
const SERVIDORES = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const CONSULTA = `[out:json][timeout:25];(node["highway"="bus_stop"](${BBOX});` +
  `nwr["amenity"="bus_station"](${BBOX});nwr["amenity"="ferry_terminal"](${BBOX}););out center tags;`;

export const ESTILO_OSM = {
  paradero: { emoji: '🚏', label: 'Paradero (OSM)' },
  terminal: { emoji: '🚌', label: 'Terminal / colectivos (OSM)' },
  muelle: { emoji: '⛴️', label: 'Muelle (OSM)' },
};

const aObjeto = ([id, lat, lng, tipo, nombre]) => ({ id, pos: [lat, lng], tipo, nombre });

/** Datos disponibles al instante: caché del navegador o la copia del repo. */
export function osmLocal() {
  try {
    const c = JSON.parse(localStorage.getItem(KEY));
    if (c?.datos?.length) return c.datos.map(aObjeto);
  } catch { /* sin caché */ }
  return OSM_PUNO.map(aObjeto);
}

/** Pide datos frescos a Overpass (en segundo plano). Devuelve null si no hay conexión. */
export async function osmActualizar() {
  for (const url of SERVIDORES) {
    try {
      const r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(CONSULTA) });
      const j = JSON.parse(await r.text());
      const datos = j.elements.map((e) => {
        const t = e.tags || {};
        const tipo = t.highway === 'bus_stop' ? 'paradero' : t.amenity === 'ferry_terminal' ? 'muelle' : 'terminal';
        return [e.type[0] + e.id, +(e.lat ?? e.center.lat).toFixed(5), +(e.lon ?? e.center.lon).toFixed(5), tipo, t.name || null];
      });
      if (!datos.length) continue;
      try { localStorage.setItem(KEY, JSON.stringify({ fecha: Date.now(), datos })); } catch { /* */ }
      return datos.map(aObjeto);
    } catch { /* probar el siguiente servidor */ }
  }
  return null;
}
