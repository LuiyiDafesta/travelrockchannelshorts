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

$id = $data['id'];
$videoUrl = isset($data['videoUrl']) ? str_replace('https://f004.backblazeb2.com/file/', 'https://media.travelrockchannel.com.ar/', $data['videoUrl']) : '';
$thumbnailUrl = isset($data['thumbnailUrl']) ? str_replace('https://f004.backblazeb2.com/file/', 'https://media.travelrockchannel.com.ar/', $data['thumbnailUrl']) : '';
$title = $data['title'];
$school = isset($data['school']) ? $data['school'] : '';
$description = isset($data['description']) ? $data['description'] : '';

$sanitizedTitle = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');
$sanitizedSchool = htmlspecialchars($school, ENT_QUOTES, 'UTF-8');
$sanitizedDesc = htmlspecialchars($description, ENT_QUOTES, 'UTF-8');

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
  <meta property="og:image" content="' . $thumbnailUrl . '">
  <meta property="og:url" content="https://shorts.travelrockchannel.com.ar/shorts/' . $id . '.html">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="' . $sanitizedTitle . ' - ' . $sanitizedSchool . '">
  <meta name="twitter:description" content="' . ($sanitizedDesc ? $sanitizedDesc : 'Mira este increíble momento en TravelRock Channel Shorts.') . '">
  <meta name="twitter:image" content="' . $thumbnailUrl . '">
  
  <!-- Redirección dinámica 301 a la App con ID del Short -->
  <script>
    window.location.href = "../index.html?short=' . $id . '";
  </script>
</head>
<body style="background:#000; color:#fff; display:flex; align-items:center; justify-content:center; height:100vh; font-family:sans-serif;">
  <div style="text-align:center;">
    <p>Redirigiendo a TravelRock Channel Shorts...</p>
  </div>
</body>
</html>';

$shortsDir = __DIR__ . '/../shorts';
if (!file_exists($shortsDir)) {
    if (!mkdir($shortsDir, 0755, true)) {
        http_response_code(500);
        echo json_encode(["error" => "Failed to create shorts folder on server."]);
        exit;
    }
}

$filePath = $shortsDir . '/' . $id . '.html';
if (file_put_contents($filePath, $html) === false) {
    http_response_code(500);
    echo json_encode(["error" => "Failed to write SEO page: " . $id . ".html"]);
    exit;
}

echo json_encode([
    "success" => true,
    "file" => "/shorts/" . $id . ".html"
]);
