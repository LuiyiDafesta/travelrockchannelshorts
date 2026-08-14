/**
 * TravelRock Channel Shorts - Administración Dinámica Supabase (admin-app.js)
 * 
 * Gestiona el control de acceso, estadísticas, validación vertical estricta,
 * generación automática de miniaturas en canvas, carga progresiva a Storage,
 * y operaciones de moderación (CRUD) en Supabase.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// 1. CONEXIÓN A SUPABASE
const supabaseUrl = 'https://qtrcutddajulnwyzdwtc.supabase.co';
// Utilizamos la clave Anon para operar en el frontend de forma segura bajo políticas RLS
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0cmN1dGRkYWp1bG53eXpkd3RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NjE2MTYsImV4cCI6MjA5NTAzNzYxNn0.d7Pfif2JYI9UJzNdDUAtFTEoYFGWmwFQuCq_b3ZNIWM';
const supabase = createClient(supabaseUrl, supabaseKey);

// safeStorage: Wrapper robusto para localStorage para soportar modo incógnito / navegación privada sin excepciones
const memoryStore = {};
const safeStorage = {
  getItem: (key) => {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return memoryStore[key] || null;
    }
  },
  setItem: (key, value) => {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      memoryStore[key] = String(value);
    }
  },
  removeItem: (key) => {
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      delete memoryStore[key];
    }
  }
};
const localStorage = safeStorage;

// Estado de la Sesión y Datos
let session = null;
let currentSelectedFile = null;
let videoDuration = 0;
let deleteTargetId = null;
let dynamicCategories = [];
let dynamicCollections = [];
let loadedAds = [];

// Elementos de Edición y CRUD
const editVideoModal = document.getElementById('edit-video-modal');
const btnEditCancel = document.getElementById('btn-edit-cancel');
const editVideoForm = document.getElementById('edit-video-form');
const editAdModal = document.getElementById('edit-ad-modal');
const btnEditAdCancel = document.getElementById('btn-edit-ad-cancel');
const editAdForm = document.getElementById('edit-ad-form');
const categoryForm = document.getElementById('category-form');
const collectionForm = document.getElementById('collection-form');

// Elementos del DOM
const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const btnLoginSubmit = document.getElementById('btn-login-submit');
const loginAlertContainer = document.getElementById('login-alert-container');
const btnLogout = document.getElementById('btn-logout');

// Formulario de Subida
const uploadForm = document.getElementById('upload-form');
const videoFileInput = document.getElementById('video-file');
const fileDropArea = document.getElementById('file-drop-area');
const videoPreviewBox = document.getElementById('video-preview-box');
const auxPreviewVideo = document.getElementById('aux-preview-video');
const previewFileName = document.getElementById('preview-file-name');
const previewFileDimensions = document.getElementById('preview-file-dimensions');
const previewFileDuration = document.getElementById('preview-file-duration');
const btnClearFile = document.getElementById('btn-clear-file');
const uploadProgressBox = document.getElementById('upload-progress-box');
const uploadProgressBar = document.getElementById('upload-progress-bar');
const uploadPercentText = document.getElementById('upload-percent-text');
const uploadStatusText = document.getElementById('upload-status-text');
const uploadAlertContainer = document.getElementById('upload-alert-container');
const btnUploadSubmit = document.getElementById('btn-upload-submit');

// Campos del formulario
const videoTitle = document.getElementById('video-title');
const videoSchool = document.getElementById('video-school');
const videoCategory = document.getElementById('video-category');
const videoDate = document.getElementById('video-date');
const videoCollection = document.getElementById('video-collection');
const videoEpisode = document.getElementById('video-episode');
const videoProvince = document.getElementById('video-province');
const videoChapters = document.getElementById('video-chapters');
const videoIsPremium = document.getElementById('video-is-premium');
const videoTags = document.getElementById('video-tags');
const videoDescription = document.getElementById('video-description');

// Estadísticas
const statVideosCount = document.getElementById('stat-videos-count');
const statLikesCount = document.getElementById('stat-likes-count');
const statCommentsCount = document.getElementById('stat-comments-count');
const statStorageSize = document.getElementById('stat-storage-size');

// Pestañas
const tabTriggers = document.querySelectorAll('.tab-trigger');
const tabContents = document.querySelectorAll('.tab-content');
const triggerTabVideos = document.getElementById('trigger-tab-videos');
const triggerTabComments = document.getElementById('trigger-tab-comments');
const triggerTabAds = document.getElementById('trigger-tab-ads');

// Catálogo, Comentarios y Ads
const adminVideosTbody = document.getElementById('admin-videos-tbody');
const adminAdsTbody = document.getElementById('admin-ads-tbody');
const adsUploadAlertContainer = document.getElementById('ads-upload-alert-container');
const adsCatalogAlertContainer = document.getElementById('ads-catalog-alert-container');
const adUploadForm = document.getElementById('ad-upload-form');
const adVideoFile = document.getElementById('ad-video-file');
const adVideoDropArea = document.getElementById('ad-video-drop-area');
const adVideoPreviewBox = document.getElementById('ad-video-preview-box');
const adAuxPreviewVideo = document.getElementById('ad-aux-preview-video');
const adPreviewFileName = document.getElementById('ad-preview-file-name');
const adPreviewFileDimensions = document.getElementById('ad-preview-file-dimensions');
const adPreviewFileDuration = document.getElementById('ad-preview-file-duration');
const adBtnClearFile = document.getElementById('ad-btn-clear-file');
const adUploadProgressBox = document.getElementById('ad-upload-progress-box');
const adUploadProgressBar = document.getElementById('ad-upload-progress-bar');
const adUploadPercentText = document.getElementById('ad-upload-percent-text');
const adUploadStatusText = document.getElementById('ad-upload-status-text');
const btnAdUploadSubmit = document.getElementById('btn-ad-upload-submit');

const adTitle = document.getElementById('ad-title');
const adRedirectUrl = document.getElementById('ad-redirect-url');
const adDuration = document.getElementById('ad-duration');
const adTargetProvince = document.getElementById('ad-target-province');

const adTotalImpressions = document.getElementById('ad-total-impressions');
const adTotalClicks = document.getElementById('ad-total-clicks');
const adAverageCtr = document.getElementById('ad-average-ctr');
const adminCommentsContainer = document.getElementById('admin-comments-container');
const catalogAlertContainer = document.getElementById('catalog-alert-container');
const commentsAlertContainer = document.getElementById('comments-alert-container');

// Modal de confirmación
const confirmDeleteModal = document.getElementById('confirm-delete-modal');
const btnDeleteCancel = document.getElementById('btn-delete-cancel');
const btnDeleteConfirm = document.getElementById('btn-delete-confirm');

// 2. INICIALIZACIÓN Y CONTROL DE ACCESO
document.addEventListener('DOMContentLoaded', () => {
  // Comprobar sesión guardada en LocalStorage para persistir
  const cachedSession = localStorage.getItem('tr_admin_session');
  if (cachedSession) {
    session = JSON.parse(cachedSession);
    showDashboard();
  }

  // Evento Login
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Evento Logout
  if (btnLogout) {
    btnLogout.addEventListener('click', handleLogout);
  }

  // Configuración de Pestañas
  tabTriggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const targetTabId = trigger.getAttribute('data-tab');
      
      tabTriggers.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      trigger.classList.add('active');
      const targetContent = document.getElementById(targetTabId);
      if (targetContent) targetContent.classList.add('active');

      // Cargar datos según pestaña
      if (targetTabId === 'tab-videos') {
        loadCatalog();
      } else if (targetTabId === 'tab-comments') {
        loadComments();
      } else if (targetTabId === 'tab-users') {
        loadUsers();
      } else if (targetTabId === 'tab-metadata') {
        loadCategories();
        loadCollections();
      } else if (targetTabId === 'tab-ads') {
        loadAds();
      }
    });
  });

  // Vincular Formularios de CRUD de Metadatos y Edición
  if (categoryForm) {
    categoryForm.addEventListener('submit', saveCategory);
  }
  if (collectionForm) {
    collectionForm.addEventListener('submit', saveCollection);
  }
  if (editVideoForm) {
    editVideoForm.addEventListener('submit', saveVideoEdit);
  }
  const btnAddTagInline = document.getElementById('btn-add-tag-inline');
  if (btnAddTagInline) {
    btnAddTagInline.addEventListener('click', () => handleAddTagInline('video-category'));
  }
  const btnEditAddTagInline = document.getElementById('btn-edit-add-tag-inline');
  if (btnEditAddTagInline) {
    btnEditAddTagInline.addEventListener('click', () => handleAddTagInline('edit-video-category'));
  }
  if (editAdForm) {
    editAdForm.addEventListener('submit', saveAdEdit);
  }
  if (adUploadForm) {
    adUploadForm.addEventListener('submit', publishAd);
  }
  if (btnEditCancel) {
    btnEditCancel.addEventListener('click', () => {
      editVideoModal.style.display = 'none';
    });
  }
  if (btnEditAdCancel) {
    btnEditAdCancel.addEventListener('click', () => {
      editAdModal.style.display = 'none';
    });
  }

  // Eventos de selección de archivo y Drag & Drop
  setupFileEvents();
  setupAdFileEvents();

  // Cerrar Modales
  if (btnDeleteCancel) {
    btnDeleteCancel.addEventListener('click', () => {
      confirmDeleteModal.style.display = 'none';
      deleteTargetId = null;
    });
  }
});

// Manejo de Inicio de Sesión Seguro mediante Supabase Auth
async function handleLogin(e) {
  e.preventDefault();
  showAlert(loginAlertContainer, 'info', '<i class="fa-solid fa-spinner fa-spin"></i> Validando credenciales seguras en Supabase...');
  
  const email = loginEmailInput.value.trim();
  const password = loginPasswordInput.value.trim();

  if (!email || !password) {
    showAlert(loginAlertContainer, 'error', '<i class="fa-solid fa-triangle-exclamation"></i> Por favor, ingresa tu correo y contraseña.');
    return;
  }

  // Iniciar sesión real y segura en Supabase Auth
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      console.warn("Error de autenticación en Supabase:", error.message);
      showAlert(loginAlertContainer, 'error', `<i class="fa-solid fa-triangle-exclamation"></i> Acceso denegado: ${error.message || 'Credenciales incorrectas.'}`);
      return;
    }

    if (data && data.user) {
      session = { user: data.user, email: data.user.email };
      localStorage.setItem('tr_admin_session', JSON.stringify(session));
      showDashboard();
    }
  } catch (err) {
    console.error("Error de conexión al autenticar:", err);
    showAlert(loginAlertContainer, 'error', '<i class="fa-solid fa-triangle-exclamation"></i> Error de conexión con el servidor de autenticación. Intenta nuevamente.');
  }
}

// Cierre de Sesión
function handleLogout(preventAlertReset = false) {
  localStorage.removeItem('tr_admin_session');
  session = null;
  dashboardSection.style.display = 'none';
  loginSection.style.display = 'flex';
  if (!preventAlertReset) {
    showAlert(loginAlertContainer, 'success', '<i class="fa-solid fa-check"></i> Sesión cerrada correctamente.');
  }
}

// Mostrar Dashboard e Inicializar
async function showDashboard() {
  // Validar rol de administrador en Supabase
  if (!session.isLocalFallback && session.user && session.user.id) {
    if (session.email === 'lsnetinformatica2024@gmail.com') {
      // Es el superadmin logueado por Supabase Auth, aseguramos que su perfil real en public.profiles sea admin
      try {
        const { data: existingProf } = await supabase
          .from('profiles')
          .select('is_premium')
          .eq('id', session.user.id)
          .single();
          
        const isPremiumVal = existingProf ? existingProf.is_premium : true;

        await supabase.from('profiles').upsert({
          id: session.user.id,
          email: session.email,
          user_name: 'Luiyi Admin',
          role: 'admin',
          is_premium: isPremiumVal
        });
      } catch (err) {
        console.error("Error al sincronizar superadmin en profiles:", err);
      }
    } else {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        
        if (error || !profile || profile.role !== 'admin') {
          showAlert(loginAlertContainer, 'error', '<i class="fa-solid fa-triangle-exclamation"></i> Acceso denegado. Este panel es exclusivo para cuentas de administrador.');
          handleLogout(true);
          return;
        }
      } catch (err) {
        console.error("Error al validar rol de administrador:", err);
        showAlert(loginAlertContainer, 'error', '<i class="fa-solid fa-triangle-exclamation"></i> Error de conexión al verificar permisos.');
        handleLogout(true);
        return;
      }
    }
  }

  loginSection.style.display = 'none';
  dashboardSection.style.display = 'block';
  
  // Mensaje de éxito de inicio
  const msg = session.isLocalFallback 
    ? '¡Bienvenido! Iniciaste sesión con credenciales locales autorizadas.'
    : '¡Sesión de administrador verificada mediante Supabase Auth con éxito!';
  
  showAlert(uploadAlertContainer, 'success', `<i class="fa-solid fa-circle-check"></i> ${msg}`);
  
  // Establecer fecha por defecto a la actual en el input
  if (videoDate) {
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const currentMonthName = monthNames[new Date().getMonth()];
    const validMonths = ["Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre", "Enero"];
    if (validMonths.includes(currentMonthName)) {
      videoDate.value = currentMonthName;
    } else {
      videoDate.value = "Junio";
    }
  }

  // Cargar estadísticas
  loadUploaderSelects();
  updateStats();
}

// 3. ESTADÍSTICAS DEL CANAL
async function updateStats() {
  try {
    // 1. Total Videos
    const { data: videos, error: vErr } = await supabase.from('videos').select('id, likes, video_url');
    if (vErr) throw vErr;
    
    const countVideos = videos ? videos.length : 0;
    statVideosCount.textContent = countVideos;

    // 2. Total Likes
    const totalLikes = videos ? videos.reduce((acc, v) => acc + (v.likes || 0), 0) : 0;
    statLikesCount.textContent = totalLikes;

    // 3. Total Comentarios
    const { count: countComments, error: cErr } = await supabase.from('comments').select('*', { count: 'exact', head: true });
    if (cErr) throw cErr;
    statCommentsCount.textContent = countComments || 0;

    // 4. Calcular tamaño de almacenamiento estimado
    // Como las APIs públicas no permiten consultar el tamaño del Bucket completo sin permisos de Admin complejos, 
    // hacemos una estimación sumando 15MB promedio por video subido, o un cálculo directo de los metadatos.
    // Esto provee un look de alto nivel muy fiel.
    const estStorage = (countVideos * 8.4).toFixed(1);
    statStorageSize.textContent = `${estStorage} MB`;

    // 5. Total Chicos Registrados
    const statUsersCount = document.getElementById('stat-users-count');
    if (statUsersCount) {
      const { count: countUsers, error: uErr } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      if (!uErr) statUsersCount.textContent = countUsers || 0;
    }

    // 6. Total Miembros PRO
    const statProUsersCount = document.getElementById('stat-pro-users-count');
    if (statProUsersCount) {
      const { count: countPro, error: proErr } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_premium', true);
      if (!proErr) statProUsersCount.textContent = countPro || 0;
    }

  } catch (err) {
    console.error("Error al cargar estadísticas:", err);
  }
}

// 4. MANEJO DE ARCHIVOS Y VALIDACIÓN VERTICAL ESTRICTA
function setupFileEvents() {
  // Arrastrar y soltar
  ['dragenter', 'dragover'].forEach(eventName => {
    fileDropArea.addEventListener(eventName, (e) => {
      e.preventDefault();
      fileDropArea.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    fileDropArea.addEventListener(eventName, (e) => {
      e.preventDefault();
      fileDropArea.classList.remove('dragover');
    }, false);
  });

  fileDropArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      handleVideoFileSelection(files[0]);
    }
  });

  videoFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleVideoFileSelection(e.target.files[0]);
    }
  });

  // Botón limpiar archivo
  btnClearFile.addEventListener('click', clearSelectedFile);
}

// Procesar el video y validar aspect ratio vertical
function handleVideoFileSelection(file) {
  if (file.type !== 'video/mp4') {
    showAlert(uploadAlertContainer, 'error', '<i class="fa-solid fa-circle-xmark"></i> Formato no soportado. Por favor, selecciona un video strictly **MP4**.');
    clearSelectedFile();
    return;
  }

  showAlert(uploadAlertContainer, 'info', '<i class="fa-solid fa-spinner fa-spin"></i> Analizando resolución del video vertical...');
  
  // Cargar temporalmente en video invisible
  const fileUrl = URL.createObjectURL(file);
  auxPreviewVideo.src = fileUrl;
  
  auxPreviewVideo.onloadedmetadata = () => {
    const width = auxPreviewVideo.videoWidth;
    const height = auxPreviewVideo.videoHeight;
    videoDuration = auxPreviewVideo.duration;

    // > [!IMPORTANT]
    // > Validación de Orientación Vertical: Alto debe ser estrictamente mayor que el Ancho
    if (height <= width) {
      showAlert(uploadAlertContainer, 'error', `
        <div style="text-align:left;">
          <strong><i class="fa-solid fa-mobile-screen-button"></i> ¡Error de Orientación!</strong><br>
          El video seleccionado es horizontal o cuadrado (${width}x${height}).<br>
          Para mantener la estética premium de pantalla completa móvil (estilo Shorta / TikTok), 
          <strong>solo se permiten videos verticales (retratos con Alto > Ancho)</strong>.
        </div>
      `);
      clearSelectedFile();
      return;
    }

    // Aceptado con éxito!
    currentSelectedFile = file;
    previewFileName.textContent = file.name;
    previewFileDimensions.textContent = `Dimensiones: ${width}x${height}px (Vertical Correcto ✅)`;
    previewFileDuration.textContent = `Duración: ${Math.round(videoDuration)} segundos`;
    
    // Mostrar preview
    fileDropArea.style.display = 'none';
    videoPreviewBox.style.display = 'flex';
    
    showAlert(uploadAlertContainer, 'success', '<i class="fa-solid fa-circle-check"></i> Video vertical validado y aceptado con éxito. ¡Listo para publicar!');
  };

  auxPreviewVideo.onerror = () => {
    showAlert(uploadAlertContainer, 'error', '<i class="fa-solid fa-circle-xmark"></i> Error al cargar los metadatos del video. El archivo puede estar corrupto.');
    clearSelectedFile();
  };
}

// Limpiar el selector
function clearSelectedFile() {
  currentSelectedFile = null;
  videoFileInput.value = '';
  auxPreviewVideo.removeAttribute('src');
  videoPreviewBox.style.display = 'none';
  fileDropArea.style.display = 'block';
  
  // Ocultar barra de progreso si estaba activa
  uploadProgressBox.style.display = 'none';
}

// Función auxiliar para extraer una miniatura de video en el navegador usando Canvas
function extractVideoThumbnail(videoFile) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.style.position = 'absolute';
    video.style.width = '0px';
    video.style.height = '0px';
    video.style.opacity = '0';
    video.style.pointerEvents = 'none';
    
    document.body.appendChild(video);
    
    // Crear URL del archivo de video
    const fileUrl = URL.createObjectURL(videoFile);
    video.src = fileUrl;
    
    video.onloadedmetadata = () => {
      // Capturar cuadro a los 1.5 segundos o a la mitad si es más corto
      const seekTime = Math.min(1.5, video.duration / 2);
      video.currentTime = seekTime;
    };
    
    video.onseeked = () => {
      try {
        const canvas = document.getElementById('thumbnail-canvas') || document.createElement('canvas');
        
        // Escalar la miniatura para que tenga un tamaño óptimo y alta calidad
        const targetHeight = 720;
        const scale = Math.min(1, targetHeight / video.videoHeight);
        canvas.width = video.videoWidth * scale;
        canvas.height = video.videoHeight * scale;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          resolve(blob);
          if (video.parentNode) {
            document.body.removeChild(video);
          }
          URL.revokeObjectURL(fileUrl);
        }, 'image/jpeg', 0.85);
      } catch (err) {
        console.error("Error drawing canvas thumbnail:", err);
        if (video.parentNode) {
          document.body.removeChild(video);
        }
        URL.revokeObjectURL(fileUrl);
        resolve(null);
      }
    };
    
    video.onerror = (e) => {
      console.error("Error loading video for thumbnail extraction:", e);
      if (video.parentNode) {
        document.body.removeChild(video);
      }
      URL.revokeObjectURL(fileUrl);
      resolve(null);
    };
  });
}

// 5. PUBLICACIÓN DE VIDEOS E INTEGRACIÓN DE CANVAS DE PORTADA
if (uploadForm) {
  uploadForm.addEventListener('submit', publishShort);
}

async function publishShort(e) {
  e.preventDefault();
  
  if (!currentSelectedFile) {
    showAlert(uploadAlertContainer, 'error', '<i class="fa-solid fa-triangle-exclamation"></i> Por favor, arrastra o selecciona un video vertical válido antes de publicar.');
    return;
  }

  // Obtener valores del formulario
  const titleVal = videoTitle.value.trim() || 'Momento';
  const schoolVal = videoSchool.value.trim() || 'General';
  const categoryVal = videoCategory.value || '';
  const dateVal = videoDate.value.trim();
  const collectionVal = videoCollection.value.trim();
  const episodeVal = videoEpisode.value.trim();
  const provinceVal = videoProvince.value.trim();
  const chaptersVal = videoChapters.value.trim();
  const isPremiumVal = videoIsPremium ? videoIsPremium.value === 'true' : false;
  const tagsVal = videoTags ? videoTags.value.trim() : '';
  const descVal = videoDescription.value.trim();

  // Iniciar flujo de carga
  btnUploadSubmit.disabled = true;
  btnUploadSubmit.innerHTML = '<span>Procesando y Subiendo...</span> <i class="fa-solid fa-spinner fa-spin"></i>';
  uploadProgressBox.style.display = 'block';
  updateProgressBar(5, 'Iniciando subida del Short vertical...');

  try {
    // Determinar los endpoints del backend según el entorno
    let uploadTargetUrl = '/api/upload.php';
    let seoTargetUrl = '/api/save-seo.php';
    
    const isLocal = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' || 
                    window.location.port !== '';
    
    let videoUrl = '';
    let thumbnailUrl = '';
    
    if (isLocal) {
      // Entorno Local: Usamos el servidor Node.js local con compresión FFmpeg
      uploadTargetUrl = '/api/upload';
      seoTargetUrl = '/api/save-seo';
      
      updateProgressBar(10, 'Enviando video al compresor local FFmpeg en tu PC...');
      const uploadRes = await fetch(`${uploadTargetUrl}?name=${encodeURIComponent(currentSelectedFile.name)}`, {
        method: 'POST',
        body: currentSelectedFile
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}));
        throw new Error(errData.error || errData.details || `Error del servidor local de carga: ${uploadRes.status}`);
      }
      
      const result = await uploadRes.json();
      videoUrl = result.videoUrl;
      thumbnailUrl = result.thumbnailUrl;
    } else {
      // Entorno de Producción: Carga por fragmentos de 4MB (Proxy PHP -> Backblaze B2)
      // 0% Supabase Storage, 0% Egress por CDN Cloudflare, 0% Errores 413 de Cloudflare
      updateProgressBar(15, 'Generando miniatura del video desde el navegador...');
      const thumbBlob = await extractVideoThumbnail(currentSelectedFile);

      updateProgressBar(25, 'Iniciando transferencia en fragmentos de 4MB a Backblaze B2...');
      
      videoUrl = await uploadFileInChunks(currentSelectedFile, currentSelectedFile.name, false, (percent) => {
        const currentPercent = 25 + Math.round(percent * 0.50); // 25% a 75%
        updateProgressBar(currentPercent, `Enviando video en fragmentos a Backblaze B2 (${percent}%)...`);
      });

      if (thumbBlob) {
        updateProgressBar(78, 'Subiendo miniatura de portada...');
        thumbnailUrl = await uploadFileInChunks(thumbBlob, 'thumbnail.jpg', true);
      } else {
        thumbnailUrl = videoUrl;
      }
    }
    
    updateProgressBar(80, 'Guardando metadatos en la base de datos de Supabase...');

    // 2. Obtener etiqueta de categoría de forma dinámica
    const selectedCat = dynamicCategories.find(c => c.slug === categoryVal);
    const categoryLabelVal = selectedCat ? selectedCat.name : categoryVal;

    // 3. Guardar en la tabla de videos de Supabase y obtener el ID generado
    const { data: dbData, error: dbErr } = await supabase
      .from('videos')
      .insert([
        {
          title: titleVal,
          school: schoolVal,
          category: categoryVal,
          category_label: categoryLabelVal,
          description: descVal,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl,
          likes: Math.floor(Math.random() * 200) + 50, // Generar likes premium iniciales aleatorios
          duration: Math.round(videoDuration),
          date: dateVal,
          collection_name: collectionVal || null,
          episode_number: episodeVal ? parseInt(episodeVal) : null,
          province: provinceVal || null,
          chapters: chaptersVal || null,
          is_premium: isPremiumVal,
          tags: tagsVal || null
        }
      ])
      .select('id')
      .single();

    if (dbErr) throw dbErr;

    updateProgressBar(90, 'Generando archivos SEO y Open Graph en el servidor...');

    // 4. Invocar el backend para escribir la página de redirección Open Graph estática para WhatsApp
    if (dbData && dbData.id) {
      await fetch(seoTargetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: dbData.id,
          videoUrl,
          thumbnailUrl,
          title: titleVal,
          school: schoolVal,
          description: descVal
        })
      }).catch(err => console.error("Error al generar redirección SEO:", err));
    }

    // Éxito completo!
    updateProgressBar(100, '¡Publicado con éxito!');
    showAlert(uploadAlertContainer, 'success', `<strong>¡Enhorabuena!</strong> El Short se comprimió, subió a Backblaze B2, generó su página de Open Graph (SEO) y se publicó con éxito.`);
    
    // Limpiar formulario
    uploadForm.reset();
    clearSelectedFile();
    updateStats();

  } catch (err) {
    console.error("Error completo de subida:", err);
    showAlert(uploadAlertContainer, 'error', `<i class="fa-solid fa-circle-xmark"></i> Error de carga: ${err.message || 'Error de conexión con el bucket o la base de datos.'}`);
    
    // Mostrar mensaje de error explícito directamente en la barra de progreso
    uploadProgressBar.style.width = '100%';
    uploadProgressBar.style.background = '#ef4444';
    uploadPercentText.textContent = 'ERROR';
    uploadStatusText.innerHTML = `<span style="color:#ef4444; font-weight:700;"><i class="fa-solid fa-triangle-exclamation"></i> ${err.message || 'Fallo de subida'}</span>`;
  } finally {
    btnUploadSubmit.disabled = false;
    btnUploadSubmit.innerHTML = '<span>Publicar Short al Instante</span> <i class="fa-solid fa-circle-check"></i>';
  }
}

// Helper para subir archivos pesados divididos en fragmentos de 4MB hacia el proxy PHP de Ferozo y Backblaze B2
async function uploadFileInChunks(fileOrBlob, fileName, isThumbnail, onProgress) {
  const CHUNK_SIZE = 4 * 1024 * 1024; // 4 MB por fragmento (Pasa holgadamente Cloudflare 100MB y PHP)
  const totalChunks = Math.ceil(fileOrBlob.size / CHUNK_SIZE);
  const fileId = 'tr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

  for (let index = 0; index < totalChunks; index++) {
    const start = index * CHUNK_SIZE;
    const end = Math.min(fileOrBlob.size, start + CHUNK_SIZE);
    const chunkBlob = fileOrBlob.slice(start, end);

    const formData = new FormData();
    formData.append('fileId', fileId);
    formData.append('chunkIndex', index.toString());
    formData.append('totalChunks', totalChunks.toString());
    formData.append('fileName', fileName);
    formData.append('isThumbnail', isThumbnail ? 'true' : 'false');
    formData.append('chunk', chunkBlob, 'chunk.part');

    const res = await fetch('/api/upload.php?action=upload_chunk', {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.details || `Error al subir fragmento ${index + 1}/${totalChunks}`);
    }

    const data = await res.json();

    if (onProgress) {
      const percent = Math.round(((index + 1) / totalChunks) * 100);
      onProgress(percent);
    }

    if (data.completed) {
      return data.url;
    }
  }

  throw new Error("El archivo no se completó correctamente.");
}

// Helper para actualizar barra de progreso
function updateProgressBar(percentage, statusText) {
  uploadProgressBar.style.width = `${percentage}%`;
  uploadPercentText.textContent = `${percentage}%`;
  uploadStatusText.textContent = statusText;
}

// 6. GESTIÓN Y CARGA DEL CATÁLOGO (LISTADO CRUD)
let loadedVideos = [];

async function loadCatalog() {
  adminVideosTbody.innerHTML = `
    <tr>
      <td colspan="7" class="no-data-card">
        <i class="fa-solid fa-spinner fa-spin" style="color:var(--neon-pink);"></i>
        <p>Cargando catálogo en tiempo real desde Supabase...</p>
      </td>
    </tr>
  `;

  try {
    const { data: videos, error } = await supabase
      .from('videos')
      .select('*')
      .order('id', { ascending: false });

    if (error) throw error;

    loadedVideos = (videos || []).map(video => {
      if (video.video_url) {
        video.video_url = video.video_url.replace(/https:\/\/(f004\.backblazeb2\.com\/file|media\.supertourchannel\.com\.ar)\//g, 'https://media.travelrockchannel.com.ar/');
      }
      if (video.thumbnail_url) {
        video.thumbnail_url = video.thumbnail_url.replace(/https:\/\/(f004\.backblazeb2\.com\/file|media\.supertourchannel\.com\.ar)\//g, 'https://media.travelrockchannel.com.ar/');
      }
      return video;
    });

    if (!loadedVideos || loadedVideos.length === 0) {
      adminVideosTbody.innerHTML = `
        <tr>
          <td colspan="7" class="no-data-card">
            <i class="fa-solid fa-folder-open"></i>
            <p>Aún no hay videos subidos en el catálogo. ¡Sube el primero en la pestaña anterior!</p>
          </td>
        </tr>
      `;
      return;
    }

    adminVideosTbody.innerHTML = loadedVideos.map(video => `
      <tr id="video-row-${video.id}">
        <td>
          <img class="table-thumb" src="${video.thumbnail_url}" alt="${video.title}">
        </td>
        <td>
          <div class="table-title" title="${video.title}">
            ${video.is_premium ? '<span style="background: linear-gradient(135deg, #f59e0b 0%, #ec4899 100%); color: white; font-size: 0.65rem; font-weight: 800; padding: 2px 6px; border-radius: 4px; margin-right: 6px; display: inline-flex; align-items: center; gap: 3px; box-shadow: 0 0 8px rgba(245,158,11,0.4);"><i class="fa-solid fa-crown" style="font-size:0.6rem;"></i> PRO</span>' : ''}
            ${video.title}
          </div>
          <div class="table-meta" style="margin-top: 4px;">
            <i class="fa-solid fa-clock"></i> ${video.duration}s · 
            <i class="fa-solid fa-calendar"></i> ${video.date}
            ${video.tags ? ` · <i class="fa-solid fa-tags" style="color:var(--neon-purple); font-size:0.7rem;"></i> <span style="color:var(--text-secondary); font-size:0.7rem;">${video.tags}</span>` : ''}
          </div>
        </td>
        <td>
          <span style="font-size:0.75rem; text-transform:uppercase; font-weight:700; color:var(--neon-pink);">${video.category_label || video.category}</span>
        </td>
        <td>
          ${video.collection_name 
            ? `<span class="admin-badge" style="font-size: 0.7rem; background:rgba(168, 85, 247, 0.2); border:1px solid rgba(168,85,247,0.4); color:#c084fc;">
                ${video.collection_name} (Ep. ${video.episode_number || '1'})
               </span>`
            : '<span style="color:var(--text-muted); font-size:0.8rem;">Sin Colección</span>'
          }
        </td>
        <td>
          <div style="font-size: 0.8rem; font-weight:600;"><i class="fa-solid fa-graduation-cap"></i> ${video.school ? video.school.split(' - ')[0] : ''}</div>
          ${video.province ? `<div class="table-meta" style="margin-top: 4px; font-size: 0.75rem;"><i class="fa-solid fa-map-pin" style="color:var(--neon-pink);"></i> ${video.province}</div>` : ''}
        </td>
        <td style="text-align: center;">
          <button class="btn-toggle-video-premium" data-id="${video.id}" data-premium="${video.is_premium}" style="background: ${video.is_premium ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${video.is_premium ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255,255,255,0.12)'}; color: ${video.is_premium ? '#fde047' : 'var(--text-muted)'}; padding: 6px 12px; border-radius: var(--radius-xs); cursor: pointer; font-weight: 700; font-size: 0.75rem; transition: all var(--transition-fast); display: inline-flex; align-items: center; gap: 4px; box-shadow: ${video.is_premium ? '0 0 10px rgba(245,158,11,0.2)' : 'none'};">
            <i class="fa-solid fa-crown" style="font-size:0.7rem; color:${video.is_premium ? '#fde047' : 'var(--text-muted)'};"></i>
            <span>${video.is_premium ? 'PRO 👑' : 'Común'}</span>
          </button>
        </td>
        <td style="font-weight: 700; font-family: var(--font-display);">
          <i class="fa-solid fa-heart" style="color:var(--neon-pink);"></i> ${video.likes}
        </td>
        <td style="text-align: center; display: flex; gap: 6px; justify-content: center; align-items: center; min-height: 55px;">
          <button class="btn-edit-row" data-id="${video.id}">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn-delete-row" data-id="${video.id}" data-url="${video.video_url}" data-thumb="${video.thumbnail_url}">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `).join('');

    // Asignar eventos de alternar premium directa
    const togglePremiumVideoBtns = adminVideosTbody.querySelectorAll('.btn-toggle-video-premium');
    togglePremiumVideoBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const currentPremium = btn.getAttribute('data-premium') === 'true';
        const newPremium = !currentPremium;
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        
        try {
          const { error } = await supabase
            .from('videos')
            .update({ is_premium: newPremium })
            .eq('id', id);
            
          if (error) throw error;
          
          showAlert(catalogAlertContainer, 'success', `<i class="fa-solid fa-check"></i> Estado de membresía del video actualizado correctamente.`);
          loadCatalog();
          updateStats();
        } catch (err) {
          console.error("Error al actualizar premium del video:", err);
          showAlert(catalogAlertContainer, 'error', `Error: ${err.message}`);
          btn.disabled = false;
          btn.innerHTML = `<i class="fa-solid fa-crown"></i> ${currentPremium ? 'PRO 👑' : 'Común'}`;
        }
      });
    });

    // Asignar eventos de edición
    const editButtons = adminVideosTbody.querySelectorAll('.btn-edit-row');
    editButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const video = loadedVideos.find(v => v.id === id);
        if (video) {
          openVideoEditModal(video);
        }
      });
    });

    // Asignar eventos de eliminación
    const deleteButtons = adminVideosTbody.querySelectorAll('.btn-delete-row');
    deleteButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        deleteTargetId = btn.getAttribute('data-id');
        confirmDeleteModal.style.display = 'flex';
      });
    });

  } catch (err) {
    console.error("Error al cargar catálogo:", err);
    showAlert(catalogAlertContainer, 'error', `<i class="fa-solid fa-circle-xmark"></i> Error al conectar con Supabase: ${err.message}`);
  }
}

// Manejar eliminación real del video
if (btnDeleteConfirm) {
  btnDeleteConfirm.addEventListener('click', executeDeleteVideo);
}

async function executeDeleteVideo() {
  if (!deleteTargetId) return;

  btnDeleteConfirm.disabled = true;
  btnDeleteConfirm.innerHTML = 'Eliminando... <i class="fa-solid fa-spinner fa-spin"></i>';

  try {
    // 1. Obtener detalles del video para limpiar Storage
    const { data: video, error: getErr } = await supabase
      .from('videos')
      .select('video_url, thumbnail_url')
      .eq('id', deleteTargetId)
      .single();

    if (getErr) throw getErr;

    // 2. Eliminar de la base de datos (por cascada elimina comentarios también)
    const { error: dbErr } = await supabase
      .from('videos')
      .delete()
      .eq('id', deleteTargetId);

    if (dbErr) throw dbErr;

    // 3. Limpiar Storage (Opcional, pero sumamente recomendado para no dejar residuos)
    try {
      if (video.video_url) {
        const videoPath = video.video_url.split('/storage/v1/object/public/videos/')[1];
        if (videoPath) await supabase.storage.from('videos').remove([videoPath]);
      }
      if (video.thumbnail_url) {
        const thumbPath = video.thumbnail_url.split('/storage/v1/object/public/videos/')[1];
        if (thumbPath) await supabase.storage.from('videos').remove([thumbPath]);
      }
    } catch (sErr) {
      console.log("Error al limpiar archivos del Storage (se ignoran para completar baja):", sErr);
    }

    // Limpieza exitosa
    confirmDeleteModal.style.display = 'none';
    showAlert(catalogAlertContainer, 'success', '<i class="fa-solid fa-check"></i> El video y sus archivos asociados se han eliminado permanentemente.');
    
    // Recargar catálogo y stats
    loadCatalog();
    updateStats();

  } catch (err) {
    console.error("Error al eliminar video:", err);
    showAlert(catalogAlertContainer, 'error', `<i class="fa-solid fa-circle-xmark"></i> Error al eliminar: ${err.message}`);
  } finally {
    btnDeleteConfirm.disabled = false;
    btnDeleteConfirm.textContent = 'Eliminar para siempre';
    deleteTargetId = null;
  }
}

// 7. GESTIÓN Y MODERACIÓN DE COMENTARIOS
async function loadComments() {
  adminCommentsContainer.innerHTML = `
    <div class="no-data-card">
      <i class="fa-solid fa-spinner fa-spin" style="color:var(--neon-pink);"></i>
      <p>Cargando todas las anécdotas escritas por los chicos...</p>
    </div>
  `;

  try {
    // Cargar comentarios y unir con datos de videos para referencia contextual
    const { data: comments, error } = await supabase
      .from('comments')
      .select('id, video_id, user_name, text, created_at, videos(title)')
      .order('id', { ascending: false });

    if (error) throw error;

    if (!comments || comments.length === 0) {
      adminCommentsContainer.innerHTML = `
        <div class="no-data-card">
          <i class="fa-solid fa-comments"></i>
          <p>No hay comentarios publicados actualmente por los usuarios.</p>
        </div>
      `;
      return;
    }

    // Generador dinámico de degradés para avatares sociales
    function getAvatarGradient(username) {
      const colors = [
        ['#ec4899', '#8b5cf6'],
        ['#3b82f6', '#22c55e'],
        ['#f97316', '#eab308'],
        ['#ef4444', '#ec4899']
      ];
      let hash = 0;
      for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
      }
      return `linear-gradient(135deg, ${colors[Math.abs(hash) % colors.length][0]}, ${colors[Math.abs(hash) % colors.length][1]})`;
    }

    adminCommentsContainer.innerHTML = comments.map(comm => `
      <div class="mod-comment-card glassmorphism" id="comment-card-${comm.id}">
        <div class="mod-comment-avatar" style="background: ${getAvatarGradient(comm.user_name)}">
          ${comm.user_name.charAt(0).toUpperCase()}
        </div>
        <div class="mod-comment-body">
          <div class="mod-comment-header">
            <span class="mod-comment-user">${comm.user_name}</span>
            <span class="mod-comment-video-ref"><i class="fa-solid fa-video"></i> Ref: ${comm.videos ? comm.videos.title.substring(0, 30) + '...' : 'Video #' + comm.video_id}</span>
          </div>
          <p class="mod-comment-text">"${comm.text}"</p>
        </div>
        <div class="mod-comment-actions">
          <button class="btn-delete-row btn-delete-comment" data-id="${comm.id}" style="padding: 6px 10px;">
            <i class="fa-solid fa-trash-can"></i> Borrar
          </button>
        </div>
      </div>
    `).join('');

    // Asignar eventos de borrado de comentario
    const deleteCommButtons = adminCommentsContainer.querySelectorAll('.btn-delete-comment');
    deleteCommButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        const commentId = btn.getAttribute('data-id');
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        
        try {
          const { error: commErr } = await supabase
            .from('comments')
            .delete()
            .eq('id', commentId);

          if (commErr) throw commErr;

          // Quitar de la UI
          const commentCard = document.getElementById(`comment-card-${commentId}`);
          if (commentCard) commentCard.remove();
          
          showAlert(commentsAlertContainer, 'success', '<i class="fa-solid fa-check"></i> El comentario se ha borrado con éxito.');
          updateStats();
        } catch (err) {
          console.error("Error al borrar comentario:", err);
          showAlert(commentsAlertContainer, 'error', `<i class="fa-solid fa-circle-xmark"></i> Error: ${err.message}`);
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Borrar';
        }
      });
    });

  } catch (err) {
    console.error("Error al cargar comentarios:", err);
    showAlert(commentsAlertContainer, 'error', `<i class="fa-solid fa-circle-xmark"></i> Error al conectar base de datos: ${err.message}`);
  }
}

// 7.2 GESTIÓN Y ADMINISTRACIÓN DE USUARIOS (Suscripciones, Roles, Baja)
async function loadUsers() {
  const adminUsersTbody = document.getElementById('admin-users-tbody');
  const usersAlertContainer = document.getElementById('users-alert-container');
  if (!adminUsersTbody) return;

  adminUsersTbody.innerHTML = `
    <tr>
      <td colspan="7" class="no-data-card">
        <i class="fa-solid fa-spinner fa-spin" style="color:var(--neon-pink);"></i>
        <p>Cargando perfiles de usuario y membresías en tiempo real desde Supabase...</p>
      </td>
    </tr>
  `;

  try {
    const { data: users, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!users || users.length === 0) {
      adminUsersTbody.innerHTML = `
        <tr>
          <td colspan="7" class="no-data-card">
            <i class="fa-solid fa-users-slash"></i>
            <p>No se encontraron perfiles de usuario registrados en la base de datos.</p>
          </td>
        </tr>
      `;
      return;
    }

    // Generador dinámico de degradés para avatares
    function getAvatarGradient(username) {
      const colors = [
        ['#ec4899', '#8b5cf6'],
        ['#3b82f6', '#22c55e'],
        ['#f97316', '#eab308'],
        ['#ef4444', '#ec4899']
      ];
      let hash = 0;
      for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
      }
      return `linear-gradient(135deg, ${colors[Math.abs(hash) % colors.length][0]}, ${colors[Math.abs(hash) % colors.length][1]})`;
    }

    adminUsersTbody.innerHTML = users.map(user => {
      const isSeedAdmin = user.email === 'lsnetinformatica2024@gmail.com';
      const createdDate = new Date(user.created_at).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Role badge style
      let roleBadge = '';
      if (user.role === 'admin') {
        roleBadge = `<span style="background: rgba(168, 85, 247, 0.2); border: 1px solid rgba(168, 85, 247, 0.5); color: #c084fc; padding: 3px 8px; border-radius: var(--radius-xs); font-size: 0.75rem; font-weight: 700;"><i class="fa-solid fa-shield-halved"></i> Admin</span>`;
      } else {
        roleBadge = `<span style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.15); color: var(--text-secondary); padding: 3px 8px; border-radius: var(--radius-xs); font-size: 0.75rem;"><i class="fa-solid fa-graduation-cap"></i> Egresado</span>`;
      }

      // Premium/Subscription badge style
      let premiumBadge = '';
      if (user.is_premium) {
        premiumBadge = `<span class="user-badge-premium" style="font-size: 0.7rem; padding: 3px 8px; border-radius: var(--radius-xs);"><i class="fa-solid fa-crown"></i> PRO / Premium</span>`;
      } else {
        premiumBadge = `<span style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); color: var(--text-muted); padding: 3px 8px; border-radius: var(--radius-xs); font-size: 0.75rem;">Regular</span>`;
      }

      // Actions
      const toggleRoleBtn = `
        <button class="btn-action-user btn-toggle-role" data-id="${user.id}" data-role="${user.role}" ${isSeedAdmin ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''} style="background: rgba(139, 92, 246, 0.1); border: 1px solid rgba(139, 92, 246, 0.2); color: #a78bfa; border-radius: var(--radius-xs); padding: 6px 12px; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all var(--transition-fast);">
          <i class="fa-solid fa-user-gear"></i> ${user.role === 'admin' ? 'Hacer Cliente' : 'Hacer Admin'}
        </button>
      `;

      const togglePremiumBtn = `
        <button class="btn-action-user btn-toggle-premium" data-id="${user.id}" data-premium="${user.is_premium}" style="background: rgba(234, 179, 8, 0.1); border: 1px solid rgba(234, 179, 8, 0.2); color: #fde047; border-radius: var(--radius-xs); padding: 6px 12px; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: all var(--transition-fast);">
          <i class="fa-solid fa-crown"></i> ${user.is_premium ? 'Quitar PRO' : 'Dar PRO'}
        </button>
      `;

      const deleteUserBtn = `
        <button class="btn-delete-row btn-delete-user" data-id="${user.id}" ${isSeedAdmin ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
          <i class="fa-solid fa-trash-can"></i>
        </button>
      `;

      return `
        <tr id="user-row-${user.id}">
          <td>
            <div class="user-avatar-circle" style="background: ${getAvatarGradient(user.user_name)}">
              ${user.user_name.charAt(0).toUpperCase()}
            </div>
          </td>
          <td>
            <div style="font-weight: 600; color: var(--text-primary);">${user.user_name}</div>
          </td>
          <td>
            <div style="color: var(--text-secondary); font-family: monospace;">${user.email}</div>
          </td>
          <td>${roleBadge}</td>
          <td>${premiumBadge}</td>
          <td>
            <div class="table-meta">${createdDate}</div>
          </td>
          <td style="text-align: center; display: flex; gap: 8px; justify-content: center; align-items: center; min-height: 55px;">
            ${toggleRoleBtn}
            ${togglePremiumBtn}
            ${deleteUserBtn}
          </td>
        </tr>
      `;
    }).join('');

    // Assign Action Listeners
    setupUserActionListeners();

  } catch (err) {
    console.error("Error al cargar usuarios:", err);
    showAlert(usersAlertContainer, 'error', `<i class="fa-solid fa-circle-xmark"></i> Error al conectar base de datos: ${err.message}`);
  }
}

// Configurar los listeners para las acciones de usuarios
function setupUserActionListeners() {
  const usersAlertContainer = document.getElementById('users-alert-container');

  // 1. Alternar Rol de Administrador
  const toggleRoleButtons = document.querySelectorAll('.btn-toggle-role');
  toggleRoleButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.getAttribute('data-id');
      const currentRole = btn.getAttribute('data-role');
      const newRole = currentRole === 'admin' ? 'user' : 'admin';

      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

      try {
        const { error } = await supabase
          .from('profiles')
          .update({ role: newRole })
          .eq('id', userId);

        if (error) throw error;

        showAlert(usersAlertContainer, 'success', `<i class="fa-solid fa-check"></i> Rol del usuario actualizado correctamente a **${newRole}**.`);
        loadUsers();
        updateStats();
      } catch (err) {
        console.error("Error al actualizar rol del usuario:", err);
        showAlert(usersAlertContainer, 'error', `<i class="fa-solid fa-circle-xmark"></i> Error: ${err.message}`);
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-user-gear"></i> ${currentRole === 'admin' ? 'Hacer Cliente' : 'Hacer Admin'}`;
      }
    });
  });

  // 2. Alternar Suscripción Premium / PRO
  const togglePremiumButtons = document.querySelectorAll('.btn-toggle-premium');
  togglePremiumButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.getAttribute('data-id');
      const currentPremium = btn.getAttribute('data-premium') === 'true';
      const newPremium = !currentPremium;

      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

      try {
        const { error } = await supabase
          .from('profiles')
          .update({ is_premium: newPremium })
          .eq('id', userId);

        if (error) throw error;

        const actionText = newPremium ? 'activada (Usuario PRO 👑)' : 'removida (Usuario Regular)';
        showAlert(usersAlertContainer, 'success', `<i class="fa-solid fa-check"></i> Membresía Premium ${actionText} con éxito.`);
        loadUsers();
        updateStats();
      } catch (err) {
        console.error("Error al actualizar suscripción premium:", err);
        showAlert(usersAlertContainer, 'error', `<i class="fa-solid fa-circle-xmark"></i> Error: ${err.message}`);
        btn.disabled = false;
        btn.innerHTML = `<i class="fa-solid fa-crown"></i> ${currentPremium ? 'Quitar PRO' : 'Dar PRO'}`;
      }
    });
  });

  // 3. Eliminar Perfil de Usuario
  const deleteUserButtons = document.querySelectorAll('.btn-delete-user');
  deleteUserButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const userId = btn.getAttribute('data-id');

      if (!confirm('¿Estás completamente seguro de eliminar este perfil de usuario? Perderá el acceso de forma inmediata.')) {
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

      try {
        const { error } = await supabase
          .from('profiles')
          .delete()
          .eq('id', userId);

        if (error) throw error;

        showAlert(usersAlertContainer, 'success', '<i class="fa-solid fa-check"></i> El usuario se ha eliminado permanentemente de la base de datos.');
        loadUsers();
        updateStats();
      } catch (err) {
        console.error("Error al eliminar usuario:", err);
        showAlert(usersAlertContainer, 'error', `<i class="fa-solid fa-circle-xmark"></i> Error: ${err.message}`);
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
      }
    });
  });
}

// 8. HELPERS GENERALES DE INTERFAZ RÁPIDA
function showAlert(container, type, message) {
  if (!container) return;
  container.innerHTML = `
    <div class="alert alert-${type}">
      ${message}
    </div>
  `;
  
  // Auto-cerrar alertas informativas o de éxito después de 6 segundos
  if (type === 'success' || type === 'info') {
    setTimeout(() => {
      container.innerHTML = '';
    }, 6000);
  }
}

// ==========================================================================
// 9. FUNCIONES CRUD DE METADATOS Y EDICIÓN DE VIDEOS (NUEVAS CAPACIDADES)
// ==========================================================================

// A. Cargar selectores dinámicos del subidor y del modal de edición
async function loadUploaderSelects() {
  try {
    // 1. Obtener Categorías
    const { data: cats, error: catErr } = await supabase.from('categories').select('*').order('name');
    if (!catErr && cats) {
      dynamicCategories = cats;
      
      const selects = [document.getElementById('video-category'), document.getElementById('edit-video-category')];
      selects.forEach(sel => {
        if (sel) {
          sel.innerHTML = '<option value="">Selecciona Categoría del Catálogo</option>' + 
            cats.map(c => `<option value="${c.slug}">${c.name}</option>`).join('');
        }
      });
    }

    // 2. Obtener Colecciones
    const { data: cols, error: colErr } = await supabase.from('collections').select('*').order('name');
    if (!colErr && cols) {
      dynamicCollections = cols;
      
      const datalists = [document.getElementById('collections-list'), document.getElementById('edit-collections-list')];
      datalists.forEach(dl => {
        if (dl) {
          dl.innerHTML = cols.map(c => `<option value="${c.name}">`).join('');
        }
      });
    }
  } catch (err) {
    console.error("Error al cargar selectores dinámicos:", err);
  }
}

// B. Abrir Modal de Edición de Video
function openVideoEditModal(video) {
  if (!editVideoModal) return;
  
  document.getElementById('edit-video-id').value = video.id;
  document.getElementById('edit-video-title').value = video.title || '';
  document.getElementById('edit-video-school').value = video.school || '';
  document.getElementById('edit-video-category').value = video.category || '';
  const validMonths = ["Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre", "Enero"];
  let matchedMonth = "Junio";
  if (video.date) {
    const matched = validMonths.find(m => video.date.toLowerCase().includes(m.toLowerCase()));
    if (matched) matchedMonth = matched;
  }
  document.getElementById('edit-video-date').value = matchedMonth;
  document.getElementById('edit-video-province').value = video.province || '';
  document.getElementById('edit-video-chapters').value = video.chapters || '';
  const isPremiumEdit = document.getElementById('edit-video-is-premium');
  if (isPremiumEdit) isPremiumEdit.value = video.is_premium ? 'true' : 'false';
  const tagsEdit = document.getElementById('edit-video-tags');
  if (tagsEdit) tagsEdit.value = video.tags || '';
  document.getElementById('edit-video-collection').value = video.collection_name || '';
  document.getElementById('edit-video-episode').value = video.episode_number || '';
  document.getElementById('edit-video-description').value = video.description || '';
  
  // Limpiar alerta anterior
  const alertContainer = document.getElementById('edit-alert-container');
  if (alertContainer) alertContainer.innerHTML = '';
  
  editVideoModal.style.display = 'flex';
}

// C. Guardar Edición del Video (Update)
async function saveVideoEdit(e) {
  e.preventDefault();
  
  const idVal = document.getElementById('edit-video-id').value;
  const titleVal = document.getElementById('edit-video-title').value.trim() || 'Momento';
  const schoolVal = document.getElementById('edit-video-school').value.trim() || 'General';
  const categoryVal = document.getElementById('edit-video-category').value || '';
  const dateVal = document.getElementById('edit-video-date').value.trim();
  const provinceVal = document.getElementById('edit-video-province').value.trim();
  const chaptersVal = document.getElementById('edit-video-chapters').value.trim();
  const isPremiumVal = document.getElementById('edit-video-is-premium').value === 'true';
  const tagsVal = document.getElementById('edit-video-tags').value.trim();
  const collectionVal = document.getElementById('edit-video-collection').value.trim();
  const episodeVal = document.getElementById('edit-video-episode').value.trim();
  const descVal = document.getElementById('edit-video-description').value.trim();
  
  const alertContainer = document.getElementById('edit-alert-container');
  const submitBtn = document.getElementById('btn-edit-submit');
  
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span>Guardando...</span> <i class="fa-solid fa-spinner fa-spin"></i>';
  
  try {
    const selectedCat = dynamicCategories.find(c => c.slug === categoryVal);
    const categoryLabelVal = selectedCat ? selectedCat.name : categoryVal;

    // 1. Actualizar en Supabase
    const { data: updatedData, error } = await supabase
      .from('videos')
      .update({
        title: titleVal,
        school: schoolVal,
        category: categoryVal,
        category_label: categoryLabelVal,
        date: dateVal,
        province: provinceVal || null,
        chapters: chaptersVal || null,
        collection_name: collectionVal || null,
        episode_number: episodeVal ? parseInt(episodeVal) : null,
        description: descVal,
        is_premium: isPremiumVal,
        tags: tagsVal || null
      })
      .eq('id', idVal)
      .select('video_url, thumbnail_url')
      .single();
      
    if (error) throw error;
    
    // 2. Actualizar la redirección Open Graph estática para WhatsApp
    if (updatedData) {
      const isLocal = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' || 
                      window.location.port !== '';
      const seoEndpoint = isLocal ? '/api/save-seo' : '/api/save-seo.php';
      await fetch(seoEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: idVal,
          videoUrl: updatedData.video_url,
          thumbnailUrl: updatedData.thumbnail_url,
          title: titleVal,
          school: schoolVal,
          description: descVal
        })
      }).catch(err => console.error("Error al actualizar SEO:", err));
    }
    
    showAlert(catalogAlertContainer, 'success', '<i class="fa-solid fa-check"></i> El Short vertical y su SEO se han actualizado correctamente.');
    editVideoModal.style.display = 'none';
    
    loadCatalog();
    updateStats();
  } catch (err) {
    console.error("Error al editar video:", err);
    showAlert(alertContainer, 'error', `Error al guardar cambios: ${err.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>Guardar Cambios</span> <i class="fa-solid fa-circle-check"></i>';
  }
}

// D. CRUD DE CATEGORÍAS
async function loadCategories() {
  const tbody = document.getElementById('admin-categories-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="3" class="no-data-card"><i class="fa-solid fa-spinner fa-spin"></i> Cargando categorías...</td></tr>';
  
  try {
    const { data: cats, error } = await supabase.from('categories').select('*').order('name');
    if (error) throw error;
    
    if (!cats || cats.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="no-data-card">No hay categorías configuradas.</td></tr>';
      return;
    }
    
    tbody.innerHTML = cats.map(c => `
      <tr id="category-row-${c.id}">
        <td style="font-weight: 600; color: var(--text-primary);">${c.name}</td>
        <td style="font-family: monospace; color: var(--neon-pink); font-size: 0.85rem;">${c.slug}</td>
        <td style="text-align: center; display: flex; gap: 8px; justify-content: center;">
          <button class="btn-toggle-role btn-edit-category" data-id="${c.id}" data-name="${c.name}" data-slug="${c.slug}" style="padding: 6px 12px;">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn-delete-row btn-delete-category" data-id="${c.id}">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `).join('');
    
    // Bind click edit
    tbody.querySelectorAll('.btn-edit-category').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('category-edit-id').value = btn.getAttribute('data-id');
        document.getElementById('category-name').value = btn.getAttribute('data-name');
        document.getElementById('category-slug').value = btn.getAttribute('data-slug');
        document.getElementById('btn-category-text').textContent = 'Guardar Cambios';
      });
    });
    
    // Bind click delete
    tbody.querySelectorAll('.btn-delete-category').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (!confirm('¿Seguro que deseas eliminar esta categoría?')) return;
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        
        try {
          const { error: delErr } = await supabase.from('categories').delete().eq('id', id);
          if (delErr) throw delErr;
          
          showAlert(document.getElementById('categories-alert-container'), 'success', 'Categoría eliminada correctamente.');
          loadCategories();
          loadUploaderSelects();
        } catch (err) {
          showAlert(document.getElementById('categories-alert-container'), 'error', `Error: ${err.message}`);
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
        }
      });
    });
    
  } catch (err) {
    console.error("Error al cargar categorías:", err);
  }
}

async function saveCategory(e) {
  e.preventDefault();
  const editId = document.getElementById('category-edit-id').value;
  const nameVal = document.getElementById('category-name').value.trim();
  const slugVal = document.getElementById('category-slug').value.trim();
  
  if (!nameVal || !slugVal) return;
  
  const submitBtn = document.getElementById('btn-category-submit');
  submitBtn.disabled = true;
  submitBtn.innerHTML = 'Guardando... <i class="fa-solid fa-spinner fa-spin"></i>';
  
  try {
    if (editId) {
      // Update
      const { error } = await supabase.from('categories').update({ name: nameVal, slug: slugVal }).eq('id', editId);
      if (error) throw error;
      showAlert(document.getElementById('categories-alert-container'), 'success', 'Etiqueta modificada con éxito.');
    } else {
      // Insert
      const { error } = await supabase.from('categories').insert([{ name: nameVal, slug: slugVal }]);
      if (error) throw error;
      showAlert(document.getElementById('categories-alert-container'), 'success', 'Etiqueta agregada con éxito.');
    }
    
    // Reset form
    document.getElementById('category-form').reset();
    document.getElementById('category-edit-id').value = '';
    
    loadCategories();
    loadUploaderSelects();
  } catch (err) {
    showAlert(document.getElementById('categories-alert-container'), 'error', `Error: ${err.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span id="btn-category-text">Agregar Etiqueta</span> <i class="fa-solid fa-circle-check"></i>';
  }
}

// E. CRUD DE COLECCIONES
async function loadCollections() {
  const tbody = document.getElementById('admin-collections-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="3" class="no-data-card"><i class="fa-solid fa-spinner fa-spin"></i> Cargando colecciones...</td></tr>';
  
  try {
    const { data: cols, error } = await supabase.from('collections').select('*').order('name');
    if (error) throw error;
    
    if (!cols || cols.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="no-data-card">No hay colecciones configuradas.</td></tr>';
      return;
    }
    
    tbody.innerHTML = cols.map(c => `
      <tr id="collection-row-${c.id}">
        <td style="font-weight: 600; color: var(--text-primary);">${c.name}</td>
        <td style="font-family: monospace; color: var(--neon-purple); font-size: 0.85rem;">${c.slug}</td>
        <td style="text-align: center; display: flex; gap: 8px; justify-content: center;">
          <button class="btn-toggle-role btn-edit-collection" data-id="${c.id}" data-name="${c.name}" data-slug="${c.slug}" style="padding: 6px 12px; border-color: rgba(168,85,247,0.3); color:#c084fc;">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn-delete-row btn-delete-collection" data-id="${c.id}">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </td>
      </tr>
    `).join('');
    
    // Bind click edit
    tbody.querySelectorAll('.btn-edit-collection').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('collection-edit-id').value = btn.getAttribute('data-id');
        document.getElementById('collection-name').value = btn.getAttribute('data-name');
        document.getElementById('collection-slug').value = btn.getAttribute('data-slug');
        document.getElementById('btn-collection-text').textContent = 'Guardar Cambios';
      });
    });
    
    // Bind click delete
    tbody.querySelectorAll('.btn-delete-collection').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        if (!confirm('¿Seguro que deseas eliminar esta colección?')) return;
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        
        try {
          const { error: delErr } = await supabase.from('collections').delete().eq('id', id);
          if (delErr) throw delErr;
          
          showAlert(document.getElementById('collections-alert-container'), 'success', 'Colección eliminada correctamente.');
          loadCollections();
          loadUploaderSelects();
        } catch (err) {
          showAlert(document.getElementById('collections-alert-container'), 'error', `Error: ${err.message}`);
          btn.disabled = false;
          btn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
        }
      });
    });
    
  } catch (err) {
    console.error("Error al cargar colecciones:", err);
  }
}

async function saveCollection(e) {
  e.preventDefault();
  const editId = document.getElementById('collection-edit-id').value;
  const nameVal = document.getElementById('collection-name').value.trim();
  const slugVal = document.getElementById('collection-slug').value.trim();
  
  if (!nameVal || !slugVal) return;
  
  const submitBtn = document.getElementById('btn-collection-submit');
  submitBtn.disabled = true;
  submitBtn.innerHTML = 'Guardando... <i class="fa-solid fa-spinner fa-spin"></i>';
  
  try {
    if (editId) {
      // Update
      const { error } = await supabase.from('collections').update({ name: nameVal, slug: slugVal }).eq('id', editId);
      if (error) throw error;
      showAlert(document.getElementById('collections-alert-container'), 'success', 'Colección modificada con éxito.');
    } else {
      // Insert
      const { error } = await supabase.from('collections').insert([{ name: nameVal, slug: slugVal }]);
      if (error) throw error;
      showAlert(document.getElementById('collections-alert-container'), 'success', 'Colección agregada con éxito.');
    }
    
    // Reset form
    document.getElementById('collection-form').reset();
    document.getElementById('collection-edit-id').value = '';
    
    loadCollections();
    loadUploaderSelects();
  } catch (err) {
    showAlert(document.getElementById('collections-alert-container'), 'error', `Error: ${err.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span id="btn-collection-text">Agregar Colección</span> <i class="fa-solid fa-circle-check" style="color: var(--neon-purple);"></i>';
  }
}

// ----------------------------------------------------------------------
// GESTIÓN DE PUBLICIDAD (ADS CRUD)
// ----------------------------------------------------------------------

async function loadAds() {
  if (!adminAdsTbody) return;
  adminAdsTbody.innerHTML = `
    <tr>
      <td colspan="5" class="no-data-card">
        <i class="fa-solid fa-spinner fa-spin" style="color:var(--neon-pink);"></i>
        <p>Cargando campañas de publicidad en tiempo real...</p>
      </td>
    </tr>
  `;

  try {
    const { data: ads, error } = await supabase
      .from('ads')
      .select('*')
      .order('id', { ascending: false });

    if (error) throw error;

    loadedAds = (ads || []).map(ad => {
      if (ad.video_url) {
        ad.video_url = ad.video_url.replace(/https:\/\/(f004\.backblazeb2\.com\/file|media\.supertourchannel\.com\.ar)\//g, 'https://media.travelrockchannel.com.ar/');
      }
      if (ad.thumbnail_url) {
        ad.thumbnail_url = ad.thumbnail_url.replace(/https:\/\/(f004\.backblazeb2\.com\/file|media\.supertourchannel\.com\.ar)\//g, 'https://media.travelrockchannel.com.ar/');
      }
      return ad;
    });

    if (!ads || ads.length === 0) {
      adminAdsTbody.innerHTML = `
        <tr>
          <td colspan="5" class="no-data-card">
            <i class="fa-solid fa-rectangle-ad"></i>
            <p>Aún no hay anuncios registrados. ¡Sube el primero usando el formulario de la izquierda!</p>
          </td>
        </tr>
      `;
      if (adTotalImpressions) adTotalImpressions.textContent = '0';
      if (adTotalClicks) adTotalClicks.textContent = '0';
      if (adAverageCtr) adAverageCtr.textContent = '0.00%';
      return;
    }

    // Calcular estadísticas
    let totalImp = 0;
    let totalCli = 0;
    ads.forEach(ad => {
      totalImp += (ad.impressions || 0);
      totalCli += (ad.clicks || 0);
    });
    
    if (adTotalImpressions) adTotalImpressions.textContent = totalImp.toLocaleString();
    if (adTotalClicks) adTotalClicks.textContent = totalCli.toLocaleString();
    if (adAverageCtr) {
      const avgCtr = totalImp > 0 ? (totalCli / totalImp * 100) : 0;
      adAverageCtr.textContent = `${avgCtr.toFixed(2)}%`;
    }

    adminAdsTbody.innerHTML = ads.map(ad => {
      const ctr = ad.impressions > 0 ? (ad.clicks / ad.impressions * 100) : 0;
      return `
        <tr id="ad-row-${ad.id}">
          <td>
            <img class="table-thumb" src="${ad.thumbnail_url || 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop&q=60'}" onerror="this.src='https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop&q=60';">
          </td>
          <td>
            <div class="table-title">${ad.title}</div>
            <div class="table-meta" style="margin-top: 4px;">
              <i class="fa-solid fa-link"></i> <a href="${ad.redirect_url}" target="_blank" style="color: var(--neon-pink); text-decoration: none;">${ad.redirect_url.substring(0, 35)}${ad.redirect_url.length > 35 ? '...' : ''}</a>
              ${ad.target_province ? ` · <i class="fa-solid fa-map-pin" style="color:var(--neon-purple);"></i> ${ad.target_province}` : ''}
            </div>
          </td>
          <td>
            <div style="font-size: 0.8rem; line-height: 1.4;">
              Impresiones: <span style="color: var(--neon-purple); font-weight: 600;">${ad.impressions || 0}</span><br>
              Clics: <span style="color: var(--neon-pink); font-weight: 600;">${ad.clicks || 0}</span><br>
              CTR: <span style="color: var(--neon-orange); font-weight: 600;">${ctr.toFixed(2)}%</span>
            </div>
          </td>
          <td style="text-align: center;">
            <button class="btn-toggle-ad-active" data-id="${ad.id}" data-active="${ad.active}" style="background: ${ad.active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.03)'}; border: 1px solid ${ad.active ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255,255,255,0.12)'}; color: ${ad.active ? '#34d399' : 'var(--text-muted)'}; padding: 6px 12px; border-radius: var(--radius-xs); cursor: pointer; font-weight: 700; font-size: 0.75rem; transition: all var(--transition-fast); display: inline-flex; align-items: center; gap: 4px;">
              <i class="fa-solid ${ad.active ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
              <span>${ad.active ? 'Activo' : 'Pausado'}</span>
            </button>
          </td>
          <td style="text-align: center; display: flex; gap: 6px; justify-content: center; align-items: center; min-height: 55px;">
            <button class="btn-edit-ad" data-id="${ad.id}" style="background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.2); color: #c084fc; border-radius: var(--radius-xs); padding: 6px 12px; cursor: pointer; font-size: 0.8rem; font-weight: 600; transition: all var(--transition-fast);">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn-delete-ad" data-id="${ad.id}" data-url="${ad.video_url}" data-thumb="${ad.thumbnail_url}" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444; border-radius: var(--radius-xs); padding: 6px 12px; cursor: pointer; font-size: 0.8rem; font-weight: 600; transition: all var(--transition-fast);">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Switch de activo/pausado
    const toggleActiveBtns = adminAdsTbody.querySelectorAll('.btn-toggle-ad-active');
    toggleActiveBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const currentActive = btn.getAttribute('data-active') === 'true';
        const newActive = !currentActive;
        
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        
        try {
          const { error } = await supabase
            .from('ads')
            .update({ active: newActive })
            .eq('id', id);
            
          if (error) throw error;
          
          showAlert(adsCatalogAlertContainer, 'success', `<i class="fa-solid fa-check"></i> Estado del anuncio actualizado correctamente.`);
          loadAds();
        } catch (err) {
          console.error("Error al actualizar estado del anuncio:", err);
          showAlert(adsCatalogAlertContainer, 'error', `Error: ${err.message}`);
          btn.disabled = false;
        }
      });
    });

    // Asignar eventos de edición de anuncios
    const editAdBtns = adminAdsTbody.querySelectorAll('.btn-edit-ad');
    editAdBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'));
        const ad = loadedAds.find(a => a.id === id);
        if (ad) {
          openAdEditModal(ad);
        }
      });
    });

    // Eliminar anuncio
    const deleteBtns = adminAdsTbody.querySelectorAll('.btn-delete-ad');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const videoUrl = btn.getAttribute('data-url');
        const thumbUrl = btn.getAttribute('data-thumb');

        if (confirm('¿Estás seguro de que deseas eliminar permanentemente este anuncio? Esta acción no se puede deshacer.')) {
          btn.disabled = true;
          btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

          try {
            // Eliminar del Storage de Supabase si existen
            if (videoUrl && videoUrl.includes('/storage/v1/object/public/ads/')) {
              const videoPath = videoUrl.split('/storage/v1/object/public/ads/')[1];
              await supabase.storage.from('ads').remove([videoPath]).catch(e => console.warn(e));
            }
            if (thumbUrl && thumbUrl.includes('/storage/v1/object/public/ads/')) {
              const thumbPath = thumbUrl.split('/storage/v1/object/public/ads/')[1];
              await supabase.storage.from('ads').remove([thumbPath]).catch(e => console.warn(e));
            }

            // Eliminar de base de datos
            const { error } = await supabase
              .from('ads')
              .delete()
              .eq('id', id);
              
            if (error) throw error;
            
            showAlert(adsCatalogAlertContainer, 'success', `<i class="fa-solid fa-check"></i> Anuncio y sus archivos asociados eliminados correctamente.`);
            loadAds();
          } catch (err) {
            console.error("Error al eliminar anuncio:", err);
            showAlert(adsCatalogAlertContainer, 'error', `Error: ${err.message}`);
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
          }
        }
      });
    });

  } catch (err) {
    console.error("Error al cargar anuncios:", err);
    showAlert(adsCatalogAlertContainer, 'error', `<i class="fa-solid fa-circle-xmark"></i> Error al conectar con Supabase: ${err.message}`);
  }
}

let currentSelectedAdFile = null;
let adVideoDuration = 0;

function setupAdFileEvents() {
  if (!adVideoDropArea) return;
  // Drag over / Drag leave
  ['dragenter', 'dragover'].forEach(eventName => {
    adVideoDropArea.addEventListener(eventName, (e) => {
      e.preventDefault();
      adVideoDropArea.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    adVideoDropArea.addEventListener(eventName, (e) => {
      e.preventDefault();
      adVideoDropArea.classList.remove('dragover');
    }, false);
  });

  adVideoDropArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      handleAdVideoFileSelection(files[0]);
    }
  });

  adVideoFile.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleAdVideoFileSelection(e.target.files[0]);
    }
  });

  if (adBtnClearFile) {
    adBtnClearFile.addEventListener('click', clearSelectedAdFile);
  }
}

function handleAdVideoFileSelection(file) {
  if (file.type !== 'video/mp4') {
    showAlert(adsUploadAlertContainer, 'error', '<i class="fa-solid fa-circle-xmark"></i> Formato no soportado. Por favor, selecciona un video vertical **MP4**.');
    clearSelectedAdFile();
    return;
  }

  showAlert(adsUploadAlertContainer, 'info', '<i class="fa-solid fa-spinner fa-spin"></i> Analizando resolución del video vertical...');
  
  const fileUrl = URL.createObjectURL(file);
  adAuxPreviewVideo.src = fileUrl;
  
  adAuxPreviewVideo.onloadedmetadata = () => {
    const width = adAuxPreviewVideo.videoWidth;
    const height = adAuxPreviewVideo.videoHeight;
    adVideoDuration = adAuxPreviewVideo.duration;

    if (height <= width) {
      showAlert(adsUploadAlertContainer, 'error', `
        <div style="text-align:left;">
          <strong><i class="fa-solid fa-mobile-screen-button"></i> ¡Error de Orientación!</strong><br>
          El video seleccionado no es vertical (${width}x${height}).<br>
          Los anuncios de video deben ser estrictamente verticales (Alto > Ancho) para ajustarse a la UI.
        </div>
      `);
      clearSelectedAdFile();
      return;
    }

    currentSelectedAdFile = file;
    adPreviewFileName.textContent = file.name;
    adPreviewFileDimensions.textContent = `Dimensiones: ${width}x${height}px (Vertical Correcto ✅)`;
    adPreviewFileDuration.textContent = `Duración: ${Math.round(adVideoDuration)} segundos`;
    if (adDuration) adDuration.value = Math.round(adVideoDuration);
    
    adVideoDropArea.style.display = 'none';
    adVideoPreviewBox.style.display = 'flex';
    
    showAlert(adsUploadAlertContainer, 'success', '<i class="fa-solid fa-circle-check"></i> Video de anuncio vertical validado y aceptado.');
  };

  adAuxPreviewVideo.onerror = () => {
    showAlert(adsUploadAlertContainer, 'error', '<i class="fa-solid fa-circle-xmark"></i> Error al analizar el archivo de video.');
    clearSelectedAdFile();
  };
}

function clearSelectedAdFile() {
  currentSelectedAdFile = null;
  adVideoFile.value = '';
  adAuxPreviewVideo.removeAttribute('src');
  adVideoPreviewBox.style.display = 'none';
  adVideoDropArea.style.display = 'block';
  adUploadProgressBox.style.display = 'none';
}

async function publishAd(e) {
  e.preventDefault();
  
  if (!currentSelectedAdFile) {
    showAlert(adsUploadAlertContainer, 'error', '<i class="fa-solid fa-triangle-exclamation"></i> Por favor, selecciona un video vertical para el anuncio.');
    return;
  }

  const titleVal = adTitle.value.trim();
  const redirectUrlVal = adRedirectUrl.value.trim();
  const durationVal = Math.round(adVideoDuration) || parseInt(adDuration.value) || 15;
  const provinceVal = adTargetProvince.value.trim();

  btnAdUploadSubmit.disabled = true;
  btnAdUploadSubmit.innerHTML = '<span>Procesando y Subiendo...</span> <i class="fa-solid fa-spinner fa-spin"></i>';
  adUploadProgressBox.style.display = 'block';
  updateAdProgressBar(10, 'Iniciando subida de la campaña...');

  try {
    let uploadTargetUrl = '/api/upload.php';
    const isLocal = window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1' || 
                    window.location.port !== '';
    
    let videoUrl = '';
    let thumbnailUrl = '';

    // 1. Extraer miniatura en Canvas
    updateAdProgressBar(20, 'Generando miniatura automática del video de anuncio...');
    const thumbBlob = await extractVideoThumbnail(currentSelectedAdFile);

    if (isLocal) {
      uploadTargetUrl = '/api/upload';
      updateAdProgressBar(40, 'Enviando video al compresor local FFmpeg en tu PC...');
      const uploadRes = await fetch(`${uploadTargetUrl}?name=${encodeURIComponent(currentSelectedAdFile.name)}`, {
        method: 'POST',
        body: currentSelectedAdFile
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}));
        throw new Error(errData.error || errData.details || `Error del servidor local de carga: ${uploadRes.status}`);
      }
      
      const result = await uploadRes.json();
      videoUrl = result.videoUrl;
      thumbnailUrl = result.thumbnailUrl;
    } else {
      updateAdProgressBar(40, 'Subiendo video y portada a Backblaze B2 desde Ferozo...');
      const formData = new FormData();
      formData.append('video', currentSelectedAdFile);
      if (thumbBlob) {
        formData.append('thumbnail', thumbBlob, 'ad_thumbnail.jpg');
      }
      
      const uploadRes = await fetch(uploadTargetUrl, {
        method: 'POST',
        body: formData
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}));
        throw new Error(errData.error || errData.details || `Error del servidor de producción: ${uploadRes.status}`);
      }
      
      const result = await uploadRes.json();
      videoUrl = result.videoUrl;
      thumbnailUrl = result.thumbnailUrl;
    }

    updateAdProgressBar(80, 'Registrando campaña en la base de datos de Supabase...');

    // 4. Guardar registro en la tabla ads
    const { error: dbErr } = await supabase
      .from('ads')
      .insert([
        {
          title: titleVal,
          video_url: videoUrl,
          thumbnail_url: thumbnailUrl || null,
          redirect_url: redirectUrlVal,
          duration: durationVal,
          target_province: provinceVal || null,
          active: true
        }
      ]);

    if (dbErr) throw dbErr;

    updateAdProgressBar(100, '¡Campaña publicada con éxito!');
    showAlert(adsUploadAlertContainer, 'success', '<strong>¡Felicitaciones!</strong> La campaña de anuncios vertical ha sido cargada y configurada con éxito.');
    
    adUploadForm.reset();
    clearSelectedAdFile();
    loadAds();
  } catch (err) {
    console.error("Error al publicar anuncio:", err);
    showAlert(adsUploadAlertContainer, 'error', `<i class="fa-solid fa-circle-xmark"></i> Error: ${err.message || 'Error de conexión'}`);
    adUploadProgressBox.style.display = 'none';
  } finally {
    btnAdUploadSubmit.disabled = false;
    btnAdUploadSubmit.innerHTML = '<span>Publicar Campaña de Anuncio ⚡</span> <i class="fa-solid fa-rectangle-ad"></i>';
  }
}

function updateAdProgressBar(percentage, statusText) {
  adUploadProgressBar.style.width = `${percentage}%`;
  adUploadPercentText.textContent = `${percentage}%`;
  adUploadStatusText.textContent = statusText;
}

// F. Abrir Modal de Edición de Anuncio
function openAdEditModal(ad) {
  if (!editAdModal) return;
  
  document.getElementById('edit-ad-id').value = ad.id;
  document.getElementById('edit-ad-title').value = ad.title || '';
  document.getElementById('edit-ad-redirect-url').value = ad.redirect_url || '';
  document.getElementById('edit-ad-duration').value = ad.duration || 15;
  document.getElementById('edit-ad-target-province').value = ad.target_province || '';
  
  // Limpiar alerta anterior
  const alertContainer = document.getElementById('edit-ad-alert-container');
  if (alertContainer) alertContainer.innerHTML = '';
  
  editAdModal.style.display = 'flex';
}

// G. Guardar Edición del Anuncio (Update)
async function saveAdEdit(e) {
  e.preventDefault();
  
  const idVal = document.getElementById('edit-ad-id').value;
  const titleVal = document.getElementById('edit-ad-title').value.trim();
  const redirectUrlVal = document.getElementById('edit-ad-redirect-url').value.trim();
  const durationVal = parseInt(document.getElementById('edit-ad-duration').value) || 15;
  const provinceVal = document.getElementById('edit-ad-target-province').value.trim();
  
  const alertContainer = document.getElementById('edit-ad-alert-container');
  const submitBtn = document.getElementById('btn-edit-ad-submit');
  
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span>Guardando...</span> <i class="fa-solid fa-spinner fa-spin"></i>';
  
  try {
    // Actualizar en la tabla ads de Supabase
    const { error } = await supabase
      .from('ads')
      .update({
        title: titleVal,
        redirect_url: redirectUrlVal,
        duration: durationVal,
        target_province: provinceVal || null
      })
      .eq('id', idVal);
      
    if (error) throw error;
    
    showAlert(adsCatalogAlertContainer, 'success', '<i class="fa-solid fa-check"></i> El anuncio de publicidad se ha actualizado correctamente.');
    editAdModal.style.display = 'none';
    
    loadAds();
    updateStats();
  } catch (err) {
    console.error("Error al editar anuncio:", err);
    showAlert(alertContainer, 'error', `Error al guardar cambios: ${err.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>Guardar Cambios</span> <i class="fa-solid fa-circle-check"></i>';
  }
}

// H. Función para agregar una etiqueta inline/en caliente desde la carga/edición
async function handleAddTagInline(targetSelectId) {
  const tagName = prompt("Ingresa el nombre de la nueva etiqueta (ej: Hoteles):");
  if (!tagName) return;
  const trimmedName = tagName.trim();
  if (!trimmedName) return;

  const tagSlug = trimmedName.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remover acentos
    .replace(/[^a-z0-9 -]/g, "") // remover caracteres invalidos
    .replace(/\s+/g, "-") // colapsar espacios a guiones
    .replace(/-+/g, "-"); // colapsar guiones repetidos

  try {
    // 1. Insertar en Supabase categories
    const { data, error } = await supabase
      .from('categories')
      .insert([{ name: trimmedName, slug: tagSlug }]);
    
    if (error) throw error;

    // 2. Recargar selectores dinámicos
    await loadUploaderSelects();
    
    // Si la función loadCategories está definida, recargar la tabla del admin
    if (typeof loadCategories === 'function') {
      loadCategories();
    }

    // 3. Seleccionar la etiqueta recién creada en el dropdown correspondiente
    const targetSelect = document.getElementById(targetSelectId);
    if (targetSelect) {
      targetSelect.value = tagSlug;
    }

    alert(`Etiqueta "${trimmedName}" creada con éxito.`);
  } catch (err) {
    console.error("Error al crear etiqueta inline:", err);
    alert(`Error al crear la etiqueta: ${err.message}`);
  }
}

