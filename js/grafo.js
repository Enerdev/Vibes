// ============================================================
//  Red de transporte como GRAFO + Dijkstra
//  Nodos: cada paradero de cada línea (base y grabadas por la comunidad),
//         más dos nodos virtuales: ORIGEN y DESTINO.
//  Aristas (peso = minutos):
//   · viaje: paradero i → i+1 de la misma línea (distancia / velocidad)
//   · transbordo: entre paraderos de líneas distintas a ≤ 400 m (caminata + espera)
//   · acceso: ORIGEN → paraderos a ≤ 900 m (caminata + espera) y paraderos → DESTINO
//  Dinamismo: los pesos se recalculan en cada consulta con los reportes activos
//  (accidente, bloqueo… suman minutos) y la espera estimada de la flota en vivo.
//  Así el camino óptimo cambia cuando cambia la ciudad, sin tocar el código.
// ============================================================
import { distancia, tramo } from './geo.js';

const MAX_ACCESO = 900;      // m caminando hasta/desde un paradero
const MAX_TRANSBORDO = 400;  // m caminando entre paraderos para cambiar de línea
const FACTOR_CALLE = 1.3;    // distancia por calles ≈ línea recta × 1.3
const VEL_PIE = 4.5;         // km/h
const RADIO_REPORTE = 150;   // m: un reporte afecta a los tramos que pasan cerca
const PENALIZACION = 10;     // min extra por reporte activo en el tramo

const minPie = (m) => (m * FACTOR_CALLE) / ((VEL_PIE * 1000) / 60);

/** Cola de prioridad mínima (montículo binario) para Dijkstra: O((V+E) log V). */
class Monticulo {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(x) {
    const a = this.a; a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].d <= a[i].d) break;
      [a[p], a[i]] = [a[i], a[p]]; i = p;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l].d < a[m].d) m = l;
        if (r < a.length && a[r].d < a[m].d) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]]; i = m;
      }
    }
    return top;
  }
}

/** Convierte una ruta grabada por la comunidad al mismo formato que las líneas base. */
export function lineaDeComunidad(r, i) {
  const pts = r.paradas.length >= 2 ? r.paradas : [r.trazo[0], ...r.paradas, r.trazo[r.trazo.length - 1]];
  return {
    id: 'C' + (i + 1),
    nombre: r.nombre,
    color: r.tipo === 'lancha' ? '#38bdf8' : r.tipo === 'mototaxi' ? '#eab308' : '#22c55e',
    frecuencia: 15,
    velocidad: r.velocidad || 15,
    tarifa: r.tarifa || 1,
    comunidad: true,
    trazo: r.trazo,
    paradas: pts.map((pos, k) => ({ id: `${r.id}-${k}`, nombre: `Paradero ${k + 1} (${r.nombre})`, pos })),
  };
}

/** Construye el grafo con pesos dinámicos y busca el camino más rápido. */
export function rutaOptima({ origen, destino, lineas, reportes = [], flota, pasaje = 1, velCombi = 16 }) {
  // ---- Nodos ----
  const nodos = [];   // { linea, idx, pos }
  for (const l of lineas) l.paradas.forEach((p, idx) => nodos.push({ linea: l, idx, pos: p.pos }));
  const O = nodos.length, D = O + 1;
  const ady = Array.from({ length: nodos.length + 2 }, () => []);
  const arista = (u, v, w, tipo) => ady[u].push({ v, w, tipo });

  const espera = (l, idx) => {
    const eta = !l.comunidad && flota?.eta(l, idx);
    return Number.isFinite(eta) ? eta : l.frecuencia / 2;
  };
  const penal = (a, b) => reportes.filter((r) =>
    distancia(r.pos, a) < RADIO_REPORTE || distancia(r.pos, b) < RADIO_REPORTE).length * PENALIZACION;

  // ---- Aristas de viaje (misma línea, paradero siguiente) ----
  nodos.forEach((n, u) => {
    const sig = n.linea.paradas[n.idx + 1];
    if (!sig) return;
    const m = distancia(n.pos, sig.pos) * FACTOR_CALLE;
    const kmh = n.linea.velocidad || velCombi;
    arista(u, u + 1, m / ((kmh * 1000) / 60) + penal(n.pos, sig.pos), 'viaje');
  });

  // ---- Aristas de transbordo y de acceso ----
  nodos.forEach((a, u) => {
    nodos.forEach((b, v) => {
      if (a.linea === b.linea) return;
      const m = distancia(a.pos, b.pos);
      if (m <= MAX_TRANSBORDO) arista(u, v, minPie(m) + espera(b.linea, b.idx), 'transbordo');
    });
    const dO = distancia(origen, a.pos);
    if (dO <= MAX_ACCESO) arista(O, u, minPie(dO) + espera(a.linea, a.idx), 'subir');
    const dD = distancia(a.pos, destino);
    if (dD <= MAX_ACCESO) arista(u, D, minPie(dD), 'bajar');
  });

  // ---- Dijkstra ----
  const dist = new Array(nodos.length + 2).fill(Infinity);
  const prev = new Array(nodos.length + 2).fill(-1);
  dist[O] = 0;
  const pq = new Monticulo();
  pq.push({ u: O, d: 0 });
  while (pq.size) {
    const { u, d } = pq.pop();
    if (d > dist[u]) continue;
    if (u === D) break;
    for (const { v, w } of ady[u]) {
      if (d + w < dist[v]) { dist[v] = d + w; prev[v] = u; pq.push({ u: v, d: d + w }); }
    }
  }
  if (!Number.isFinite(dist[D])) return null;

  // ---- Reconstruir camino y agrupar por línea ----
  const camino = [];
  for (let x = prev[D]; x !== O && x !== -1; x = prev[x]) camino.unshift(x);
  const tramos = [];   // { linea, desde, hasta }
  for (const u of camino) {
    const n = nodos[u], t = tramos[tramos.length - 1];
    if (t && t.linea === n.linea) t.hasta = n.idx;
    else tramos.push({ linea: n.linea, desde: n.idx, hasta: n.idx });
  }
  const viajes = tramos.filter((t) => t.hasta > t.desde);
  if (!viajes.length) return null;

  const pasos = [], dibujo = [], detalle = [];
  let anterior = origen, costo = 0;
  for (const t of viajes) {
    const l = t.linea, a = l.paradas[t.desde], b = l.paradas[t.hasta];
    const caminata = distancia(anterior, a.pos);
    pasos.push({ modo: 'pie', min: minPie(caminata) });
    dibujo.push({ modo: 'pie', linea: [anterior, a.pos] });
    let m = 0;
    for (let k = t.desde; k < t.hasta; k++) m += distancia(l.paradas[k].pos, l.paradas[k + 1].pos) * FACTOR_CALLE;
    pasos.push({ modo: 'combi', ruta: l, min: m / (((l.velocidad || velCombi) * 1000) / 60) });
    dibujo.push({ modo: 'combi', color: l.color, linea: l.trazo?.length ? tramo(l.trazo, a.pos, b.pos) : [a.pos, b.pos] });
    detalle.push(`Toma <b>${l.nombre}</b>${l.comunidad ? ' (ruta de la comunidad)' : ''} en <b>${a.nombre}</b> y baja en <b>${b.nombre}</b>`);
    costo += l.comunidad ? l.tarifa : pasaje;
    anterior = b.pos;
  }
  pasos.push({ modo: 'pie', min: minPie(distancia(anterior, destino)) });
  dibujo.push({ modo: 'pie', linea: [anterior, destino] });
  const afectados = reportes.length ? ' Los tramos con reportes activos pesan +10 min.' : '';
  detalle.push(`Calculado con Dijkstra sobre ${nodos.length} paraderos y ${ady.reduce((s, x) => s + x.length, 0)} conexiones.${afectados}`);

  return {
    tipo: 'grafo',
    titulo: 'Ruta óptima (grafo)',
    minutos: dist[D],
    costo,
    lineas: viajes.map((t) => t.linea),
    pasos, dibujo, detalle,
    grafo: { nodos: nodos.length, aristas: ady.reduce((s, x) => s + x.length, 0) },
  };
}
