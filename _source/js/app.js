/**
 * TravelRock Channel Shorts - Core de Reproducción e Inteligencia (app.js)
 * 
 * Orquesta la reproducción inteligente de videos, Intersection Observer,
 * autoplay con sonido centralizado, me gusta dinámicos, comentarios locales
 * y la renderización en móvil/desktop.
 */

import { videosData } from '../data/videos.js';
import { initNavigation, switchView, triggerLikeAnimation } from './ui.js';

// Estado global de la aplicación
const state = {
  videos: [...videosData],
  activeVideoId: 1,
  isMuted: true, // Muted por defecto debido a políticas de navegadores
  currentFilter: 'all',
  comments: {
    1: [
      { user: "Facundo_2026", text: "¡La mejor noche de mi vida lejos! By Pass explota mal 🔥", time: "Hace 5m" },
      { user: "Sofi.R", text: "Quiero volver yaaaa, no se comparen con nadie", time: "Hace 2h" }
    ],
    2: [
      { user: "Lucas_Cba", text: "Qué golpazo me di en esa bajada jajaja, el mejor día 🏂", time: "Hace 1h" },
      { user: "Marti_G", text: "Faltó la toma de los culipatines al final!", time: "Hace 4h" }
    ],
    3: [
      { user: "Nacho.Tuc", text: "El agua estaba helada pero la adrenalina fue total! 🌊", time: "Hace 20m" }
    ],
    4: [
      { user: "Cande_Nac", text: "Esos chocolates de Rapanui son de otro planeta 🤤🍫", time: "Hace 3h" }
    ],
    5: [
      { user: "Gaby_Viajes", text: "¡Qué postal por favor! Lagrimón con este video 🌲", time: "Hace 30m" }
    ]
  }
};

// Contenedores del DOM
const feedContainer = document.getElementById('shorts-feed-view');
const netflixContainer = document.getElementById('netflix-rows-container');

// Inicialización de la Aplicación
document.addEventListener('DOMContentLoaded', () => {
  renderFeed();
  renderNetflixRows();
  
  // Inicializar navegación de UI
  initNavigation((action, data) => {
    if (action === 'feed' || action === 'explorer') {
      pauseAllVideos();
      if (action === 'feed') {
        setTimeout(playActiveVideo, 100);
      }
    } else if (action === 'filter') {
      state.currentFilter = data;
      filterFeed(data);
    }
  });

  // Configurar observador inteligente para reproducción automática en móviles
  setupIntersectionObserver();

  // Soporte de navegación por teclado en Desktop
  setupKeyboardNavigation();

  // Iniciar reproducción del primer video
  setTimeout(() => {
    playActiveVideo();
  }, 500);
});

// ----------------------------------------------------------------------
// RENDERIZACIÓN DINÁMICA DE ELEMENTOS
// ----------------------------------------------------------------------

// A. Renderizar el Feed de Videos (Estructura móvil y desktop híbrida)
function renderFeed() {
  feedContainer.innerHTML = '';
  const filtered = state.currentFilter === 'all' 
    ? state.videos 
    : state.videos.filter(v => v.category === state.currentFilter);

  if (filtered.length === 0) {
    feedContainer.innerHTML = `
      <div class="glassmorphism" style="padding: 40px; border-radius: 20px; text-align: center; max-width: 320px; margin: 100px auto;">
        <i class="fa-solid fa-video-slash" style="font-size: 3rem; margin-bottom: 20px; color: var(--neon-pink);"></i>
        <h3 style="font-family: var(--font-display); margin-bottom: 8px;">No hay videos</h3>
        <p style="font-size: 0.85rem; color: var(--text-secondary);">Pronto subiremos más shorts espectaculares de esta sección.</p>
      </div>
    `;
    return;
  }

  filtered.forEach((video, index) => {
    const isFirst = index === 0;
    
    // Crear contenedor del short-card
    const card = document.createElement('div');
    card.className = `short-card ${isFirst ? 'active-desktop' : ''}`;
    card.setAttribute('data-video-id', video.id);
    card.id = `short-card-${video.id}`;

    // Layout inmersivo híbrido
    card.innerHTML = `
      <div class="desktop-layout">
        
        <!-- REPRODUCTOR VERTICAL -->
        <div class="player-wrapper">
          <!-- Video Nativo -->
          <video class="short-video" loop playsinline preload="metadata" src="${video.videoUrl}"></video>
          
          <!-- Capa de Sombreado de UI -->
          <div class="video-overlay"></div>
          
          <!-- Micro-animación de Doble Tap -->
          <div class="double-tap-heart"><i class="fa-solid fa-heart"></i></div>
          
          <!-- Botón de Unmute/Sonido Inteligente Flotante -->
          <div class="unmute-overlay-btn ${state.isMuted ? 'visible' : ''}">
            <i class="fa-solid ${state.isMuted ? 'fa-volume-xmark' : 'fa-volume-high'}"></i>
          </div>

          <!-- Acciones Flotantes (Visibles en móvil, ocultas en desktop cine) -->
          <div class="video-actions">
            <div class="action-btn-wrapper">
              <button class="action-btn btn-like" data-id="${video.id}">
                <i class="fa-solid fa-heart"></i>
              </button>
              <span class="action-count count-like">${video.likes}</span>
            </div>
            
            <div class="action-btn-wrapper">
              <button class="action-btn btn-comments-mobile" data-id="${video.id}">
                <i class="fa-solid fa-comment"></i>
              </button>
              <span class="action-count">${state.comments[video.id] ? state.comments[video.id].length : 0}</span>
            </div>
            
            <div class="action-btn-wrapper">
              <button class="action-btn btn-share" data-id="${video.id}">
                <i class="fa-solid fa-share-nodes"></i>
              </button>
              <span class="action-count">Compartir</span>
            </div>

            <div class="action-btn-wrapper">
              <button class="action-btn btn-fullscreen">
                <i class="fa-solid fa-expand"></i>
              </button>
            </div>
          </div>

          <!-- Info Flotante (badge, título y descripción) -->
          <div class="video-info-panel">
            <span class="school-badge"><i class="fa-solid fa-graduation-cap"></i> ${video.school}</span>
            <h3 class="video-title-text">${video.title}</h3>
            <p class="video-desc-text">${video.description}</p>
          </div>

          <!-- Barra de Progreso Fina -->
          <div class="video-progress-bar">
            <div class="video-progress-fill"></div>
          </div>
        </div>

        <!-- PANEL DE DETALLES LATERAL GLASSMORPHISM (Exclusivo Desktop Cine) -->
        <div class="side-panel">
          <div class="side-panel-header">
            <span class="school-badge"><i class="fa-solid fa-graduation-cap"></i> ${video.school}</span>
            <h2 class="side-panel-title">${video.title}</h2>
            <div class="side-panel-meta">
              <span><i class="fa-solid fa-calendar"></i> ${video.date}</span>
              <span><i class="fa-solid fa-heart"></i> <strong class="desktop-like-count">${video.likes}</strong> likes</span>
            </div>
          </div>

          <div class="side-panel-body">
            <!-- Anécdota y Detalles -->
            <div class="experience-box">
              <h4>La anécdota del día ❄️</h4>
              <p>${video.description}</p>
            </div>

            <!-- Botones Rápidos de Interacción Desktop -->
            <div style="display:flex; gap:12px; margin-bottom:8px;">
              <button class="premium-btn btn-like-desktop" data-id="${video.id}" style="flex:1;">
                <i class="fa-solid fa-heart"></i> Like
              </button>
              <button class="premium-btn btn-share-desktop" data-id="${video.id}" style="flex:1;">
                <i class="fa-solid fa-share-nodes"></i> Compartir
              </button>
            </div>

            <!-- Sección de Comentarios Interactivos -->
            <div class="interactive-comments-section">
              <h4>Comentarios de los Chicos (<span class="comment-count-text">${state.comments[video.id] ? state.comments[video.id].length : 0}</span>)</h4>
              <div class="comments-list" id="comments-list-${video.id}">
                ${renderCommentsHtml(video.id)}
              </div>
              
              <!-- Input de Comentarios -->
              <div class="comment-input-wrapper">
                <input type="text" class="comment-input" placeholder="Sumá tu anécdota..." data-id="${video.id}">
                <button class="comment-submit-btn btn-comment-submit" data-id="${video.id}">
                  <i class="fa-solid fa-paper-plane"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    `;

    feedContainer.appendChild(card);
    
    // Configurar interacciones particulares para este video
    setupVideoControls(card, video);
  });

  // Re-evaluar mute en la UI al renderizar
  updateMuteIconGlobally();
}

// B. Renderizar Filas de Carruseles Estilo Netflix en el Explorer
function renderNetflixRows() {
  netflixContainer.innerHTML = '';
  
  // Categorías que tenemos en nuestra base de datos
  const categories = [
    { key: 'boliche', label: 'Boliches & Fiesta Nocturna' },
    { key: 'aventura', label: 'Aventura en la Nieve & Montañas' },
    { key: 'lifestyle', label: 'Lifestyle, Hoteles y Chocolates' },
    { key: 'emociones', label: 'Momentos Mágicos del Viaje' }
  ];

  categories.forEach(cat => {
    const rowVideos = state.videos.filter(v => v.category === cat.key);
    if (rowVideos.length === 0) return;

    // Crear la fila
    const row = document.createElement('div');
    row.className = 'netflix-row';
    
    row.innerHTML = `
      <h3 class="row-title">${cat.label}</h3>
      <div class="row-carousel">
        ${rowVideos.map(video => `
          <div class="netflix-card" data-video-id="${video.id}">
            <img class="netflix-card-img" src="${video.thumbnailUrl}" onerror="this.src='https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop&q=60';" alt="${video.title}">
            <div class="netflix-card-overlay">
              <span class="netflix-card-school">${video.school.split(' - ')[0]}</span>
              <h4 class="netflix-card-title">${video.title}</h4>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    netflixContainer.appendChild(row);
  });

  // Asignar click a cada tarjeta de Netflix para reproducir al instante
  const netflixCards = netflixContainer.querySelectorAll('.netflix-card');
  netflixCards.forEach(card => {
    card.addEventListener('click', () => {
      const id = parseInt(card.getAttribute('data-video-id'));
      state.activeVideoId = id;
      
      // Cambiar a vista feed
      switchView('feed');
      
      // En Desktop: Buscar el card en el DOM y marcarlo activo
      if (window.innerWidth >= 992) {
        document.querySelectorAll('.short-card').forEach(c => c.classList.remove('active-desktop'));
        const targetCard = document.getElementById(`short-card-${id}`);
        if (targetCard) targetCard.classList.add('active-desktop');
      } else {
        // En móvil: Scroll hasta el elemento
        const targetCard = document.getElementById(`short-card-${id}`);
        if (targetCard) {
          targetCard.scrollIntoView({ behavior: 'smooth' });
        }
      }

      // Reiniciar y reproducir
      setTimeout(playActiveVideo, 200);
    });
  });
}

// Genera el HTML de comentarios para un video específico
function renderCommentsHtml(videoId) {
  const videoComments = state.comments[videoId] || [];
  if (videoComments.length === 0) {
    return `<p class="no-comments-text" style="color:var(--text-muted); font-size:0.75rem; text-align:center; padding:10px;">¡Sé el primero en comentar!</p>`;
  }
  
  return videoComments.map(c => `
    <div class="comment-item">
      <div class="comment-user">
        ${c.user} <span>${c.time}</span>
      </div>
      <div class="comment-text">${c.text}</div>
    </div>
  `).join('');
}

// ----------------------------------------------------------------------
// GESTIÓN DE CONTROLES E INTERACCIONES DE VIDEO
// ----------------------------------------------------------------------

function setupVideoControls(card, videoData) {
  const video = card.querySelector('.short-video');
  const playerWrapper = card.querySelector('.player-wrapper');
  const progressFill = card.querySelector('.video-progress-fill');
  const progressBar = card.querySelector('.video-progress-bar');
  const unmuteBtn = card.querySelector('.unmute-overlay-btn');
  const doubleHeart = card.querySelector('.double-tap-heart');

  // A. Eventos de Reproducción y Mute
  
  // Click simple en pantalla: Play/Pause
  video.addEventListener('click', togglePlayPause);
  
  // Click en botón central de mute
  unmuteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    state.isMuted = !state.isMuted;
    updateMuteIconGlobally();
  });

  function togglePlayPause() {
    if (video.paused) {
      video.play().catch(err => console.log("Autoplay bloqueado:", err));
      unmuteBtn.classList.remove('visible');
    } else {
      video.pause();
      // Mostrar mute button como play indicador si está pausado
      unmuteBtn.querySelector('i').className = 'fa-solid fa-play';
      unmuteBtn.classList.add('visible');
    }
  }

  // B. Barra de Progreso
  video.addEventListener('timeupdate', () => {
    if (video.duration) {
      const percentage = (video.currentTime / video.duration) * 100;
      progressFill.style.width = `${percentage}%`;
    }
  });

  // Adelantar/retroceder clickeando la barra
  progressBar.addEventListener('click', (e) => {
    const rect = progressBar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    video.currentTime = pos * video.duration;
  });

  // C. Interacciones de Like (Corazón)
  const likeBtnMobile = card.querySelector('.btn-like');
  const likeBtnDesktop = card.querySelector('.btn-like-desktop');
  const likeCountTextMobile = card.querySelector('.count-like');
  const likeCountTextDesktop = card.querySelector('.desktop-like-count');

  // Acción de Dar Like
  function giveLike() {
    const videoObj = state.videos.find(v => v.id === videoData.id);
    if (!videoObj.hasLiked) {
      videoObj.likes += 1;
      videoObj.hasLiked = true;
      
      // Actualizar interfaz
      likeCountTextMobile.textContent = videoObj.likes;
      if (likeCountTextDesktop) likeCountTextDesktop.textContent = videoObj.likes;
      
      // Clases activas de Like
      likeBtnMobile.classList.add('liked');
      if (likeBtnDesktop) {
        likeBtnDesktop.classList.add('liked');
        likeBtnDesktop.innerHTML = `<i class="fa-solid fa-heart"></i> Liked!`;
      }
      
      triggerLikeAnimation(likeBtnMobile);
    }
  }

  likeBtnMobile.addEventListener('click', giveLike);
  if (likeBtnDesktop) likeBtnDesktop.addEventListener('click', giveLike);

  // Doble Tap para dar Like con animación
  let lastTap = 0;
  playerWrapper.addEventListener('click', (e) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    
    // Evitar disparar si se hace clic en botones flotantes
    if (e.target.closest('.video-actions') || e.target.closest('.video-progress-bar') || e.target.closest('.unmute-overlay-btn')) {
      return;
    }

    if (tapLength < 300 && tapLength > 0) {
      e.preventDefault();
      // Animación de corazón
      doubleHeart.className = 'double-tap-heart animate';
      setTimeout(() => {
        doubleHeart.classList.remove('animate');
      }, 800);

      giveLike();
    }
    lastTap = currentTime;
  });

  // D. Botón Compartir
  const shareBtnMobile = card.querySelector('.btn-share');
  const shareBtnDesktop = card.querySelector('.btn-share-desktop');

  function shareVideo() {
    const shareText = `¡Mirá este momentazo en Bariloche de ${videoData.school}! 🏂🌲 ${videoData.title}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'TravelRock Shorts',
        text: shareText,
        url: window.location.href
      }).catch(err => console.log(err));
    } else {
      // Fallback: Copiar enlace
      navigator.clipboard.writeText(window.location.href);
      
      // Toast elegante flotante
      const toast = document.createElement('div');
      toast.className = 'glassmorphism';
      toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        padding: 12px 24px;
        border-radius: var(--radius-full);
        font-family: var(--font-display);
        font-size: 0.85rem;
        font-weight: 600;
        border-color: var(--neon-pink);
        color: #fff;
        z-index: 200;
        opacity: 0;
        transition: all 0.3s ease;
      `;
      toast.innerHTML = `<i class="fa-solid fa-check" style="color:var(--neon-pink); margin-right:8px;"></i> ¡Enlace copiado al portapapeles!`;
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
      }, 100);

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
        setTimeout(() => toast.remove(), 300);
      }, 2500);
    }
  }

  shareBtnMobile.addEventListener('click', shareVideo);
  if (shareBtnDesktop) shareBtnDesktop.addEventListener('click', shareVideo);

  // E. Botón Fullscreen (Móvil)
  const fullscreenBtn = card.querySelector('.btn-fullscreen');
  fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      playerWrapper.requestFullscreen().catch(err => {
        console.log(`Error al activar pantalla completa: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  });

  // F. Gestión de comentarios Desktop
  const commentsList = card.querySelector('.comments-list');
  const commentInput = card.querySelector('.comment-input');
  const commentSubmitBtn = card.querySelector('.btn-comment-submit');
  const commentsMobileBtn = card.querySelector('.btn-comments-mobile');

  function addComment() {
    const text = commentInput.value.trim();
    if (!text) return;

    const newComment = {
      user: "Egresado_TR",
      text: text,
      time: "Ahora"
    };

    if (!state.comments[videoData.id]) {
      state.comments[videoData.id] = [];
    }

    state.comments[videoData.id].unshift(newComment);
    commentInput.value = '';

    // Renderizar
    commentsList.innerHTML = renderCommentsHtml(videoData.id);
    
    // Actualizar conteos
    const commentCountElements = card.querySelectorAll('.comment-count-text');
    commentCountElements.forEach(el => el.textContent = state.comments[videoData.id].length);

    // Animación de envío
    commentSubmitBtn.style.transform = 'scale(0.8)';
    setTimeout(() => commentSubmitBtn.style.transform = '', 150);
  }

  if (commentSubmitBtn) {
    commentSubmitBtn.addEventListener('click', addComment);
    commentInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addComment();
    });
  }

  // En móvil, click en comentarios abre un alert o simulación rápida
  commentsMobileBtn.addEventListener('click', () => {
    alert(`Anécdotas en Bariloche:\n\n` + state.comments[videoData.id].map(c => `• ${c.user}: ${c.text}`).join('\n'));
  });
}

// ----------------------------------------------------------------------
// LÓGICA DE REPRODUCCIÓN AUTOMÁTICA INTELIGENTE
// ----------------------------------------------------------------------

// Actualizar el estado de sonido global en la UI
function updateMuteIconGlobally() {
  const videos = document.querySelectorAll('.short-video');
  const unmuteButtons = document.querySelectorAll('.unmute-overlay-btn');

  videos.forEach(v => {
    v.muted = state.isMuted;
  });

  unmuteButtons.forEach(btn => {
    const icon = btn.querySelector('i');
    if (state.isMuted) {
      icon.className = 'fa-solid fa-volume-xmark';
      btn.classList.add('visible');
    } else {
      icon.className = 'fa-solid fa-volume-high';
      btn.classList.remove('visible');
    }
  });
}

// Setup del Intersection Observer para Móviles (detección de scroll vertical snap)
function setupIntersectionObserver() {
  const observerOptions = {
    root: feedContainer,
    rootMargin: '0px',
    threshold: 0.6 // El video debe estar al menos al 60% visible para activarse
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const card = entry.target;
      const video = card.querySelector('.short-video');
      const id = parseInt(card.getAttribute('data-video-id'));

      if (entry.isIntersecting) {
        state.activeVideoId = id;
        
        // Pausar todos los demás primero
        pauseAllVideos();
        
        // Reproducir este
        video.muted = state.isMuted;
        video.play().catch(err => {
          console.log("Autoplay bloqueado esperando interacción del usuario", err);
          // Si el autoplay falla, mostramos el botón de unmute grande como indicador
          card.querySelector('.unmute-overlay-btn').classList.add('visible');
        });

        // Configuración de interfaz Desktop (Modo Cine)
        if (window.innerWidth >= 992) {
          document.querySelectorAll('.short-card').forEach(c => c.classList.remove('active-desktop'));
          card.classList.add('active-desktop');
        }

        // Pre-carga (prefetch) inteligente del siguiente video de la lista
        preloadNextVideo(id);
      } else {
        video.pause();
      }
    });
  }, observerOptions);

  // Observar cada short-card
  document.querySelectorAll('.short-card').forEach(card => observer.observe(card));
}

// Pausar absolutamente todos los videos
function pauseAllVideos() {
  document.querySelectorAll('.short-video').forEach(video => {
    video.pause();
  });
}

// Reproducir activamente el video seleccionado en el estado
function playActiveVideo() {
  const activeCard = document.getElementById(`short-card-${state.activeVideoId}`);
  if (!activeCard) return;

  const video = activeCard.querySelector('.short-video');
  const unmuteBtn = activeCard.querySelector('.unmute-overlay-btn');
  
  pauseAllVideos();
  
  video.muted = state.isMuted;
  video.currentTime = 0; // Iniciar desde el principio
  video.play()
    .then(() => {
      if (!state.isMuted) {
        unmuteBtn.classList.remove('visible');
      }
    })
    .catch(err => {
      console.log("Esperando interacción para reproducir:", err);
      unmuteBtn.classList.add('visible');
    });

  // Actualizar UI activa en desktop
  if (window.innerWidth >= 992) {
    document.querySelectorAll('.short-card').forEach(c => c.classList.remove('active-desktop'));
    activeCard.classList.add('active-desktop');
  }
}

// Precarga del siguiente video (Prefetch inteligente)
function preloadNextVideo(currentId) {
  const currentIndex = state.videos.findIndex(v => v.id === currentId);
  if (currentIndex !== -1 && currentIndex < state.videos.length - 1) {
    const nextVideoData = state.videos[currentIndex + 1];
    const nextCard = document.getElementById(`short-card-${nextVideoData.id}`);
    if (nextCard) {
      const nextVideoElement = nextCard.querySelector('.short-video');
      nextVideoElement.setAttribute('preload', 'auto');
    }
  }
}

// Filtrar feed por categoría
function filterFeed(category) {
  renderFeed();
  
  // Si filtramos, el primer video de la lista se convierte en el activo
  const filtered = category === 'all' 
    ? state.videos 
    : state.videos.filter(v => v.category === category);
    
  if (filtered.length > 0) {
    state.activeVideoId = filtered[0].id;
    
    // Configurar IntersectionObserver de nuevo para los nuevos elementos
    setupIntersectionObserver();
    
    setTimeout(() => {
      playActiveVideo();
    }, 100);
  }
}

// ----------------------------------------------------------------------
// NAVEGACIÓN TECLADO (DESKTOP CINE)
// ----------------------------------------------------------------------
function setupKeyboardNavigation() {
  document.addEventListener('keydown', (e) => {
    // Si el usuario está escribiendo en el input de comentarios, no hacer nada
    if (document.activeElement.classList.contains('comment-input')) {
      return;
    }

    const filtered = state.currentFilter === 'all'
      ? state.videos
      : state.videos.filter(v => v.category === state.currentFilter);
      
    const currentIndex = filtered.findIndex(v => v.id === state.activeVideoId);

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      // Siguiente video
      if (currentIndex < filtered.length - 1) {
        e.preventDefault();
        state.activeVideoId = filtered[currentIndex + 1].id;
        
        // En Desktop: reproducir directamente. En Móvil: el scrollsnap se encarga pero también podemos empujarlo
        if (window.innerWidth >= 992) {
          playActiveVideo();
        } else {
          document.getElementById(`short-card-${state.activeVideoId}`).scrollIntoView({ behavior: 'smooth' });
        }
      }
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      // Video anterior
      if (currentIndex > 0) {
        e.preventDefault();
        state.activeVideoId = filtered[currentIndex - 1].id;
        
        if (window.innerWidth >= 992) {
          playActiveVideo();
        } else {
          document.getElementById(`short-card-${state.activeVideoId}`).scrollIntoView({ behavior: 'smooth' });
        }
      }
    } else if (e.key === ' ') {
      // Espacio: Play/Pause del video activo
      e.preventDefault();
      const activeCard = document.getElementById(`short-card-${state.activeVideoId}`);
      if (activeCard) {
        const video = activeCard.querySelector('.short-video');
        if (video.paused) video.play();
        else video.pause();
      }
    }
  });
}
