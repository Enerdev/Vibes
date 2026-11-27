// ============================================================
//  Cuentas de usuario (sin servidor: perfiles en este dispositivo)
//  El PIN nunca se guarda en texto plano: se guarda su hash SHA-256 con sal.
//  Cada usuario tiene sus lugares y rutas favoritas y sus filtros de transporte.
//  Fase 2: mover estas cuentas a un backend (Supabase / PHP en Plesk) para
//  sincronizar entre celulares.
// ============================================================
import { API } from './api.js';

const KEY = 'vibes:usuarios:v1';
const KEY_SESION = 'vibes:sesion:v1';

// Filtros de transporte que el usuario puede activar o desactivar.
export const FILTROS = {
  publico: { label: '🚌 Transporte público (combis)', capas: ['rutas', 'paraderos', 'envivo'] },
  distrital: { label: '🏔️ Distrital / interprovincial', capas: ['region'] },
  moto: { label: '🛺 Mototaxi', capas: ['mototaxi'] },
  taxi: { label: '🚕 Taxi', capas: ['taxi'] },
  barco: { label: '⛵ Lanchas del lago', capas: ['lago'] },
};
const FILTROS_INICIALES = { publico: true, distrital: false, moto: false, taxi: false, barco: true };

function leer() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function guardar(u) {
  try { localStorage.setItem(KEY, JSON.stringify(u)); } catch { /* sin almacenamiento */ }
}

async function hash(texto) {
  const datos = new TextEncoder().encode(texto);
  const h = await crypto.subtle.digest('SHA-256', datos);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const clave = (nombre) => nombre.trim().toLowerCase();

export class Cuentas {
  constructor() {
    this.usuarios = leer();
    let s = null;
    try { s = localStorage.getItem(KEY_SESION); } catch { /* */ }
    this.actual = s && this.usuarios[s] ? this.usuarios[s] : null;
  }

  /** Con base de datos: la cuenta vive en el servidor (PIN con bcrypt) y aquí solo una copia sin PIN. */
  async viaServidor(recurso, nombre, pin) {
    const datos = { lugares: [], rutas: [], filtros: { ...FILTROS_INICIALES } };
    const r = await API.pedir(recurso, { metodo: 'POST', datos: { nombre, pin, datos } });
    API.token = r.token;
    const k = clave(r.nombre);
    this.usuarios[k] = {
      nombre: r.nombre, servidor: true, creado: Date.now(),
      lugares: r.datos?.lugares || [], rutas: r.datos?.rutas || [], filtros: { ...FILTROS_INICIALES, ...(r.datos?.filtros || {}) },
    };
    guardar(this.usuarios);
    return this.iniciar(k);
  }

  async registrar(nombre, pin) {
    const k = clave(nombre);
    if (k.length < 3) throw new Error('El nombre debe tener al menos 3 letras');
    if (!/^\d{4,6}$/.test(pin)) throw new Error('El PIN debe tener de 4 a 6 números');
    if (API.disponible) return this.viaServidor('registro', nombre, pin);
    if (this.usuarios[k]) throw new Error('Ese usuario ya existe en este celular');
    const sal = crypto.getRandomValues(new Uint32Array(2)).join('-');
    this.usuarios[k] = {
      nombre: nombre.trim(), sal, pin: await hash(sal + pin), creado: Date.now(),
      lugares: [], rutas: [], filtros: { ...FILTROS_INICIALES },
    };
    guardar(this.usuarios);
    return this.iniciar(k);
  }

  async entrar(nombre, pin) {
    if (API.disponible) return this.viaServidor('login', nombre, pin);
    const u = this.usuarios[clave(nombre)];
    if (!u || u.pin !== await hash(u.sal + pin)) throw new Error('Usuario o PIN incorrecto');
    return this.iniciar(clave(nombre));
  }

  iniciar(k) {
    this.actual = this.usuarios[k];
    try { localStorage.setItem(KEY_SESION, k); } catch { /* */ }
    return this.actual;
  }

  salir() {
    if (this.actual?.servidor) { API.enviar('salir', {}); API.token = null; }
    this.actual = null;
    try { localStorage.removeItem(KEY_SESION); } catch { /* */ }
  }

  persistir() {
    guardar(this.usuarios);
    const u = this.actual;
    if (u?.servidor) API.enviar('perfil', { datos: { lugares: u.lugares, rutas: u.rutas, filtros: u.filtros } });
  }

  /** Filtros del usuario, o los iniciales si no hay sesión. */
  get filtros() { return this.actual?.filtros || { ...FILTROS_INICIALES }; }

  setFiltro(id, on) {
    if (!this.actual) return;
    this.actual.filtros[id] = on;
    this.persistir();
  }

  guardarLugar(nombre, pos) {
    if (!this.actual) return false;
    if (this.actual.lugares.some((l) => l.nombre === nombre)) return false;
    this.actual.lugares.push({ nombre, pos });
    this.persistir();
    return true;
  }

  guardarRuta(id, nombre) {
    if (!this.actual) return false;
    if (this.actual.rutas.some((r) => r.id === id)) return false;
    this.actual.rutas.push({ id, nombre });
    this.persistir();
    return true;
  }

  quitar(tipo, i) {
    if (!this.actual) return;
    this.actual[tipo].splice(i, 1);
    this.persistir();
  }
}
