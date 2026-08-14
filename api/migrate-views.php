<?php
/**
 * Migración: Agregar columna 'views' a la tabla 'videos' en Supabase.
 * Ejecutar UNA SOLA VEZ visitando: /api/migrate-views.php?key=tr_ferozo_deploy_2026
 */
header('Content-Type: application/json');

$key = $_GET['key'] ?? '';
if ($key !== 'tr_ferozo_deploy_2026') {
    http_response_code(403);
    echo json_encode(['error' => 'Clave inválida']);
    exit;
}

$supabaseUrl = 'https://qtrcutddajulnwyzdwtc.supabase.co';
$serviceKey = getenv('SUPABASE_SERVICE_KEY');

// Intentar leer la key del .env si no está en variables de entorno
if (!$serviceKey) {
    $envFile = __DIR__ . '/.env';
    if (file_exists($envFile)) {
        $envContent = file_get_contents($envFile);
        if (preg_match('/SUPABASE_SERVICE_KEY=(.+)/', $envContent, $m)) {
            $serviceKey = trim($m[1]);
        }
    }
}

if (!$serviceKey) {
    // Usar la anon key como fallback (necesita permisos de ALTER en RLS)
    $serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0cmN1dGRkYWp1bG53eXpkd3RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NjE2MTYsImV4cCI6MjA5NTAzNzYxNn0.d7Pfif2JYI9UJzNdDUAtFTEoYFGWmwFQuCq_b3ZNIWM';
}

// Ejecutar la migración vía Supabase REST API (rpc o query directo)
// Primero intentamos agregar la columna usando PATCH en un registro existente
// Si la columna no existe, el PATCH fallará y sabremos que necesitamos crearla

// Paso 1: Verificar si la columna ya existe intentando leer un video
$ch = curl_init("$supabaseUrl/rest/v1/videos?select=views&limit=1");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        "apikey: $serviceKey",
        "Authorization: Bearer $serviceKey",
    ],
]);
$result = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200) {
    echo json_encode([
        'status' => 'ok',
        'message' => 'La columna views ya existe en la tabla videos.',
        'sample' => json_decode($result)
    ]);
} else {
    echo json_encode([
        'status' => 'needs_manual',
        'message' => 'La columna views NO existe. Ejecuta este SQL en el Dashboard de Supabase (SQL Editor):',
        'sql' => 'ALTER TABLE videos ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;',
        'instructions' => 'Ve a https://supabase.com/dashboard → tu proyecto → SQL Editor → pega el SQL y ejecuta.'
    ]);
}
