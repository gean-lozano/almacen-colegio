<?php
// Página de diagnóstico: abre http://localhost/almacen-colegio/verificar.php
require_once 'config.php';
header('Content-Type: text/html; charset=utf-8');
$pasos = []; $todoOk = true;
function paso($ok, $titulo, $ayuda = '') {
    global $pasos, $todoOk;
    if (!$ok) $todoOk = false;
    $pasos[] = [$ok, $titulo, $ayuda];
}

paso(version_compare(PHP_VERSION, '7.4.0', '>='), 'PHP ' . PHP_VERSION . ' (se necesita 7.4 o superior)',
     'Instala una versión más nueva de XAMPP: https://www.apachefriends.org');
paso(extension_loaded('pdo_mysql'), 'Extensión pdo_mysql activada',
     'En XAMPP: Config de Apache > php.ini > quita el ; de la línea extension=pdo_mysql y reinicia Apache.');

$db = null;
try {
    $db = conectar();
    paso(true, 'Conexión a MySQL y a la base "' . DB_NAME . '"');
} catch (Throwable $e) {
    $c = (int)$e->getCode();
    if ($c === 2002 || $c === 2006) $ayuda = 'MySQL está apagado. En el panel de XAMPP pulsa "Start" en la fila de MySQL.';
    elseif ($c === 1045) $ayuda = 'Usuario o contraseña incorrectos. Corrige DB_USER y DB_PASS en config.php (en XAMPP: usuario root y contraseña vacía; con Docker: la clave está en el archivo .env).';
    elseif ($c === 1049) $ayuda = 'La base "' . DB_NAME . '" no existe. Créala en phpMyAdmin (paso 4 de INSTALAR.html) con ESE nombre exacto.';
    else $ayuda = 'Detalle técnico: ' . $e->getMessage();
    paso(false, 'Conexión a MySQL y a la base "' . DB_NAME . '"', $ayuda);
}

if ($db) {
    $necesarias = ['proveedores', 'materiales', 'almacenes', 'stock', 'movimientos'];
    $existentes = $db->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
    $faltan = array_diff($necesarias, $existentes);
    paso(!$faltan, 'Tablas creadas (' . implode(', ', $necesarias) . ')',
         'Faltan: ' . implode(', ', $faltan) . '. En phpMyAdmin entra a la base "' . DB_NAME . '", pestaña Importar, y sube database.sql (paso 5).');
    if (!$faltan) {
        $n = (int)$db->query('SELECT COUNT(*) FROM almacenes')->fetchColumn();
        paso($n > 0, 'Hay al menos un almacén registrado', 'Entra al sistema, menú Almacenes, y crea uno (por ejemplo "Sala de Cómputo").');
        $motor = $db->query("SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock'")->fetchColumn();
        paso($motor === 'InnoDB', 'Motor de tablas InnoDB (' . $motor . ')', 'Vuelve a importar database.sql en una base vacía.');
    }
}
?>
<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><title>Verificar instalación</title>
<style>
body{font-family:Segoe UI,Ubuntu,sans-serif;max-width:680px;margin:30px auto;padding:0 16px;color:#222}
.p{display:flex;gap:12px;padding:12px 14px;margin:8px 0;border-radius:8px;background:#f3f5f7}
.p.ok{background:#e3f4ea}.p.mal{background:#fde8ea}.ic{font-size:20px}.ay{margin-top:4px;color:#7a1f28;font-size:14px}
.fin{padding:16px;border-radius:8px;margin-top:20px;font-size:18px}.fin.ok{background:#198754;color:#fff}.fin.ok a{color:#fff}
</style></head><body>
<h1>Verificar instalación</h1>
<?php foreach ($pasos as [$ok, $t, $ay]): ?>
  <div class="p <?= $ok ? 'ok' : 'mal' ?>"><span class="ic"><?= $ok ? '✅' : '❌' ?></span>
    <div><?= htmlspecialchars($t) ?><?php if (!$ok): ?><div class="ay">👉 <?= htmlspecialchars($ay) ?></div><?php endif; ?></div></div>
<?php endforeach; ?>
<?php if ($todoOk): ?>
  <div class="fin ok">¡Todo listo! 🎉 <a href="index.html">Abrir el sistema</a></div>
<?php else: ?>
  <p>Corrige lo marcado con ❌ y recarga esta página (F5).</p>
<?php endif; ?>
</body></html>
