// Simulación de unidades en movimiento (demo "en vivo").
// En producción, estas posiciones vendrían del GPS de los choferes
// o de pasajeros que comparten su viaje.
import { puntoEn } from './geo.js';
import { VELOCIDADES } from '../data/puno.js';

const VEL = (VELOCIDADES.combi * 1000) / 3600; // m/s

export class Flota {
  constructor(rutas) {
    this.rutas = rutas;
    this.unidades = [];
    for (const r of rutas) {
      for (let k = 0; k < r.unidades; k++) {
        this.unidades.push({
          ruta: r,
          frac: (k + Math.random() * 0.5) / r.unidades,  // posición relativa 0..1
          dir: k % 2 === 0 ? 1 : -1,
          vel: VEL * (0.8 + Math.random() * 0.4),
          espera: 0,
          placa: placa(),
        });
      }
    }
    this.ultimo = performance.now();
  }

  /** Avanza la simulación. `acelerar` multiplica la velocidad visual. */
  paso(acelerar = 1) {
    const ahora = performance.now();
    const dt = Math.min(0.5, (ahora - this.ultimo) / 1000) * acelerar;
    this.ultimo = ahora;
    for (const u of this.unidades) {
      if (u.espera > 0) { u.espera -= dt; continue; }
      const L = u.ruta.largo || 1;
      const antes = u.frac * L;
      let d = antes + u.dir * u.vel * dt;
      if (d >= L) { d = L; u.dir = -1; u.espera = 8; }
      if (d <= 0) { d = 0; u.dir = 1; u.espera = 8; }
      // breve parada al pasar por un paradero
      for (const dp of u.ruta.distParadas) {
        if ((antes - dp) * (d - dp) < 0) { u.espera = 3; break; }
      }
      u.frac = d / L;
    }
  }

  posicion(u) {
    const r = u.ruta;
    return puntoEn(r.trazo, r.acc, u.frac * r.largo);
  }

  /** Minutos estimados para que la próxima unidad de `ruta` llegue a la parada `idx`. */
  eta(ruta, idx) {
    const L = ruta.largo, dp = ruta.distParadas[idx];
    let mejor = Infinity;
    for (const u of this.unidades) {
      if (u.ruta !== ruta) continue;
      const d = u.frac * L;
      let falta;
      if (u.dir === 1) falta = dp >= d ? dp - d : (L - d) + (L - dp);
      else falta = dp <= d ? d - dp : d + dp;
      mejor = Math.min(mejor, falta / u.vel + Math.max(0, u.espera));
    }
    return mejor / 60;
  }
}

function placa() {
  const L = 'ABCDFGHJKMPRTVXZ';
  const c = () => L[Math.floor(Math.random() * L.length)];
  return `Z${c()}${Math.floor(Math.random() * 10)}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
}
