// ============================================================
//  REGIÓN PUNO — segmentación territorial (referencial)
//  13 provincias (con su capital) y los 15 distritos de la provincia de Puno.
//  Coordenadas APROXIMADAS de cada capital: validar con el INEI / IGN.
//  Formato: { id, nombre, capital, pos:[lat,lng], km: distancia por carretera
//  aprox. desde Puno ciudad, transporte: cómo se llega }
// ============================================================
export const REGION_LIMITES = [[-17.4, -71.3], [-13.0, -68.7]];

export const PROVINCIAS = [
  { id: 'puno', nombre: 'Puno', capital: 'Puno', pos: [-15.8402, -70.0219], km: 0, transporte: 'Combis urbanas, mototaxis, lanchas' },
  { id: 'sanroman', nombre: 'San Román', capital: 'Juliaca', pos: [-15.4997, -70.1333], km: 45, transporte: 'Combis cada 5–10 min · aeropuerto' },
  { id: 'azangaro', nombre: 'Azángaro', capital: 'Azángaro', pos: [-14.9083, -70.1961], km: 140, transporte: 'Combis desde Juliaca' },
  { id: 'carabaya', nombre: 'Carabaya', capital: 'Macusani', pos: [-14.0689, -70.4311], km: 290, transporte: 'Buses desde Juliaca (Interoceánica)' },
  { id: 'chucuito', nombre: 'Chucuito', capital: 'Juli', pos: [-16.2167, -69.4597], km: 80, transporte: 'Combis desde el terminal zonal' },
  { id: 'elcollao', nombre: 'El Collao', capital: 'Ilave', pos: [-16.0867, -69.6383], km: 55, transporte: 'Combis desde el terminal zonal' },
  { id: 'huancane', nombre: 'Huancané', capital: 'Huancané', pos: [-15.2025, -69.7614], km: 100, transporte: 'Combis desde Juliaca' },
  { id: 'lampa', nombre: 'Lampa', capital: 'Lampa', pos: [-15.3636, -70.3658], km: 75, transporte: 'Combis desde Juliaca' },
  { id: 'melgar', nombre: 'Melgar', capital: 'Ayaviri', pos: [-14.8817, -70.5897], km: 180, transporte: 'Buses Juliaca–Cusco' },
  { id: 'moho', nombre: 'Moho', capital: 'Moho', pos: [-15.3617, -69.5008], km: 140, transporte: 'Combis vía Huancané' },
  { id: 'putina', nombre: 'San Antonio de Putina', capital: 'Putina', pos: [-14.9142, -69.8678], km: 160, transporte: 'Combis desde Juliaca' },
  { id: 'sandia', nombre: 'Sandia', capital: 'Sandia', pos: [-14.2833, -69.4667], km: 310, transporte: 'Buses desde Juliaca (selva)' },
  { id: 'yunguyo', nombre: 'Yunguyo', capital: 'Yunguyo', pos: [-16.2442, -69.0928], km: 130, transporte: 'Combis vía Juli · frontera con Bolivia' },
];

// Distritos de la provincia de Puno (capital distrital aproximada).
export const DISTRITOS_PUNO = [
  { nombre: 'Puno', pos: [-15.8402, -70.0219] },
  { nombre: 'Acora', pos: [-15.9730, -69.7970] },
  { nombre: 'Amantaní', pos: [-15.6600, -69.7200], lago: true },
  { nombre: 'Atuncolla', pos: [-15.6900, -70.1400] },
  { nombre: 'Capachica', pos: [-15.6430, -69.8320] },
  { nombre: 'Chucuito', pos: [-15.8940, -69.8900] },
  { nombre: 'Coata', pos: [-15.5700, -69.9500] },
  { nombre: 'Huata', pos: [-15.6150, -69.9750] },
  { nombre: 'Mañazo', pos: [-15.8000, -70.3430] },
  { nombre: 'Paucarcolla', pos: [-15.7450, -70.0500] },
  { nombre: 'Pichacani', pos: [-16.1500, -70.0700] },
  { nombre: 'Platería', pos: [-15.9460, -69.8300] },
  { nombre: 'San Antonio', pos: [-16.1700, -70.3600] },
  { nombre: 'Tiquillaca', pos: [-15.8000, -70.1900] },
  { nombre: 'Vilque', pos: [-15.7700, -70.2600] },
];
