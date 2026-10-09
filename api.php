<?php
// API del sistema de almacén. Uso: api.php?r=<recurso>&a=<accion>  (cuerpo JSON por POST)
require_once 'config.php';
header('Content-Type: application/json; charset=utf-8');

class Aviso extends Exception {}   // error pensado para mostrarse al usuario

function responder($datos, int $codigo = 200): void {
    http_response_code($codigo);
    echo json_encode($datos, JSON_UNESCAPED_UNICODE);
    exit;
}
function entero($v, string $campo, int $min = 1): int {
    if (!is_numeric($v) || (int)$v != $v || (int)$v < $min)
        throw new Aviso("$campo debe ser un número entero " . ($min >= 1 ? 'mayor que 0' : '(0 o más)'));
    return (int)$v;
}
function texto($v, string $campo, bool $req = false): ?string {
    $v = trim((string)($v ?? ''));
    if ($v === '') { if ($req) throw new Aviso("$campo es obligatorio"); return null; }
    return $v;
}
function fechaValida($v, string $campo): ?string {
    $v = texto($v, $campo);
    if ($v === null) return null;
    $d = DateTime::createFromFormat('Y-m-d', $v);
    if (!$d || $d->format('Y-m-d') !== $v) throw new Aviso("$campo no es una fecha válida");
    return $v;
}
function transaccion(PDO $db, callable $f) {
    $db->beginTransaction();
    try { $r = $f(); $db->commit(); return $r; }
    catch (Throwable $e) { $db->rollBack(); throw $e; }
}

// ---------- CRUD simple (proveedores, materiales, almacenes) ----------
const TABLAS = [
    'proveedores' => ['pk' => 'id_proveedor', 'orden' => 'entidad',
        'campos' => ['entidad', 'representante', 'contacto', 'email', 'direccion', 'fecha', 'comentario'], 'req' => ['entidad']],
    'materiales'  => ['pk' => 'id_material', 'orden' => 'nombre',
        'campos' => ['nombre', 'unidad', 'descripcion'], 'req' => ['nombre', 'unidad']],
    'almacenes'   => ['pk' => 'id_almacen', 'orden' => 'nombre',
        'campos' => ['nombre', 'ubicacion'], 'req' => ['nombre']],
];

function crud(PDO $db, string $tabla, string $a, array $in) {
    $t = TABLAS[$tabla]; $pk = $t['pk'];
    switch ($a) {
        case 'listar':
            return $db->query("SELECT * FROM $tabla ORDER BY {$t['orden']}")->fetchAll();
        case 'guardar':
            $vals = [];
            foreach ($t['campos'] as $c) {
                $vals[$c] = $c === 'fecha' ? fechaValida($in[$c] ?? null, 'La fecha')
                                           : texto($in[$c] ?? null, "El campo $c", in_array($c, $t['req']));
            }
            if (!empty($in[$pk])) {
                $set = implode(', ', array_map(fn($c) => "$c = :$c", $t['campos']));
                $vals[$pk] = entero($in[$pk], 'ID');
                $db->prepare("UPDATE $tabla SET $set WHERE $pk = :$pk")->execute($vals);
            } else {
                $cols = implode(', ', $t['campos']);
                $ph = implode(', ', array_map(fn($c) => ":$c", $t['campos']));
                $db->prepare("INSERT INTO $tabla ($cols) VALUES ($ph)")->execute($vals);
            }
            return ['ok' => true];
        case 'eliminar':
            $db->prepare("DELETE FROM $tabla WHERE $pk = ?")->execute([entero($in['id'] ?? 0, 'ID')]);
            return ['ok' => true];
    }
    throw new Aviso('Acción no válida');
}

// ---------- Inventario ----------
// Cambia el stock de un almacén y devuelve el saldo resultante. Bloquea la fila para evitar errores si dos personas operan a la vez.
function stockCambiar(PDO $db, int $alm, int $mat, int $delta): int {
    $db->prepare('INSERT IGNORE INTO stock (id_almacen, id_material, cantidad) VALUES (?, ?, 0)')->execute([$alm, $mat]);
    $q = $db->prepare('SELECT cantidad FROM stock WHERE id_almacen = ? AND id_material = ? FOR UPDATE');
    $q->execute([$alm, $mat]);
    $actual = $q->fetchColumn();
    if ($actual === false) throw new Aviso('El almacén o el material no existe');
    $nuevo = (int)$actual + $delta;
    if ($nuevo < 0) throw new Aviso("Stock insuficiente: solo hay $actual disponible(s) en este almacén");
    if ($delta !== 0) $db->prepare('UPDATE stock SET cantidad = ? WHERE id_almacen = ? AND id_material = ?')->execute([$nuevo, $alm, $mat]);
    return $nuevo;
}
function registrar(PDO $db, array $d): int {
    $d += ['fecha' => date('Y-m-d H:i:s')];   // la hora siempre la pone PHP, así todos los movimientos usan el mismo reloj
    $cols = array_keys($d);
    $sql = 'INSERT INTO movimientos (' . implode(', ', $cols) . ') VALUES (' . implode(', ', array_map(fn($c) => ":$c", $cols)) . ')';
    $db->prepare($sql)->execute($d);
    return (int)$db->lastInsertId();
}
function buscarSalida(PDO $db, $id): array {
    $q = $db->prepare("SELECT * FROM movimientos WHERE id_movimiento = ? AND tipo = 'salida' FOR UPDATE");
    $q->execute([entero($id, 'Salida')]);
    $s = $q->fetch();
    if (!$s) throw new Aviso('La salida no existe');
    return $s;
}

function inventario(PDO $db, string $a, array $in) {
    switch ($a) {
        case 'stock':
            return $db->query("SELECT s.id_almacen, a.nombre AS almacen, s.id_material, m.nombre AS material, m.unidad, s.cantidad,
                    CAST(COALESCE((SELECT SUM(x.pendiente) FROM movimientos x WHERE x.tipo = 'salida'
                              AND x.id_almacen = s.id_almacen AND x.id_material = s.id_material), 0) AS UNSIGNED) AS en_prestamo
                FROM stock s JOIN almacenes a ON a.id_almacen = s.id_almacen JOIN materiales m ON m.id_material = s.id_material
                ORDER BY a.nombre, m.nombre")->fetchAll();

        case 'salidas_activas':
            return $db->query("SELECT mv.*, m.nombre AS material, m.unidad, a.nombre AS almacen
                FROM movimientos mv JOIN materiales m ON m.id_material = mv.id_material JOIN almacenes a ON a.id_almacen = mv.id_almacen
                WHERE mv.tipo = 'salida' AND mv.pendiente > 0 ORDER BY mv.fecha DESC")->fetchAll();

        case 'kardex':
            $w = []; $p = [];
            foreach (['id_almacen', 'id_material'] as $f) if (!empty($in[$f])) { $w[] = "mv.$f = ?"; $p[] = (int)$in[$f]; }
            if (!empty($in['tipo'])) { $w[] = 'mv.tipo = ?'; $p[] = $in['tipo']; }
            $lim = min(1000, max(1, (int)($in['limite'] ?? 300)));
            $sql = "SELECT mv.*, m.nombre AS material, m.unidad, a.nombre AS almacen, p.entidad AS proveedor
                FROM movimientos mv JOIN materiales m ON m.id_material = mv.id_material JOIN almacenes a ON a.id_almacen = mv.id_almacen
                LEFT JOIN proveedores p ON p.id_proveedor = mv.id_proveedor"
                . ($w ? ' WHERE ' . implode(' AND ', $w) : '') . " ORDER BY mv.fecha DESC, mv.id_movimiento DESC LIMIT $lim";
            $q = $db->prepare($sql); $q->execute($p);
            return $q->fetchAll();

        // Entrada desde fuera (gobierno, donación, compra): suma al stock del almacén
        case 'entrada':
            return transaccion($db, function () use ($db, $in) {
                $alm = entero($in['id_almacen'] ?? 0, 'El almacén');
                $mat = entero($in['id_material'] ?? 0, 'El material');
                $cant = entero($in['cantidad'] ?? 0, 'La cantidad');
                $prov = entero($in['id_proveedor'] ?? 0, 'El proveedor');
                $costo = null;
                if (($in['costo'] ?? '') !== '') {
                    if (!is_numeric($in['costo']) || $in['costo'] < 0) throw new Aviso('El costo no es válido');
                    $costo = (float)$in['costo'];
                }
                $f = fechaValida($in['fecha'] ?? null, 'La fecha');
                $saldo = stockCambiar($db, $alm, $mat, $cant);
                registrar($db, ['tipo' => 'entrada_externa', 'id_almacen' => $alm, 'id_material' => $mat, 'cantidad' => $cant,
                    'saldo' => $saldo, 'id_proveedor' => $prov, 'costo' => $costo,
                    'fecha' => ($f ?? date('Y-m-d')) . ' ' . date('H:i:s'), 'observacion' => texto($in['observacion'] ?? null, '')]);
                return ['ok' => true, 'saldo' => $saldo];
            });

        // Salida del almacén hacia un docente: resta stock y queda "pendiente de devolver"
        case 'salida':
            return transaccion($db, function () use ($db, $in) {
                $alm = entero($in['id_almacen'] ?? 0, 'El almacén');
                $mat = entero($in['id_material'] ?? 0, 'El material');
                $cant = entero($in['cantidad'] ?? 0, 'La cantidad');
                $docente = texto($in['docente'] ?? null, 'El docente', true);
                $nivel = texto($in['nivel'] ?? null, '');
                if ($nivel !== null && !in_array($nivel, ['primario', 'secundario'])) throw new Aviso('Nivel no válido');
                $nest = ($in['num_estudiantes'] ?? '') === '' ? null : entero($in['num_estudiantes'], 'El número de estudiantes');
                $saldo = stockCambiar($db, $alm, $mat, -$cant);
                $id = registrar($db, ['tipo' => 'salida', 'id_almacen' => $alm, 'id_material' => $mat, 'cantidad' => $cant,
                    'saldo' => $saldo, 'pendiente' => $cant, 'docente' => $docente,
                    'sesion_aprendizaje' => texto($in['sesion_aprendizaje'] ?? null, ''), 'grado' => texto($in['grado'] ?? null, ''),
                    'seccion' => texto($in['seccion'] ?? null, ''), 'num_estudiantes' => $nest, 'nivel' => $nivel]);
                return ['ok' => true, 'id' => $id, 'saldo' => $saldo];
            });

        // Retorno (total o parcial): vuelve al stock y se registra como movimiento propio
        case 'retorno':
            return transaccion($db, function () use ($db, $in) {
                $s = buscarSalida($db, $in['id_movimiento'] ?? 0);
                $cant = entero($in['cantidad'] ?? 0, 'La cantidad');
                if ($cant > $s['pendiente']) throw new Aviso("Solo quedan {$s['pendiente']} por devolver en esta salida");
                $saldo = stockCambiar($db, (int)$s['id_almacen'], (int)$s['id_material'], $cant);
                $db->prepare('UPDATE movimientos SET pendiente = pendiente - ? WHERE id_movimiento = ?')->execute([$cant, $s['id_movimiento']]);
                registrar($db, ['tipo' => 'retorno', 'id_almacen' => $s['id_almacen'], 'id_material' => $s['id_material'], 'cantidad' => $cant,
                    'saldo' => $saldo, 'id_salida' => $s['id_movimiento'], 'docente' => $s['docente'],
                    'observacion' => texto($in['observacion'] ?? null, '')]);
                return ['ok' => true, 'saldo' => $saldo];
            });

        // Baja: lo que salió y NO volverá (consumido, perdido, malogrado). No toca el stock.
        case 'baja':
            return transaccion($db, function () use ($db, $in) {
                $s = buscarSalida($db, $in['id_movimiento'] ?? 0);
                $cant = ($in['cantidad'] ?? '') === '' ? (int)$s['pendiente'] : entero($in['cantidad'], 'La cantidad');
                if ($cant > $s['pendiente']) throw new Aviso("Solo quedan {$s['pendiente']} pendientes en esta salida");
                $motivo = texto($in['observacion'] ?? null, 'El motivo', true);
                $saldo = stockCambiar($db, (int)$s['id_almacen'], (int)$s['id_material'], 0);
                $db->prepare('UPDATE movimientos SET pendiente = pendiente - ? WHERE id_movimiento = ?')->execute([$cant, $s['id_movimiento']]);
                registrar($db, ['tipo' => 'baja', 'id_almacen' => $s['id_almacen'], 'id_material' => $s['id_material'], 'cantidad' => $cant,
                    'saldo' => $saldo, 'id_salida' => $s['id_movimiento'], 'docente' => $s['docente'], 'observacion' => $motivo]);
                return ['ok' => true];
            });

        // Ajuste por conteo físico: fija el stock real y deja constancia de la diferencia
        case 'ajuste':
            return transaccion($db, function () use ($db, $in) {
                $alm = entero($in['id_almacen'] ?? 0, 'El almacén');
                $mat = entero($in['id_material'] ?? 0, 'El material');
                $nuevo = entero($in['nuevo_stock'] ?? '', 'El stock real', 0);
                $motivo = texto($in['observacion'] ?? null, 'El motivo', true);
                $actual = stockCambiar($db, $alm, $mat, 0);
                if ($nuevo === $actual) throw new Aviso("El stock ya es $actual, no hay nada que ajustar");
                stockCambiar($db, $alm, $mat, $nuevo - $actual);
                registrar($db, ['tipo' => 'ajuste', 'id_almacen' => $alm, 'id_material' => $mat, 'cantidad' => $nuevo - $actual,
                    'saldo' => $nuevo, 'observacion' => $motivo]);
                return ['ok' => true, 'saldo' => $nuevo];
            });
    }
    throw new Aviso('Acción no válida');
}

// ---------- Enrutador ----------
try {
    try { $db = conectar(); }
    catch (PDOException $e) {
        responder(['error' => 'No se pudo conectar a la base de datos. Abre verificar.php en el navegador para ver qué falla'], 500);
    }
    $r = $_GET['r'] ?? ''; $a = $_GET['a'] ?? '';
    $in = json_decode(file_get_contents('php://input'), true) ?: [];
    if (isset(TABLAS[$r])) responder(crud($db, $r, $a, $in));
    if ($r === 'inventario') responder(inventario($db, $a, $in));
    throw new Aviso('Recurso no válido');
} catch (Aviso $e) {
    responder(['error' => $e->getMessage()], 400);
} catch (PDOException $e) {
    $cod = $e->errorInfo[1] ?? 0;
    if ($cod == 1062) responder(['error' => 'Ya existe un registro con ese nombre'], 400);
    if ($cod == 1451) responder(['error' => 'No se puede eliminar: tiene stock o movimientos asociados'], 400);
    if ($cod == 1452) responder(['error' => 'Alguno de los datos seleccionados no existe'], 400);
    error_log($e->getMessage());
    responder(['error' => 'Error de base de datos'], 500);
} catch (Throwable $e) {
    error_log($e->getMessage());
    responder(['error' => 'Error interno del servidor'], 500);
}
