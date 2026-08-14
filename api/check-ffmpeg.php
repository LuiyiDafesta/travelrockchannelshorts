<?php
/**
 * TravelRock Channel Shorts - Panel de Diagnóstico FFmpeg Premium
 * 
 * Este panel permite auditar si el servidor PHP en producción (Ferozo / DonWeb) 
 * tiene las funciones de ejecución y el binario FFmpeg listos para optimizar videos.
 */

// 1. Manejo de la acción AJAX para pruebas de compresión
if (isset($_GET['action']) && $_GET['action'] === 'test_compress') {
    header('Content-Type: application/json; charset=utf-8');
    
    // Verificar si exec existe
    if (!function_exists('exec')) {
        echo json_encode(["success" => false, "error" => "La función 'exec' no existe en esta versión de PHP."]);
        exit;
    }
    
    // Verificar si exec está deshabilitado
    $disabled = explode(',', ini_get('disable_functions'));
    $disabled = array_map('trim', $disabled);
    if (in_array('exec', $disabled)) {
        echo json_encode(["success" => false, "error" => "La función 'exec' está bloqueada en disable_functions del php.ini."]);
        exit;
    }
    
    // Buscar la ruta de FFmpeg
    $ffmpegPath = null;
    $output = [];
    $return_var = -1;
    @exec('ffmpeg -version 2>&1', $output, $return_var);
    if ($return_var === 0) {
        $ffmpegPath = 'ffmpeg';
    } else {
        $commonPaths = [
            '/usr/bin/ffmpeg',
            '/usr/local/bin/ffmpeg',
            '/usr/bin/ffmpeg6',
            '/usr/local/bin/ffmpeg6',
            '/opt/ffmpeg/bin/ffmpeg',
            '/bin/ffmpeg',
            __DIR__ . '/bin/ffmpeg'
        ];
        foreach ($commonPaths as $path) {
            $output = [];
            $return_var = -1;
            @exec(escapeshellcmd($path) . ' -version 2>&1', $output, $return_var);
            if ($return_var === 0) {
                $ffmpegPath = $path;
                break;
            }
        }
    }
    
    if (!$ffmpegPath) {
        echo json_encode(["success" => false, "error" => "No se encontró ningún binario FFmpeg funcional en el servidor."]);
        exit;
    }
    
    $inputFile = __DIR__ . '/test_sample.mp4';
    $outputFile = __DIR__ . '/test_output.mp4';
    
    if (!file_exists($inputFile)) {
        echo json_encode(["success" => false, "error" => "Archivo de muestra 'test_sample.mp4' no encontrado en el directorio api."]);
        exit;
    }
    
    if (file_exists($outputFile)) {
        @unlink($outputFile);
    }
    
    $startTime = microtime(true);
    
    // Comando de compresión real
    $cmd = escapeshellcmd($ffmpegPath) . ' -y -i ' . escapeshellarg($inputFile) . ' -c:v libx264 -crf 28 -preset fast -vf "scale=-2:\'min(1280,ih)\'" -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart ' . escapeshellarg($outputFile) . ' 2>&1';
    
    $cmdOutput = [];
    $res = -1;
    @exec($cmd, $cmdOutput, $res);
    
    $endTime = microtime(true);
    $timeTaken = round($endTime - $startTime, 2);
    
    if ($res === 0 && file_exists($outputFile) && filesize($outputFile) > 0) {
        $inSize = filesize($inputFile);
        $outSize = filesize($outputFile);
        $reduction = round((($inSize - $outSize) / $inSize) * 100, 1);
        
        // Limpiar archivo de salida del test
        @unlink($outputFile);
        
        echo json_encode([
            "success" => true,
            "ffmpeg" => $ffmpegPath,
            "input_size" => round($inSize / 1024, 1) . " KB",
            "output_size" => round($outSize / 1024, 1) . " KB",
            "reduction" => $reduction . "%",
            "time" => $timeTaken . "s"
        ]);
    } else {
        $errLog = implode("\n", $cmdOutput);
        echo json_encode([
            "success" => false,
            "error" => "Fallo al ejecutar la compresión con FFmpeg.",
            "details" => $errLog
        ]);
    }
    exit;
}

// 2. Obtener datos de diagnóstico de PHP
$execEnabled = function_exists('exec');
$disableFunctions = ini_get('disable_functions');
$disabledArray = array_map('trim', explode(',', $disableFunctions));
$execDisabled = in_array('exec', $disabledArray) || in_array('shell_exec', $disabledArray);
$maxExecTime = ini_get('max_execution_time');
$memoryLimit = ini_get('memory_limit');
$uploadMaxFilesize = ini_get('upload_max_filesize');
$postMaxSize = ini_get('post_max_size');
$phpVersion = PHP_VERSION;
$osName = PHP_OS;

// 3. Escanear rutas de FFmpeg
$pathsToScan = [
    'Global `ffmpeg`' => 'ffmpeg',
    '/usr/bin/ffmpeg' => '/usr/bin/ffmpeg',
    '/usr/local/bin/ffmpeg' => '/usr/local/bin/ffmpeg',
    '/usr/bin/ffmpeg6' => '/usr/bin/ffmpeg6',
    '/usr/local/bin/ffmpeg6' => '/usr/local/bin/ffmpeg6',
    '/opt/ffmpeg/bin/ffmpeg' => '/opt/ffmpeg/bin/ffmpeg',
    '/bin/ffmpeg' => '/bin/ffmpeg',
    'Binario Local `api/bin/ffmpeg`' => __DIR__ . '/bin/ffmpeg'
];

$scanResults = [];
$ffmpegFound = false;
$activeFfmpegPath = '';
$ffmpegVersionInfo = 'No disponible';

if ($execEnabled && !$execDisabled) {
    foreach ($pathsToScan as $label => $cmdPath) {
        $output = [];
        $return_var = -1;
        
        // Ejecutar de forma segura con escape
        $testCmd = ($label === 'Global `ffmpeg`') ? 'ffmpeg' : escapeshellcmd($cmdPath);
        @exec($testCmd . ' -version 2>&1', $output, $return_var);
        
        if ($return_var === 0) {
            $scanResults[$label] = [
                'status' => 'disponible',
                'path' => $cmdPath,
                'version' => !empty($output[0]) ? trim($output[0]) : 'Detectado sin detalles'
            ];
            if (!$ffmpegFound) {
                $ffmpegFound = true;
                $activeFfmpegPath = $cmdPath;
                $ffmpegVersionInfo = implode("\n", array_slice($output, 0, 3));
            }
        } else {
            $scanResults[$label] = [
                'status' => 'no_disponible',
                'path' => $cmdPath,
                'version' => 'No encontrado o ejecución fallida'
            ];
        }
    }
} else {
    foreach ($pathsToScan as $label => $cmdPath) {
        $scanResults[$label] = [
            'status' => 'bloqueado',
            'path' => $cmdPath,
            'version' => 'PHP `exec` está deshabilitado'
        ];
    }
}

$sampleVideoExists = file_exists(__DIR__ . '/test_sample.mp4');
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Auditoría de Compresión FFmpeg - TravelRock Channel</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🛡️</text></svg>">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  
  <style>
    /* Estilos Premium Autocontenidos Aurora Glow */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@700;800;900&display=swap');
    
    :root {
      --bg-dark: #08080a;
      --panel-dark: rgba(17, 17, 24, 0.55);
      --glass-border: rgba(255, 255, 255, 0.05);
      --text-primary: #f3f4f6;
      --text-secondary: #9ca3af;
      --text-muted: #6b7280;
      --neon-pink: #ec4899;
      --neon-purple: #8b5cf6;
      --neon-orange: #f97316;
      --primary-gradient: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%);
      --radius-lg: 16px;
      --radius-md: 12px;
      --radius-sm: 8px;
      --shadow-premium: 0 15px 35px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.05);
      --neon-glow: 0 0 25px rgba(236, 72, 153, 0.2);
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      background-color: var(--bg-dark);
      color: var(--text-primary);
      font-family: 'Inter', sans-serif;
      overflow-x: hidden;
      min-height: 100vh;
      line-height: 1.5;
    }
    
    /* Fondos Ambientales Aurora Glow */
    .aurora-bg {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 0;
      pointer-events: none;
      overflow: hidden;
    }
    
    .aurora-glow {
      position: absolute;
      width: 50vw;
      height: 50vw;
      border-radius: 50%;
      filter: blur(100px);
      opacity: 0.12;
    }
    
    .aurora-glow-1 {
      top: -10vw;
      left: -10vw;
      background: var(--neon-pink);
    }
    
    .aurora-glow-2 {
      bottom: -10vw;
      right: -10vw;
      background: var(--neon-purple);
    }
    
    /* Contenedor Principal */
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px 20px 80px 20px;
      position: relative;
      z-index: 1;
    }
    
    /* Header del Dashboard */
    header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 1px solid var(--glass-border);
      padding-bottom: 30px;
    }
    
    h1 {
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      font-size: 2.3rem;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
    }
    
    .text-gradient {
      background: var(--primary-gradient);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    header p {
      color: var(--text-secondary);
      font-size: 1rem;
    }
    
    /* Layout de Dos Columnas */
    .grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 30px;
    }
    
    @media (min-width: 992px) {
      .grid {
        grid-template-columns: 1.1fr 0.9fr;
      }
    }
    
    /* Tarjetas de Panel */
    .panel {
      background: var(--panel-dark);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-lg);
      padding: 30px;
      box-shadow: var(--shadow-premium);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }
    
    .panel-title {
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-size: 1.3rem;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding-bottom: 12px;
    }
    
    .panel-title i {
      color: var(--neon-pink);
    }
    
    /* Estados y Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 50px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .badge-success {
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #34d399;
    }
    
    .badge-error {
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #f87171;
    }
    
    .badge-warning {
      background: rgba(249, 115, 22, 0.12);
      border: 1px solid rgba(249, 115, 22, 0.3);
      color: #fb923c;
    }
    
    /* Filas de Información */
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px dashed rgba(255, 255, 255, 0.04);
    }
    
    .info-row:last-child {
      border-bottom: none;
    }
    
    .info-label {
      color: var(--text-secondary);
      font-size: 0.9rem;
      font-weight: 500;
    }
    
    .info-value {
      font-family: monospace;
      font-weight: 600;
      font-size: 0.95rem;
    }
    
    .info-value.bold {
      font-family: inherit;
    }
    
    /* Lista de Escaneo de FFmpeg */
    .scan-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 15px;
    }
    
    .scan-item {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-sm);
      padding: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .scan-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    
    .scan-name {
      font-weight: 600;
      font-size: 0.9rem;
    }
    
    .scan-path {
      font-family: monospace;
      color: var(--text-muted);
      font-size: 0.75rem;
      word-break: break-all;
    }
    
    /* Widget de Test de Compresión */
    .test-box {
      text-align: center;
      background: rgba(236, 72, 153, 0.03);
      border: 1px dashed var(--neon-pink);
      border-radius: var(--radius-md);
      padding: 24px;
      margin-bottom: 24px;
    }
    
    .btn-action {
      background: var(--primary-gradient);
      border: none;
      color: white;
      padding: 12px 28px;
      border-radius: 50px;
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-size: 0.95rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: var(--neon-glow);
      transition: all 0.3s ease;
    }
    
    .btn-action:hover {
      transform: translateY(-2px);
      box-shadow: 0 0 35px rgba(236, 72, 153, 0.4);
    }
    
    .btn-action:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
      box-shadow: none !important;
    }
    
    .test-results {
      margin-top: 20px;
      background: rgba(8, 8, 10, 0.6);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-sm);
      padding: 18px;
      text-align: left;
      display: none;
    }
    
    .result-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-top: 10px;
    }
    
    .result-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-sm);
      padding: 10px;
    }
    
    .result-card-label {
      font-size: 0.7rem;
      color: var(--text-muted);
      text-transform: uppercase;
    }
    
    .result-card-val {
      font-family: monospace;
      font-weight: 700;
      font-size: 1rem;
      margin-top: 2px;
      color: var(--neon-pink);
    }
    
    .result-reduction {
      color: #34d399 !important;
    }
    
    /* Caja de Log Consola */
    .log-box {
      margin-top: 20px;
      background: #000;
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-sm);
      padding: 15px;
      font-family: monospace;
      font-size: 0.75rem;
      color: #34d399;
      max-height: 180px;
      overflow-y: auto;
      white-space: pre-wrap;
      text-align: left;
      display: none;
    }
    
    /* Pestañas de la Guía de Ferozo */
    .tabs-wrapper {
      margin-top: 25px;
    }
    
    .tab-buttons {
      display: flex;
      gap: 8px;
      background: rgba(255,255,255,0.03);
      padding: 4px;
      border-radius: 50px;
      border: 1px solid var(--glass-border);
      margin-bottom: 20px;
    }
    
    .tab-btn {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--text-secondary);
      padding: 8px 16px;
      border-radius: 50px;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.8rem;
      transition: all 0.2s;
    }
    
    .tab-btn.active {
      background: var(--primary-gradient);
      color: #fff;
      box-shadow: var(--neon-glow);
    }
    
    .tab-content {
      display: none;
      animation: fadeIn 0.4s ease;
      font-size: 0.85rem;
      color: var(--text-secondary);
      line-height: 1.6;
    }
    
    .tab-content.active {
      display: block;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    ol, ul {
      margin-left: 20px;
      margin-top: 10px;
      margin-bottom: 10px;
    }
    
    li {
      margin-bottom: 6px;
    }
    
    code {
      background: rgba(255, 255, 255, 0.08);
      color: var(--neon-pink);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.85rem;
    }
    
    pre {
      background: #000;
      border: 1px solid var(--glass-border);
      padding: 12px;
      border-radius: var(--radius-sm);
      color: #ccc;
      overflow-x: auto;
      font-size: 0.75rem;
      margin: 10px 0;
    }
    
    .alert-box {
      background: rgba(249, 115, 22, 0.06);
      border: 1px solid rgba(249, 115, 22, 0.2);
      border-radius: var(--radius-sm);
      padding: 15px;
      color: #fb923c;
      font-size: 0.8rem;
      margin-bottom: 15px;
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }
    
    .alert-box i {
      font-size: 1.2rem;
      margin-top: 2px;
    }
  </style>
</head>
<body>

  <!-- Aurora Glow Ambient Background -->
  <div class="aurora-bg">
    <div class="aurora-glow aurora-glow-1"></div>
    <div class="aurora-glow aurora-glow-2"></div>
  </div>

  <div class="container">
    <!-- Header -->
    <header>
      <h1><i class="fa-solid fa-shield-halved text-gradient" style="margin-right: 8px;"></i>Diagnóstico <span class="text-gradient">FFmpeg</span> de Producción</h1>
      <p>Panel de auditoría y verificación para compresión de video en Ferozo PHP</p>
    </header>

    <div class="grid">
      <!-- Columna Izquierda: Auditoría del Sistema -->
      <div style="display: flex; flex-direction: column; gap: 30px;">
        
        <!-- Tarjeta 1: Entorno de PHP -->
        <div class="panel">
          <h2 class="panel-title"><i class="fa-solid fa-server"></i> Estado del Entorno PHP</h2>
          
          <div class="info-row">
            <span class="info-label">Versión de PHP</span>
            <span class="info-value"><?php echo $phpVersion; ?></span>
          </div>
          <div class="info-row">
            <span class="info-label">Sistema Operativo</span>
            <span class="info-value"><?php echo $osName; ?></span>
          </div>
          <div class="info-row">
            <span class="info-label">Funciones de Ejecución (`exec`)</span>
            <span class="info-value">
              <?php if ($execEnabled && !$execDisabled): ?>
                <span class="badge badge-success"><i class="fa-solid fa-check"></i> Habilitado</span>
              <?php else: ?>
                <span class="badge badge-error"><i class="fa-solid fa-triangle-exclamation"></i> Deshabilitado</span>
              <?php endif; ?>
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">Límite de Memoria (`memory_limit`)</span>
            <span class="info-value"><?php echo $memoryLimit; ?></span>
          </div>
          <div class="info-row">
            <span class="info-label">Máx. Tiempo de Ejecución</span>
            <span class="info-value"><?php echo $maxExecTime; ?>s</span>
          </div>
          <div class="info-row">
            <span class="info-label">Carga Máxima de Archivos</span>
            <span class="info-value"><?php echo $uploadMaxFilesize; ?></span>
          </div>
          <div class="info-row">
            <span class="info-label">Funciones Deshabilitadas (disable_functions)</span>
            <span class="info-value bold" style="font-size: 0.75rem; color: var(--text-secondary); max-width: 250px; text-align: right; word-break: break-all;">
              <?php echo $disableFunctions ? str_replace(',', ', ', $disableFunctions) : 'Ninguna'; ?>
            </span>
          </div>
        </div>

        <!-- Tarjeta 2: Escáner de Rutas FFmpeg -->
        <div class="panel">
          <h2 class="panel-title"><i class="fa-solid fa-magnifying-glass"></i> Escáner de Binarios FFmpeg</h2>
          <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 15px;">
            Buscamos el binario FFmpeg en las ubicaciones más comunes del servidor:
          </p>
          
          <div class="scan-list">
            <?php foreach ($scanResults as $name => $res): ?>
              <div class="scan-item">
                <div class="scan-info">
                  <span class="scan-name"><?php echo $name; ?></span>
                  <span class="scan-path"><?php echo $res['path']; ?></span>
                </div>
                <div>
                  <?php if ($res['status'] === 'disponible'): ?>
                    <span class="badge badge-success" title="<?php echo htmlspecialchars($res['version']); ?>"><i class="fa-solid fa-circle-check"></i> Activo</span>
                  <?php elseif ($res['status'] === 'bloqueado'): ?>
                    <span class="badge badge-warning"><i class="fa-solid fa-lock"></i> Bloqueado</span>
                  <?php else: ?>
                    <span class="badge badge-error"><i class="fa-solid fa-circle-xmark"></i> Inactivo</span>
                  <?php endif; ?>
                </div>
              </div>
            <?php endforeach; ?>
          </div>
          
          <?php if ($ffmpegFound): ?>
            <div style="margin-top: 20px; background: rgba(139, 92, 246, 0.05); border: 1px solid rgba(139, 92, 246, 0.15); padding: 15px; border-radius: var(--radius-sm);">
              <h4 style="font-size: 0.85rem; font-family: 'Outfit', sans-serif; color: var(--neon-purple); margin-bottom: 8px;">Ubicación activa elegida:</h4>
              <p style="font-family: monospace; font-size: 0.8rem; color: var(--text-primary); margin-bottom: 6px; word-break: break-all;"><?php echo $activeFfmpegPath; ?></p>
              <pre style="background: rgba(0,0,0,0.4); border:none; margin:0;"><?php echo htmlspecialchars($ffmpegVersionInfo); ?></pre>
            </div>
          <?php else: ?>
            <div class="alert-box" style="margin-top: 20px;">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <div>
                <strong>FFmpeg no detectado</strong><br>
                El servidor PHP no posee FFmpeg en el PATH global ni en directorios comunes. Para habilitarlo, revisa la guía de la derecha.
              </div>
            </div>
          <?php endif; ?>
        </div>

      </div>

      <!-- Columna Derecha: Acciones y Guías de Configuración -->
      <div style="display: flex; flex-direction: column; gap: 30px;">
        
        <!-- Tarjeta 3: Test de Compresión de Video -->
        <div class="panel">
          <h2 class="panel-title"><i class="fa-solid fa-circle-play"></i> Prueba de Compresión en Tiempo Real</h2>
          
          <?php if (!$sampleVideoExists): ?>
            <div class="alert-box" style="background: rgba(239, 68, 68, 0.06); border-color: rgba(239, 68, 68, 0.2); color: #f87171; margin-bottom: 0;">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <div>
                <strong>Falta archivo de prueba</strong><br>
                El video de prueba `api/test_sample.mp4` no existe. Sube el video de muestra al servidor para ejecutar este test.
              </div>
            </div>
          <?php elseif (!$ffmpegFound): ?>
            <div class="test-box" style="border-color: var(--text-muted); background: transparent;">
              <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 15px;">
                Para habilitar el test de compresión en tiempo real, primero debes tener FFmpeg configurado en el servidor.
              </p>
              <button class="btn-action" disabled>
                <span>Ejecutar Test</span>
                <i class="fa-solid fa-play"></i>
              </button>
            </div>
          <?php else: ?>
            <div class="test-box">
              <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 20px;">
                Comprime un video corto de muestra de 61.8 KB aplicando H.264, 720p vertical, CRF 28 y Faststart:
              </p>
              
              <button class="btn-action" id="btn-run-test">
                <span>Ejecutar Test de Compresión</span>
                <i class="fa-solid fa-bolt"></i>
              </button>
              
              <!-- Cargador -->
              <div id="test-loader" style="display: none; margin-top: 15px; font-size: 0.85rem; color: var(--text-secondary);">
                <i class="fa-solid fa-spinner fa-spin" style="color: var(--neon-pink); margin-right: 8px;"></i>
                Procesando video con FFmpeg en servidor...
              </div>
              
              <!-- Resultados -->
              <div class="test-results" id="test-results-container">
                <h4 style="font-family: 'Outfit', sans-serif; font-size: 0.9rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 6px; margin-bottom: 10px;">Resultados:</h4>
                <div class="result-grid">
                  <div class="result-card">
                    <div class="result-card-label">Original</div>
                    <div class="result-card-val" id="res-orig-size">--</div>
                  </div>
                  <div class="result-card">
                    <div class="result-card-label">Optimizado</div>
                    <div class="result-card-val" id="res-opt-size">--</div>
                  </div>
                  <div class="result-card">
                    <div class="result-card-label">Reducción</div>
                    <div class="result-card-val result-reduction" id="res-reduction">--</div>
                  </div>
                  <div class="result-card">
                    <div class="result-card-label">Tiempo de CPU</div>
                    <div class="result-card-val" id="res-time">--</div>
                  </div>
                </div>
                <div style="font-size: 0.75rem; color: #34d399; margin-top: 12px; font-weight: 500; display: flex; align-items: center; gap: 4px;">
                  <i class="fa-solid fa-circle-check"></i> ¡Compresión y faststart aplicados exitosamente!
                </div>
              </div>
              
              <!-- Caja de Logs Consola -->
              <div class="log-box" id="test-logs"></div>
            </div>
          <?php endif; ?>
        </div>

        <!-- Tarjeta 4: Guía Ferozo DonWeb -->
        <div class="panel">
          <h2 class="panel-title"><i class="fa-solid fa-circle-info"></i> Guía de Configuración Ferozo</h2>
          <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 15px;">
            Si tu servidor tiene limitaciones para compresión, aplica estos pasos en tu hosting Ferozo:
          </p>
          
          <div class="tabs-wrapper">
            <div class="tab-buttons">
              <button class="tab-btn active" onclick="switchTab('tab-exec')">1. Habilitar `exec()`</button>
              <button class="tab-btn" onclick="switchTab('tab-binary')">2. Binario Estático</button>
            </div>
            
            <!-- Contenido Pestaña 1: exec -->
            <div class="tab-content active" id="tab-exec">
              <p>Por defecto, algunos planes de Ferozo restringen la ejecución de funciones del sistema. Sigue estos pasos para habilitarlas:</p>
              <ol>
                <li>Ingresa al <strong>Panel de Control Ferozo / Plesk</strong> de tu dominio.</li>
                <li>Ve a la sección <strong>Configuración de PHP</strong> para la versión activa.</li>
                <li>Busca la directiva <code>disable_functions</code>.</li>
                <li>Elimina las funciones <code>exec</code> y <code>shell_exec</code> de la lista de bloqueo. En algunos planes, esto se puede hacer modificando tu archivo <code>.htaccess</code> o <code>.user.ini</code> local en la carpeta raíz agregando:</li>
              </ol>
              <pre>disable_functions = "system,passthru,popen"</pre>
              <p style="margin-top: 8px;"><em>Si no tienes acceso a esta configuración, contacta al soporte de DonWeb solicitando habilitar la ejecución de la función <code>exec</code> para procesos en segundo plano.</em></p>
            </div>
            
            <!-- Contenido Pestaña 2: binario estático -->
            <div class="tab-content" id="tab-binary">
              <p>Si la función <code>exec</code> está habilitada pero FFmpeg no está instalado globalmente en el sistema Linux de Ferozo, puedes subir un binario local:</p>
              <ol>
                <li>Descarga el ejecutable estático de FFmpeg para Linux x86_64 desde una fuente confiable (ej. <a href="https://johnvansickle.com/ffmpeg/" target="_blank" style="color:var(--neon-pink);">John Van Sickle Releases</a>).</li>
                <li>Descomprime el archivo y extrae únicamente el ejecutable llamado <code>ffmpeg</code>.</li>
                <li>Crea un directorio llamado <code>bin</code> dentro de tu carpeta <code>api</code> en el servidor Ferozo (quedando <code>api/bin/</code>).</li>
                <li>Sube el ejecutable <code>ffmpeg</code> allí (ruta final: <code>api/bin/ffmpeg</code>).</li>
                <li>Dale permisos de ejecución (chmod 755 o 777) a través del Administrador de Archivos de Ferozo o por FTP.</li>
              </ol>
              <p style="margin-top: 10px; font-weight: 500;">¡Listo! El backend detectará automáticamente esta ubicación y optimizará tus videos.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>

  <script>
    // Cambio de pestañas
    function switchTab(tabId) {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
      
      const activeBtn = Array.from(document.querySelectorAll('.tab-btn')).find(btn => btn.getAttribute('onclick').includes(tabId));
      if (activeBtn) activeBtn.classList.add('active');
      
      const activeContent = document.getElementById(tabId);
      if (activeContent) activeContent.classList.add('active');
    }
    
    // Ejecutar test de compresión
    const btnRunTest = document.getElementById('btn-run-test');
    if (btnRunTest) {
      btnRunTest.addEventListener('click', () => {
        btnRunTest.disabled = true;
        document.getElementById('test-loader').style.display = 'block';
        document.getElementById('test-results-container').style.display = 'none';
        document.getElementById('test-logs').style.display = 'none';
        
        fetch('check-ffmpeg.php?action=test_compress')
          .then(res => res.json())
          .then(data => {
            btnRunTest.disabled = false;
            document.getElementById('test-loader').style.display = 'none';
            
            if (data.success) {
              document.getElementById('res-orig-size').textContent = data.input_size;
              document.getElementById('res-opt-size').textContent = data.output_size;
              document.getElementById('res-reduction').textContent = '-' + data.reduction;
              document.getElementById('res-time').textContent = data.time;
              document.getElementById('test-results-container').style.display = 'block';
            } else {
              document.getElementById('test-logs').textContent = 'Error: ' + data.error + '\n\nDetalles del Log:\n' + (data.details || 'No hay detalles de consola.');
              document.getElementById('test-logs').style.display = 'block';
            }
          })
          .catch(err => {
            btnRunTest.disabled = false;
            document.getElementById('test-loader').style.display = 'none';
            document.getElementById('test-logs').textContent = 'Fallo crítico al conectar con el servidor: ' + err.message;
            document.getElementById('test-logs').style.display = 'block';
          });
      });
    }
  </script>
</body>
</html>
