<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method Not Allowed. Use POST."]);
    exit;
}

// Read JSON input
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || !isset($data['id']) || !isset($data['title'])) {
    http_response_code(400);
    echo json_encode(["error" => "Missing required parameters (id, title)"]);
    exit;
}

$id = isset($data['id']) ? trim((string)$data['id']) : '';

// Validar que $id contenga exclusivamente caracteres alfanuméricos seguros
if (!preg_match('/^[a-zA-Z0-9_-]+$/', $id) || strlen($id) > 64) {
    http_response_code(400);
    echo json_encode(["error" => "Parámetro ID no válido o inseguro."]);
    exit;
}

$cleanId = basename($id);
$videoUrl = isset($data['videoUrl']) ? filter_var($data['videoUrl'], FILTER_SANITIZE_URL) : '';
$thumbnailUrl = isset($data['thumbnailUrl']) ? filter_var($data['thumbnailUrl'], FILTER_SANITIZE_URL) : '';

if ($videoUrl) {
    $videoUrl = preg_replace('/https:\/\/(f004\.backblazeb2\.com\/file|media\.supertourchannel\.com\.ar)\//', 'https://media.travelrockchannel.com.ar/', $videoUrl);
}
if ($thumbnailUrl) {
    $thumbnailUrl = preg_replace('/https:\/\/(f004\.backblazeb2\.com\/file|media\.supertourchannel\.com\.ar)\//', 'https://media.travelrockchannel.com.ar/', $thumbnailUrl);
}

$title = isset($data['title']) ? trim((string)$data['title']) : 'Momento';
$school = isset($data['school']) ? trim((string)$data['school']) : 'TravelRock';
$description = isset($data['description']) ? trim((string)$data['description']) : '';

$sanitizedTitle = htmlspecialchars($title, ENT_QUOTES | ENT_HTML5, 'UTF-8');
$sanitizedSchool = htmlspecialchars($school, ENT_QUOTES | ENT_HTML5, 'UTF-8');
$sanitizedDesc = htmlspecialchars($description, ENT_QUOTES | ENT_HTML5, 'UTF-8');
$sanitizedThumb = htmlspecialchars($thumbnailUrl, ENT_QUOTES | ENT_HTML5, 'UTF-8');
$sanitizedShortId = htmlspecialchars($cleanId, ENT_QUOTES | ENT_HTML5, 'UTF-8');
$jsSafeId = json_encode($cleanId);

$html = '<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>' . $sanitizedTitle . ' | TravelRock Channel</title>
  
  <!-- SEO Meta Tags -->
  <meta name="description" content="' . ($sanitizedDesc ? $sanitizedDesc : 'Mira este increíble momento en TravelRock Channel Shorts.') . '">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="video.other">
  <meta property="og:title" content="' . $sanitizedTitle . ' - ' . $sanitizedSchool . '">
  <meta property="og:description" content="' . ($sanitizedDesc ? $sanitizedDesc : 'Mira este increíble momento en TravelRock Channel Shorts.') . '">
  <meta property="og:image" content="' . $sanitizedThumb . '">
  <meta property="og:url" content="https://shorts.travelrockchannel.com.ar/shorts/' . $sanitizedShortId . '.html">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="' . $sanitizedTitle . ' - ' . $sanitizedSchool . '">
  <meta name="twitter:description" content="' . ($sanitizedDesc ? $sanitizedDesc : 'Mira este increíble momento en TravelRock Channel Shorts.') . '">
  <meta name="twitter:image" content="' . $sanitizedThumb . '">
  
  <!-- Redirección dinámica a la App con ID del Short -->
  <script>
    window.location.href = "../index.html?short=" + encodeURIComponent(' . $jsSafeId . ');
  </script>
</head>
<body style="background:#08080a; color:#fff; display:flex; align-items:center; justify-content:center; height:100vh; font-family:system-ui, -apple-system, sans-serif;">
  <div style="text-align:center; padding:20px;">
    <h2 style="font-size:1.4rem; margin-bottom:8px; font-weight:700;">TravelRock Channel Shorts</h2>
    <p style="color:#9ca3af; font-size:0.9rem;">Redirigiendo al momento seleccionado...</p>
  </div>
</body>
</html>';

$shortsDir = dirname(__DIR__) . '/shorts';
if (!file_exists($shortsDir)) {
    if (!mkdir($shortsDir, 0755, true)) {
        http_response_code(500);
        echo json_encode(["error" => "No se pudo crear el directorio de shorts en el servidor."]);
        exit;
    }
}

$realShortsDir = str_replace('\\', '/', realpath($shortsDir));
$filePath = $realShortsDir . '/' . $cleanId . '.html';
$fileDir = str_replace('\\', '/', dirname($filePath));

// Doble comprobación: asegurarse de que el archivo final esté dentro de la carpeta shorts
if ($fileDir !== $realShortsDir) {
    http_response_code(403);
    echo json_encode(["error" => "Ruta de archivo no autorizada."]);
    exit;
}

if (file_put_contents($filePath, $html, LOCK_EX) === false) {
    http_response_code(500);
    echo json_encode(["error" => "Fallo al escribir la página SEO: " . $cleanId . ".html"]);
    exit;
}

echo json_encode([
    "success" => true,
    "file" => "/shorts/" . $cleanId . ".html"
]);
