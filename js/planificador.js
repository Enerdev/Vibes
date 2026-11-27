// "¿Cómo llego?" — combina caminata, combis (directo o con transbordo), taxi y mototaxi.
import { TARIFAS, VELOCIDADES } from '../data/puno.js';
import { distancia, tramo } from './geo.js';

const MAX_CAMINATA = 900;     // m hasta / desde un paradero
const MAX_TRANSBORDO = 300;   // m entre paraderos para cambiar de línea
const FACTOR_CALLE = 1.3;     // distancia por calles ≈ línea recta × 1.3
const mPorMin = (kmh) => (kmh * 1000) / 60;

const caminar = (m) => (m * FACTOR_CALLE) / mPorMin(VELOCIDADES.caminar);
const redondear = (s) => Math.round(s * 2) / 2;

/** Paradero de la ruta más cercano a un punto. */
function paradaCercana(ruta, p) {
  let idx = -1, d = Infinity;
  ruta.paradas.forEach((s, i) => {
    const di = distancia(s.pos, p);
    if (di < d) { d = di; idx = i; }
  });
  return { idx, d };
}

function viaje(ruta, i, j) {
  const m = Math.abs(ruta.distParadas[j] - ruta.distParadas[i]);
  const linea = tramo(ruta.trazo, ruta.paradas[i].pos, ruta.paradas[j].pos);
  return { m, min: m / mPorMin(VELOCIDADES.combi), linea };
}

/**
 * @param {object} o  { origen:[lat,lng], destino:[lat,lng], rutas, flota, estudiante }
 * @returns lista de opciones ordenadas por tiempo total
 */
export function planificar({ origen, destino, rutas, flota, estudiante }) {
  const opciones = [];
  const recta = distancia(origen, destino);
  const pasaje = estudiante ? TARIFAS.combiEstudiante : TARIFAS.combiUrbana;
  const espera = (ruta, idx) => {
    const eta = flota?.eta(ruta, idx);
    return Number.isFinite(eta) ? eta : ruta.frecuencia / 2;
  };

  // 1) A pie
  if (recta <= 2000) {
    opciones.push({
      tipo: 'pie', titulo: 'Caminando', minutos: caminar(recta), costo: 0,
      pasos: [{ modo: 'pie', min: caminar(recta) }],
      dibujo: [{ modo: 'pie', linea: [origen, destino] }],
      detalle: [`Camina ${Math.round(recta * FACTOR_CALLE)} m aprox.`],
    });
  }

  // 2) Combi directa
  for (const r of rutas) {
    const a = paradaCercana(r, origen), b = paradaCercana(r, destino);
    if (a.idx === b.idx || a.d > MAX_CAMINATA || b.d > MAX_CAMINATA) continue;
    const v = viaje(r, a.idx, b.idx);
    const w = espera(r, a.idx);
    const total = caminar(a.d) + w + v.min + caminar(b.d);
    opciones.push({
      tipo: 'combi', titulo: `Combi ${r.id}`, minutos: total, costo: pasaje, lineas: [r],
      pasos: [
        { modo: 'pie', min: caminar(a.d) },
        { modo: 'combi', ruta: r, min: v.min },
        { modo: 'pie', min: caminar(b.d) },
      ],
      dibujo: [
        { modo: 'pie', linea: [origen, r.paradas[a.idx].pos] },
        { modo: 'combi', color: r.color, linea: v.linea },
        { modo: 'pie', linea: [r.paradas[b.idx].pos, destino] },
      ],
      detalle: [
        `Camina a <b>${r.paradas[a.idx].nombre}</b> (${Math.round(caminar(a.d))} min)`,
        `Toma la <b>${r.nombre}</b> · próxima en ~${Math.max(1, Math.round(w))} min`,
        `Baja en <b>${r.paradas[b.idx].nombre}</b> (${Math.abs(b.idx - a.idx)} paradas)`,
        `Camina ${Math.round(caminar(b.d))} min hasta tu destino`,
      ],
    });
  }

  // 3) Combi con un transbordo
  for (const r1 of rutas) {
    const a = paradaCercana(r1, origen);
    if (a.d > MAX_CAMINATA) continue;
    for (const r2 of rutas) {
      if (r1 === r2) continue;
      const b = paradaCercana(r2, destino);
      if (b.d > MAX_CAMINATA) continue;
      let mejor = null;
      r1.paradas.forEach((s1, i) => {
        if (i === a.idx) return;
        r2.paradas.forEach((s2, j) => {
          if (j === b.idx) return;
          const dt = distancia(s1.pos, s2.pos);
          if (dt > MAX_TRANSBORDO) return;
          const v1 = viaje(r1, a.idx, i), v2 = viaje(r2, j, b.idx);
          const total = caminar(a.d) + espera(r1, a.idx) + v1.min + caminar(dt) + espera(r2, j) + v2.min + caminar(b.d);
          if (!mejor || total < mejor.total) mejor = { i, j, dt, v1, v2, total };
        });
      });
      if (!mejor) continue;
      const { i, j, dt, v1, v2, total } = mejor;
      opciones.push({
        tipo: 'transbordo', titulo: `${r1.id} + ${r2.id}`, minutos: total, costo: pasaje * 2, lineas: [r1, r2],
        pasos: [
          { modo: 'pie', min: caminar(a.d) },
          { modo: 'combi', ruta: r1, min: v1.min },
          { modo: 'combi', ruta: r2, min: v2.min },
          { modo: 'pie', min: caminar(b.d) },
        ],
        dibujo: [
          { modo: 'pie', linea: [origen, r1.paradas[a.idx].pos] },
          { modo: 'combi', color: r1.color, linea: v1.linea },
          { modo: 'pie', linea: [r1.paradas[i].pos, r2.paradas[j].pos] },
          { modo: 'combi', color: r2.color, linea: v2.linea },
          { modo: 'pie', linea: [r2.paradas[b.idx].pos, destino] },
        ],
        detalle: [
          `Camina a <b>${r1.paradas[a.idx].nombre}</b> y toma la <b>${r1.id}</b>`,
          `Baja en <b>${r1.paradas[i].nombre}</b>${dt > 20 ? `, camina ${Math.round(caminar(dt))} min` : ''} y toma la <b>${r2.id}</b> en <b>${r2.paradas[j].nombre}</b>`,
          `Baja en <b>${r2.paradas[b.idx].nombre}</b> y camina ${Math.round(caminar(b.d))} min`,
        ],
      });
    }
  }

  // 4) Taxi
  const km = (recta * FACTOR_CALLE) / 1000;
  if (recta > 300) {
    opciones.push({
      tipo: 'taxi', titulo: 'Taxi', minutos: 4 + (km / VELOCIDADES.taxi) * 60,
      costo: redondear(Math.max(TARIFAS.taxiBase, 3 + km * TARIFAS.taxiPorKm)),
      pasos: [{ modo: 'taxi', min: (km / VELOCIDADES.taxi) * 60 }],
      dibujo: [{ modo: 'taxi', linea: [origen, destino] }],
      detalle: [`~${km.toFixed(1)} km · incluye ~4 min de espera`, 'Acuerda el precio antes de subir'],
    });
  }

  // 5) Mototaxi (trayectos cortos)
  if (recta > 300 && recta < 3500) {
    opciones.push({
      tipo: 'mototaxi', titulo: 'Mototaxi', minutos: 3 + (km / VELOCIDADES.mototaxi) * 60,
      costo: redondear(Math.max(TARIFAS.mototaxiBase, 1 + km * TARIFAS.mototaxiPorKm)),
      pasos: [{ modo: 'mototaxi', min: (km / VELOCIDADES.mototaxi) * 60 }],
      dibujo: [{ modo: 'mototaxi', linea: [origen, destino] }],
      detalle: ['Ideal para tramos cortos y calles sin combi'],
    });
  }

  // Ordenar, quitar transbordos peores que una combi directa y limitar
  opciones.sort((x, y) => x.minutos - y.minutos);
  const mejorDirecta = opciones.find((o) => o.tipo === 'combi');
  const filtradas = opciones.filter((o) =>
    o.tipo !== 'transbordo' || !mejorDirecta || o.minutos < mejorDirecta.minutos - 3);
  let combis = 0;
  const final = filtradas.filter((o) => {
    if (o.tipo === 'combi' || o.tipo === 'transbordo') return ++combis <= 3;
    return true;
  });

  // Etiquetas
  const rapida = final[0];
  if (rapida) rapida.etiqueta = 'Más rápida';
  const conCosto = final.filter((o) => o.costo > 0 && o.tipo !== 'pie');
  const barata = conCosto.sort((x, y) => x.costo - y.costo || x.minutos - y.minutos)[0];
  if (barata && barata !== rapida) barata.etiqueta = 'Más económica';
  return final;
}
