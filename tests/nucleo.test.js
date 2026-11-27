// Pruebas unitarias del núcleo (sin dependencias): node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distancia } from '../js/geo.js';
import { simplificar, similitud } from '../js/registro.js';
import { rutaOptima } from '../js/grafo.js';

test('distancia haversine: 0.001° de latitud ≈ 111 m', () => {
  const d = distancia([-15.84, -70.02], [-15.841, -70.02]);
  assert.ok(d > 105 && d < 117, `d=${d}`);
});

test('Douglas–Peucker elimina puntos alineados y conserva extremos', () => {
  const linea = [[-15.84, -70.02], [-15.841, -70.021], [-15.842, -70.022], [-15.845, -70.025]];
  const s = simplificar(linea);
  assert.equal(s.length, 2);
  assert.deepEqual(s[0], linea[0]);
  assert.deepEqual(s[1], linea[3]);
});

test('Douglas–Peucker conserva una esquina real', () => {
  const linea = [[-15.84, -70.02], [-15.84, -70.025], [-15.845, -70.025]];
  assert.equal(simplificar(linea).length, 3);
});

test('similitud: misma ruta = 1, ruta lejana = 0', () => {
  const a = [[-15.84, -70.02], [-15.85, -70.03]];
  const b = [[-15.70, -70.20], [-15.71, -70.21]];
  assert.equal(similitud(a, a), 1);
  assert.equal(similitud(a, b), 0);
});

// Red de prueba: dos líneas que se cruzan en un paradero común.
const p = (id, lat, lng) => ({ id, nombre: id, pos: [lat, lng] });
const A = { id: 'A', nombre: 'Línea A', color: '#f00', frecuencia: 6, paradas: [p('a1', -15.84, -70.03), p('a2', -15.84, -70.02), p('x', -15.84, -70.01)] };
const B = { id: 'B', nombre: 'Línea B', color: '#00f', frecuencia: 6, paradas: [p('x2', -15.8401, -70.01), p('b2', -15.83, -70.01), p('b3', -15.82, -70.01)] };
A.trazo = A.paradas.map((s) => s.pos);
B.trazo = B.paradas.map((s) => s.pos);

test('grafo + Dijkstra: encuentra el transbordo A → B', () => {
  const r = rutaOptima({ origen: [-15.84, -70.03], destino: [-15.82, -70.01], lineas: [A, B] });
  assert.ok(r, 'debe existir ruta');
  assert.deepEqual(r.lineas.map((l) => l.id), ['A', 'B']);
  assert.ok(r.minutos > 0 && Number.isFinite(r.minutos));
});

test('grafo dinámico: un reporte en el camino aumenta el tiempo', () => {
  const base = rutaOptima({ origen: [-15.84, -70.03], destino: [-15.82, -70.01], lineas: [A, B] });
  const conReporte = rutaOptima({ origen: [-15.84, -70.03], destino: [-15.82, -70.01], lineas: [A, B], reportes: [{ pos: [-15.83, -70.01] }] });
  assert.ok(conReporte.minutos > base.minutos, `${conReporte.minutos} > ${base.minutos}`);
});

test('grafo: sin paraderos cerca devuelve null', () => {
  assert.equal(rutaOptima({ origen: [-15.0, -69.0], destino: [-15.1, -69.1], lineas: [A, B] }), null);
});
