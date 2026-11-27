<?php
// ============================================================
//  Vibes · API REST mínima (PHP 8 + PDO + MySQL/MariaDB)
//  Una sola entrada:  api/index.php?r=<recurso>
//
//  GET  ?r=salud              → estado de la API y la base de datos
//  GET  ?r=rutas              → rutas de la comunidad
//  POST ?r=rutas              → guardar una ruta nueva
//  POST ?r=confirmar          → "yo también la tomé" (+1 confirmación)
//  GET  ?r=reportes           → reportes activos (últimas 6 h)
//  POST ?r=reportes           → crear reporte
//  POST ?r=votar              → "sigue ahí" / "ya no está"
//  POST ?r=registro           → crear cuenta (nombre + PIN)
//  POST ?r=login              → iniciar sesión, devuelve token
//  GET  ?r=perfil  (Bearer)   → favoritos y filtros del usuario
//  POST ?r=perfil  (Bearer)   → guardar favoritos y filtros
//  POST ?r=salir   (Bearer)   → cerrar sesión (invalida el token)
//
//  Seguridad: consultas preparadas (sin inyección SQL), PIN con bcrypt,
//  validación de tipos y tamaños, errores sin detalles internos.
// ============================================================
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

const VIDA_REPORTE_H = 6;
const VOTOS_PARA_QUITAR = 3;
const TIPOS_RUTA = ['combi', 'mototaxi', 'lancha'];
const TIPOS_REPORTE = ['accidente', 'bloqueo', 'obra', 'clima', 'trafico', 'otro'];

function responder(int $codigo, array $datos): never {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}

function fallar(int $codigo, string $mensaje): never {
    responder($codigo, ['ok' => false, 'error' => $mensaje]);
}

function cuerpo(): array {
    $texto = file_get_contents('php://input') ?: '';
    if (strlen($texto) > 512 * 1024) fallar(413, 'Datos demasiado grandes');
    $json = json_decode($texto, true);
    return is_array($json) ? $json : [];
}

function db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $archivo = __DIR__ . '/config.php';
    if (!is_file($archivo)) fallar(503, 'API sin configurar (falta api/config.php)');
    $c = require $archivo;
    try {
        $pdo = new PDO(
            "mysql:host={$c['host']};port={$c['puerto']};dbname={$c['base']};charset=utf8mb4",
            $c['usuario'], $c['clave'],
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC],
        );
    } catch (PDOException) {
        fallar(503, 'No se pudo conectar a la base de datos');
    }
    return $pdo;
}

/** Valida una lista de puntos [[lat, lng], ...] dentro de la región Puno. */
function puntos(mixed $lista, int $min, int $max): array {
    if (!is_array($lista) || count($lista) < $min || count($lista) > $max) fallar(400, 'Lista de puntos inválida');
    $salida = [];
    foreach ($lista as $p) {
        if (!is_array($p) || count($p) !== 2 || !is_numeric($p[0]) || !is_numeric($p[1])) fallar(400, 'Punto inválido');
        [$lat, $lng] = [(float) $p[0], (float) $p[1]];
        if ($lat < -18 || $lat > -12 || $lng < -72 || $lng > -68) fallar(400, 'Punto fuera de la región Puno');
        $salida[] = [round($lat, 6), round($lng, 6)];
    }
    return $salida;
}

function texto(mixed $v, int $max): string {
    return mb_substr(trim(strip_tags((string) ($v ?? ''))), 0, $max);
}

function idValido(mixed $v): string {
    $id = (string) ($v ?? '');
    if (!preg_match('/^[A-Za-z0-9_-]{1,40}$/', $id)) fallar(400, 'Id inválido');
    return $id;
}

/** Usuario dueño del token Bearer, o null. */
function usuarioActual(): ?array {
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!preg_match('/^Bearer ([a-f0-9]{64})$/', $h, $m)) return null;
    $q = db()->prepare('SELECT id, nombre, datos FROM usuarios WHERE token = ?');
    $q->execute([$m[1]]);
    return $q->fetch() ?: null;
}

function rutaDeFila(array $f): array {
    return [
        'id' => $f['id'], 'nombre' => $f['nombre'], 'tipo' => $f['tipo'],
        'tarifa' => (float) $f['tarifa'], 'velocidad' => (int) $f['velocidad'],
        'trazo' => json_decode($f['trazo'], true), 'paradas' => json_decode($f['paradas'], true),
        'confirmaciones' => (int) $f['confirmaciones'], 'creado' => (int) $f['ts'] * 1000,
    ];
}

$recurso = $_GET['r'] ?? '';
$metodo = $_SERVER['REQUEST_METHOD'];

switch ("$metodo $recurso") {
    case 'GET salud':
        db()->query('SELECT 1');
        responder(200, ['ok' => true, 'db' => true]);

    // ---------------- Rutas de la comunidad ----------------
    case 'GET rutas':
        $filas = db()->query('SELECT *, UNIX_TIMESTAMP(creado) AS ts FROM rutas ORDER BY creado DESC LIMIT 500')->fetchAll();
        responder(200, ['ok' => true, 'rutas' => array_map('rutaDeFila', $filas)]);

    case 'POST rutas':
        $b = cuerpo();
        $tipo = in_array($b['tipo'] ?? '', TIPOS_RUTA, true) ? $b['tipo'] : fallar(400, 'Tipo inválido');
        $nombre = texto($b['nombre'] ?? '', 60);
        if ($nombre === '') fallar(400, 'Falta el nombre');
        $usuario = usuarioActual();
        $q = db()->prepare('INSERT IGNORE INTO rutas (id, nombre, tipo, tarifa, velocidad, trazo, paradas, usuario_id)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        $q->execute([
            idValido($b['id'] ?? ''), $nombre, $tipo,
            max(0, min(500, (float) ($b['tarifa'] ?? 0))),
            max(1, min(80, (int) ($b['velocidad'] ?? 15))),
            json_encode(puntos($b['trazo'] ?? null, 2, 5000)),
            json_encode(puntos($b['paradas'] ?? [], 0, 200)),
            $usuario['id'] ?? null,
        ]);
        responder(201, ['ok' => true]);

    case 'POST confirmar':
        $q = db()->prepare('UPDATE rutas SET confirmaciones = confirmaciones + 1 WHERE id = ?');
        $q->execute([idValido(cuerpo()['id'] ?? '')]);
        responder(200, ['ok' => true, 'actualizadas' => $q->rowCount()]);

    // ---------------- Reportes en vivo ----------------
    case 'GET reportes':
        $q = db()->prepare('SELECT *, UNIX_TIMESTAMP(creado) AS ts FROM reportes WHERE creado > NOW() - INTERVAL ? HOUR AND ya_no < ? ORDER BY creado DESC');
        $q->execute([VIDA_REPORTE_H, VOTOS_PARA_QUITAR]);
        $lista = array_map(fn ($f) => [
            'id' => $f['id'], 'tipo' => $f['tipo'], 'pos' => [(float) $f['lat'], (float) $f['lng']],
            'texto' => $f['texto'], 'sigue' => (int) $f['sigue'], 'yaNo' => (int) $f['ya_no'],
            'creado' => (int) $f['ts'] * 1000,
        ], $q->fetchAll());
        responder(200, ['ok' => true, 'reportes' => $lista]);

    case 'POST reportes':
        $b = cuerpo();
        $tipo = in_array($b['tipo'] ?? '', TIPOS_REPORTE, true) ? $b['tipo'] : 'otro';
        [$pos] = puntos([$b['pos'] ?? null], 1, 1);
        $q = db()->prepare('INSERT IGNORE INTO reportes (id, tipo, lat, lng, texto) VALUES (?, ?, ?, ?, ?)');
        $q->execute([idValido($b['id'] ?? ''), $tipo, $pos[0], $pos[1], texto($b['texto'] ?? '', 140)]);
        responder(201, ['ok' => true]);

    case 'POST votar':
        $b = cuerpo();
        $campo = match ($b['voto'] ?? '') { 'sigue' => 'sigue', 'yaNo' => 'ya_no', default => fallar(400, 'Voto inválido') };
        $q = db()->prepare("UPDATE reportes SET $campo = $campo + 1 WHERE id = ?");   // $campo viene de una lista cerrada
        $q->execute([idValido($b['id'] ?? '')]);
        responder(200, ['ok' => true]);

    // ---------------- Cuentas ----------------
    case 'POST registro':
    case 'POST login':
        $b = cuerpo();
        $nombre = texto($b['nombre'] ?? '', 30);
        $clave = mb_strtolower($nombre);
        $pin = (string) ($b['pin'] ?? '');
        if (mb_strlen($nombre) < 3) fallar(400, 'El nombre debe tener al menos 3 letras');
        if (!preg_match('/^\d{4,6}$/', $pin)) fallar(400, 'El PIN debe tener de 4 a 6 números');
        $token = bin2hex(random_bytes(32));
        if ($recurso === 'registro') {
            $datos = json_encode(is_array($b['datos'] ?? null) ? $b['datos'] : new stdClass());
            try {
                db()->prepare('INSERT INTO usuarios (nombre, clave, pin_hash, token, datos) VALUES (?, ?, ?, ?, ?)')
                    ->execute([$nombre, $clave, password_hash($pin, PASSWORD_BCRYPT), $token, $datos]);
            } catch (PDOException) {
                fallar(409, 'Ese usuario ya existe');
            }
            responder(201, ['ok' => true, 'token' => $token, 'nombre' => $nombre, 'datos' => json_decode($datos, true)]);
        }
        $q = db()->prepare('SELECT id, nombre, pin_hash, datos FROM usuarios WHERE clave = ?');
        $q->execute([$clave]);
        $u = $q->fetch();
        if (!$u || !password_verify($pin, $u['pin_hash'])) fallar(401, 'Usuario o PIN incorrecto');
        db()->prepare('UPDATE usuarios SET token = ? WHERE id = ?')->execute([$token, $u['id']]);
        responder(200, ['ok' => true, 'token' => $token, 'nombre' => $u['nombre'], 'datos' => json_decode($u['datos'], true)]);

    case 'GET perfil':
        $u = usuarioActual() ?? fallar(401, 'Sesión no válida');
        responder(200, ['ok' => true, 'nombre' => $u['nombre'], 'datos' => json_decode($u['datos'], true)]);

    case 'POST perfil':
        $u = usuarioActual() ?? fallar(401, 'Sesión no válida');
        $datos = cuerpo()['datos'] ?? null;
        if (!is_array($datos)) fallar(400, 'Datos inválidos');
        $json = json_encode([
            'lugares' => array_slice($datos['lugares'] ?? [], 0, 100),
            'rutas' => array_slice($datos['rutas'] ?? [], 0, 100),
            'filtros' => $datos['filtros'] ?? new stdClass(),
        ], JSON_UNESCAPED_UNICODE);
        if (strlen($json) > 64 * 1024) fallar(413, 'Demasiados favoritos');
        db()->prepare('UPDATE usuarios SET datos = ? WHERE id = ?')->execute([$json, $u['id']]);
        responder(200, ['ok' => true]);

    case 'POST salir':
        $u = usuarioActual();
        if ($u) db()->prepare('UPDATE usuarios SET token = NULL WHERE id = ?')->execute([$u['id']]);
        responder(200, ['ok' => true]);

    default:
        fallar(404, 'Recurso no encontrado');
}
