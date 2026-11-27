// Estado del Lago Titicaca (viento real de Open-Meteo, sin API key) y próximas salidas.

const URL = 'https://api.open-meteo.com/v1/forecast?latitude=-15.82&longitude=-69.97' +
  '&current=temperature_2m,wind_speed_10m,wind_gusts_10m,weather_code&timezone=America%2FLima';

const CLIMA = {
  0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
  45: 'Neblina', 48: 'Neblina', 51: 'Llovizna', 53: 'Llovizna', 55: 'Llovizna',
  61: 'Lluvia', 63: 'Lluvia', 65: 'Lluvia fuerte', 71: 'Nevada', 73: 'Nevada', 75: 'Nevada fuerte',
  77: 'Granizo fino', 80: 'Chubascos', 81: 'Chubascos', 82: 'Chubascos fuertes',
  85: 'Nevada', 86: 'Nevada', 95: 'Tormenta', 96: 'Tormenta con granizo', 99: 'Tormenta con granizo',
};

export async function estadoLago() {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(URL, { signal: ctrl.signal });
    if (!r.ok) throw new Error('clima ' + r.status);
    const { current: c } = await r.json();
    const viento = c.wind_speed_10m, rafagas = c.wind_gusts_10m;
    const tormenta = [95, 96, 99].includes(c.weather_code);
    let nivel = 'ok', mensaje = 'Buenas condiciones para navegar';
    if (tormenta || viento >= 35 || rafagas >= 50) { nivel = 'peligro'; mensaje = 'No se recomienda salir al lago'; }
    else if (viento >= 20 || rafagas >= 35) { nivel = 'precaucion'; mensaje = 'Precaución: lago movido'; }
    return {
      nivel, mensaje, viento, rafagas,
      temp: c.temperature_2m, clima: CLIMA[c.weather_code] || 'Clima variable',
    };
  } finally {
    clearTimeout(t);
  }
}

/** Próxima salida (hoy) a partir de la hora actual. */
export function proximaSalida(salidas, ahora = new Date()) {
  const min = ahora.getHours() * 60 + ahora.getMinutes();
  for (const s of salidas) {
    const [h, m] = s.split(':').map(Number);
    const t = h * 60 + m;
    if (t >= min) return { hora: s, en: t - min };
  }
  return null; // ya no hay salidas hoy
}
