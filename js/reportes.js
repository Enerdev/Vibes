// Reportes de la comunidad (accidentes, bloqueos, obras, clima).
// Demo: se guardan en el navegador. En producción irían a un backend
// para que todos los usuarios vean los mismos reportes en tiempo real.
import { REPORTES_DEMO } from '../data/puno.js';

const KEY = 'vibes:reportes:v1';
const VIDA_MS = 6 * 60 * 60 * 1000;   // 6 horas
const VOTOS_PARA_QUITAR = 3;

function leer() {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
}
function guardar(lista) {
  try { localStorage.setItem(KEY, JSON.stringify(lista)); } catch { /* sin almacenamiento */ }
}

export class Reportes {
  constructor() {
    let lista = leer();
    if (!Array.isArray(lista)) {
      const ahora = Date.now();
      lista = REPORTES_DEMO.map((r, i) => ({
        id: `demo-${i}`, tipo: r.tipo, pos: r.pos, texto: r.texto,
        creado: ahora - r.minutos * 60000, sigue: 2 + i, yaNo: 0, demo: true,
      }));
    }
    this.lista = lista;
    this.limpiar();
  }

  limpiar() {
    const ahora = Date.now();
    this.lista = this.lista.filter((r) => ahora - r.creado < VIDA_MS && r.yaNo < VOTOS_PARA_QUITAR);
    guardar(this.lista);
  }

  activos() {
    this.limpiar();
    return [...this.lista].sort((a, b) => b.creado - a.creado);
  }

  agregar({ tipo, pos, texto }) {
    const r = { id: `r-${Date.now()}`, tipo, pos, texto: texto?.trim() || '', creado: Date.now(), sigue: 0, yaNo: 0 };
    this.lista.push(r);
    guardar(this.lista);
    this.alCambiar?.('nuevo', r);
    return r;
  }

  votar(id, campo) {
    const r = this.lista.find((x) => x.id === id);
    if (!r) return;
    r[campo] += 1;
    guardar(this.lista);
    this.alCambiar?.('voto', r, campo);
    this.limpiar();
  }

  /** Une los reportes del servidor con los locales. */
  fusionar(remotos) {
    for (const rr of remotos) {
      const local = this.lista.find((x) => x.id === rr.id);
      if (local) { local.sigue = Math.max(local.sigue, rr.sigue); local.yaNo = Math.max(local.yaNo, rr.yaNo); }
      else this.lista.push(rr);
    }
    guardar(this.lista);
    this.limpiar();
  }
}

export function hace(ts) {
  const min = Math.round((Date.now() - ts) / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  return `hace ${Math.floor(min / 60)} h ${min % 60} min`;
}
