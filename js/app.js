// ============================================================
//  Vibes · Muévete por Puno — aplicación principal
// ============================================================
import { CIUDAD, LUGARES, PARADEROS_EXTRA, LAGO, INTERPROVINCIAL, TIPOS_REPORTE, TARIFAS } from '../data/puno.js';
import { distancia, longitud, formatoDistancia, formatoMinutos } from './geo.js';
import { cargarRed, paraderos as calcularParaderos, lugarPorId } from './red.js';
import { Flota } from './envivo.js';
import { planificar } from './planificador.js';
import { Reportes, hace } from './reportes.js';
import { estadoLago, proximaSalida } from './lago.js';
import { Grabadora, RutasComunidad, TIPOS as TIPOS_REG, CONFIRMACIONES_VALIDADA } from './registro.js';
import { rutaOptima, lineaDeComunidad } from './grafo.js';
import { osmLocal, osmActualizar, ESTILO_OSM } from './osm.js';
import { PROVINCIAS, DISTRITOS_PUNO, REGION_LIMITES } from '../data/region.js';
import { Cuentas, FILTROS } from './usuario.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esMovil = () => matchMedia('(max-width: 820px)').matches;

// ---------------- Estado ----------------
const st = {
  rutas: [],
  paraderos: [],
  flota: null,
  reportes: new Reportes(),
  yo: null,
  origen: null,     // { pos, nombre }
  destino: null,
  pick: null,       // 'origen' | 'destino' | 'reporte'
  reportePos: null,
  reporteTipo: null,
  rutaSel: null,
  opciones: [],
};

// ---------------- Mapa ----------------
const map = L.map('map', { zoomControl: false, minZoom: 10, maxBounds: CIUDAD.limites, maxBoundsViscosity: 0.8 })
  .setView(CIUDAD.centro, CIUDAD.zoom);

// Mapas base sin clave de API (los de CARTO devolvían "API KEY REQUIRED").
const TILES = {
  oscuro: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
  claro: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  satelite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
};
const ORDEN_TEMAS = ['oscuro', 'satelite', 'claro'];
const zoomNativo = (t) => (t === 'oscuro' ? 16 : t === 'satelite' ? 18 : 19);
const ATRIB = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Tiles &copy; Esri';
let tema = 'oscuro';
try { tema = localStorage.getItem('vibes:tema') || 'oscuro'; } catch { /* */ }
if (!TILES[tema]) tema = 'oscuro';
const base = L.tileLayer(TILES[tema], { attribution: ATRIB, maxZoom: 19, maxNativeZoom: zoomNativo(tema) }).addTo(map);
document.body.classList.toggle('claro', tema === 'claro');

$('#btn-tema').onclick = () => {
  tema = ORDEN_TEMAS[(ORDEN_TEMAS.indexOf(tema) + 1) % ORDEN_TEMAS.length];
  base.options.maxNativeZoom = zoomNativo(tema);
  toast({ oscuro: 'Mapa oscuro', satelite: 'Vista satélite', claro: 'Mapa claro' }[tema], 1500);
  base.setUrl(TILES[tema]);
  document.body.classList.toggle('claro', tema === 'claro');
  try { localStorage.setItem('vibes:tema', tema); } catch { /* */ }
};

const capas = {
  rutas: L.layerGroup().addTo(map),
  paraderos: L.layerGroup().addTo(map),
  envivo: L.layerGroup().addTo(map),
  mototaxi: L.layerGroup(),
  taxi: L.layerGroup(),
  lago: L.layerGroup().addTo(map),
  reportes: L.layerGroup().addTo(map),
  osm: L.layerGroup(),
  region: L.layerGroup(),
};
const capaPlan = L.layerGroup().addTo(map);
const capaYo = L.layerGroup().addTo(map);

$$('#capas .chip').forEach((chip) => {
  chip.onclick = () => {
    const c = capas[chip.dataset.capa];
    const on = !map.hasLayer(c);
    on ? c.addTo(map) : map.removeLayer(c);
    chip.classList.toggle('on', on);
  };
});

/** Encaja el mapa dejando libre el espacio que tapa el panel. */
function encuadrar(bounds, maxZoom = 16) {
  const opts = esMovil()
    ? { paddingTopLeft: [30, 120], paddingBottomRight: [30, innerHeight * 0.45], maxZoom }
    : { paddingTopLeft: [430, 130], paddingBottomRight: [80, 40], maxZoom };
  map.flyToBounds(bounds, { ...opts, duration: 0.8 });
}

const icono = (html, cls = '', size = [32, 32]) =>
  L.divIcon({ html, className: cls, iconSize: size, iconAnchor: [size[0] / 2, size[1] / 2] });

// ---------------- Rutas de combi ----------------
function dibujarRutas() {
  capas.rutas.clearLayers();
  for (const r of st.rutas) {
    const sel = st.rutaSel === r;
    const atenuar = st.rutaSel && !sel;
    L.polyline(r.trazo, { color: r.color, weight: sel ? 16 : 11, opacity: atenuar ? 0.03 : 0.16, interactive: false })
      .addTo(capas.rutas);
    L.polyline(r.trazo, { color: r.color, weight: sel ? 6 : 4, opacity: atenuar ? 0.2 : 0.95, lineCap: 'round' })
      .on('click', () => seleccionarRuta(r))
      .bindTooltip(r.nombre, { sticky: true })
      .addTo(capas.rutas);
  }
}

function seleccionarRuta(r) {
  st.rutaSel = st.rutaSel === r ? null : r;
  dibujarRutas();
  renderRutas();
  if (st.rutaSel) encuadrar(L.latLngBounds(r.trazo));
}

// ---------------- Paraderos ----------------
function tagLinea(r, cls = 'linea-tag') {
  return `<span class="${cls}" style="background:${r.color}">${r.id}</span>`;
}

function popupParadero(p) {
  const etas = p.lineas.map((r) => {
    const idx = r.paradas.findIndex((x) => x.id === p.id);
    const eta = st.flota.eta(r, idx);
    return `<span><i style="background:${r.color}">${r.id}</i> llega en ~${Math.max(1, Math.round(eta))} min</span>`;
  }).join('');
  return `<b>🚏 ${p.nombre}</b><div class="pop-eta">${etas}</div>
    <div style="margin-top:8px"><a href="#" data-ir="${p.id}">🧭 Ir aquí</a></div>`;
}

function dibujarParaderos() {
  capas.paraderos.clearLayers();
  for (const p of st.paraderos) {
    const m = L.marker(p.pos, { icon: icono('<div class="mk-parada"></div>', '', [14, 14]) })
      .bindPopup(() => popupParadero(p))
      .bindTooltip(p.nombre, { direction: 'top', offset: [0, -8] });
    m.addTo(capas.paraderos);
  }
}

function dibujarExtras() {
  for (const e of PARADEROS_EXTRA) {
    const emoji = e.tipo === 'taxi' ? '🚕' : '🛺';
    L.marker(e.pos, { icon: icono(`<div class="mk-emoji">${emoji}</div>`) })
      .bindPopup(`<b>${emoji} ${e.nombre}</b><br><small>Paradero de ${e.tipo}</small>`)
      .addTo(capas[e.tipo]);
  }
}

// ---------------- En vivo (simulación) ----------------
const marcadoresBus = new Map();
function iniciarEnVivo() {
  st.flota = new Flota(st.rutas);
  for (const u of st.flota.unidades) {
    const html = `<div class="mk-bus" style="background:${u.ruta.color}">${u.ruta.id}</div>`;
    const m = L.marker(st.flota.posicion(u).pos, { icon: icono(html, '', [28, 28]), zIndexOffset: 500 })
      .bindPopup(() => `<b>🚌 ${u.ruta.nombre}</b><br>Placa ${u.placa}<br><small>Unidad simulada para la demo</small>`)
      .addTo(capas.envivo);
    marcadoresBus.set(u, m);
  }
  const loop = () => {
    st.flota.paso();
    if (map.hasLayer(capas.envivo)) {
      for (const [u, m] of marcadoresBus) m.setLatLng(st.flota.posicion(u).pos);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

// ---------------- Lago ----------------
const CANAL = [-15.7930, -69.8650]; // salida de la bahía de Puno (aprox.)
function dibujarLago() {
  const puerto = lugarPorId[LAGO.puerto];
  L.marker(puerto.pos, { icon: icono('<div class="mk-emoji">⛵</div>'), zIndexOffset: 300 })
    .bindPopup(`<b>⛵ ${puerto.nombre}</b><br><small>Salidas a Uros, Taquile y Amantaní</small>`)
    .addTo(capas.lago);
  const caminos = {
    uros: [puerto.pos, [-15.8260, -69.9950], LAGO.destinos[0].pos],
    taquile: [puerto.pos, [-15.8260, -69.9950], LAGO.destinos[0].pos, CANAL, LAGO.destinos[1].pos],
    amantani: [puerto.pos, [-15.8260, -69.9950], LAGO.destinos[0].pos, CANAL, [-15.7200, -69.7600], LAGO.destinos[2].pos],
  };
  for (const d of LAGO.destinos) {
    L.polyline(caminos[d.id], { color: '#36b6ff', weight: 3, opacity: 0.8, dashArray: '2 9', lineCap: 'round' })
      .addTo(capas.lago);
    L.marker(d.pos, {
      icon: L.divIcon({ html: `<div class="mk-isla">🏝️ ${d.nombre.replace('Islas flotantes de los ', '').replace('Isla ', '')}</div>`, className: '', iconSize: null }),
    }).bindPopup(() => popupDestinoLago(d)).addTo(capas.lago);
  }
}

function popupDestinoLago(d) {
  const p = proximaSalida(d.salidas);
  return `<b>🏝️ ${d.nombre}</b><br>Viaje: ${formatoMinutos(d.duracion)}<br>
    Próxima salida: ${p ? `<b>${p.hora}</b> (en ${formatoMinutos(p.en)})` : 'mañana desde ' + d.salidas[0]}<br>
    <small>Ref.: S/ ${d.precioLocal} local · S/ ${d.precioTurista} turista</small>`;
}

async function renderLago() {
  const caja = $('#estado-lago');
  try {
    const e = await estadoLago();
    caja.className = `estado-lago ${e.nivel === 'ok' ? '' : e.nivel}`;
    const ico = { ok: '🌊', precaucion: '⚠️', peligro: '⛔' }[e.nivel];
    caja.innerHTML = `<div class="estado-ico">${ico}</div><div><strong>${e.mensaje}</strong>
      <small>Viento ${Math.round(e.viento)} km/h · ráfagas ${Math.round(e.rafagas)} km/h · ${Math.round(e.temp)} °C · ${e.clima}</small></div>`;
  } catch {
    caja.className = 'estado-lago';
    caja.innerHTML = `<div class="estado-ico">📴</div><div><strong>Sin conexión al servicio de clima</strong>
      <small>Consulta en el puerto antes de embarcar</small></div>`;
  }
  $('#lista-lago').innerHTML = LAGO.destinos.map((d) => {
    const p = proximaSalida(d.salidas);
    return `<button class="card" data-isla="${d.id}">
      <div class="ico-circ">🏝️</div>
      <div class="grow"><div class="titulo">${d.nombre}</div>
        <div class="sub">${formatoMinutos(d.duracion)} de viaje · S/ ${d.precioLocal} local · S/ ${d.precioTurista} turista</div></div>
      <div class="der">${p ? `<strong>${p.hora}</strong><small>en ${formatoMinutos(p.en)}</small>` : `<strong>—</strong><small>mañana ${d.salidas[0]}</small>`}</div>
    </button>`;
  }).join('');
  $$('#lista-lago [data-isla]').forEach((b) => {
    b.onclick = () => {
      const d = LAGO.destinos.find((x) => x.id === b.dataset.isla);
      encuadrar(L.latLngBounds([lugarPorId.puerto.pos, d.pos]), 13);
    };
  });
}

$('#btn-ir-puerto').onclick = () => {
  fijar('destino', { pos: lugarPorId.puerto.pos, nombre: lugarPorId.puerto.nombre });
  abrirTab('ir');
  asegurarOrigen();
};

// ---------------- Explorar ----------------
function renderRutas() {
  $('#lista-rutas').innerHTML = st.rutas.map((r) => `
    <button class="card ${st.rutaSel === r ? 'sel' : ''}" data-ruta="${r.id}">
      ${tagLinea(r)}
      <div class="grow"><div class="titulo">${r.nombre.split('·')[1].trim()}</div>
        <div class="sub">${r.horario} · cada ~${r.frecuencia} min · ${r.paradas.length} paraderos</div></div>
      <div class="der"><strong>${formatoDistancia(r.largo)}</strong><small>recorrido</small></div>
    </button>`).join('');
  $$('#lista-rutas [data-ruta]').forEach((b) => {
    b.onclick = () => seleccionarRuta(st.rutas.find((r) => r.id === b.dataset.ruta));
  });
}

function renderCercanos() {
  if (!st.yo) return;
  const cerca = st.paraderos
    .map((p) => ({ p, d: distancia(p.pos, st.yo) }))
    .sort((a, b) => a.d - b.d).slice(0, 4);
  $('#lista-cercanos').innerHTML = cerca.map(({ p, d }) => {
    const proximas = p.lineas.map((r) => {
      const eta = st.flota.eta(r, r.paradas.findIndex((x) => x.id === p.id));
      return `${tagLinea(r, 'paso')} ${Math.max(1, Math.round(eta))}′`;
    }).join(' ');
    return `<button class="card" data-parada="${p.id}">
      <div class="ico-circ">🚏</div>
      <div class="grow"><div class="titulo">${p.nombre}</div><div class="sub pasos">${proximas}</div></div>
      <div class="der"><strong>${formatoDistancia(d)}</strong><small>a pie</small></div>
    </button>`;
  }).join('');
  $$('#lista-cercanos .paso').forEach((s) => { s.style.color = '#0b1020'; s.style.fontWeight = 700; });
  $$('#lista-cercanos [data-parada]').forEach((b) => {
    b.onclick = () => map.flyTo(lugarPorId[b.dataset.parada].pos, 17, { duration: 0.8 });
  });
}

function renderInterprovincial() {
  $('#lista-interprov').innerHTML = INTERPROVINCIAL.map((x) => `
    <div class="card">
      <div class="ico-circ">${x.tipo.startsWith('Bus') ? '🚍' : x.destino.includes('Aeropuerto') ? '✈️' : '🚐'}</div>
      <div class="grow"><div class="titulo">${x.destino}</div>
        <div class="sub">${x.tipo} · ${x.frecuencia} · desde ${lugarPorId[x.desde].nombre}</div></div>
      <div class="der"><strong>S/ ${x.precio}</strong><small>${formatoMinutos(x.duracion)}</small></div>
    </div>`).join('');
}

// ---------------- Autocompletado ----------------
const normalizar = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const EMOJI_TIPO = { centro: '🏛️', mercado: '🛒', turismo: '📸', educacion: '🎓', salud: '🏥', terminal: '🚌', puerto: '⛵', barrio: '🏘️', otro: '📍' };

function autocompletar(input, lista, alElegir) {
  let activo = -1, items = [];
  const cerrar = () => { lista.hidden = true; activo = -1; };
  const pintar = () => {
    const q = normalizar(input.value.trim());
    items = [];
    if ('mi ubicacion'.includes(q) || !q) items.push({ id: '__yo', nombre: 'Mi ubicación', tipo: 'yo' });
    const palabras = q.split(/\s+/).filter(Boolean);
    items.push(...LUGARES.filter((l) => palabras.every((w) => normalizar(l.nombre).includes(w))).slice(0, 8));
    lista.innerHTML = items.map((l, i) =>
      `<li data-i="${i}" class="${i === activo ? 'activo' : ''}">${l.tipo === 'yo' ? '◎' : EMOJI_TIPO[l.tipo] || '📍'} ${l.nombre}
       ${st.yo && l.pos ? `<small>${formatoDistancia(distancia(st.yo, l.pos))}</small>` : ''}</li>`).join('');
    lista.hidden = !items.length;
  };
  input.addEventListener('focus', pintar);
  input.addEventListener('input', () => { activo = -1; pintar(); });
  input.addEventListener('keydown', (e) => {
    if (lista.hidden) return;
    if (e.key === 'ArrowDown') { activo = Math.min(items.length - 1, activo + 1); pintar(); e.preventDefault(); }
    if (e.key === 'ArrowUp') { activo = Math.max(0, activo - 1); pintar(); e.preventDefault(); }
    if (e.key === 'Enter') { const it = items[Math.max(0, activo)]; if (it) { alElegir(it); cerrar(); input.blur(); } }
    if (e.key === 'Escape') cerrar();
  });
  lista.addEventListener('mousedown', (e) => {
    const li = e.target.closest('li'); if (!li) return;
    e.preventDefault();
    alElegir(items[+li.dataset.i]); cerrar(); input.blur();
  });
  input.addEventListener('blur', () => setTimeout(cerrar, 150));
}

function lugarDesdeItem(it, cb) {
  if (it.tipo === 'yo') {
    ubicarme().then((pos) => cb({ pos, nombre: 'Mi ubicación' })).catch(() => {});
  } else cb({ pos: it.pos, nombre: it.nombre });
}

autocompletar($('#buscar'), $('#buscar-sugerencias'), (it) => {
  lugarDesdeItem(it, (l) => {
    $('#buscar').value = '';
    fijar('destino', l);
    abrirTab('ir');
    asegurarOrigen();
  });
});
for (const campo of ['origen', 'destino']) {
  const input = $('#' + campo);
  autocompletar(input, input.nextElementSibling, (it) => lugarDesdeItem(it, (l) => fijar(campo, l)));
}

// ---------------- ¿Cómo llego? ----------------
function nombrePunto(pos) {
  let mejor = null, d = Infinity;
  for (const l of LUGARES) { const di = distancia(l.pos, pos); if (di < d) { d = di; mejor = l; } }
  return d < 350 ? `Cerca de ${mejor.nombre}` : 'Punto en el mapa';
}

function fijar(campo, lugar) {
  st[campo] = lugar;
  $('#' + campo).value = lugar ? lugar.nombre : '';
  calcular();
}

async function asegurarOrigen() {
  if (st.origen) return;
  try {
    const pos = await ubicarme();
    fijar('origen', { pos, nombre: 'Mi ubicación' });
  } catch {
    $('#origen').focus();
  }
}

$('#btn-mi-origen').onclick = () => ubicarme().then((pos) => fijar('origen', { pos, nombre: 'Mi ubicación' })).catch(() => {});
$('#btn-invertir').onclick = () => {
  [st.origen, st.destino] = [st.destino, st.origen];
  $('#origen').value = st.origen?.nombre || '';
  $('#destino').value = st.destino?.nombre || '';
  calcular();
};
$('#chk-estudiante').onchange = () => calcular();

const ICONO_MODO = { pie: '🚶', combi: '🚌', taxi: '🚕', mototaxi: '🛺' };

/**
 * Grafo multimodal (js/grafo.js): une líneas base y rutas grabadas por la comunidad,
 * con pesos que cambian según los reportes activos. Si encuentra un camino distinto
 * a las opciones clásicas, lo agrega; si coincide, marca esa opción como óptima.
 */
function agregarOpcionGrafo() {
  const lineas = [...st.rutas, ...comunidad.lista.filter((r) => r.tipo !== 'lancha').map(lineaDeComunidad)];
  const g = rutaOptima({
    origen: st.origen.pos, destino: st.destino.pos, lineas, flota: st.flota,
    reportes: st.reportes.activos(),
    pasaje: $('#chk-estudiante').checked ? TARIFAS.combiEstudiante : TARIFAS.combiUrbana,
  });
  if (!g) return;
  const firma = (o) => (o.lineas || []).map((l) => l.id).join('+');
  const igual = st.opciones.find((o) => o.lineas && firma(o) === firma(g));
  if (igual) {
    igual.etiqueta = (igual.etiqueta ? igual.etiqueta + ' · ' : '') + 'Óptima (grafo)';
    return;
  }
  g.etiqueta = 'Óptima (grafo)';
  st.opciones.push(g);
  st.opciones.sort((a, b) => a.minutos - b.minutos);
}

function calcular() {
  capaPlan.clearLayers();
  const res = $('#resultados');
  if (st.origen) L.marker(st.origen.pos, { icon: icono('<div class="mk-pin a"></div>', '', [22, 22]), zIndexOffset: 900 }).addTo(capaPlan);
  if (st.destino) L.marker(st.destino.pos, { icon: icono('<div class="mk-pin b"></div>', '', [22, 22]), zIndexOffset: 900 }).addTo(capaPlan);
  if (!st.origen || !st.destino) {
    res.innerHTML = `<p class="muted">${!st.origen ? 'Falta el origen.' : 'Falta el destino.'} Escribe un lugar o toca 📍 y luego el mapa.</p>`;
    return;
  }
  st.opciones = planificar({
    origen: st.origen.pos, destino: st.destino.pos, rutas: st.rutas, flota: st.flota,
    estudiante: $('#chk-estudiante').checked,
  });
  agregarOpcionGrafo();
  if (!st.opciones.length) {
    res.innerHTML = '<p class="muted">Están muy cerca: ¡puedes ir caminando!</p>';
    return;
  }
  res.innerHTML = `<h3>${st.opciones.length} opciones · ${formatoDistancia(distancia(st.origen.pos, st.destino.pos))} en línea recta</h3>` +
    st.opciones.map((o, i) => `
    <button class="card opcion" data-op="${i}">
      <div class="cab">
        <span><strong>${formatoMinutos(o.minutos)}</strong>${o.etiqueta ? `<span class="etiqueta">${o.etiqueta}</span>` : ''}</span>
        <span class="precio">${o.costo ? 'S/ ' + o.costo.toFixed(2) : 'Gratis'}</span>
      </div>
      <div class="pasos">${o.pasos.map((p) => p.modo === 'combi'
        ? `<span class="paso">🚌 <b style="background:${p.ruta.color}">${p.ruta.id}</b> ${Math.round(p.min)}′</span>`
        : `<span class="paso">${ICONO_MODO[p.modo]} ${Math.max(1, Math.round(p.min))}′</span>`).join('<span>›</span>')}</div>
      <ul class="detalle" hidden>${o.detalle.map((d) => `<li>${d}</li>`).join('')}</ul>
    </button>`).join('');
  $$('#resultados [data-op]').forEach((b) => { b.onclick = () => elegirOpcion(+b.dataset.op); });
  elegirOpcion(0, false);
  encuadrar(L.latLngBounds([st.origen.pos, st.destino.pos]).pad(0.15));
}

function elegirOpcion(i, mover = true) {
  $$('#resultados [data-op]').forEach((b) => {
    const sel = +b.dataset.op === i;
    b.classList.toggle('sel', sel);
    $('.detalle', b).hidden = !sel;
  });
  capaPlan.eachLayer((l) => { if (l instanceof L.Polyline) capaPlan.removeLayer(l); });
  const o = st.opciones[i];
  const todas = [];
  for (const seg of o.dibujo) {
    todas.push(...seg.linea);
    const estilo = {
      pie: { color: '#ffffff', weight: 4, dashArray: '1 9', opacity: 0.9 },
      combi: { color: seg.color, weight: 8, opacity: 1 },
      taxi: { color: '#ffc531', weight: 5, dashArray: '10 8', opacity: 0.95 },
      mototaxi: { color: '#ff8a3d', weight: 5, dashArray: '10 8', opacity: 0.95 },
    }[seg.modo];
    if (seg.modo === 'combi') L.polyline(seg.linea, { color: '#000', weight: 13, opacity: 0.35 }).addTo(capaPlan);
    L.polyline(seg.linea, { ...estilo, lineCap: 'round' }).addTo(capaPlan);
  }
  if (mover) encuadrar(L.latLngBounds(todas).pad(0.1));
}

// ---------------- Elegir en el mapa ----------------
function modoElegir(modo, mensaje) {
  st.pick = modo;
  document.body.classList.toggle('picking', !!modo);
  $$('[data-pick]').forEach((b) => b.classList.toggle('activo', b.dataset.pick === modo));
  if (modo) {
    toast(mensaje, 0);
    if (esMovil()) setHoja('min');
  } else ocultarToast();
}
$$('[data-pick]').forEach((b) => {
  b.onclick = () => {
    const campo = b.dataset.pick;
    modoElegir(st.pick === campo ? null : campo, `Toca el mapa para elegir el ${campo}`);
  };
});

map.on('click', (e) => {
  if (!st.pick) return;
  const pos = [e.latlng.lat, e.latlng.lng];
  const modo = st.pick;
  modoElegir(null);
  if (modo === 'reporte') { st.reportePos = pos; abrirModal(); return; }
  fijar(modo, { pos, nombre: nombrePunto(pos) });
  if (esMovil()) setHoja('normal');
});

// "Ir aquí" desde popups de paradero
map.on('popupopen', (e) => {
  const a = e.popup.getElement()?.querySelector('[data-ir]');
  if (!a) return;
  a.onclick = (ev) => {
    ev.preventDefault();
    const l = lugarPorId[a.dataset.ir];
    map.closePopup();
    fijar('destino', { pos: l.pos, nombre: l.nombre });
    abrirTab('ir');
    asegurarOrigen();
  };
});

// ---------------- Reportes ----------------
function dibujarReportes() {
  capas.reportes.clearLayers();
  const activos = st.reportes.activos();
  $('#badge-reportes').textContent = activos.length;
  renderCinta(activos);
  for (const r of activos) {
    const t = TIPOS_REPORTE[r.tipo] || TIPOS_REPORTE.otro;
    L.marker(r.pos, {
      icon: icono(`<div class="radar" style="--c:${t.color}"></div><div class="mk-emoji mk-reporte" style="--c:${t.color}99;border-color:${t.color}">${t.emoji}</div>`),
      zIndexOffset: 700,
    }).bindPopup(() => `<b>${t.emoji} ${t.label}</b>${r.texto ? `<br>${escapar(r.texto)}` : ''}<br>
      <small>${hace(r.creado)} · ${r.sigue} confirman</small>`).addTo(capas.reportes);
  }
  $('#lista-reportes').innerHTML = activos.length ? activos.map((r) => {
    const t = TIPOS_REPORTE[r.tipo] || TIPOS_REPORTE.otro;
    return `<div class="card" data-rep="${r.id}">
      <div class="ico-circ" style="background:${t.color}22">${t.emoji}</div>
      <div class="grow"><div class="titulo">${t.label}</div>
        <div class="sub">${r.texto ? escapar(r.texto) + ' · ' : ''}${hace(r.creado)}</div>
        <div class="votos">
          <button data-voto="sigue">👍 Sigue ahí (${r.sigue})</button>
          <button data-voto="yaNo">✅ Ya no está (${r.yaNo})</button>
        </div></div>
    </div>`;
  }).join('') : '<p class="muted">Sin reportes activos. ¡Todo tranquilo en las vías!</p>';
  $$('#lista-reportes [data-rep]').forEach((card) => {
    card.onclick = (e) => {
      const voto = e.target.closest('[data-voto]');
      if (voto) {
        st.reportes.votar(card.dataset.rep, voto.dataset.voto);
        toast('¡Gracias por confirmar!');
        dibujarReportes();
        return;
      }
      const r = st.reportes.lista.find((x) => x.id === card.dataset.rep);
      if (r) map.flyTo(r.pos, 17, { duration: 0.8 });
    };
  });
}

/** Cinta "EN VIVO" inferior: reportes activos y datos de la red, uno tras otro. */
function renderCinta(activos) {
  const items = activos.map((r) => {
    const t = TIPOS_REPORTE[r.tipo] || TIPOS_REPORTE.otro;
    return `<span class="ci" data-cpos="${r.pos.join(',')}"><b>${t.emoji} ${t.label}</b> ${r.texto ? escapar(r.texto) : ''} <i>${hace(r.creado)}</i></span>`;
  });
  items.push(`<span class="ci"><b>📡 Red</b> ${st.rutas.length} líneas de combi · ${st.paraderos.length} paraderos</span>`);
  if (typeof comunidad !== 'undefined') items.push(`<span class="ci"><b>⭐ Comunidad</b> ${comunidad.lista.length} rutas grabadas por pasajeros</span>`);
  const pista = items.join('<span class="sep">•</span>');
  $('#cinta-pista').innerHTML = pista + '<span class="sep">•</span>' + pista;  // duplicado = desplazamiento continuo
  $('#cinta-n').textContent = activos.length;
}
$('#cinta').onclick = (e) => {
  const ci = e.target.closest('[data-cpos]');
  if (ci) map.flyTo(ci.dataset.cpos.split(',').map(Number), 17, { duration: 0.8 });
};

function iniciarReporte() {
  abrirTab('reportes');
  modoElegir('reporte', 'Toca el mapa donde está ocurriendo');
}
$('#btn-reportar').onclick = iniciarReporte;
$('#btn-reportar-2').onclick = iniciarReporte;

$('#tipos-reporte').innerHTML = Object.entries(TIPOS_REPORTE).map(([k, t]) =>
  `<button class="tipo" data-tipo="${k}"><span>${t.emoji}</span>${t.label}</button>`).join('');
$$('#tipos-reporte .tipo').forEach((b) => {
  b.onclick = () => {
    st.reporteTipo = b.dataset.tipo;
    $$('#tipos-reporte .tipo').forEach((x) => x.classList.toggle('sel', x === b));
    $('#btn-publicar').disabled = false;
  };
});
function abrirModal() {
  st.reporteTipo = null;
  $$('#tipos-reporte .tipo').forEach((x) => x.classList.remove('sel'));
  $('#texto-reporte').value = '';
  $('#btn-publicar').disabled = true;
  $('#modal').hidden = false;
}
$('#btn-cancelar').onclick = () => { $('#modal').hidden = true; };
$('#btn-publicar').onclick = () => {
  st.reportes.agregar({ tipo: st.reporteTipo, pos: st.reportePos, texto: $('#texto-reporte').value });
  $('#modal').hidden = true;
  dibujarReportes();
  if (esMovil()) setHoja('normal');
  toast('Reporte publicado. ¡Gracias por avisar! 🙌');
};

function escapar(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------------- Ubicación ----------------
function ubicarme() {
  return new Promise((resolve, reject) => {
    const usar = (pos, simulada) => {
      st.yo = pos;
      capaYo.clearLayers();
      L.marker(pos, { icon: icono('<div class="mk-yo"></div>', '', [18, 18]), zIndexOffset: 1000 })
        .bindTooltip(simulada ? 'Ubicación de prueba' : 'Estás aquí').addTo(capaYo);
      map.flyTo(pos, Math.max(map.getZoom(), 16), { duration: 0.8 });
      renderCercanos();
      resolve(pos);
    };
    const simular = (motivo) => {
      toast(`${motivo} Usamos la Plaza de Armas como ubicación de prueba.`);
      usar(lugarPorId.plaza.pos, true);
    };
    if (!navigator.geolocation) return simular('Tu navegador no comparte ubicación.');
    toast('Buscando tu ubicación…');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pos = [p.coords.latitude, p.coords.longitude];
        const [[s, o], [n, e]] = CIUDAD.limites;
        const dentro = pos[0] > s && pos[0] < n && pos[1] > o && pos[1] < e;
        if (dentro) { ocultarToast(); usar(pos, false); } else simular('Estás fuera de Puno.');
      },
      () => simular('No pudimos obtener tu ubicación.'),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
    void reject;
  });
}
$('#btn-ubicacion').onclick = () => ubicarme().catch(() => {});

// ---------------- Pestañas y hoja inferior ----------------
function abrirTab(nombre) {
  $$('.tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === nombre));
  $$('.view').forEach((v) => v.classList.toggle('on', v.dataset.view === nombre));
  if (esMovil() && $('#panel').classList.contains('min')) setHoja('normal');
}
$$('.tab').forEach((t) => { t.onclick = () => abrirTab(t.dataset.tab); });

function setHoja(estado) {
  const p = $('#panel');
  p.classList.toggle('min', estado === 'min');
  p.classList.toggle('expandido', estado === 'exp');
  document.body.classList.toggle('panel-min', estado === 'min');
  document.body.classList.toggle('panel-exp', estado === 'exp');
}
(() => {
  const h = $('#handle');
  let y0 = null;
  const estado = () => ($('#panel').classList.contains('min') ? 'min' : $('#panel').classList.contains('expandido') ? 'exp' : 'normal');
  h.addEventListener('pointerdown', (e) => { y0 = e.clientY; h.setPointerCapture(e.pointerId); });
  h.addEventListener('pointerup', (e) => {
    if (y0 === null) return;
    const dy = e.clientY - y0; y0 = null;
    const orden = ['min', 'normal', 'exp'];
    let i = orden.indexOf(estado());
    if (Math.abs(dy) < 10) i = (i + 1) % 3;
    else i = dy < 0 ? Math.min(2, i + 1) : Math.max(0, i - 1);
    setHoja(orden[i]);
  });
})();

// ---------------- Toast ----------------
let toastTimer;
function toast(msg, ms = 2800) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  if (ms) toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}
function ocultarToast() { $('#toast').hidden = true; }

// ---------------- Registrar ruta con GPS (función estrella) ----------------
const capaComunidad = L.layerGroup().addTo(map);
const capaGrabando = L.layerGroup().addTo(map);
const comunidad = new RutasComunidad();
let regTipo = 'combi';

const grabadora = new Grabadora((evento, dato) => {
  if (evento === 'error') {
    toast(dato?.code === 1 ? 'Sin permiso de ubicación. Usa el modo demo para probar.' : 'No hay señal GPS todavía…');
  }
  if (evento === 'punto' && !grabadora.demo) map.panTo(dato, { animate: true });
  dibujarGrabacion();
});

$('#reg-tipos').innerHTML = Object.entries(TIPOS_REG).map(([k, t]) =>
  `<button data-regtipo="${k}" class="${k === regTipo ? 'sel' : ''}">${t.emoji} ${t.label}</button>`).join('');
$$('#reg-tipos [data-regtipo]').forEach((b) => {
  b.onclick = () => {
    if (grabadora.activa) return;
    regTipo = b.dataset.regtipo;
    $$('#reg-tipos [data-regtipo]').forEach((x) => x.classList.toggle('sel', x === b));
  };
});

function dibujarGrabacion() {
  capaGrabando.clearLayers();
  const g = grabadora;
  const color = TIPOS_REG[g.tipo].color;
  if (g.puntos.length > 1) {
    L.polyline(g.puntos, { color, weight: 5, dashArray: g.tipo === 'lancha' ? '10 8' : null }).addTo(capaGrabando);
  }
  if (g.puntos.length) {
    L.circleMarker(g.puntos[g.puntos.length - 1], { radius: 8, color: '#fff', fillColor: color, fillOpacity: 1, weight: 3 }).addTo(capaGrabando);
  }
  g.paradas.forEach((p) => L.marker(p, { icon: icono('<div class="mk-reg-parada"></div>', '', [14, 14]) }).addTo(capaGrabando));
  const est = $('#reg-estado');
  est.hidden = !g.activa;
  if (g.activa) {
    est.innerHTML = `<span class="rec"></span><b>Grabando ${TIPOS_REG[g.tipo].label.toLowerCase()}</b>${g.demo ? ' (demo: toca el mapa)' : ''}<br>
      ${g.puntos.length} puntos · ${formatoDistancia(g.metros)} · ${g.paradas.length} paraderos
      ${g.descartados ? `<br><small>${g.descartados} lecturas GPS imprecisas descartadas</small>` : ''}
      ${!g.demo && g.tipo === 'lancha' ? '<br><small>⛵ En el lago el GPS tiene menos señal: mantén el celular a la vista del cielo.</small>' : ''}`;
  }
}

function botonesGrabando(on) {
  $('#reg-iniciar').hidden = on;
  ['#reg-paradero', '#reg-terminar', '#reg-cancelar'].forEach((s) => { $(s).hidden = !on; });
  ['#reg-nombre', '#reg-tarifa', '#reg-demo'].forEach((s) => { $(s).disabled = on; });
}

$('#reg-iniciar').onclick = () => {
  if (!$('#reg-nombre').value.trim()) { toast('Ponle un nombre o número a la ruta'); $('#reg-nombre').focus(); return; }
  const demo = $('#reg-demo').checked || !navigator.geolocation;
  grabadora.iniciar({ demo, tipo: regTipo });
  botonesGrabando(true);
  if (demo) {
    toast('Modo demo: toca el mapa siguiendo el recorrido', 4000);
    if (esMovil()) setHoja('min');
  } else toast('Grabando… súbete y viaja. Marca cada paradero.', 4000);
};
$('#reg-paradero').onclick = () => {
  toast(grabadora.marcarParadero() ? '🚏 Paradero marcado' : 'Aún no hay ubicación para marcar');
};
$('#reg-cancelar').onclick = () => {
  grabadora.reset();
  botonesGrabando(false);
  dibujarGrabacion();
};
$('#reg-terminar').onclick = () => {
  const ruta = grabadora.terminar({ nombre: $('#reg-nombre').value.trim(), tarifa: Number($('#reg-tarifa').value) || 0 });
  botonesGrabando(false);
  if (!ruta) { toast('El recorrido es muy corto (mínimo 100 m). No se guardó.'); grabadora.reset(); dibujarGrabacion(); return; }
  const { ruta: r, nueva } = comunidad.agregar(ruta);
  grabadora.reset();
  dibujarGrabacion();
  dibujarComunidad();
  renderComunidad();
  if (esMovil()) setHoja('normal');
  toast(nueva ? `✅ Ruta guardada: ${formatoDistancia(ruta.metros)}, ${ruta.paradas.length} paraderos`
    : `👍 Ya existía una ruta igual: ahora tiene ${r.confirmaciones} confirmaciones`, 4000);
};

// En modo demo, cada toque al mapa es un punto del recorrido.
map.on('click', (e) => {
  if (st.pick || !grabadora.activa || !grabadora.demo) return;
  grabadora.agregarPunto([e.latlng.lat, e.latlng.lng]);
});

function estadoValidacion(r) {
  return r.confirmaciones >= CONFIRMACIONES_VALIDADA
    ? `<span class="chip-val ok">comunidad ✓ ${r.confirmaciones}</span>`
    : '<span class="chip-val">por validar</span>';
}

function dibujarComunidad() {
  capaComunidad.clearLayers();
  for (const r of comunidad.lista) {
    const t = TIPOS_REG[r.tipo];
    const validada = r.confirmaciones >= CONFIRMACIONES_VALIDADA;
    L.polyline(r.trazo, {
      color: t.color, weight: 5, opacity: 0.9,
      dashArray: r.tipo === 'lancha' ? '10 8' : validada ? null : '2 8',
    }).bindPopup(`<b>${t.emoji} ${escapar(r.nombre)}</b><br>${estadoValidacion(r)}<br>
      <small>${formatoDistancia(longitud(r.trazo))} · S/ ${r.tarifa.toFixed(2)} · ~${r.velocidad} km/h</small>
      <div style="margin-top:8px"><a href="#" data-confirmar="${r.id}">👍 Yo también la tomé</a></div>`)
      .addTo(capaComunidad);
    r.paradas.forEach((p) => L.marker(p, { icon: icono('<div class="mk-reg-parada"></div>', '', [14, 14]) })
      .bindTooltip(`Paradero · ${escapar(r.nombre)}`).addTo(capaComunidad));
  }
}

function renderComunidad() {
  const l = comunidad.lista;
  $('#lista-comunidad').innerHTML = l.length ? l.map((r) => {
    const t = TIPOS_REG[r.tipo];
    return `<div class="card" data-com="${r.id}">
      <div class="ico-circ" style="background:${t.color}22">${t.emoji}</div>
      <div class="grow"><div class="titulo">${escapar(r.nombre)}</div>
        <div class="sub">${formatoDistancia(longitud(r.trazo))} · ${r.paradas.length} paraderos · S/ ${r.tarifa.toFixed(2)} ${estadoValidacion(r)}</div>
        <div class="mini-acc"><button data-acc="guardar">⭐</button><button data-acc="confirmar">👍 Yo también la tomé</button><button data-acc="borrar">🗑 Borrar</button></div>
      </div></div>`;
  }).join('') : '<p class="muted">Aún no hay rutas grabadas en este celular. ¡Sé el primero!</p>';
  $$('#lista-comunidad [data-com]').forEach((card) => {
    card.onclick = (e) => {
      const id = card.dataset.com;
      const acc = e.target.closest('[data-acc]')?.dataset.acc;
      if (acc === 'confirmar') { comunidad.confirmar(id); toast('¡Gracias por validar la ruta!'); }
      else if (acc === 'borrar') { if (!confirm('¿Borrar esta ruta de tu celular?')) return; comunidad.borrar(id); }
      else { const r = comunidad.lista.find((x) => x.id === id); if (r) encuadrar(L.latLngBounds(r.trazo)); return; }
      dibujarComunidad();
      renderComunidad();
    };
  });
}

map.on('popupopen', (e) => {
  const a = e.popup.getElement()?.querySelector('[data-confirmar]');
  if (!a) return;
  a.onclick = (ev) => {
    ev.preventDefault();
    comunidad.confirmar(a.dataset.confirmar);
    map.closePopup();
    dibujarComunidad();
    renderComunidad();
    toast('¡Gracias por validar la ruta!');
  };
});

$('#reg-exportar').onclick = () => {
  if (!comunidad.lista.length) { toast('No hay rutas para exportar'); return; }
  const blob = new Blob([JSON.stringify(comunidad.aGeoJSON(), null, 2)], { type: 'application/geo+json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'vibes-rutas-comunidad.geojson';
  a.click();
  URL.revokeObjectURL(a.href);
};
$('#reg-importar').onchange = async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const n = comunidad.deGeoJSON(JSON.parse(await f.text()));
    dibujarComunidad();
    renderComunidad();
    toast(`${n} rutas importadas`);
  } catch { toast('El archivo no es un GeoJSON válido'); }
  e.target.value = '';
};

// ---------------- Datos abiertos de OpenStreetMap ----------------
function dibujarOSM(lista) {
  capas.osm.clearLayers();
  for (const e of lista) {
    const t = ESTILO_OSM[e.tipo];
    L.marker(e.pos, { icon: icono(`<div class="mk-osm">${t.emoji}</div>`, '', [24, 24]) })
      .bindPopup(`<b>${t.emoji} ${e.nombre ? escapar(e.nombre) : t.label}</b><br><small>${t.label} · dato abierto
        <a href="https://www.openstreetmap.org/${{ n: 'node', w: 'way', r: 'relation' }[e.id[0]]}/${e.id.slice(1)}" target="_blank" rel="noopener">ver en OSM</a></small>`)
      .addTo(capas.osm);
  }
}

// ---------------- Región Puno: provincias y distritos ----------------
// Segmenta el territorio: la provincia de Puno (sus 15 distritos) y las otras 12
// provincias de la región, unidas a Puno ciudad como un grafo estrella de rutas
// interprovinciales. Al activar la capa, el mapa se abre a toda la región.
function dibujarRegion() {
  capas.region.clearLayers();
  const centro = PROVINCIAS[0].pos;
  for (const p of PROVINCIAS) {
    if (p.id !== 'puno') {
      L.polyline([centro, p.pos], { color: '#a78bfa', weight: 2, dashArray: '6 8', opacity: 0.8 }).addTo(capas.region);
    }
    L.circleMarker(p.pos, { radius: p.id === 'puno' ? 11 : 8, color: '#fff', weight: 2, fillColor: '#7c3aed', fillOpacity: 0.9 })
      .bindTooltip(p.nombre, { permanent: true, direction: 'right', className: 'tt-region' })
      .bindPopup(`<b>Provincia ${p.nombre}</b><br>Capital: ${p.capital}<br>
        <small>${p.km ? `~${p.km} km de Puno por carretera` : 'Capital de la región'}<br>🚐 ${p.transporte}</small>`)
      .addTo(capas.region);
  }
  for (const d of DISTRITOS_PUNO.slice(1)) {
    L.circleMarker(d.pos, { radius: 5, color: '#c4b5fd', weight: 1, fillColor: '#c4b5fd', fillOpacity: 0.7 })
      .bindTooltip(`Distrito ${d.nombre}${d.lago ? ' (isla, en lancha)' : ''} · prov. Puno`)
      .addTo(capas.region);
  }
}
dibujarRegion();
$('[data-capa=region]').addEventListener('click', () => {
  if (map.hasLayer(capas.region)) {
    map.setMinZoom(7);
    map.setMaxBounds(REGION_LIMITES);
    map.flyToBounds(L.latLngBounds(PROVINCIAS.map((p) => p.pos)).pad(0.1), { duration: 0.8 });
  } else {
    map.setMaxBounds(CIUDAD.limites);
    map.flyTo(CIUDAD.centro, CIUDAD.zoom, { duration: 0.8 });
    map.once('moveend', () => map.setMinZoom(10));
  }
});

// ---------------- Cuenta de usuario, favoritos y filtros ----------------
const cuentas = new Cuentas();

/** Aplica los filtros del usuario: muestra u oculta cada tipo de transporte. */
function aplicarFiltros() {
  const f = cuentas.filtros;
  for (const [id, def] of Object.entries(FILTROS)) {
    for (const c of def.capas) {
      f[id] ? capas[c].addTo(map) : map.removeLayer(capas[c]);
      $(`#capas [data-capa="${c}"]`)?.classList.toggle('on', !!f[id]);
    }
  }
}

function renderCuenta() {
  const u = cuentas.actual;
  $('#btn-cuenta').textContent = u ? u.nombre[0].toUpperCase() : '👤';
  $('#btn-cuenta').classList.toggle('con-sesion', !!u);
  const cuerpo = $('#cuenta-cuerpo');
  if (!u) {
    cuerpo.innerHTML = `<p class="muted">Crea tu perfil para guardar tus lugares, tus rutas y qué transporte quieres ver.</p>
      <input id="cu-nombre" maxlength="30" placeholder="Tu nombre de usuario" autocomplete="username" />
      <input id="cu-pin" type="password" inputmode="numeric" maxlength="6" placeholder="PIN de 4 a 6 números" autocomplete="current-password" />
      <p id="cu-error" class="cu-error" hidden></p>
      <div class="modal-actions"><button id="cu-crear" class="ghost">Crear cuenta</button><button id="cu-entrar" class="primary">Entrar</button></div>
      <p class="muted" style="font-size:12px">🔒 Tu PIN se guarda cifrado (SHA-256) solo en este celular.</p>`;
    const accion = async (fn) => {
      try {
        await fn($('#cu-nombre').value, $('#cu-pin').value);
        aplicarFiltros(); renderCuenta(); toast(`¡Hola, ${cuentas.actual.nombre}! 👋`);
      } catch (e) { $('#cu-error').textContent = e.message; $('#cu-error').hidden = false; }
    };
    $('#cu-entrar').onclick = () => accion((n, p) => cuentas.entrar(n, p));
    $('#cu-crear').onclick = () => accion((n, p) => cuentas.registrar(n, p));
    return;
  }
  const filtros = Object.entries(FILTROS).map(([id, d]) =>
    `<label class="cu-filtro"><input type="checkbox" data-filtro="${id}" ${u.filtros[id] ? 'checked' : ''}/> ${d.label}</label>`).join('');
  const lugares = u.lugares.length ? u.lugares.map((l, i) =>
    `<div class="cu-fav"><button data-ir-fav="${i}">📍 ${escapar(l.nombre)}</button><button data-quitar="lugares:${i}" title="Quitar">✕</button></div>`).join('')
    : '<p class="muted">Aún no guardas lugares. En “¿Cómo llego?” toca ⭐ junto al destino.</p>';
  const rutas = u.rutas.length ? u.rutas.map((r, i) =>
    `<div class="cu-fav"><button data-ver-ruta="${i}">🚌 ${escapar(r.nombre)}</button><button data-quitar="rutas:${i}" title="Quitar">✕</button></div>`).join('')
    : '<p class="muted">Aún no guardas rutas. Toca una línea en “Explorar” y luego ⭐ Guardar ruta.</p>';
  cuerpo.innerHTML = `<p><b>Hola, ${escapar(u.nombre)}</b></p>
    <h3>Qué transporte quiero ver</h3><div class="cu-filtros">${filtros}</div>
    <h3>Mis lugares</h3>${lugares}
    <h3>Mis rutas</h3>${rutas}
    <div class="modal-actions"><button id="cu-salir" class="ghost">Cerrar sesión</button><button id="cu-cerrar" class="primary">Listo</button></div>`;
  $$('#cuenta-cuerpo [data-filtro]').forEach((c) => {
    c.onchange = () => { cuentas.setFiltro(c.dataset.filtro, c.checked); aplicarFiltros(); };
  });
  $$('#cuenta-cuerpo [data-quitar]').forEach((b) => {
    b.onclick = () => { const [t, i] = b.dataset.quitar.split(':'); cuentas.quitar(t, +i); renderCuenta(); };
  });
  $$('#cuenta-cuerpo [data-ir-fav]').forEach((b) => {
    b.onclick = () => {
      const l = u.lugares[+b.dataset.irFav];
      $('#modal-cuenta').hidden = true;
      fijar('destino', { pos: l.pos, nombre: l.nombre });
      abrirTab('ir');
      asegurarOrigen();
    };
  });
  $$('#cuenta-cuerpo [data-ver-ruta]').forEach((b) => {
    b.onclick = () => {
      const fav = u.rutas[+b.dataset.verRuta];
      $('#modal-cuenta').hidden = true;
      const r = st.rutas.find((x) => x.id === fav.id);
      if (r) { abrirTab('explorar'); if (st.rutaSel !== r) seleccionarRuta(r); return; }
      const c = comunidad.lista.find((x) => x.id === fav.id);
      if (c) { abrirTab('registrar'); encuadrar(L.latLngBounds(c.trazo)); }
    };
  });
  $('#cu-salir').onclick = () => { cuentas.salir(); aplicarFiltros(); renderCuenta(); toast('Sesión cerrada'); };
  $('#cu-cerrar').onclick = () => { $('#modal-cuenta').hidden = true; };
}

$('#btn-cuenta').onclick = () => { renderCuenta(); $('#modal-cuenta').hidden = false; };
$('#modal-cuenta').onclick = (e) => { if (e.target.id === 'modal-cuenta') $('#modal-cuenta').hidden = true; };

$('#btn-guardar-destino').onclick = () => {
  if (!cuentas.actual) { toast('Inicia sesión (👤) para guardar lugares'); return; }
  if (!st.destino) { toast('Primero elige un destino'); return; }
  toast(cuentas.guardarLugar(st.destino.nombre, st.destino.pos) ? `⭐ Guardado: ${st.destino.nombre}` : 'Ese lugar ya está guardado');
};
$('#btn-guardar-ruta').onclick = () => {
  if (!cuentas.actual) { toast('Inicia sesión (👤) para guardar rutas'); return; }
  if (!st.rutaSel) { toast('Toca primero una línea de la lista'); return; }
  toast(cuentas.guardarRuta(st.rutaSel.id, st.rutaSel.nombre) ? `⭐ Ruta guardada: ${st.rutaSel.id}` : 'Esa ruta ya está guardada');
};
$('#lista-comunidad').addEventListener('click', (e) => {
  const b = e.target.closest('[data-acc="guardar"]');
  if (!b) return;
  e.stopPropagation();
  if (!cuentas.actual) { toast('Inicia sesión (👤) para guardar rutas'); return; }
  const r = comunidad.lista.find((x) => x.id === b.closest('[data-com]').dataset.com);
  toast(cuentas.guardarRuta(r.id, r.nombre) ? '⭐ Ruta guardada' : 'Esa ruta ya está guardada');
}, true);

// ---------------- Inicio ----------------
function iniciar() {
  st.rutas = cargarRed((rutas) => {
    // Llegaron los trazos por calles: redibujar todo lo que depende de ellos
    st.rutas = rutas;
    dibujarRutas();
    renderRutas();
    if (st.origen && st.destino) calcular();
  });
  st.paraderos = calcularParaderos(st.rutas);
  iniciarEnVivo();
  dibujarRutas();
  dibujarParaderos();
  dibujarExtras();
  dibujarLago();
  dibujarReportes();
  renderRutas();
  renderInterprovincial();
  renderLago();
  dibujarComunidad();
  renderComunidad();
  dibujarOSM(osmLocal());
  aplicarFiltros();
  renderCuenta();
  osmActualizar().then((l) => { if (l) dibujarOSM(l); });
  encuadrar(L.latLngBounds(st.rutas.flatMap((r) => r.trazo)), 15);
  setInterval(() => { renderCercanos(); dibujarReportes(); }, 20000);
  setInterval(renderLago, 10 * 60 * 1000);
}
iniciar();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// Exponer para depuración en consola
window.vibes = { st, map };
