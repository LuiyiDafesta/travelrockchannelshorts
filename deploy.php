<?php
/**
 * TravelRock Channel Shorts - Script de Despliegue Continuo Seguro para Hosting Ferozo (PHP)
 * 
 * Este script automatiza la descarga de cambios del repositorio GitHub directamente 
 * en el directorio raíz de tu servidor Ferozo (Apache / PHP) mediante una petición HTTP segura.
 * 
 * Procedimiento de configuración en Ferozo:
 * 1. Sube este archivo (deploy.php) al directorio raíz (public_html o similar) de tu Ferozo.
 * 2. Asegúrate de que la carpeta del servidor sea un repositorio de git inicializado que
 *    apunte a tu origen ('git remote add origin https://github.com/LuiyiDafesta/travelrockchannelshorts.git').
 * 3. Configura un Webhook en tu repositorio de GitHub apuntando a:
 *    https://tudominio.com.ar/deploy.php?key=tr_ferozo_deploy_2026
 *    o simplemente visítalo desde el navegador para forzar la actualización instantánea.
 */

// Establecer cabeceras y límites
header("Content-Type: text/plain; charset=utf-8");
header("Cache-Control: no-cache, must-revalidate");
set_time_limit(180); // Ferozo puede tardar un poco en completar el pull

// 1. CLAVE DE SEGURIDAD (Previene que usuarios externos disparen actualizaciones maliciosas)
$secretKey = 'tr_ferozo_deploy_2026';
if (!isset($_GET['key']) || $_GET['key'] !== $secretKey) {
    http_response_code(403);
    die("Error 403: Acceso denegado. Clave de seguridad inválida o no proporcionada.\n");
}

echo "========================================================\n";
echo "  TRAVELROCK SHORTS - MOTOR DE DESPLIEGUE EN FEROZO PHP \n";
echo "========================================================\n";
echo "Inicio de ejecución: " . date('Y-m-d H:i:s') . "\n\n";

// 2. VERIFICACIÓN DE ENTORNO GIT
if (!is_dir('.git')) {
    http_response_code(500);
    die("Error crítico: El directorio raíz no está inicializado como un repositorio Git (.git no encontrado).\n");
}

// 3. COMANDOS DE DESPLIEGUE SECUENCIALES
$commands = [
    ['cmd' => 'git status', 'desc' => 'Verificando estado actual...'],
    ['cmd' => 'git reset --hard HEAD', 'desc' => 'Descartando cambios locales en servidor (seguridad)...'],
    ['cmd' => 'git pull origin main', 'desc' => 'Descargando y aplicando últimos cambios de producción...'],
    ['cmd' => 'git status', 'desc' => 'Verificando estado consolidado final...']
];

$success = true;
foreach ($commands as $step) {
    $cmd = $step['cmd'];
    $desc = $step['desc'];
    echo "[PASO] > $desc\n";
    echo "$ > $cmd\n";
    
    $output = [];
    $returnVar = 0;
    
    // Ejecutar el comando redirigiendo el error standard para ver toda la respuesta
    exec($cmd . ' 2>&1', $output, $returnVar);
    
    echo implode("\n", $output) . "\n";
    
    if ($returnVar !== 0) {
        echo "❌ [FALLO] Error en paso: $cmd (Código de salida: $returnVar)\n\n";
        $success = false;
        break;
    }
    echo "✅ [ÉXITO] Paso completado.\n\n";
}

// 4. LIMPIEZA DE OPCACHE EN FEROZO
if ($success) {
    echo "[PASO] > Purgando OPcache para asegurar que Ferozo recargue scripts PHP instantáneamente...\n";
    if (function_exists('opcache_reset')) {
        if (opcache_reset()) {
            echo "✅ [ÉXITO] Caché de OPcode de Ferozo purgada con éxito.\n";
        } else {
            echo "⚠️ [ADVERTENCIA] No se pudo purgar OPcache (función deshabilitada o inactiva).\n";
        }
    } else {
        echo "ℹ️ OPcache no está activo en esta versión de PHP de Ferozo.\n";
    }
}

echo "\n========================================================\n";
if ($success) {
    echo "🎉 ¡DESPLIEGUE FINALIZADO CON TOTAL ÉXITO EN FEROZO PHP! 🎉\n";
    echo "Los Shorts con Ambilight, buffer agresivo y likes persistentes están listos.\n";
} else {
    http_response_code(500);
    echo "❌ EL DESPLIEGUE FALLÓ. Por favor revisa los logs de arriba.\n";
}
echo "========================================================\n";
