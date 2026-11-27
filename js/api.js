// ============================================================
//  Cliente de la API (api/index.php → MySQL).
//  Si la API no responde (por ejemplo, abierta como sitio estático),
//  la app sigue funcionando en modo local con localStorage.
// ============================================================
const BASE = 'api/index.php';
const KEY_TOKEN = 'vibes:token:v1';

export const API = {
  disponible: false,

  get token() { try { return localStorage.getItem(KEY_TOKEN); } catch { return null; } },
  set token(t) { try { t ? localStorage.setItem(KEY_TOKEN, t) : localStorage.removeItem(KEY_TOKEN); } catch { /* */ } },

  /** Comprueba si hay API y base de datos. */
  async iniciar() {
    try {
      const r = await fetch(`${BASE}?r=salud`, { cache: 'no-store' });
      this.disponible = r.ok && (await r.json()).db === true;
    } catch {
      this.disponible = false;
    }
    return this.disponible;
  },

  async pedir(recurso, { metodo = 'GET', datos } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    const r = await fetch(`${BASE}?r=${recurso}`, {
      method: metodo, headers, cache: 'no-store',
      body: datos === undefined ? undefined : JSON.stringify(datos),
    });
    const j = await r.json().catch(() => ({ ok: false, error: 'Respuesta inválida del servidor' }));
    if (!r.ok || !j.ok) throw new Error(j.error || `Error ${r.status}`);
    return j;
  },

  /** Envío "en segundo plano": si falla, el dato ya quedó guardado en el celular. */
  enviar(recurso, datos) {
    if (!this.disponible) return;
    this.pedir(recurso, { metodo: 'POST', datos }).catch((e) => console.warn('API', recurso, e.message));
  },
};
