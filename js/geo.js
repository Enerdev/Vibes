// Utilidades geográficas (sin dependencias)

const R = 6371000; // radio de la Tierra en metros
const rad = (d) => (d * Math.PI) / 180;

/** Distancia en metros entre dos puntos [lat, lng] */
export function distancia(a, b) {
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Longitud total de una polilínea en metros */
export function longitud(linea) {
  let total = 0;
  for (let i = 1; i < linea.length; i++) total += distancia(linea[i - 1], linea[i]);
  return total;
}

/** Distancias acumuladas a lo largo de la polilínea */
export function acumuladas(linea) {
  const acc = [0];
  for (let i = 1; i < linea.length; i++) acc.push(acc[i - 1] + distancia(linea[i - 1], linea[i]));
  return acc;
}

/** Punto a una distancia `d` (m) a lo largo de la línea. Devuelve {pos, angulo} */
export function puntoEn(linea, acc, d) {
  const total = acc[acc.length - 1];
  d = Math.max(0, Math.min(total, d));
  let i = 1;
  while (i < acc.length - 1 && acc[i] < d) i++;
  const seg = acc[i] - acc[i - 1] || 1;
  const t = (d - acc[i - 1]) / seg;
  const a = linea[i - 1], b = linea[i];
  return {
    pos: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
    angulo: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI,
  };
}

/** Índice del vértice de la línea más cercano a un punto */
export function indiceCercano(linea, p) {
  let best = 0, bestD = Infinity;
  for (let i = 0; i < linea.length; i++) {
    const d = distancia(linea[i], p);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

/** Tramo de la polilínea entre los vértices más cercanos a a y b */
export function tramo(linea, a, b) {
  const i = indiceCercano(linea, a);
  const j = indiceCercano(linea, b);
  return i <= j ? linea.slice(i, j + 1) : linea.slice(j, i + 1).reverse();
}

export function formatoDistancia(m) {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
}

export function formatoMinutos(min) {
  min = Math.max(1, Math.round(min));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), r = min % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}
