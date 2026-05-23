const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { exec } = require('child_process');

const PORT = 8080;
const PUBLIC_DIR = path.join(__dirname, '..');

// Backblaze B2 Configuration
const B2_BUCKET_ID = '72b91a4198da584e9cee081c';
const B2_KEY_ID = '00429a18a8ece8c0000000003';
const B2_APPLICATION_KEY = 'K004eR5sm0qof1iDJQ5nqpqsX+O+Dg8';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.ico': 'image/x-icon'
};

// Helper for Backblaze B2 uploads
async function uploadToB2(fileBuffer, fileName, contentType) {
  // 1. Authorize B2 Account
  const authHeader = 'Basic ' + Buffer.from(`${B2_KEY_ID}:${B2_APPLICATION_KEY}`).toString('base64');
  
  const authResponse = await new Promise((resolve, reject) => {
    const req = https.get('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', {
      headers: { 'Authorization': authHeader }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) resolve(JSON.parse(data));
        else reject(new Error(`B2 Auth failed: ${res.statusCode} ${data}`));
      });
    });
    req.on('error', reject);
  });

  const { authorizationToken } = authResponse;
  const apiUrl = authResponse.apiInfo.storageApi.apiUrl;

  // 2. List buckets to find the bucketName matching the bucketId
  const bucketsResponse = await new Promise((resolve, reject) => {
    const url = new URL(`${apiUrl}/b2api/v3/b2_list_buckets`);
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Authorization': authorizationToken,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) resolve(JSON.parse(data));
        else reject(new Error(`B2 List Buckets failed: ${res.statusCode} ${data}`));
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify({ accountId: authResponse.accountId }));
    req.end();
  });

  const bucket = bucketsResponse.buckets.find(b => b.bucketId === B2_BUCKET_ID);
  if (!bucket) {
    throw new Error(`B2 Bucket with ID ${B2_BUCKET_ID} not found in the account.`);
  }
  const bucketName = bucket.bucketName;

  // 3. Get Upload URL
  const uploadUrlResponse = await new Promise((resolve, reject) => {
    const url = new URL(`${apiUrl}/b2api/v3/b2_get_upload_url`);
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Authorization': authorizationToken,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) resolve(JSON.parse(data));
        else reject(new Error(`B2 Get Upload URL failed: ${res.statusCode} ${data}`));
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify({ bucketId: B2_BUCKET_ID }));
    req.end();
  });

  const { uploadUrl, authorizationToken: uploadToken } = uploadUrlResponse;

  // 4. Upload File
  const uploadResponse = await new Promise((resolve, reject) => {
    const url = new URL(uploadUrl);
    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Authorization': uploadToken,
        'X-Bz-File-Name': encodeURIComponent(fileName),
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length,
        'X-Bz-Content-Sha1': 'do_not_verify'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) resolve(JSON.parse(data));
        else reject(new Error(`B2 Upload failed: ${res.statusCode} ${data}`));
      });
    });
    req.on('error', reject);
    req.write(fileBuffer);
    req.end();
  });

  // Construct public friendly download URL
  return `https://f004.backblazeb2.com/file/${bucketName}/${fileName}`;
}

// Handle Local Video Compression and B2 Upload
function handleVideoUpload(req, res) {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const originalFileName = parsedUrl.searchParams.get('name') || `video_${Date.now()}.mp4`;
  const sanitizedBase = originalFileName.replace(/[^a-zA-Z0-9.]/g, '_').split('.')[0];
  
  const timestamp = Date.now();
  const rawFilePath = path.join(__dirname, `temp_raw_${timestamp}.mp4`);
  const compressedFilePath = path.join(__dirname, `temp_compressed_${timestamp}.mp4`);
  const thumbFilePath = path.join(__dirname, `temp_thumb_${timestamp}.jpg`);

  const writeStream = fs.createWriteStream(rawFilePath);
  
  req.pipe(writeStream);

  writeStream.on('finish', () => {
    console.log(`Temp file saved to: ${rawFilePath}. Starting compression...`);
    
    // 1. Convert video strictly for web playback (H.264, web-optimized, vertical scaled, faststart metadata)
    // scale=-2:'min(1080,ih)' preserves orientation, ensures even dimensions, and limits height to 1080p for web
    const compressCmd = `ffmpeg -y -i "${rawFilePath}" -c:v libx264 -crf 23 -preset medium -vf "scale=-2:'min(1080,ih)'" -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "${compressedFilePath}"`;
    
    exec(compressCmd, (err, stdout, stderr) => {
      if (err) {
        console.error("FFmpeg Compression failed:", err, stderr);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Video compression failed.', details: err.message }));
        cleanupFiles([rawFilePath]);
        return;
      }
      
      console.log('Video compressed successfully! Extracting thumbnail...');
      
      // 2. Extract thumbnail frame at 1.5 seconds
      const thumbCmd = `ffmpeg -y -ss 00:00:01.5 -i "${compressedFilePath}" -vframes 1 -q:v 2 "${thumbFilePath}"`;
      
      exec(thumbCmd, async (tErr, tStdout, tStderr) => {
        if (tErr) {
          console.error("FFmpeg Thumbnail extraction failed:", tErr, tStderr);
          // Fallback thumbnail extracting at 0 seconds if 1.5 fails
          const fallbackCmd = `ffmpeg -y -i "${compressedFilePath}" -vframes 1 -q:v 2 "${thumbFilePath}"`;
          await new Promise(r => exec(fallbackCmd, r));
        }
        
        console.log('Thumbnail generated! Uploading to Backblaze B2...');
        
        try {
          // Read files into Buffers
          const videoBuffer = fs.readFileSync(compressedFilePath);
          const thumbBuffer = fs.readFileSync(thumbFilePath);
          
          const b2VideoName = `shorts/${timestamp}_${sanitizedBase}.mp4`;
          const b2ThumbName = `thumbnails/${timestamp}_${sanitizedBase}.jpg`;
          
          // Parallel Upload to B2
          const [videoUrl, thumbnailUrl] = await Promise.all([
            uploadToB2(videoBuffer, b2VideoName, 'video/mp4'),
            uploadToB2(thumbBuffer, b2ThumbName, 'image/jpeg')
          ]);
          
          console.log('B2 Upload complete! Public URLs:');
          console.log(`Video:     ${videoUrl}`);
          console.log(`Thumbnail: ${thumbnailUrl}`);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ videoUrl, thumbnailUrl }));
          
        } catch (uploadErr) {
          console.error("B2 Upload failed:", uploadErr);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Uploading to Backblaze B2 failed.', details: uploadErr.message }));
        } finally {
          // Cleanup all local temp files
          cleanupFiles([rawFilePath, compressedFilePath, thumbFilePath]);
        }
      });
    });
  });

  writeStream.on('error', (err) => {
    console.error("Write stream error:", err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Saving temporary upload file failed.' }));
    cleanupFiles([rawFilePath]);
  });
}

function cleanupFiles(paths) {
  paths.forEach(p => {
    fs.exists(p, (exists) => {
      if (exists) fs.unlink(p, () => {});
    });
  });
}

const SHORTS_DIR = path.join(PUBLIC_DIR, 'shorts');
if (!fs.existsSync(SHORTS_DIR)) {
  fs.mkdirSync(SHORTS_DIR, { recursive: true });
}

// Write a static redirection page with Open Graph metadata for WhatsApp and red social previews
function writeSeoPage(id, videoUrl, thumbnailUrl, title, school, description) {
  const sanitizedTitle = title ? title.replace(/"/g, '&quot;') : '';
  const sanitizedSchool = school ? school.replace(/"/g, '&quot;') : '';
  const sanitizedDesc = description ? description.replace(/"/g, '&quot;') : '';
  
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${sanitizedTitle} | TravelRock Channel</title>
  
  <!-- SEO Meta Tags -->
  <meta name="description" content="${sanitizedDesc || 'Mira este increíble momento en TravelRock Channel Shorts.'}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="video.other">
  <meta property="og:title" content="${sanitizedTitle} - ${sanitizedSchool}">
  <meta property="og:description" content="${sanitizedDesc || 'Mira este increíble momento en TravelRock Channel Shorts.'}">
  <meta property="og:image" content="${thumbnailUrl}">
  <meta property="og:video" content="${videoUrl}">
  <meta property="og:video:type" content="video/mp4">
  <meta property="og:site_name" content="TravelRock Channel">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${sanitizedTitle}">
  <meta name="twitter:description" content="${sanitizedDesc || 'Mira este increíble momento en TravelRock Channel Shorts.'}">
  <meta name="twitter:image" content="${thumbnailUrl}">
  
  <!-- Redirection Script -->
  <script>
    window.location.href = "../index.html?v=${id}";
  </script>
</head>
<body style="background-color: #08080a; color: #f3f4f6; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; text-align: center; padding: 20px; box-sizing: border-box;">
  <div>
    <div style="width: 50px; height: 50px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #ec4899; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
    <h2>Redireccionando a TravelRock Channel...</h2>
    <p style="color: #9ca3af; font-size: 0.9rem;">Si no eres redireccionado automáticamente, <a href="../index.html?v=${id}" style="color: #ec4899; text-decoration: none; font-weight: bold;">haz clic aquí</a>.</p>
  </div>
  <style>
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</body>
</html>`;

  fs.writeFileSync(path.join(SHORTS_DIR, `${id}.html`), html, 'utf8');
}

// Helper to parse JSON POST requests
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // Handle API Endpoint for Local Video Compression & B2 Uploads
  if (req.method === 'POST' && req.url.startsWith('/api/upload')) {
    handleVideoUpload(req, res);
    return;
  }

  // Handle Save SEO Metadata and Write Redirect Page
  if (req.method === 'POST' && req.url.startsWith('/api/save-seo')) {
    parseJsonBody(req).then(data => {
      const { id, videoUrl, thumbnailUrl, title, school, description } = data;
      if (!id || !title) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing required parameters (id, title)' }));
        return;
      }
      try {
        writeSeoPage(id, videoUrl, thumbnailUrl, title, school, description);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, file: `/shorts/${id}.html` }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to write SEO page', details: err.message }));
      }
    }).catch(err => {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON payload', details: err.message }));
    });
    return;
  }

  // Handle Bulk Sync SEO Pages from Supabase videos
  if (req.method === 'GET' && req.url.startsWith('/api/sync-seo')) {
    const supabaseUrl = 'https://qtrcutddajulnwyzdwtc.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0cmN1dGRkYWp1bG53eXpkd3RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NjE2MTYsImV4cCI6MjA5NTAzNzYxNn0.d7Pfif2JYI9UJzNdDUAtFTEoYFGWmwFQuCq_b3ZNIWM';
    
    const dbUrl = new URL(`${supabaseUrl}/rest/v1/videos?select=*`);
    
    const sReq = https.get(dbUrl, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    }, (sRes) => {
      let data = '';
      sRes.on('data', chunk => data += chunk);
      sRes.on('end', () => {
        if (sRes.statusCode !== 200) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Supabase query failed: ${sRes.statusCode}`, details: data }));
          return;
        }
        try {
          const videos = JSON.parse(data);
          let count = 0;
          videos.forEach(v => {
            writeSeoPage(v.id, v.video_url, v.thumbnail_url, v.title, v.school, v.description);
            count++;
          });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: `Synchronized ${count} SEO pages successfully.` }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed to write sync SEO pages', details: err.message }));
        }
      });
    });
    sReq.on('error', (err) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'HTTPS request to Supabase failed', details: err.message }));
    });
    return;
  }


  // Normalize URL path and default to index.html
  let safeUrl = req.url.split('?')[0];
  if (safeUrl === '/') {
    safeUrl = '/index.html';
  }

  const filePath = path.join(PUBLIC_DIR, safeUrl);

  // Check if file is inside public directory (prevent path traversal)
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.statusCode = 403;
    res.end('Access Denied');
    return;
  }

  fs.exists(filePath, (exists) => {
    if (!exists) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('File Not Found');
      return;
    }

    // Handle directories
    if (fs.statSync(filePath).isDirectory()) {
      res.statusCode = 403;
      res.end('Access Denied');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 TravelRock Channel Local Server is running!`);
  console.log(`👉 App URL:   http://localhost:${PORT}/index.html`);
  console.log(`👉 Admin URL: http://localhost:${PORT}/admin.html\n`);
});
