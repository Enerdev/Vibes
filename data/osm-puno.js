// ============================================================
//  DATASET ABIERTO: OpenStreetMap (© colaboradores de OpenStreetMap, licencia ODbL)
//  Paraderos (highway=bus_stop), terminales (amenity=bus_station) y muelles
//  (amenity=ferry_terminal) de Puno, extraídos con la API Overpass.
//  Consulta usada (bbox de Puno):
//    node["highway"="bus_stop"](-15.90,-70.08,-15.78,-69.98);
//    nwr["amenity"="bus_station"](...); nwr["amenity"="ferry_terminal"](...);
//  Se guarda en el repo porque Overpass puede tardar más de 30 s; js/osm.js
//  intenta actualizarlo en vivo y, si falla, usa esta copia.
//  Formato: [id OSM, lat, lng, tipo, nombre]
// ============================================================
export const OSM_FECHA = '2026-11-27';
export const OSM_PUNO = [
  ['n4195943889', -15.83213, -70.01944, 'terminal', 'Bus to Capachica'],
  ['n4199098301', -15.84558, -70.01704, 'terminal', 'Transporte local: colectivos'],
  ['n4214688859', -15.8619, -70.0005, 'terminal', null],
  ['n4214690249', -15.85368, -70.01487, 'terminal', null],
  ['n4214690250', -15.84929, -70.01884, 'terminal', null],
  ['n4214691560', -15.86184, -70.00098, 'terminal', null],
  ['n4214691561', -15.8607, -70.00148, 'terminal', null],
  ['n4310357394', -15.83869, -70.02607, 'terminal', 'Rossy Tours'],
  ['n4548556189', -15.83241, -70.02813, 'terminal', 'Colectivos a Juliaca'],
  ['n5150906822', -15.83617, -70.01716, 'paradero', null],
  ['n5163776721', -15.83534, -70.01497, 'paradero', null],
  ['n5520643193', -15.81928, -69.98879, 'muelle', 'Puerto Kalapajra'],
  ['n6336638086', -15.84151, -70.03148, 'paradero', null],
  ['n6515693385', -15.8351, -70.01807, 'paradero', null],
  ['n6746461386', -15.84435, -70.01831, 'terminal', 'Combis para Moquegua'],
  ['n7197176635', -15.83653, -70.01506, 'muelle', null],
  ['n8362739725', -15.83507, -70.01424, 'muelle', null],
  ['n8858585918', -15.84108, -70.02049, 'paradero', null],
  ['n10542289559', -15.81112, -70.02919, 'paradero', null],
  ['n10542289560', -15.81134, -70.03214, 'paradero', null],
  ['n10542289561', -15.81422, -70.02993, 'paradero', null],
  ['n10542289562', -15.81466, -70.03136, 'paradero', null],
  ['n10542289563', -15.8274, -70.03409, 'paradero', null],
  ['n10542289564', -15.8268, -70.03005, 'paradero', null],
  ['n10542289565', -15.82978, -70.02926, 'paradero', null],
  ['n10542289566', -15.83608, -70.02663, 'paradero', 'Mercado'],
  ['n10542289567', -15.84009, -70.02553, 'paradero', 'Esquina'],
  ['n10542289568', -15.84675, -70.02158, 'paradero', null],
  ['n10542289569', -15.84503, -70.02051, 'paradero', null],
  ['n10660352379', -15.82727, -70.02997, 'paradero', null],
  ['n10660352459', -15.82855, -70.02973, 'paradero', null],
  ['n10815375754', -15.83323, -70.02753, 'paradero', null],
  ['n12101028080', -15.84377, -70.01701, 'paradero', null],
  ['n12101028081', -15.84376, -70.01694, 'paradero', null],
  ['n12101028082', -15.84373, -70.01685, 'paradero', null],
  ['n12101028083', -15.84372, -70.01678, 'paradero', null],
  ['n12101028084', -15.84369, -70.01671, 'paradero', null],
  ['n12101028085', -15.84367, -70.01663, 'paradero', null],
  ['n12101028086', -15.8435, -70.01708, 'paradero', null],
  ['n12101028087', -15.84348, -70.01702, 'paradero', null],
  ['n12101028088', -15.84346, -70.01693, 'paradero', null],
  ['n12101028089', -15.84343, -70.01684, 'paradero', null],
  ['n12101028090', -15.8434, -70.01676, 'paradero', null],
  ['n12101028091', -15.84338, -70.01668, 'paradero', null],
  ['n12363602119', -15.83769, -70.02608, 'paradero', null],
  ['n12488547201', -15.84757, -70.01538, 'terminal', null],
  ['n12776384962', -15.84663, -70.0213, 'paradero', null],
  ['n13746113301', -15.83319, -70.02789, 'terminal', null],
  ['w245233060', -15.84363, -70.01699, 'terminal', 'Terminal Terrestre de Puno'],
  ['w550775931', -15.84773, -70.01498, 'terminal', 'Terminal zonal sur'],
  ['w622494279', -15.84104, -70.02045, 'terminal', 'Estación Virgen de Fátima'],
  ['w844802712', -15.83257, -70.0282, 'terminal', null],
];
