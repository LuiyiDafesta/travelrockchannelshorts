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

// 1. Backblaze B2 Configuration
$bucketId = '72b91a4198da584e9cee081c';
$keyId = '00429a18a8ece8c0000000003';
$applicationKey = 'K004eR5sm0qof1iDJQ5nqpqsX+O+Dg8';

// 2. Validate Uploaded Files
if (!isset($_FILES['video']) || $_FILES['video']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    $errorMsg = isset($_FILES['video']) ? "Upload error code: " . $_FILES['video']['error'] : "Missing video file.";
    echo json_encode(["error" => "No video file received.", "details" => $errorMsg]);
    exit;
}

$videoFile = $_FILES['video'];
$videoName = preg_replace('/[^a-zA-Z0-9.]/', '_', $videoFile['name']);
$videoBase = pathinfo($videoName, PATHINFO_FILENAME);
$timestamp = time();

// Read video contents
$videoData = file_get_contents($videoFile['tmp_name']);
if ($videoData === false) {
    http_response_code(500);
    echo json_encode(["error" => "Failed to read uploaded video data."]);
    exit;
}

// Read thumbnail (if provided by client-side canvas extraction)
$hasThumbnail = false;
$thumbData = null;
if (isset($_FILES['thumbnail']) && $_FILES['thumbnail']['error'] === UPLOAD_ERR_OK) {
    $thumbData = file_get_contents($_FILES['thumbnail']['tmp_name']);
    if ($thumbData !== false) {
        $hasThumbnail = true;
    }
}

// Fallback blank pixel thumbnail if client failed to extract one
if (!$hasThumbnail) {
    // 1x1 grey Jpeg pixel
    $thumbData = base64_decode('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=');
    $hasThumbnail = true;
}

try {
    // 3. Authorize B2 Account
    $credentials = base64_encode("$keyId:$applicationKey");
    $ch = curl_init("https://api.backblazeb2.com/b2api/v3/b2_authorize_account");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Basic $credentials",
        "User-Agent: B2-PHP-Uploader"
    ]);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($status !== 200) {
        throw new Exception("B2 Auth failed (Status $status): $response");
    }

    $authData = json_decode($response, true);
    $authToken = $authData['authorizationToken'];
    $apiUrl = isset($authData['apiUrl']) ? $authData['apiUrl'] : $authData['apiInfo']['storageApi']['apiUrl'];

    // 4. Get Upload URL
    $ch = curl_init("$apiUrl/b2api/v3/b2_get_upload_url");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: $authToken",
        "Content-Type: application/json",
        "User-Agent: B2-PHP-Uploader"
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode(["bucketId" => $bucketId]));
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($status !== 200) {
        throw new Exception("B2 Get Upload URL failed (Status $status): $response");
    }

    $uploadData = json_decode($response, true);
    $uploadUrl = $uploadData['uploadUrl'];
    $uploadToken = $uploadData['authorizationToken'];

    // 5. Upload Video
    $b2VideoName = "shorts/{$timestamp}_{$videoBase}.mp4";
    $videoUrl = uploadToB2($uploadUrl, $uploadToken, $videoData, $b2VideoName, 'video/mp4');

    // 6. Upload Thumbnail
    $b2ThumbName = "thumbnails/{$timestamp}_{$videoBase}.jpg";
    $thumbnailUrl = uploadToB2($uploadUrl, $uploadToken, $thumbData, $b2ThumbName, 'image/jpeg');

    // 7. Return Public URLs
    echo json_encode([
        "videoUrl" => $videoUrl,
        "thumbnailUrl" => $thumbnailUrl
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "error" => "B2 processing or upload failed.",
        "details" => $e->getMessage()
    ]);
}

// B2 Upload Helper using cURL
function uploadToB2($uploadUrl, $uploadToken, $fileData, $fileName, $contentType) {
    $ch = curl_init($uploadUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: $uploadToken",
        "X-Bz-File-Name: " . rawurlencode($fileName),
        "Content-Type: $contentType",
        "Content-Length: " . strlen($fileData),
        "X-Bz-Content-Sha1: do_not_verify",
        "User-Agent: B2-PHP-Uploader"
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $fileData);
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($status !== 200) {
        throw new Exception("Upload of $fileName failed with status $status: $response");
    }

    return "https://f004.backblazeb2.com/file/TravelShorts/" . $fileName;
}
