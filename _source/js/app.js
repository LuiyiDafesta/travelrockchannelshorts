/**
 * TravelRock Channel Shorts - Core de Reproducción e Inteligencia (app.js)
 * 
 * Orquesta la reproducción inteligente de videos, Intersection Observer,
 * autoplay con sonido centralizado, me gusta dinámicos, comentarios locales
 * y la renderización en móvil/desktop.
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { initNavigation, switchView, triggerLikeAnimation } from './ui.js?v=1.1.0';

// 1. CONEXIÓN A SUPABASE
const supabaseUrl = 'https://qtrcutddajulnwyzdwtc.supabase.co';
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

// Estado global de la aplicación (se cargará dinámicamente de Supabase)
const state = {
  videos: [],
  ads: [], // Anuncios activos cargados desde Supabase
  activeVideoId: 1,
  isMuted: false, // Por defecto siempre activado (solicitud del usuario)
  currentFilter: 'all',
  comments: {}
};

// Variable para almacenar la sesión del cliente
let clientSession = null;

// Helper de hashing para avatares HSL
function getHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function generateAvatarStyle(name) {
  const h = getHash(name) % 360;
  return `linear-gradient(135deg, hsl(${h}, 80%, 60%) 0%, hsl(${(h + 40) % 360}, 85%, 50%) 100%)`;
}

// Cargar la sesión del cliente al inicio
async function loadClientSession() {
  const local = localStorage.getItem('tr_client_session');
  if (local) {
    clientSession = JSON.parse(local);
    // Sincronizar dinámicamente con Supabase en cada carga de página para evitar datos obsoletos en caché
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq(clientSession.id ? 'id' : 'email', clientSession.id || clientSession.email)
        .single();
      if (profile) {
        clientSession = profile;
        localStorage.setItem('tr_client_session', JSON.stringify(profile));
      }
    } catch (e) {
      console.warn("No se pudo sincronizar la sesión local con Supabase:", e);
    }
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      if (profile) {
        clientSession = profile;
        localStorage.setItem('tr_client_session', JSON.stringify(profile));
      }
    }
  } catch (err) {
    console.error("Error al cargar la sesión de Supabase:", err);
  }
  updateUserUI();
}

// Sincronizar activamente el estado de la sesión con la base de datos para evitar datos obsoletos en caché
async function syncSessionWithDatabase() {
  if (clientSession) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq(clientSession.id ? 'id' : 'email', clientSession.id || clientSession.email)
        .single();
      if (profile) {
        if (clientSession.is_premium !== profile.is_premium) {
          console.log(`Sincronización de Sesión: Estado premium cambiado de ${clientSession.is_premium} a ${profile.is_premium}`);
          clientSession = profile;
          localStorage.setItem('tr_client_session', JSON.stringify(profile));
          updateUserUI();
        } else {
          clientSession = profile;
          localStorage.setItem('tr_client_session', JSON.stringify(profile));
        }
      }
    } catch (e) {
      console.warn("No se pudo sincronizar la sesión con Supabase:", e);
    }
  }
}

// Actualizar la interfaz de usuario en base a la sesión
function updateUserUI() {
  const sidebarBtnLogin = document.getElementById('sidebar-btn-login');
  const sidebarUserLogged = document.getElementById('sidebar-user-logged');
  const sidebarUserAvatar = document.getElementById('sidebar-user-avatar');
  const sidebarUserName = document.getElementById('sidebar-user-name');
  const sidebarRoleBadge = sidebarUserLogged ? sidebarUserLogged.querySelector('span[style*="font-size: 0.65rem"]') : null;

  const mobileAuthBtn = document.getElementById('mobile-btn-login');
  const mobileUserAvatar = document.getElementById('mobile-user-avatar');
  const premiumSidebarCard = document.querySelector('.sidebar-premium-card');
  const mobileHeaderPremiumBtn = document.getElementById('mobile-header-premium-btn');

  // Elementos de administración
  const sidebarBtnAdmin = document.getElementById('sidebar-btn-admin');
  const mobileBtnAdmin = document.getElementById('mobile-btn-admin');

  if (clientSession) {
    // Usuario Logueado
    if (sidebarBtnLogin) sidebarBtnLogin.classList.add('hidden');
    if (sidebarUserLogged) sidebarUserLogged.classList.remove('hidden');
    
    const dispName = clientSession.user_name || clientSession.email.split('@')[0];
    
    if (sidebarUserName) sidebarUserName.textContent = dispName;
    if (sidebarUserAvatar) {
      sidebarUserAvatar.textContent = dispName.charAt(0).toUpperCase();
      sidebarUserAvatar.style.background = generateAvatarStyle(dispName);
    }
    
    if (mobileAuthBtn) mobileAuthBtn.classList.add('hidden');
    if (mobileUserAvatar) {
      mobileUserAvatar.classList.remove('hidden');
      mobileUserAvatar.textContent = dispName.charAt(0).toUpperCase();
      mobileUserAvatar.style.background = generateAvatarStyle(dispName);
    }

    if (clientSession.is_premium) {
      if (sidebarRoleBadge) {
        sidebarRoleBadge.innerHTML = clientSession.role === 'admin' ? 'Admin 👑' : 'PRO 👑';
        sidebarRoleBadge.className = 'user-badge-premium';
      }
      if (premiumSidebarCard) premiumSidebarCard.style.display = 'none';
      if (mobileHeaderPremiumBtn) {
        mobileHeaderPremiumBtn.style.color = '#fde047';
        mobileHeaderPremiumBtn.style.textShadow = '0 0 10px rgba(253, 224, 71, 0.6)';
      }
    } else {
      if (sidebarRoleBadge) {
        sidebarRoleBadge.innerHTML = clientSession.role === 'admin' ? 'Admin ⚙️' : 'Egresado 🎓';
        sidebarRoleBadge.className = clientSession.role === 'admin' ? 'user-badge-premium' : '';
      }
      if (premiumSidebarCard) premiumSidebarCard.style.display = 'block';
      if (mobileHeaderPremiumBtn) {
        mobileHeaderPremiumBtn.style.color = '';
        mobileHeaderPremiumBtn.style.textShadow = '';
      }
    }

    // Mostrar/ocultar enlaces de administración según rol
    if (clientSession.role === 'admin') {
      if (sidebarBtnAdmin) sidebarBtnAdmin.classList.remove('hidden');
      if (mobileBtnAdmin) mobileBtnAdmin.classList.remove('hidden');
    } else {
      if (sidebarBtnAdmin) sidebarBtnAdmin.classList.add('hidden');
      if (mobileBtnAdmin) mobileBtnAdmin.classList.add('hidden');
    }
  } else {
    // Invitado (No Logueado)
    if (sidebarBtnLogin) sidebarBtnLogin.classList.remove('hidden');
    if (sidebarUserLogged) sidebarUserLogged.classList.add('hidden');
    
    if (mobileAuthBtn) mobileAuthBtn.classList.remove('hidden');
    if (mobileUserAvatar) mobileUserAvatar.classList.add('hidden');
    if (premiumSidebarCard) premiumSidebarCard.style.display = 'block';
    if (mobileHeaderPremiumBtn) {
      mobileHeaderPremiumBtn.style.color = '';
      mobileHeaderPremiumBtn.style.textShadow = '';
    }

    if (sidebarBtnAdmin) sidebarBtnAdmin.classList.add('hidden');
    if (mobileBtnAdmin) mobileBtnAdmin.classList.add('hidden');
  }

  // Refrescar dinámicamente las vistas del frontend si ya se cargaron los videos
  if (state.videos && state.videos.length > 0) {
    renderFeed();
    renderNetflixFeatured();
    renderNetflixRanking();
    renderNetflixRows();
    renderNetflixGrid(getFilteredVideos());
  }
}

// Abrir modal de autenticación
function openAuthModal(defaultTab = 'login') {
  pauseAllVideos(); // Pausar videos activos en login
  const modal = document.getElementById('client-auth-modal');
  if (modal) {
    modal.classList.add('active');
    switchAuthTab(defaultTab);
  }
}

// Cerrar modal de autenticación
function closeAuthModal() {
  const modal = document.getElementById('client-auth-modal');
  if (modal) modal.classList.remove('active');
}

// Cambiar de pestaña (Login / Registro)
function switchAuthTab(tab) {
  const btnTabLogin = document.getElementById('btn-tab-login');
  const btnTabRegister = document.getElementById('btn-tab-register');
  const groupUsername = document.getElementById('group-auth-username');
  const btnSubmitText = document.getElementById('btn-auth-text');
  const btnSubmitIcon = document.getElementById('btn-auth-icon');
  const modalSubtitle = document.getElementById('auth-modal-subtitle');
  const alertContainer = document.getElementById('auth-alert-container');
  
  if (alertContainer) alertContainer.innerHTML = '';
  
  if (tab === 'login') {
    btnTabLogin.classList.add('active');
    btnTabLogin.style.background = 'var(--primary-gradient)';
    btnTabLogin.style.boxShadow = 'var(--neon-glow-pink)';
    btnTabLogin.style.color = 'white';
    
    btnTabRegister.classList.remove('active');
    btnTabRegister.style.background = 'transparent';
    btnTabRegister.style.boxShadow = 'none';
    btnTabRegister.style.color = 'var(--text-secondary)';
    
    if (groupUsername) groupUsername.classList.add('hidden');
    if (btnSubmitText) btnSubmitText.textContent = 'Ingresar ahora';
    if (btnSubmitIcon) btnSubmitIcon.className = 'fa-solid fa-right-to-bracket';
    if (modalSubtitle) modalSubtitle.textContent = 'Inicia sesión para guardar favoritos y chatear';
  } else {
    btnTabRegister.classList.add('active');
    btnTabRegister.style.background = 'var(--primary-gradient)';
    btnTabRegister.style.boxShadow = 'var(--neon-glow-pink)';
    btnTabRegister.style.color = 'white';
    
    btnTabLogin.classList.remove('active');
    btnTabLogin.style.background = 'transparent';
    btnTabLogin.style.boxShadow = 'none';
    btnTabLogin.style.color = 'var(--text-secondary)';
    
    if (groupUsername) groupUsername.classList.remove('hidden');
    if (btnSubmitText) btnSubmitText.textContent = 'Registrarse y comenzar';
    if (btnSubmitIcon) btnSubmitIcon.className = 'fa-solid fa-user-plus';
    if (modalSubtitle) modalSubtitle.textContent = 'Unite al Club Egresados y viví la experiencia';
  }
}

// Procesar el formulario de inicio de sesión o registro
async function handleClientAuthSubmit() {
  const isLogin = document.getElementById('btn-tab-login').classList.contains('active');
  const emailInput = document.getElementById('auth-email');
  const passInput = document.getElementById('auth-password');
  const userinput = document.getElementById('auth-username');
  const alertContainer = document.getElementById('auth-alert-container');
  const submitBtn = document.getElementById('btn-auth-submit');
  
  if (!emailInput.value || !passInput.value || (!isLogin && !userinput.value)) {
    showAlert('Por favor, completa todos los campos requeridos.', 'danger');
    return;
  }

  submitBtn.disabled = true;
  const originalHtml = submitBtn.innerHTML;
  submitBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Procesando...`;

  function showAlert(msg, type = 'danger') {
    if (!alertContainer) return;
    alertContainer.innerHTML = `
      <div class="glassmorphism" style="padding: 10px 14px; border-radius: var(--radius-sm); font-size: 0.8rem; font-weight: 600; border-color: ${type === 'danger' ? 'var(--neon-pink)' : '#22c55e'}; background: ${type === 'danger' ? 'rgba(236, 72, 153, 0.1)' : 'rgba(34, 197, 94, 0.1)'}; color: #fff; margin-top: 10px;">
        <i class="fa-solid ${type === 'danger' ? 'fa-triangle-exclamation' : 'fa-circle-check'}" style="color: ${type === 'danger' ? 'var(--neon-pink)' : '#22c55e'}; margin-right: 8px;"></i>
        ${msg}
      </div>
    `;
  }

  try {
    if (isLogin) {
      // 1. Iniciar sesión en Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailInput.value.trim(),
        password: passInput.value
      });
      
      if (error) {
        // Fallback local especial para el administrador semilla
        if (emailInput.value.trim().toLowerCase() === 'lsnetinformatica2024@gmail.com' && passInput.value === 'Luiyi260879@') {
          // Intentar obtener el perfil real de la base de datos para respetar su estado premium
          let dbIsPremium = true;
          try {
            const { data: prof } = await supabase
              .from('profiles')
              .select('is_premium')
              .eq('email', 'lsnetinformatica2024@gmail.com')
              .single();
            if (prof) {
              dbIsPremium = prof.is_premium;
            }
          } catch (e) {
            console.error("Error al obtener perfil del admin en login:", e);
          }

          clientSession = {
            id: 'admin-seed-id-lsnet',
            email: 'lsnetinformatica2024@gmail.com',
            user_name: 'Luiyi Admin',
            role: 'admin',
            is_premium: dbIsPremium
          };
          localStorage.setItem('tr_client_session', JSON.stringify(clientSession));
          showAlert('¡Inicio de sesión exitoso como Admin! 🎉', 'success');
          setTimeout(() => {
            closeAuthModal();
            updateUserUI();
          }, 1000);
          return;
        }

        // Fallback local por si el usuario no tiene correo validado pero se registró localmente
        const fallbackData = localStorage.getItem(`tr_local_auth_${emailInput.value.trim().toLowerCase()}`);
        if (fallbackData) {
          const user = JSON.parse(fallbackData);
          if (user.password === passInput.value) {
            clientSession = {
              id: user.id,
              email: user.email,
              user_name: user.user_name,
              role: user.role,
              is_premium: user.is_premium
            };
            localStorage.setItem('tr_client_session', JSON.stringify(clientSession));
            showAlert('¡Inicio de sesión exitoso!', 'success');
            setTimeout(() => {
              closeAuthModal();
              updateUserUI();
            }, 1000);
            return;
          }
        }
        throw error;
      }
      
      // 2. Traer perfil
      const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
        
      if (pError) throw pError;
      
      clientSession = profile;
      localStorage.setItem('tr_client_session', JSON.stringify(profile));
      showAlert('¡Bienvenido de nuevo, ' + profile.user_name + '! 🎉', 'success');
      setTimeout(() => {
        closeAuthModal();
        updateUserUI();
      }, 1000);
    } else {
      // Registro
      const email = emailInput.value.trim();
      const password = passInput.value;
      const username = userinput.value.trim();
      
      // 1. Registrar en Supabase
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password
      });
      
      if (error) throw error;
      
      const userId = data.user ? data.user.id : 'local_' + Date.now();
      const newProfile = {
        id: userId,
        email: email,
        user_name: username,
        role: 'user',
        is_premium: false
      };

      // 2. Guardar en tabla profiles de Supabase
      try {
        await supabase
          .from('profiles')
          .insert([newProfile]);
      } catch (pErr) {
        console.error("Falla guardando perfil en base de datos:", pErr);
      }
      
      // 3. Registrar localmente para fallback inmediato
      localStorage.setItem(`tr_local_auth_${email.toLowerCase()}`, JSON.stringify({
        id: userId,
        email: email,
        password: password,
        user_name: username,
        role: 'user',
        is_premium: false
      }));

      clientSession = newProfile;
      localStorage.setItem('tr_client_session', JSON.stringify(clientSession));

      showAlert('¡Cuenta creada con éxito! Bienvenido al club. 🎉', 'success');
      setTimeout(() => {
        closeAuthModal();
        updateUserUI();
      }, 1500);
    }
  } catch (err) {
    console.error("Error en Auth:", err);
    showAlert(err.message || 'Error de autenticación.', 'danger');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalHtml;
  }
}

// Helper para calcular tiempos relativos de comentarios
function getRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return "Ahora";
  if (diffMins < 60) return `Hace ${diffMins}m`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  return `Hace ${diffDays}d`;
}

// Cargar dinámicamente videos y comentarios desde Supabase
async function fetchVideosAndComments() {
  try {
    // 1. Consultar todos los videos
    const { data: videos, error: vErr } = await supabase
      .from('videos')
      .select('*')
      .order('id', { ascending: false });
    if (vErr) throw vErr;
    
    // Mapear campos de Postgres a nombres de claves esperados en el JS del frontend
    state.videos = (videos || []).map(v => ({
      id: v.id,
      title: v.title,
      category: v.category,
      categoryLabel: v.category_label,
      school: v.school,
      description: v.description,
      videoUrl: v.video_url,
      thumbnailUrl: v.thumbnail_url,
      likes: v.likes,
      duration: v.duration,
      date: v.date,
      collection_name: v.collection_name,
      episode_number: v.episode_number,
      province: v.province,
      chapters: v.chapters,
      is_premium: v.is_premium,
      tags: v.tags
    }));

    // 2. Consultar todos los comentarios
    const { data: comments, error: cErr } = await supabase
      .from('comments')
      .select('*')
      .order('id', { ascending: false });
    if (cErr) throw cErr;

    // Agrupar comentarios por ID de video
    state.comments = {};
    (comments || []).forEach(c => {
      if (!state.comments[c.video_id]) {
        state.comments[c.video_id] = [];
      }
      
      const relative = getRelativeTime(new Date(c.created_at));
      
      state.comments[c.video_id].push({
        id: c.id,
        user: c.user_name,
        text: c.text,
        time: relative
      });
    });

    // 3. Consultar todas las categorías dinámicamente
    const { data: dbCategories, error: catErr } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    if (!catErr && dbCategories) {
      state.dynamicCategories = dbCategories.map(c => ({
        key: c.slug,
        label: c.name
      }));
    }

    // Establecer video inicial activo si está disponible (priorizando parámetro v en URL)
    if (state.videos.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const queryVid = urlParams.get('v');
      const parsedQueryVid = queryVid ? parseInt(queryVid) : null;
      
      if (parsedQueryVid && state.videos.some(v => v.id === parsedQueryVid)) {
        state.activeVideoId = parsedQueryVid;
      } else {
        const cachedRecentlyPlayed = JSON.parse(localStorage.getItem('tr_recently_played') || '[]');
        if (cachedRecentlyPlayed.length > 0 && state.videos.some(v => v.id === cachedRecentlyPlayed[0])) {
          state.activeVideoId = cachedRecentlyPlayed[0];
        } else {
          state.activeVideoId = state.videos[0].id;
        }
      }
    }

    // 4. Consultar anuncios activos desde Supabase
    try {
      const { data: activeAds, error: adsErr } = await supabase
        .from('ads')
        .select('*')
        .eq('active', true);
      
      if (!adsErr && activeAds) {
        state.ads = activeAds.map(ad => ({
          id: ad.id,
          title: ad.title,
          videoUrl: ad.video_url,
          thumbnailUrl: ad.thumbnail_url || 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop&q=60',
          redirectUrl: ad.redirect_url || '',
          duration: ad.duration || 15,
          isAd: true // Identificador especial para anuncios
        }));
      }
    } catch (e) {
      console.warn("No se pudieron cargar los anuncios de Supabase:", e);
    }

  } catch (err) {
    console.error("Error al cargar la base de datos Supabase:", err);
  }
}

// Contenedores del DOM
const feedContainer = document.getElementById('shorts-feed-view');
const netflixContainer = document.getElementById('netflix-rows-container');

// Inicialización de la Aplicación
document.addEventListener('DOMContentLoaded', async () => {
  // Carga asíncrona robusta de Supabase antes de renderizar
  await fetchVideosAndComments();

  // Renderizar chips de categorías dinámicos
  const container = document.getElementById('categories-container');
  if (container && state.dynamicCategories) {
    const iconMap = {
      boliche: 'fa-solid fa-music',
      aventura: 'fa-solid fa-mountain',
      lifestyle: 'fa-solid fa-mug-hot',
      emociones: 'fa-solid fa-heart',
      bienvenida: 'fa-solid fa-hand-wave'
    };
    
    let html = `<button class="category-chip active" data-category="all">⚡ Todos los Momentos</button>`;
    state.dynamicCategories.forEach(cat => {
      const icon = iconMap[cat.key] || 'fa-solid fa-tag';
      html += `
        <button class="category-chip" data-category="${cat.key}">
          <i class="${icon}"></i> ${cat.label}
        </button>
      `;
    });
    // Agregar chip especial Club PRO
    html += `
      <button class="category-chip special-pro-chip" data-category="pro-only" style="background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%); border: 1px solid rgba(245, 158, 11, 0.4); color: #fde047; font-weight: 700; display: inline-flex; align-items: center; gap: 6px;">
        <i class="fa-solid fa-crown" style="color: #fde047;"></i> Contenido PRO 👑
      </button>
    `;
    container.innerHTML = html;
  }

  renderFeed();
  renderNetflixFeatured();
  renderNetflixRanking();
  renderNetflixRows();
  renderNetflixGrid(state.videos); // Renderizar grilla de catálogo inicial
  
  // Inicializar navegación de UI
  initNavigation((action, data) => {
    if (action === 'feed' || action === 'explorer') {
      pauseAllVideos();
      if (action === 'feed') {
        setTimeout(playActiveVideo, 100);
      }
    } else if (action === 'filter') {
      state.currentFilter = data;
      updateAppOnFilterOrSearch(); // Filtrado dinámico unificado
    }
  });

  // Configurar buscador en tiempo real
  const searchInput = document.getElementById('catalog-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      updateAppOnFilterOrSearch();
    });
  }

  // Configurar observador inteligente para reproducción automática en móviles
  setupIntersectionObserver();

  // Configurar gesto tirar para recargar (Pull-to-Refresh) en móvil
  setupPullToRefresh();

  // Soporte de navegación por teclado en Desktop
  setupKeyboardNavigation();

  // Iniciar reproducción del primer video sólo si la vista feed está activa
  setTimeout(() => {
    const feedView = document.getElementById('shorts-feed-view');
    if (feedView && !feedView.classList.contains('hidden')) {
      playActiveVideo();
    }
  }, 500);

  // Inicializar sidebar de "Continuar Viendo"
  updateKeepWatchingSidebar();

  // Cargar sesión del cliente
  await loadClientSession();

  // Sincronizar sesión dinámicamente cuando el usuario interactúa, vuelve a la pestaña o cambia de pestaña
  window.addEventListener('focus', () => {
    syncSessionWithDatabase();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      syncSessionWithDatabase();
    }
  });

  // Configurar Modal de Autenticación de Clientes
  const sidebarBtnLogin = document.getElementById('sidebar-btn-login');
  const mobileBtnLogin = document.getElementById('mobile-btn-login');
  const btnCloseAuthModal = document.getElementById('btn-close-auth-modal');
  const btnTabLogin = document.getElementById('btn-tab-login');
  const btnTabRegister = document.getElementById('btn-tab-register');
  const clientAuthForm = document.getElementById('client-auth-form');

  if (sidebarBtnLogin) {
    sidebarBtnLogin.addEventListener('click', (e) => {
      e.stopPropagation();
      openAuthModal('login');
    });
  }
  if (mobileBtnLogin) {
    mobileBtnLogin.addEventListener('click', (e) => {
      e.stopPropagation();
      openAuthModal('login');
    });
  }
  if (btnCloseAuthModal) {
    btnCloseAuthModal.addEventListener('click', () => {
      closeAuthModal();
    });
  }
  if (btnTabLogin) {
    btnTabLogin.addEventListener('click', () => {
      switchAuthTab('login');
    });
  }
  if (btnTabRegister) {
    btnTabRegister.addEventListener('click', () => {
      switchAuthTab('register');
    });
  }
  if (clientAuthForm) {
    clientAuthForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleClientAuthSubmit();
    });
  }

  // Logout en sidebar
  const btnSidebarLogout = document.getElementById('btn-sidebar-logout');
  if (btnSidebarLogout) {
    btnSidebarLogout.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await supabase.auth.signOut();
      } catch (err) {}
      clientSession = null;
      localStorage.removeItem('tr_client_session');
      updateUserUI();
      location.reload();
    });
  }

  // Logout en móvil
  const mobileUserAvatar = document.getElementById('mobile-user-avatar');
  if (mobileUserAvatar) {
    mobileUserAvatar.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('¿Deseas cerrar tu sesión del Club Egresados?')) {
        localStorage.removeItem('tr_client_session');
        clientSession = null;
        updateUserUI();
        location.reload();
      }
    });
  }

  // Configurar Simulación de Checkout Premium (Shorta.com Checkout)
  const btnCheckoutSubmit = document.getElementById('btn-checkout-submit');
  const btnCheckoutSuccessClose = document.getElementById('btn-checkout-success-close');
  const step1 = document.getElementById('premium-modal-content-step1');
  const step2 = document.getElementById('premium-modal-content-step2');
  const step3 = document.getElementById('premium-modal-content-step3');
  const premiumModal = document.getElementById('premium-checkout-modal');

  if (btnCheckoutSubmit) {
    btnCheckoutSubmit.addEventListener('click', () => {
      // Ir a Paso 2 (Procesando Pago con Spinner)
      step1.classList.add('hidden');
      step2.classList.remove('hidden');

      // Simular la comunicación con la pasarela de pagos segura (2 segundos)
      setTimeout(async () => {
        step2.classList.add('hidden');
        step3.classList.remove('hidden');

        // Disparar lluvia mágica de confeti de éxito premium
        triggerConfetti();

        // Si hay una sesión de cliente activa, actualizar su estado a PREMIUM en Supabase
        if (clientSession) {
          clientSession.is_premium = true;
          localStorage.setItem('tr_client_session', JSON.stringify(clientSession));
          
          try {
            // Guardar en la base de datos Supabase profiles
            await supabase
              .from('profiles')
              .update({ is_premium: true })
              .eq('id', clientSession.id);

            // También actualizar cualquier registro local de fallback
            const localAuthKey = `tr_local_auth_${clientSession.email.toLowerCase()}`;
            const localAuth = localStorage.getItem(localAuthKey);
            if (localAuth) {
              const uObj = JSON.parse(localAuth);
              uObj.is_premium = true;
              localStorage.setItem(localAuthKey, JSON.stringify(uObj));
            }
          } catch (err) {
            console.error("Error actualizando estado premium del usuario en la base de datos:", err);
          }
          
          updateUserUI();
        }
      }, 2000);
    });
  }

  if (btnCheckoutSuccessClose) {
    btnCheckoutSuccessClose.addEventListener('click', () => {
      if (premiumModal) {
        premiumModal.classList.remove('active');
      }
      // Resetear modal a paso 1 para futuras suscripciones
      setTimeout(() => {
        step1.classList.remove('hidden');
        step2.classList.add('hidden');
        step3.classList.add('hidden');
      }, 300);
    });
  }
});

// ----------------------------------------------------------------------
// RENDERIZACIÓN DINÁMICA DE ELEMENTOS
// ----------------------------------------------------------------------

// Helper robusto para parsear capítulos de video en marcas de tiempo
function parseChapters(chaptersText) {
  if (!chaptersText) return [];
  // Separar por comas o saltos de línea
  const lines = chaptersText.split(/[,\n]/);
  const chapters = [];
  lines.forEach(line => {
    // Expresión regular que busca MM:SS o H:MM:SS
    const match = line.match(/(?:(\d+):)?(\d+):(\d+)\s*[-–—]\s*(.+)/);
    if (match) {
      const hrs = match[1] ? parseInt(match[1]) : 0;
      const mins = parseInt(match[2]);
      const secs = parseInt(match[3]);
      const label = match[4].trim();
      const timeInSecs = hrs * 3600 + mins * 60 + secs;
      chapters.push({ time: timeInSecs, label });
    }
  });
  return chapters.sort((a, b) => a.time - b.time);
}

// Formatear segundos en formato de capítulo
function formatChapterTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// A. Renderizar el Feed de Videos (Estructura móvil y desktop híbrida)
function renderFeed() {
  feedContainer.innerHTML = '';
  const filtered = getFilteredVideos(true);

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
    
    // Calcular episodios de la misma colección (Configurables en Supabase) o escuela
    const episodes = video.collection_name
      ? state.videos.filter(v => v.collection_name === video.collection_name).sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0))
      : state.videos.filter(v => v.school === video.school || v.category === video.category);
      
    // Calcular sugerencias del catálogo que no correspondan a la colección activa
    const suggested = video.collection_name
      ? state.videos.filter(v => v.collection_name !== video.collection_name)
      : state.videos.filter(v => v.id !== video.id);
      
    // Crear contenedor del short-card
    const card = document.createElement('div');
    card.className = `short-card ${isFirst ? 'active-desktop' : ''}`;
    card.setAttribute('data-video-id', video.id);
    card.id = `short-card-${video.id}`;

    if (video.isAd) {
      card.className = `short-card ad-card ${isFirst ? 'active-desktop' : ''}`;
      card.innerHTML = `
        <div class="desktop-layout">
          <!-- REPRODUCTOR VERTICAL -->
          <div class="player-wrapper">
            <video class="short-video" muted loop playsinline preload="metadata" src="${video.videoUrl}"></video>
            <div class="video-overlay"></div>
            
            <div class="play-pause-hud"><i class="fa-solid fa-play"></i></div>
            
            <!-- Badge de Publicidad -->
            <div class="ad-badge-indicator">
              <i class="fa-solid fa-bullhorn"></i> Publicidad Patrocinada
            </div>

            <!-- Botón Saltar Anuncio (Skip) -->
            <button class="btn-skip-ad" id="btn-skip-ad-${video.id}" style="pointer-events: none;">
              Saltar en 5...
            </button>

            <!-- Info Flotante del Anunciante -->
            <div class="video-info-panel" style="bottom: 74px !important;">
              <span class="school-badge" style="background: var(--primary-gradient); box-shadow: var(--neon-glow-pink);"><i class="fa-solid fa-rectangle-ad"></i> ANUNCIO</span>
              <h3 class="video-title-text">${video.title}</h3>
              <p class="video-desc-text">Patrocinador oficial de TravelRock. Hacé clic en "Saber más" para ver esta oferta exclusiva.</p>
            </div>

            <!-- Barra de Control Integrada Estilo Netflix (Simplificada para Ads) -->
            <div class="embedded-control-bar">
              <div class="embedded-controls-top">
                <div class="embedded-video-title">Anuncio - ${video.title}</div>
                <div class="embedded-controls-right">
                  <button class="embedded-btn btn-embedded-mute" title="Sonido/Silencio">
                    <i class="fa-solid ${state.isMuted ? 'fa-volume-xmark' : 'fa-volume-high'}"></i>
                  </button>
                </div>
              </div>
              <div class="embedded-timeline-wrapper ad-timeline-wrapper" style="pointer-events: none;">
                <div class="embedded-timeline-bar">
                  <div class="embedded-timeline-fill"></div>
                </div>
              </div>
            </div>

            <!-- Botón CTA flotante inmersivo (Móvil) -->
            <a href="${video.redirectUrl}" target="_blank" class="ad-cta-button-mobile ad-cta-trigger" data-ad-id="${Math.abs(video.id)}">
              <span>Saber Más ⚡</span>
            </a>
          </div>

          <!-- PANEL LATERAL DE DETALLES DEL ANUNCIANTE (Desktop) -->
          <div class="side-panel ad-side-panel">
            <div class="side-panel-body" style="justify-content: center; gap: 30px;">
              <div class="ad-sponsor-card glassmorphism" style="padding: 30px; border-radius: var(--radius-lg); text-align: center; border-color: var(--neon-pink); background: rgba(168, 85, 247, 0.05); box-shadow: var(--neon-glow-pink);">
                <div class="lock-crown-icon" style="background: linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%); border-color: var(--neon-pink); width: 72px; height: 72px; margin: 0 auto 20px;">
                  <i class="fa-solid fa-rectangle-ad" style="color: var(--neon-pink); filter: drop-shadow(0 0 10px rgba(236, 72, 153, 0.6)); font-size: 2rem;"></i>
                </div>
                <span class="school-badge" style="background: var(--primary-gradient); box-shadow: var(--neon-glow-pink); font-size: 0.8rem; padding: 4px 14px; margin-bottom: 15px;">ANUNCIANTE OFICIAL 🌟</span>
                <h2 style="font-family: var(--font-display); font-size: 1.8rem; font-weight: 900; margin-bottom: 12px; line-height: 1.2;">${video.title}</h2>
                <p style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 30px;">TravelRock te trae los momentos de tu vida con la mejor compañía. Visitá nuestro sitio oficial o hacé clic abajo para conocer descuentos exclusivos para tu viaje de egresados.</p>
                <a href="${video.redirectUrl}" target="_blank" class="premium-checkout-btn ad-cta-trigger" data-ad-id="${Math.abs(video.id)}" style="text-decoration: none; max-width: 320px; margin: 0 auto; padding: 14px 28px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                  <span>Visitar Sitio Oficial 🌐</span>
                  <i class="fa-solid fa-arrow-up-right-from-square"></i>
                </a>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      // Layout inmersivo híbrido
      card.innerHTML = `
      <div class="desktop-layout">
        
        <!-- REPRODUCTOR VERTICAL -->
        <div class="player-wrapper">
          <!-- Video Nativo -->
          <video class="short-video" muted loop playsinline preload="metadata" src="${video.videoUrl}"></video>
          
          <!-- Capa de Sombreado de UI -->
          <div class="video-overlay"></div>
          
          <!-- Micro-animación de Doble Tap -->
          <div class="double-tap-heart"><i class="fa-solid fa-heart"></i></div>
          
          <!-- HUD Indicador de Play/Pause Gigante -->
          <div class="play-pause-hud"><i class="fa-solid fa-play"></i></div>
          
          <!-- Botón de Unmute/Sonido Inteligente Flotante -->
          <div class="unmute-overlay-btn ${state.isMuted ? 'visible' : ''}">
            <i class="fa-solid ${state.isMuted ? 'fa-volume-xmark' : 'fa-volume-high'}"></i>
          </div>

          <!-- Overlay de Bloqueo Premium (Solo para videos PRO si no tiene membresía) -->
          ${video.is_premium ? `
            <div class="premium-lock-overlay" id="premium-lock-overlay-${video.id}" style="display: none;">
              <div class="lock-overlay-content">
                <div class="lock-crown-icon">
                  <i class="fa-solid fa-crown animate-pulse-crown"></i>
                </div>
                <h2 class="lock-overlay-title">MOMENTO EXCLUSIVO</h2>
                <span class="lock-overlay-badge">CLUB PRO 👑</span>
                <p class="lock-overlay-desc">Estás viendo un avance gratuito de 7 segundos. Suscribite al Club PRO para ver este momento completo y todo el contenido exclusivo de Bariloche.</p>
                <button class="lock-overlay-btn btn-unlock-video" data-id="${video.id}">
                  <span>Desbloquear momento ⚡</span>
                </button>
              </div>
            </div>
          ` : ''}

          <!-- Indicador de Avance de 7s -->
          ${video.is_premium ? `
            <div class="preview-indicator-badge" id="preview-indicator-${video.id}">
              <i class="fa-solid fa-crown"></i> Avance Gratuito 7s
            </div>
          ` : ''}

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

            <!-- Botón Mute para Móvil (Siempre visible en barra lateral) -->
            <div class="action-btn-wrapper mobile-only-action">
              <button class="action-btn btn-embedded-mute" title="Sonido/Silencio">
                <i class="fa-solid ${state.isMuted ? 'fa-volume-xmark' : 'fa-volume-high'}"></i>
              </button>
              <span class="action-count">Sonido</span>
            </div>

            <!-- Botón Ajustes para Móvil (Siempre visible en barra lateral) -->
            <div class="action-btn-wrapper mobile-only-action settings-menu-wrapper">
              <button class="action-btn btn-embedded-settings" title="Ajustes">
                <i class="fa-solid fa-gear"></i>
              </button>
              <span class="action-count">Ajustes</span>
              
              <!-- Popover de Ajustes para Móviles -->
              <div class="settings-popover glassmorphism hidden">
                <div class="settings-title">Ajustes</div>
                <div class="settings-options">
                  <!-- Velocidad -->
                  <div class="settings-row" id="settings-row-speed-mobile-${video.id}">
                    <div class="settings-row-left">
                      <i class="fa-solid fa-gauge-high"></i>
                      <span>Velocidad</span>
                    </div>
                    <div class="settings-row-right">
                      <span class="current-speed-text">Normal</span>
                      <i class="fa-solid fa-chevron-right"></i>
                    </div>
                    <div class="settings-submenu speed-submenu hidden">
                      <div class="submenu-item" data-speed="0.5">0.5x</div>
                      <div class="submenu-item active" data-speed="1.0">Normal</div>
                      <div class="submenu-item" data-speed="1.5">1.5x</div>
                      <div class="submenu-item" data-speed="2.0">2.0x</div>
                    </div>
                  </div>
                  <!-- Calidad -->
                  <div class="settings-row" id="settings-row-quality-mobile-${video.id}">
                    <div class="settings-row-left">
                      <i class="fa-solid fa-sliders"></i>
                      <span>Calidad</span>
                    </div>
                    <div class="settings-row-right">
                      <span class="current-quality-text">Automático</span>
                      <i class="fa-solid fa-chevron-right"></i>
                    </div>
                    <div class="settings-submenu quality-submenu hidden">
                      <div class="submenu-item active" data-quality="auto">Automático</div>
                      <div class="submenu-item" data-quality="1080p">1080p (Full HD)</div>
                      <div class="submenu-item" data-quality="720p">720p (HD)</div>
                      <div class="submenu-item" data-quality="480p">480p (SD)</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="action-btn-wrapper desktop-only-action">
              <button class="action-btn btn-fullscreen">
                <i class="fa-solid fa-expand"></i>
              </button>
            </div>
          </div>

          <!-- Info Flotante Rediseñada Estilo Canal Egresados (TikTok/Screenshot style) -->
          <div class="video-info-panel">
            <!-- Fila del Canal/Egresados con su avatar circular -->
            <div class="video-info-channel-row">
              <div class="channel-avatar">TR</div>
              <div class="channel-meta">
                <span class="channel-name">${(video.school || 'General').split(' - ')[0]}</span>
                <span class="video-episode-number">${video.collection_name ? `E${video.episode_number || 1}` : 'Short'}</span>
              </div>
              ${video.is_premium ? `
                <span class="school-badge" style="background: var(--primary-gradient); box-shadow: var(--neon-glow-pink); margin-left: 2px; text-transform: uppercase; font-size: 0.6rem; padding: 2px 6px;"><i class="fa-solid fa-crown" style="color: #fde047; font-size: 0.65rem;"></i> PRO</span>
              ` : ''}
            </div>
            
            <h3 class="video-title-text">${video.title}</h3>
            <p class="video-desc-text">${video.description}</p>
          </div>

          <!-- Barra de Control Integrada Estilo Netflix (Siempre Visible) -->
          <div class="embedded-control-bar">
            <div class="embedded-controls-top">
              <div class="embedded-video-title">${video.title}</div>
              <div class="embedded-controls-right">
                <button class="embedded-btn btn-embedded-mute" title="Sonido/Silencio">
                  <i class="fa-solid ${state.isMuted ? 'fa-volume-xmark' : 'fa-volume-high'}"></i>
                </button>
                <div class="settings-menu-wrapper">
                  <button class="embedded-btn btn-embedded-settings" title="Ajustes">
                    <i class="fa-solid fa-gear"></i>
                  </button>
                  <div class="settings-popover glassmorphism hidden">
                    <div class="settings-title">Ajustes</div>
                    <div class="settings-options">
                      <!-- Velocidad -->
                      <div class="settings-row" id="settings-row-speed-${video.id}">
                        <div class="settings-row-left">
                          <i class="fa-solid fa-gauge-high"></i>
                          <span>Velocidad</span>
                        </div>
                        <div class="settings-row-right">
                          <span class="current-speed-text">Normal</span>
                          <i class="fa-solid fa-chevron-right"></i>
                        </div>
                        <div class="settings-submenu speed-submenu hidden">
                          <div class="submenu-item" data-speed="0.5">0.5x</div>
                          <div class="submenu-item active" data-speed="1.0">Normal</div>
                          <div class="submenu-item" data-speed="1.5">1.5x</div>
                          <div class="submenu-item" data-speed="2.0">2.0x</div>
                        </div>
                      </div>
                      <!-- Calidad -->
                      <div class="settings-row" id="settings-row-quality-${video.id}">
                        <div class="settings-row-left">
                          <i class="fa-solid fa-sliders"></i>
                          <span>Calidad</span>
                        </div>
                        <div class="settings-row-right">
                          <span class="current-quality-text">Automático</span>
                          <i class="fa-solid fa-chevron-right"></i>
                        </div>
                        <div class="settings-submenu quality-submenu hidden">
                          <div class="submenu-item active" data-quality="auto">Automático</div>
                          <div class="submenu-item" data-quality="1080p">1080p (Full HD)</div>
                          <div class="submenu-item" data-quality="720p">720p (HD)</div>
                          <div class="submenu-item" data-quality="480p">480p (SD)</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="embedded-timeline-wrapper">
              <div class="embedded-timeline-bar">
                <div class="embedded-timeline-fill"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- PANEL DE DETALLES LATERAL GLASSMORPHISM (Exclusivo Desktop Cine) -->
        <div class="side-panel">
          <div class="side-panel-body">
            
            <!-- Bloque 1: Show Card Superior (Estilo Netflix/Shorta) -->
            <div class="side-panel-showcard">
              <img class="showcard-poster" src="${video.thumbnailUrl}" onerror="this.src='https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop&q=60';" alt="${video.title}">
              <div class="showcard-info">
                <div>
                  <span class="showcard-tags">${video.categoryLabel} · ${(video.school || 'General').split(' - ')[0]}${video.province ? ` (${video.province})` : ''}</span>
                  <h2 class="showcard-title">${video.title}</h2>
                </div>
                <div class="showcard-actions">
                  <button class="btn-replay-showcard">
                    <i class="fa-solid fa-play"></i> Ver de nuevo
                  </button>
                  <button class="btn-like-showcard btn-like-desktop" data-id="${video.id}">
                    <i class="fa-solid fa-heart"></i> <strong class="desktop-like-count">${video.likes}</strong>
                  </button>
                  <button class="btn-share-showcard btn-share-desktop" data-id="${video.id}">
                    <i class="fa-solid fa-share-nodes"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- Bloque 2: Anécdota y Detalles con botón MÁS -->
            <div class="experience-box">
              <h4>La anécdota del día ❄️</h4>
              <p class="desc-container">
                ${video.description.length > 130 
                  ? `<span class="desc-short">${video.description.substring(0, 130)}...</span>
                     <span class="desc-full hidden">${video.description}</span>
                     <button class="btn-more-desc">MÁS</button>`
                  : `<span>${video.description}</span>`
                }
              </p>
              ${video.tags ? `
                <div class="video-tags-container" style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px;">
                  ${video.tags.split(',').map(tag => {
                    const cleanTag = tag.trim();
                    if (!cleanTag) return '';
                    return `<span class="tag-pill-badge" data-tag="${cleanTag}" style="cursor: pointer; background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(168, 85, 247, 0.25); color: #c084fc; padding: 4px 10px; border-radius: var(--radius-full); font-size: 0.75rem; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; transition: all var(--transition-fast);"><i class="fa-solid fa-tag"></i> #${cleanTag}</span>`;
                  }).join('')}
                </div>
              ` : ''}
            </div>

            <!-- Bloque 2.5: Capítulos del Video (Timeline Interactivo) -->
            ${(function() {
              const chs = parseChapters(video.chapters);
              if (chs.length === 0) return '';
              return `
                <div class="video-chapters-box">
                  <h4>Capítulos del Video 🎬</h4>
                  <div class="chapters-timeline">
                    ${chs.map(ch => `
                      <div class="chapter-timeline-item" data-time="${ch.time}">
                        <span class="chapter-badge"><i class="fa-solid fa-play"></i> ${formatChapterTime(ch.time)}</span>
                        <span class="chapter-label">${ch.label}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              `;
            })()}

            <!-- Bloque 3: Carrusel A (Episodios del Tema/Colección) -->
            <div class="side-panel-carousel">
              <div class="carousel-header">
                <h3>${video.collection_name ? `Colección: ${video.collection_name}` : 'Episodios'} <span class="episode-count">${episodes.length}</span></h3>
                <div class="carousel-arrows">
                  <button class="btn-carousel-prev" data-target="episodes-track-${video.id}"><i class="fa-solid fa-chevron-left"></i></button>
                  <button class="btn-carousel-next" data-target="episodes-track-${video.id}"><i class="fa-solid fa-chevron-right"></i></button>
                </div>
              </div>
              <div class="carousel-track" id="episodes-track-${video.id}">
                ${episodes.map((ep, epIdx) => {
                  const isActive = ep.id === video.id;
                  return `
                    <div class="carousel-card ${isActive ? 'active' : ''}" data-video-id="${ep.id}">
                      <img src="${ep.thumbnailUrl}" alt="${ep.title}" onerror="this.src='https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&auto=format&fit=crop&q=60';">
                      <span class="carousel-card-badge">M${ep.episode_number || (epIdx + 1)}</span>
                      ${isActive ? '<div class="active-badge"><i class="fa-solid fa-play"></i></div>' : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Bloque 4: Carrusel B (Sugerencias Recomendados del Catálogo) -->
            <div class="side-panel-carousel">
              <div class="carousel-header">
                <h3>Sugeridos <span class="episode-count">${suggested.length}</span></h3>
                <div class="carousel-arrows">
                  <button class="btn-carousel-prev" data-target="suggested-track-${video.id}"><i class="fa-solid fa-chevron-left"></i></button>
                  <button class="btn-carousel-next" data-target="suggested-track-${video.id}"><i class="fa-solid fa-chevron-right"></i></button>
                </div>
              </div>
              <div class="carousel-track" id="suggested-track-${video.id}">
                ${suggested.map((sug) => {
                  return `
                    <div class="carousel-card" data-video-id="${sug.id}">
                      <img src="${sug.thumbnailUrl}" alt="${sug.title}" onerror="this.src='https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&auto=format&fit=crop&q=60';">
                      <span class="carousel-card-badge tag-badge">${sug.categoryLabel ? sug.categoryLabel.split(' ')[0] : 'Short'}</span>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Bloque 5: Comentarios e Interacciones -->
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

    `;
    }

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
  
  // Agrupar videos por colección de forma dinámica
  const collectionsMap = {};
  const uncategorizedVideos = [];
  
  state.videos.forEach(video => {
    if (video.collection_name) {
      const colName = video.collection_name.trim();
      if (!collectionsMap[colName]) {
        collectionsMap[colName] = [];
      }
      collectionsMap[colName].push(video);
    } else {
      uncategorizedVideos.push(video);
    }
  });

  // Obtener nombres de las colecciones ordenadas alfabéticamente
  const sortedCollectionNames = Object.keys(collectionsMap).sort();

  // Función interna para crear el HTML de una fila
  function createRowHtml(title, videos) {
    const row = document.createElement('div');
    row.className = 'netflix-row';
    row.innerHTML = `
      <h3 class="row-title">${title}</h3>
      <div class="row-carousel">
        ${videos.map(video => `
          <div class="netflix-card" data-video-id="${video.id}">
            <img class="netflix-card-img" src="${video.thumbnailUrl}" onerror="this.src='https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop&q=60';" alt="${video.title}">
            ${video.is_premium ? `
              <div class="netflix-card-premium-badge" style="position: absolute; top: 10px; right: 10px; background: linear-gradient(135deg, #f59e0b 0%, #ec4899 100%); color: white; border-radius: 4px; padding: 3px 6px; font-size: 0.65rem; font-weight: 800; display: flex; align-items: center; gap: 3px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); z-index: 2;"><i class="fa-solid fa-crown"></i> PRO</div>
            ` : ''}
            <div class="netflix-card-overlay">
              <span class="netflix-card-school">${(video.school || 'General').split(' - ')[0]}${video.province ? ` (${video.province})` : ''}</span>
              <h4 class="netflix-card-title">${video.title}</h4>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    return row;
  }

  // Renderizar las filas de colecciones
  sortedCollectionNames.forEach(colName => {
    if (collectionsMap[colName].length > 0) {
      netflixContainer.appendChild(createRowHtml(colName, collectionsMap[colName]));
    }
  });

  // Renderizar los videos que no pertenecen a ninguna colección
  if (uncategorizedVideos.length > 0) {
    netflixContainer.appendChild(createRowHtml("Otros Momentos", uncategorizedVideos));
  }

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

// B2. Renderizar Carrusel TOP 5 Ranking Popularidad Estilo Netflix
function renderNetflixRanking() {
  const rankingContainer = document.getElementById('netflix-ranking-container');
  if (!rankingContainer) return;
  
  rankingContainer.innerHTML = '';
  
  // Obtener los top 5 videos más vistos/populares (ordenados por likes de mayor a menor)
  const popularVideos = [...state.videos]
    .sort((a, b) => (b.likes || 0) - (a.likes || 0))
    .slice(0, 5);
    
  if (popularVideos.length === 0) {
    rankingContainer.style.display = 'none';
    return;
  }
  
  // Si estamos filtrando o buscando, se ocultará desde updateAppOnFilterOrSearch
  rankingContainer.style.display = state.currentFilter === 'all' ? 'block' : 'none';
  
  rankingContainer.innerHTML = `
    <div class="netflix-row ranking-row">
      <h3 class="row-title"><i class="fa-solid fa-fire" style="color: var(--neon-orange); margin-right: 6px;"></i> Los 5 Más Vistos de la Semana</h3>
      <div class="row-carousel ranking-carousel">
        ${popularVideos.map((video, index) => `
          <div class="ranking-card" data-video-id="${video.id}">
            <div class="ranking-number-wrapper">
              <span class="ranking-number">${index + 1}</span>
            </div>
            <div class="netflix-card ranking-card-inner">
              <img class="netflix-card-img" src="${video.thumbnailUrl}" onerror="this.src='https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop&q=60';" alt="${video.title}">
              ${video.is_premium ? `
                <div class="netflix-card-premium-badge" style="position: absolute; top: 10px; right: 10px; background: linear-gradient(135deg, #f59e0b 0%, #ec4899 100%); color: white; border-radius: 4px; padding: 3px 6px; font-size: 0.65rem; font-weight: 800; display: flex; align-items: center; gap: 3px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); z-index: 2;"><i class="fa-solid fa-crown"></i> PRO</div>
              ` : ''}
              <div class="netflix-card-overlay">
                <span class="netflix-card-school">${(video.school || 'General').split(' - ')[0]}${video.province ? ` (${video.province})` : ''}</span>
                <h4 class="netflix-card-title">${video.title}</h4>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  // Agregar event listener para clicks en las tarjetas de ranking
  const rankingCards = rankingContainer.querySelectorAll('.ranking-card');
  rankingCards.forEach(card => {
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
      
      // Reproducir
      setTimeout(playActiveVideo, 200);
    });
  });
}

// B1. Renderizar Carrusel de "Últimos Agregados" (Tarjetas Grandes estilo Hero)
function renderNetflixFeatured() {
  const featuredContainer = document.getElementById('netflix-featured-container');
  if (!featuredContainer) return;
  
  featuredContainer.innerHTML = '';
  
  // Obtener los últimos 4 videos subidos/agregados (ordenados por ID descendente)
  const latestVideos = [...state.videos]
    .sort((a, b) => b.id - a.id)
    .slice(0, 4);
    
  if (latestVideos.length === 0) {
    featuredContainer.style.display = 'none';
    return;
  }
  
  // Controlar visibilidad del contenedor de destacados en la vista general
  featuredContainer.style.display = state.currentFilter === 'all' ? 'block' : 'none';
  
  featuredContainer.innerHTML = `
    <div class="netflix-row featured-row">
      <h3 class="row-title"><i class="fa-solid fa-sparkles" style="color: var(--neon-pink); margin-right: 6px;"></i> Los Últimos Agregados</h3>
      <div class="row-carousel featured-carousel">
        ${latestVideos.map(video => {
          // Extraer las tags o categorías secundarias para mostrar como géneros
          const genresList = video.tags ? video.tags.split(',').slice(0, 2).map(t => t.trim()).join(' · ') : (video.categoryLabel || 'Exclusivo');
          
          return `
            <div class="featured-card" data-video-id="${video.id}">
              <img class="featured-card-img" src="${video.thumbnailUrl}" onerror="this.src='https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop&q=60';" alt="${video.title}">
              <div class="featured-card-overlay">
                <span class="featured-card-school">${(video.school || 'General').split(' - ')[0]}${video.province ? ` (${video.province})` : ''}</span>
                <h4 class="featured-card-title-logo">${video.title}</h4>
                <div class="featured-card-genres">${genresList}</div>
                <button class="featured-card-btn">
                  <i class="fa-solid fa-play"></i> Reproducir
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
  
  // Agregar clicks en las tarjetas destacadas
  const featuredCards = featuredContainer.querySelectorAll('.featured-card');
  featuredCards.forEach(card => {
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
      
      // Reproducir
      setTimeout(playActiveVideo, 200);
    });
  });
}

// Generador dinámico de degradés para avatares sociales
function getAvatarGradient(username) {
  const colors = [
    ['#ec4899', '#8b5cf6'], // Rosa a Púrpura
    ['#3b82f6', '#22c55e'], // Azul a Verde
    ['#f97316', '#eab308'], // Naranja a Amarillo
    ['#ef4444', '#ec4899'], // Rojo a Rosa
    ['#06b6d4', '#3b82f6'], // Cian a Azul
    ['#8b5cf6', '#d946ef']  // Violeta a Fucsia
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  const grad = colors[index];
  return `linear-gradient(135deg, ${grad[0]}, ${grad[1]})`;
}

// Genera el HTML de comentarios para un video específico
function renderCommentsHtml(videoId) {
  const videoComments = state.comments[videoId] || [];
  if (videoComments.length === 0) {
    return `<p class="no-comments-text" style="color:var(--text-muted); font-size:0.75rem; text-align:center; padding:10px;">¡Sé el primero en comentar!</p>`;
  }
  
  return videoComments.map(c => `
    <div class="comment-item">
      <div class="comment-avatar" style="background: ${getAvatarGradient(c.user)}">
        ${c.user.charAt(0).toUpperCase()}
      </div>
      <div class="comment-content">
        <div class="comment-user">
          ${c.user} <span>${c.time}</span>
        </div>
        <div class="comment-text">${c.text}</div>
      </div>
    </div>
  `).join('');
}

function setupVideoControls(card, videoData) {
  const video = card.querySelector('.short-video');
  const playerWrapper = card.querySelector('.player-wrapper');
  const doubleHeart = card.querySelector('.double-tap-heart');
  const playPauseHud = card.querySelector('.play-pause-hud');
  const unmuteBtn = card.querySelector('.unmute-overlay-btn');
  const chapterItems = card.querySelectorAll('.chapter-timeline-item');

  // Nuevos Controles del Panel Integrado Estilo Netflix y Barra Móvil
  const btnEmbeddedMute = card.querySelectorAll('.btn-embedded-mute'); // queryAll
  const btnEmbeddedSettingsList = card.querySelectorAll('.btn-embedded-settings'); // queryAll
  const settingsPopoverList = card.querySelectorAll('.settings-popover'); // queryAll
  const speedRows = card.querySelectorAll('[id^="settings-row-speed-"]'); // queryAll
  const qualityRows = card.querySelectorAll('[id^="settings-row-quality-"]'); // queryAll
  const currentSpeedText = card.querySelector('.current-speed-text');
  const currentQualityText = card.querySelector('.current-quality-text');

  const timelineWrapper = card.querySelector('.embedded-timeline-wrapper');
  const timelineFill = card.querySelector('.embedded-timeline-fill');

  if (videoData.isAd) {
    // 1. Contador para botón Saltar Anuncio (Skip)
    const btnSkipAd = card.querySelector(`.btn-skip-ad`);
    let skipSeconds = 5;
    
    // Función para manejar el tick del temporizador
    const skipTimerTick = () => {
      if (video.paused) return; // solo restar si está reproduciendo
      
      if (skipSeconds > 0) {
        btnSkipAd.textContent = `Saltar en ${skipSeconds}...`;
        skipSeconds--;
      } else {
        btnSkipAd.textContent = `Saltar anuncio ⏩`;
        btnSkipAd.style.pointerEvents = 'auto'; // Permitir clicks
        btnSkipAd.classList.add('active');
        clearInterval(skipInterval);
      }
    };
    
    // Iniciar tick al reproducir
    let skipInterval = null;
    video.addEventListener('play', () => {
      // Registrar la impresión cuando empieza a reproducir por primera vez
      if (!video.dataset.impressionRecorded) {
        video.dataset.impressionRecorded = 'true';
        recordAdImpression(Math.abs(videoData.id));
      }
      
      if (!skipInterval && skipSeconds >= 0) {
        skipInterval = setInterval(skipTimerTick, 1000);
      }
    });
    
    video.addEventListener('pause', () => {
      if (skipInterval) {
        clearInterval(skipInterval);
        skipInterval = null;
      }
    });
    
    // Configurar click en saltar anuncio
    if (btnSkipAd) {
      btnSkipAd.addEventListener('click', (e) => {
        e.stopPropagation();
        if (skipInterval) clearInterval(skipInterval);
        
        // Buscar el siguiente video en el feed con anuncios
        const filtered = getFilteredVideos(true);
        const currentIndex = filtered.findIndex(v => v.id === videoData.id);
        if (currentIndex !== -1 && currentIndex < filtered.length - 1) {
          const nextVideoData = filtered[currentIndex + 1];
          state.activeVideoId = nextVideoData.id;
          
          if (window.innerWidth >= 992) {
            document.querySelectorAll('.short-card').forEach(c => c.classList.remove('active-desktop'));
            const targetCard = document.getElementById(`short-card-${nextVideoData.id}`);
            if (targetCard) targetCard.classList.add('active-desktop');
          } else {
            const targetCard = document.getElementById(`short-card-${nextVideoData.id}`);
            if (targetCard) {
              targetCard.scrollIntoView({ behavior: 'smooth' });
            }
          }
          
          setTimeout(playActiveVideo, 200);
        } else {
          // Si es el último, pausar el video
          video.pause();
        }
      });
    }

    // 2. Registrar clics de CTA
    const ctaTriggers = card.querySelectorAll('.ad-cta-trigger');
    ctaTriggers.forEach(trigger => {
      trigger.addEventListener('click', () => {
        recordAdClick(Math.abs(videoData.id));
      });
    });

    // 3. Mute centralizado
    if (btnEmbeddedMute) {
      btnEmbeddedMute.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          state.isMuted = !state.isMuted;
          updateMuteIconGlobally();
        });
      });
    }

    playerWrapper.addEventListener('click', (e) => {
      if (e.target.closest('.embedded-control-bar') || e.target.closest('.btn-skip-ad') || e.target.closest('.ad-cta-button-mobile')) {
        return;
      }
      if (state.isMuted) {
        state.isMuted = false;
        updateMuteIconGlobally();
      } else {
        if (video.paused) {
          video.play().catch(err => console.log(err));
        } else {
          video.pause();
        }
      }
    });
    
    // Sincronizar timeline en timeupdate para ads
    video.addEventListener('timeupdate', () => {
      if (video.duration) {
        const percentage = (video.currentTime / video.duration) * 100;
        if (timelineFill) {
          timelineFill.style.width = `${percentage}%`;
        }
      }
    });

    // Desactivar comentarios / likes para ads
    return;
  }

  // AUTO-HIDE DE CONTROLES EN MÓVIL (3 segundos de inactividad)
  const embeddedBar = card.querySelector('.embedded-control-bar');
  let controlsHideTimer = null;
  const isMobileDevice = window.innerWidth < 992;

  function showMobileControls() {
    if (!isMobileDevice || !embeddedBar) return;
    embeddedBar.style.opacity = '1';
    embeddedBar.style.visibility = 'visible';
    embeddedBar.style.transform = 'translateY(0)';
    resetControlsTimer();
  }

  function hideMobileControls() {
    if (!isMobileDevice || !embeddedBar) return;
    embeddedBar.style.opacity = '0';
    embeddedBar.style.visibility = 'hidden';
    embeddedBar.style.transform = 'translateY(10px)';
  }

  function resetControlsTimer() {
    if (controlsHideTimer) clearTimeout(controlsHideTimer);
    controlsHideTimer = setTimeout(hideMobileControls, 3000);
  }

  if (isMobileDevice && embeddedBar) {
    // Mostrar controles inicialmente por 3 segundos
    showMobileControls();

    // Al tocar cualquier parte del player-wrapper, mostrar controles
    playerWrapper.addEventListener('touchstart', () => {
      showMobileControls();
    }, { passive: true });

    // Mantener controles visibles al interactuar con ellos
    embeddedBar.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      resetControlsTimer();
    }, { passive: true });
  }

  // A. Eventos de Reproducción y Mute

  // Evento play del video: Sincroniza interfaz y asegura volumen
  video.addEventListener('play', () => {
    if (unmuteBtn) unmuteBtn.classList.remove('visible');
    
    // Re-aplicar velocidad guardada para evitar reseteos en bucle del navegador
    const savedSpeed = parseFloat(video.dataset.currentSpeed || '1.0');
    video.playbackRate = savedSpeed;
    
    // HUD Animación: Play
    if (playPauseHud) {
      playPauseHud.querySelector('i').className = 'fa-solid fa-play';
      playPauseHud.classList.remove('animate-hud');
      void playPauseHud.offsetWidth; // Trigger reflow
      playPauseHud.classList.add('animate-hud');
    }
  });

  // Evento pause del video: Sincroniza interfaz
  video.addEventListener('pause', () => {
    // HUD Animación: Pause
    if (playPauseHud) {
      playPauseHud.querySelector('i').className = 'fa-solid fa-pause';
      playPauseHud.classList.remove('animate-hud');
      void playPauseHud.offsetWidth; // Trigger reflow
      playPauseHud.classList.add('animate-hud');
    }
  });

  // Click simple en pantalla: Play/Pause
  function togglePlayPause() {
    const userIsPremium = clientSession && clientSession.is_premium;
    if (videoData.is_premium && !userIsPremium && video.currentTime >= 7) {
      if (premiumLockOverlay) premiumLockOverlay.style.display = 'flex';
      return;
    }
    if (video.paused) {
      video.play().catch(err => console.log("Autoplay bloqueado:", err));
    } else {
      video.pause();
    }
  }

  // Click en botón mute de la barra integrada
  if (btnEmbeddedMute) {
    btnEmbeddedMute.addEventListener('click', (e) => {
      e.stopPropagation();
      state.isMuted = !state.isMuted;
      updateMuteIconGlobally();
    });
  }

  // B. Menú de Ajustes Popover (Velocidad y Calidad)

  // Toggle Popover de Ajustes
  btnEmbeddedSettingsList.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const popover = btn.closest('.settings-menu-wrapper')?.querySelector('.settings-popover');
      if (popover) {
        popover.classList.toggle('hidden');
        // Ocultar submenús
        popover.querySelector('.speed-submenu')?.classList.add('hidden');
        popover.querySelector('.quality-submenu')?.classList.add('hidden');
      }
    });
  });

  // Cerrar popover si se hace clic afuera del wrapper de ajustes
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.settings-menu-wrapper')) {
      settingsPopoverList.forEach(popover => popover.classList.add('hidden'));
    }
  });

  // Abrir submenú de velocidad
  speedRows.forEach(row => {
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      const submenu = row.querySelector('.speed-submenu');
      if (submenu) {
        submenu.classList.remove('hidden');
        row.closest('.settings-popover')?.querySelector('.quality-submenu')?.classList.add('hidden');
      }
    });
  });

  // Abrir submenú de calidad
  qualityRows.forEach(row => {
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      const submenu = row.querySelector('.quality-submenu');
      if (submenu) {
        submenu.classList.remove('hidden');
        row.closest('.settings-popover')?.querySelector('.speed-submenu')?.classList.add('hidden');
      }
    });
  });

  // Clic en items de Velocidad
  card.querySelectorAll('.speed-submenu').forEach(submenu => {
    submenu.querySelectorAll('.submenu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const speedVal = parseFloat(item.getAttribute('data-speed'));
        if (!isNaN(speedVal)) {
          video.dataset.currentSpeed = speedVal;
          video.playbackRate = speedVal;
          video.defaultPlaybackRate = speedVal;
          
          // Actualizar estado activo en todos los submenús de velocidad de esta tarjeta
          card.querySelectorAll('.speed-submenu').forEach(sub => {
            sub.querySelectorAll('.submenu-item').forEach(i => {
              if (parseFloat(i.getAttribute('data-speed')) === speedVal) i.classList.add('active');
              else i.classList.remove('active');
            });
          });

          // Actualizar texto en la fila principal
          card.querySelectorAll('.current-speed-text').forEach(el => {
            el.textContent = speedVal === 1.0 ? 'Normal' : `${speedVal}x`;
          });

          // Ocultar todos los popovers
          settingsPopoverList.forEach(popover => popover.classList.add('hidden'));
        }
      });
    });
  });

  // Buscar o crear spinner dinámico de carga de calidad
  let qualitySpinner = playerWrapper.querySelector('.quality-loader-spinner');
  if (!qualitySpinner) {
    qualitySpinner = document.createElement('div');
    qualitySpinner.className = 'quality-loader-spinner';
    qualitySpinner.innerHTML = '<div class="spinner-circle"></div>';
    playerWrapper.appendChild(qualitySpinner);
  }

  // Clic en items de Calidad (Carga simulada premium)
  card.querySelectorAll('.quality-submenu').forEach(submenu => {
    submenu.querySelectorAll('.submenu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const qualityVal = item.getAttribute('data-quality');
        
        // Simular reload / re-búfer con el spinner
        qualitySpinner.classList.add('active');
        const wasPaused = video.paused;
        video.pause();

        setTimeout(() => {
          qualitySpinner.classList.remove('active');
          
          // Actualizar estado activo en todos los submenús de calidad de esta tarjeta
          card.querySelectorAll('.quality-submenu').forEach(sub => {
            sub.querySelectorAll('.submenu-item').forEach(i => {
              if (i.getAttribute('data-quality') === qualityVal) i.classList.add('active');
              else i.classList.remove('active');
            });
          });

          // Actualizar texto en la fila principal
          const labelMap = {
            'auto': 'Automático',
            '1080p': '1080p (Full HD)',
            '720p': '720p (HD)',
            '480p': '480p (SD)'
          };
          card.querySelectorAll('.current-quality-text').forEach(el => {
            el.textContent = labelMap[qualityVal] || 'Automático';
          });

          // Reanudar video si estaba reproduciendo
          if (!wasPaused) {
            video.play().catch(err => console.log(err));
          }

          // Ocultar todos los popovers
          settingsPopoverList.forEach(popover => popover.classList.add('hidden'));
        }, 800);
      });
    });
  });

  // C. Barra de Progreso y Drag-to-Seek Móvil/Desktop Híbrido
  let isDraggingTimeline = false;

  const premiumLockOverlay = card.querySelector('.premium-lock-overlay');
  const previewIndicator = card.querySelector('.preview-indicator-badge');

  function checkPremiumLimit() {
    const userIsPremium = clientSession && clientSession.is_premium;
    if (videoData.is_premium && !userIsPremium) {
      if (video.currentTime >= 7) {
        video.pause();
        video.currentTime = 7;
        if (premiumLockOverlay) {
          premiumLockOverlay.style.display = 'flex';
        }
        return true;
      }
    } else {
      if (premiumLockOverlay) {
        premiumLockOverlay.style.display = 'none';
      }
      if (previewIndicator) {
        previewIndicator.classList.add('hidden');
      }
    }
    return false;
  }

  // Configurar click en botón de desbloqueo del overlay
  const unlockBtn = card.querySelector('.btn-unlock-video');
  if (unlockBtn) {
    unlockBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const premiumModal = document.getElementById('premium-checkout-modal');
      if (premiumModal) {
        premiumModal.classList.add('active');
      }
    });
  }

  video.addEventListener('timeupdate', () => {
    // Verificar límite premium antes de proceder
    if (checkPremiumLimit()) return;

    if (video.duration) {
      const percentage = (video.currentTime / video.duration) * 100;
      
      if (!isDraggingTimeline) {
        if (timelineFill) {
          timelineFill.style.width = `${percentage}%`;
        }
      }
      
      // Resaltado dinámico del capítulo activo basado en el tiempo actual de reproducción
      let activeChapter = null;
      chapterItems.forEach(item => {
        const itemTime = parseFloat(item.getAttribute('data-time'));
        if (video.currentTime >= itemTime) {
          activeChapter = item;
        }
      });
      
      chapterItems.forEach(item => {
        if (item === activeChapter) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    }
  });

  // Drag en la barra de progreso fina integrada
  function seek(e) {
    if (!video.duration || !timelineWrapper) return;
    const rect = timelineWrapper.getBoundingClientRect();
    let clientX = e.clientX;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
    }
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    let targetTime = pos * video.duration;

    const userIsPremium = clientSession && clientSession.is_premium;
    if (videoData.is_premium && !userIsPremium && targetTime > 7) {
      targetTime = 7;
      if (premiumLockOverlay) premiumLockOverlay.style.display = 'flex';
      video.pause();
    } else {
      if (premiumLockOverlay && targetTime < 7) premiumLockOverlay.style.display = 'none';
    }

    if (timelineFill) {
      timelineFill.style.width = `${(targetTime / video.duration) * 100}%`;
    }
    video.currentTime = targetTime;
  }

  if (timelineWrapper) {
    timelineWrapper.addEventListener('mousedown', (e) => {
      isDraggingTimeline = true;
      seek(e);
    });

    timelineWrapper.addEventListener('touchstart', (e) => {
      isDraggingTimeline = true;
      seek(e);
    }, { passive: true });
  }

  window.addEventListener('mousemove', (e) => {
    if (isDraggingTimeline) {
      seek(e);
    }
  });

  window.addEventListener('touchmove', (e) => {
    if (isDraggingTimeline) {
      seek(e);
    }
  }, { passive: true });

  window.addEventListener('mouseup', () => {
    isDraggingTimeline = false;
  });

  window.addEventListener('touchend', () => {
    isDraggingTimeline = false;
  });

  // C. Interacciones de Like (Corazón)
  const likeBtnMobile = card.querySelector('.btn-like');
  const likeBtnDesktop = card.querySelector('.btn-like-desktop');
  const likeCountTextMobile = card.querySelector('.count-like');
  const likeCountTextDesktop = card.querySelector('.desktop-like-count');

  // Acción de Dar Like
  async function giveLike() {
    if (!clientSession) {
      openAuthModal('login');
      return;
    }
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
        likeBtnDesktop.innerHTML = `<i class="fa-solid fa-heart"></i> <strong class="desktop-like-count">${videoObj.likes}</strong>`;
      }
      
      triggerLikeAnimation(likeBtnMobile);

      // Persistir like de forma inmediata en Supabase
      try {
        await supabase
          .from('videos')
          .update({ likes: videoObj.likes })
          .eq('id', videoData.id);
      } catch (err) {
        console.error("Error al persistir like en Supabase:", err);
      }
    }
  }

  likeBtnMobile.addEventListener('click', giveLike);
  if (likeBtnDesktop) likeBtnDesktop.addEventListener('click', giveLike);

  // Doble Tap para dar Like con animación y Clic Simple para Play/Pause en todo el video
  let lastTap = 0;
  let tapTimeout = null;
  playerWrapper.addEventListener('click', (e) => {
    // Evitar disparar si se hace clic en controles inferiores, menú de ajustes, o bloqueo premium
    if (e.target.closest('.embedded-control-bar') || e.target.closest('.video-actions') || e.target.closest('.premium-lock-overlay')) {
      return;
    }

    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;

    if (tapLength < 300 && tapLength > 0) {
      e.preventDefault();
      if (tapTimeout) {
        clearTimeout(tapTimeout);
        tapTimeout = null;
      }
      // Animación de corazón
      doubleHeart.className = 'double-tap-heart animate';
      setTimeout(() => {
        doubleHeart.classList.remove('animate');
      }, 800);

      giveLike();
      // Clic simple: Play/Pause del video con pequeña demora para evitar conflictos
      if (tapTimeout) clearTimeout(tapTimeout);
      tapTimeout = setTimeout(() => {
        if (state.isMuted) {
          state.isMuted = false;
          updateMuteIconGlobally();
        } else {
          togglePlayPause();
        }
        tapTimeout = null;
      }, 250);
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

  async function addComment() {
    if (!clientSession) {
      openAuthModal('login');
      return;
    }
    const text = commentInput.value.trim();
    if (!text) return;

    const defaultUser = clientSession.user_name || clientSession.email.split('@')[0];

    try {
      // Inyectar comentario en Supabase de forma persistente
      const { data, error } = await supabase
        .from('comments')
        .insert([
          {
            video_id: videoData.id,
            user_name: defaultUser,
            text: text
          }
        ])
        .select();

      if (error) throw error;

      const newComment = {
        user: defaultUser,
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

    } catch (err) {
      console.error("Error al publicar comentario en Supabase:", err);
    }
  }

  if (commentSubmitBtn) {
    commentSubmitBtn.addEventListener('click', addComment);
    commentInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addComment();
    });
  }

  // En móvil, click en comentarios abre un alert o simulación rápida
  commentsMobileBtn.addEventListener('click', () => {
    if (!clientSession) {
      openAuthModal('login');
      return;
    }
    const cList = state.comments[videoData.id] || [];
    if (cList.length === 0) {
      alert("Aún no hay comentarios. ¡Sé el primero!");
    } else {
      alert(`Anécdotas en Bariloche:\n\n` + cList.map(c => `• ${c.user}: ${c.text}`).join('\n'));
    }
  });

  // 1. Botón Replay de Show Card
  const btnReplay = card.querySelector('.btn-replay-showcard');
  if (btnReplay) {
    btnReplay.addEventListener('click', (e) => {
      e.stopPropagation();
      video.currentTime = 0;
      video.play().catch(err => console.log(err));
    });
  }

  // 2. Expandir Descripción (MÁS/MENOS)
  const btnMoreDesc = card.querySelector('.btn-more-desc');
  if (btnMoreDesc) {
    btnMoreDesc.addEventListener('click', (e) => {
      e.stopPropagation();
      const descShort = card.querySelector('.desc-short');
      const descFull = card.querySelector('.desc-full');
      if (descFull.classList.contains('hidden')) {
        descFull.classList.remove('hidden');
        descShort.classList.add('hidden');
        btnMoreDesc.textContent = 'MENOS';
      } else {
        descFull.classList.add('hidden');
        descShort.classList.remove('hidden');
        btnMoreDesc.textContent = 'MÁS';
      }
    });
  }

  // 3. Flechas de carrusel en panel de detalles
  const carouselArrows = card.querySelectorAll('.carousel-arrows button');
  carouselArrows.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const targetId = btn.getAttribute('data-target');
      const track = card.querySelector(`#${targetId}`);
      if (track) {
        const scrollAmount = 240;
        if (btn.classList.contains('btn-carousel-prev')) {
          track.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        } else {
          track.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
      }
    });
  });

  // 4. Click en miniatura de carrusel (Cambio de video instantáneo)
  const carouselCards = card.querySelectorAll('.carousel-card');
  carouselCards.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt(item.getAttribute('data-video-id'));
      
      // Cambiar video activo
      state.activeVideoId = id;
      
      // En desktop cine: marcar el card activo
      if (window.innerWidth >= 992) {
        document.querySelectorAll('.short-card').forEach(c => c.classList.remove('active-desktop'));
        const targetCard = document.getElementById(`short-card-${id}`);
        if (targetCard) targetCard.classList.add('active-desktop');
      }
      
      // Reproducir
      setTimeout(playActiveVideo, 100);
    });
  });

  // 5. Configurar click en capítulos del video para saltar de tiempo (seek)
  chapterItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const seekTime = parseFloat(item.getAttribute('data-time'));
      if (!isNaN(seekTime)) {
        video.currentTime = seekTime;
        video.play().catch(err => console.log("Autoplay post-seek bloqueado:", err));
        
        // Reset controls display/timer
        resetMobileControlsTimer();
        
        // Highlight active chapter
        chapterItems.forEach(ci => ci.classList.remove('active'));
        item.classList.add('active');
      }
    });
  });

  // Configurar click en los tags interactivos
  const tagPills = card.querySelectorAll('.tag-pill-badge');
  tagPills.forEach(pill => {
    pill.addEventListener('click', (e) => {
      e.stopPropagation();
      const tagQuery = pill.getAttribute('data-tag');
      if (tagQuery) {
        const searchInput = document.getElementById('catalog-search-input');
        if (searchInput) {
          searchInput.value = tagQuery;
        }
        
        // Pausar todos los videos de inmediato
        pauseAllVideos();
        
        // Ejecutar búsqueda y actualizar vistas
        state.currentFilter = 'all';
        
        // Actualizar chips de categoría activos en la UI
        document.querySelectorAll('.category-chip').forEach(chip => {
          if (chip.getAttribute('data-category') === 'all') {
            chip.classList.add('active');
          } else {
            chip.classList.remove('active');
          }
        });

        updateAppOnFilterOrSearch();
        switchView('explorer');
        
        // Scroll suave al catálogo/resultados
        const gridSection = document.getElementById('netflix-grid-section');
        if (gridSection) {
          gridSection.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });
}

// ----------------------------------------------------------------------
// LÓGICA DE REPRODUCCIÓN AUTOMÁTICA INTELIGENTE
// ----------------------------------------------------------------------

// Actualizar el estado de sonido global en la UI
function updateMuteIconGlobally() {
  const videos = document.querySelectorAll('.short-video');
  const unmuteButtons = document.querySelectorAll('.unmute-overlay-btn');
  const controlMuteBtns = document.querySelectorAll('.btn-control-mute');
  const embeddedMuteBtns = document.querySelectorAll('.btn-embedded-mute');

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

  controlMuteBtns.forEach(btn => {
    const icon = btn.querySelector('i');
    if (state.isMuted) {
      icon.className = 'fa-solid fa-volume-xmark';
    } else {
      icon.className = 'fa-solid fa-volume-high';
    }
  });

  embeddedMuteBtns.forEach(btn => {
    const icon = btn.querySelector('i');
    if (icon) {
      if (state.isMuted) {
        icon.className = 'fa-solid fa-volume-xmark';
      } else {
        icon.className = 'fa-solid fa-volume-high';
      }
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
        
        // Registrar en "Continuar Viendo"
        logRecentlyPlayed(id);
        
        // Pausar todos los demás primero
        pauseAllVideos();

        // BLOQUEO DE SWIPE EN PUBLICIDADES (Las publicidades se quedan para obligarte a verlas)
        const isAd = id < 0;
        if (isAd) {
          feedContainer.style.overflowY = 'hidden';
          feedContainer.style.touchAction = 'none';
        } else {
          feedContainer.style.overflowY = 'scroll';
          feedContainer.style.touchAction = 'pan-y';
        }
        
        // Reproducir este
        video.muted = state.isMuted;
        video.play().catch(err => {
          console.warn("Autoplay con sonido bloqueado por el navegador. Intentando reproducir silenciado...", err);
          video.muted = true;
          state.isMuted = true;
          updateMuteIconGlobally();
          video.play().catch(e => console.error("Autoplay silenciado también falló:", e));
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
  const feedView = document.getElementById('shorts-feed-view');
  if (feedView && feedView.classList.contains('hidden')) {
    pauseAllVideos();
    return;
  }

  // BLOQUEO DE SWIPE EN PUBLICIDADES (Las publicidades se quedan para obligarte a verlas)
  const isAdVideo = state.activeVideoId < 0;
  if (feedView) {
    if (isAdVideo) {
      feedView.style.overflowY = 'hidden';
      feedView.style.touchAction = 'none';
    } else {
      feedView.style.overflowY = 'scroll';
      feedView.style.touchAction = 'pan-y';
    }
  }

  const activeCard = document.getElementById(`short-card-${state.activeVideoId}`);
  if (!activeCard) return;

  // Actualizar metadatos de SEO y Open Graph dinámicamente para los buscadores/IAs del cliente
  const activeVideo = state.activeVideoId < 0
    ? state.ads.find(ad => ad.id === Math.abs(state.activeVideoId))
    : state.videos.find(v => v.id === state.activeVideoId);
    
  if (activeVideo) {
    const cleanSchool = activeVideo.school ? activeVideo.school.split(' - ')[0] : 'ANUNCIO';
    document.title = activeVideo.isAd 
      ? `Patrocinado: ${activeVideo.title} | TravelRock`
      : `${activeVideo.title} | ${cleanSchool} | TravelRock Channel`;
    
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', activeVideo.description || activeVideo.title || '');
    
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', activeVideo.isAd ? `Patrocinado: ${activeVideo.title}` : `${activeVideo.title} - ${cleanSchool}`);
    
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', activeVideo.description || activeVideo.title || '');

    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) ogImage.setAttribute('content', activeVideo.thumbnailUrl || '');
  }

  // Registrar en "Continuar Viendo"
  logRecentlyPlayed(state.activeVideoId);

  // Sincronizar la sesión en segundo plano al reproducir para asegurar el estado premium más actualizado
  syncSessionWithDatabase().catch(err => console.log("Error syncSession:", err));

  const video = activeCard.querySelector('.short-video');
  const unmuteBtn = activeCard.querySelector('.unmute-overlay-btn');
  
  pauseAllVideos();
  
  video.muted = state.isMuted;
  video.currentTime = 0; // Iniciar desde el principio
  video.play()
    .catch(err => {
      console.warn("Autoplay con sonido bloqueado en inicio. Intentando reproducir silenciado...", err);
      video.muted = true;
      state.isMuted = true;
      updateMuteIconGlobally();
      video.play().catch(e => console.error("Autoplay silenciado también falló:", e));
    });

  // Actualizar UI activa en desktop
  if (window.innerWidth >= 992) {
    document.querySelectorAll('.short-card').forEach(c => c.classList.remove('active-desktop'));
    activeCard.classList.add('active-desktop');
  }
}

// Precarga del siguiente video (Prefetch inteligente)
function preloadNextVideo(currentId) {
  const filtered = getFilteredVideos(true);
  const currentIndex = filtered.findIndex(v => v.id === currentId);
  if (currentIndex !== -1 && currentIndex < filtered.length - 1) {
    const nextVideoData = filtered[currentIndex + 1];
    const nextCard = document.getElementById(`short-card-${nextVideoData.id}`);
    if (nextCard) {
      const nextVideoElement = nextCard.querySelector('.short-video');
      nextVideoElement.setAttribute('preload', 'auto');
    }
  }
}

// Incrementar impresiones de anuncios en Supabase
async function recordAdImpression(adId) {
  try {
    const { data: currentAd } = await supabase.from('ads').select('impressions').eq('id', adId).single();
    if (currentAd) {
      await supabase.from('ads').update({ impressions: (currentAd.impressions || 0) + 1 }).eq('id', adId);
    }
  } catch (err) {
    console.warn("Error al registrar impresión de anuncio:", err);
  }
}

// Incrementar clics de anuncios en Supabase
async function recordAdClick(adId) {
  try {
    const { data: currentAd } = await supabase.from('ads').select('clicks').eq('id', adId).single();
    if (currentAd) {
      await supabase.from('ads').update({ clicks: (currentAd.clicks || 0) + 1 }).eq('id', adId);
    }
  } catch (err) {
    console.warn("Error al registrar clic de anuncio:", err);
  }
}

// Obtener lista filtrada de videos combinando categoría y búsqueda
export function getFilteredVideos(includeAds = false) {
  let list = state.videos;
  
  // A. Filtrar por Categoría chip activa
  if (state.currentFilter !== 'all') {
    if (state.currentFilter === 'pro-only') {
      list = list.filter(v => v.is_premium === true);
    } else {
      list = list.filter(v => v.category === state.currentFilter);
    }
  }
  
  // B. Filtrar por término de búsqueda en input
  const searchInput = document.getElementById('catalog-search-input');
  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
  
  if (query) {
    list = list.filter(v => 
      (v.title && v.title.toLowerCase().includes(query)) || 
      (v.description && v.description.toLowerCase().includes(query)) || 
      (v.school && v.school.toLowerCase().includes(query)) || 
      (v.categoryLabel && v.categoryLabel.toLowerCase().includes(query)) ||
      (v.collection_name && v.collection_name.toLowerCase().includes(query)) ||
      (v.tags && v.tags.toLowerCase().includes(query))
    );
  }

  // C. Ordenamiento Inteligente: agrupar videos por colección y ordenarlos por número de episodio secuencial.
  // Los videos que no pertenecen a ninguna colección mantendrán su orden original.
  const collections = {};
  const singleVideos = [];

  list.forEach(v => {
    if (v.collection_name) {
      const colName = v.collection_name.trim();
      if (!collections[colName]) {
        collections[colName] = [];
      }
      collections[colName].push(v);
    } else {
      singleVideos.push(v);
    }
  });

  // Ordenar episodios dentro de cada colección secuencialmente
  for (const colName in collections) {
    collections[colName].sort((a, b) => (a.episode_number || 999) - (b.episode_number || 999));
  }

  // Re-aplanar la lista agrupada: primero colecciones ordenadas por su video más reciente, y luego videos sueltos
  let sortedList = [];
  const collectionsArray = Object.keys(collections).map(colName => {
    const vids = collections[colName];
    const maxId = Math.max(...vids.map(v => v.id));
    return { name: colName, videos: vids, maxId };
  });

  // Ordenar colecciones por maxId descendente
  collectionsArray.sort((a, b) => b.maxId - a.maxId);

  // Agregar videos de colecciones
  collectionsArray.forEach(c => {
    sortedList = sortedList.concat(c.videos);
  });

  // Agregar videos sueltos ordenados por ID descendente (más nuevos primero)
  singleVideos.sort((a, b) => b.id - a.id);
  sortedList = sortedList.concat(singleVideos);
  list = sortedList;
  
  // Intercalar anuncios dinámicamente si includeAds es true y el usuario es común (no premium) y hay anuncios
  const isPremium = clientSession && clientSession.is_premium;
  if (includeAds && !isPremium && state.ads && state.ads.length > 0) {
    let result = [];
    let adIndex = 0;
    for (let i = 0; i < list.length; i++) {
      result.push(list[i]);
      if ((i + 1) % 2 === 0) {
        const ad = state.ads[adIndex % state.ads.length];
        result.push({
          ...ad,
          id: -ad.id // ID negativo para identificarlo como anuncio
        });
        adIndex++;
      }
    }
    return result;
  }
  
  return list;
}

// C. Renderizar la grilla general del Explorer (Buscador y Filtrado)
function renderNetflixGrid(filteredVideos) {
  const gridContainer = document.getElementById('netflix-grid-container');
  if (!gridContainer) return;
  
  gridContainer.innerHTML = '';
  
  if (filteredVideos.length === 0) {
    gridContainer.innerHTML = `
      <div class="glassmorphism" style="padding: 40px; border-radius: 20px; text-align: center; grid-column: 1 / -1; max-width: 320px; margin: 40px auto; border-color: rgba(236, 72, 153, 0.3);">
        <i class="fa-solid fa-magnifying-glass" style="font-size: 3rem; margin-bottom: 20px; color: var(--neon-pink); filter: drop-shadow(0 0 10px rgba(236,72,153,0.4));"></i>
        <h3 style="font-family: var(--font-display); margin-bottom: 8px; font-weight: 700;">No hay resultados</h3>
        <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4;">Intentá buscando otra palabra clave, boliche o el colegio de los chicos.</p>
      </div>
    `;
    return;
  }
  
  gridContainer.innerHTML = filteredVideos.map(video => `
    <div class="netflix-card" data-video-id="${video.id}">
      <img class="netflix-card-img" src="${video.thumbnailUrl}" onerror="this.src='https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop&q=60';" alt="${video.title}">
      ${video.is_premium ? `
        <div class="netflix-card-premium-badge" style="position: absolute; top: 10px; right: 10px; background: linear-gradient(135deg, #f59e0b 0%, #ec4899 100%); color: white; border-radius: 4px; padding: 3px 6px; font-size: 0.65rem; font-weight: 800; display: flex; align-items: center; gap: 3px; box-shadow: 0 4px 10px rgba(0,0,0,0.5); z-index: 2;"><i class="fa-solid fa-crown"></i> PRO</div>
      ` : ''}
      <div class="netflix-card-overlay">
        <span class="netflix-card-school">${(video.school || 'General').split(' - ')[0]}${video.province ? ` (${video.province})` : ''}</span>
        <h4 class="netflix-card-title">${video.title}</h4>
      </div>
    </div>
  `).join('');
  
  // Asignar click a cada tarjeta de la grilla para reproducir al instante
  const gridCards = gridContainer.querySelectorAll('.netflix-card');
  gridCards.forEach(card => {
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

// D. Unificar la actualización de todas las vistas tras buscar o filtrar categorías
function updateAppOnFilterOrSearch() {
  const filtered = getFilteredVideos();
  const searchInput = document.getElementById('catalog-search-input');
  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
  
  const gridSectionTitle = document.getElementById('grid-section-title');
  const netflixRowsContainer = document.getElementById('netflix-rows-container');
  
  const categoryLabels = { all: 'Todos los Momentos', 'pro-only': 'Contenido PRO 👑' };
  if (state.dynamicCategories) {
    state.dynamicCategories.forEach(c => {
      categoryLabels[c.key] = c.label;
    });
  } else {
    categoryLabels.boliche = 'Noches de Boliches';
    categoryLabels.aventura = 'Aventura Extrema';
    categoryLabels.lifestyle = 'Lifestyle & Relax';
    categoryLabels.emociones = 'Momentos Mágicos';
  }
  
  const netflixRankingContainer = document.getElementById('netflix-ranking-container');
  const netflixFeaturedContainer = document.getElementById('netflix-featured-container');
  
  if (query) {
    // Si hay búsqueda activa: ocultar destacados, carruseles y ranking
    if (netflixFeaturedContainer) netflixFeaturedContainer.style.display = 'none';
    if (netflixRowsContainer) netflixRowsContainer.style.display = 'none';
    if (netflixRankingContainer) netflixRankingContainer.style.display = 'none';
    if (gridSectionTitle) gridSectionTitle.textContent = `Resultados de Búsqueda para "${searchInput.value.trim()}" (${filtered.length})`;
  } else {
    // Si no hay búsqueda:
    if (state.currentFilter === 'all') {
      // Mostrar destacados, carruseles y ranking
      if (netflixFeaturedContainer) netflixFeaturedContainer.style.display = 'block';
      if (netflixRowsContainer) netflixRowsContainer.style.display = 'block';
      if (netflixRankingContainer) netflixRankingContainer.style.display = 'block';
      if (gridSectionTitle) gridSectionTitle.textContent = 'Todos los Momentos';
    } else {
      // Ocultar destacados, carruseles y ranking, y mostrar momentos de la categoría seleccionada
      if (netflixFeaturedContainer) netflixFeaturedContainer.style.display = 'none';
      if (netflixRowsContainer) netflixRowsContainer.style.display = 'none';
      if (netflixRankingContainer) netflixRankingContainer.style.display = 'none';
      if (gridSectionTitle) gridSectionTitle.textContent = `${categoryLabels[state.currentFilter]} (${filtered.length})`;
    }
  }
  
  // Re-renderizar Grilla Explorer y Feed
  renderNetflixGrid(filtered);
  renderFeed();
  
  // Actualizar video activo si ya no está disponible en la lista filtrada
  if (filtered.length > 0) {
    const isStillAvailable = filtered.some(v => v.id === state.activeVideoId);
    if (!isStillAvailable) {
      state.activeVideoId = filtered[0].id;
    }
  }
  
  // Reconectar IntersectionObserver para el feed dinámico
  setupIntersectionObserver();
  
  // Controlar reproducción según vista activa
  const feedView = document.getElementById('shorts-feed-view');
  if (feedView && !feedView.classList.contains('hidden')) {
    setTimeout(playActiveVideo, 100);
  } else {
    pauseAllVideos();
  }
}

// ----------------------------------------------------------------------
// NAVEGACIÓN TECLADO (DESKTOP CINE)
// ----------------------------------------------------------------------
function setupKeyboardNavigation() {
  document.addEventListener('keydown', (e) => {
    // Si el usuario está escribiendo en comentarios o en la búsqueda, ignorar shortcuts
    if (document.activeElement.classList.contains('comment-input') || document.activeElement.id === 'catalog-search-input') {
      return;
    }

    const filtered = getFilteredVideos(true);
    const currentIndex = filtered.findIndex(v => v.id === state.activeVideoId);

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      // Siguiente video
      if (currentIndex < filtered.length - 1) {
        e.preventDefault();
        state.activeVideoId = filtered[currentIndex + 1].id;
        
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

// ----------------------------------------------------------------------
// GESTIÓN HISTORIAL "CONTINUAR VIENDO" (Recently Played)
// ----------------------------------------------------------------------
let recentlyPlayed = JSON.parse(localStorage.getItem('tr_recently_played') || '[]');

// Si está vacío en primer inicio, inicializamos con los 3 primeros videos
if (recentlyPlayed.length === 0 && state.videos.length >= 3) {
  recentlyPlayed = [1, 2, 3];
  localStorage.setItem('tr_recently_played', JSON.stringify(recentlyPlayed));
}

// Registrar un video reproducido en el historial
function logRecentlyPlayed(id) {
  if (id < 0) return; // Bypasear anuncios
  // Evitar duplicados moviendo el ID al principio
  recentlyPlayed = recentlyPlayed.filter(vidId => vidId !== id);
  recentlyPlayed.unshift(id);
  
  // Limitar historial a los últimos 3 videos reproducidos
  if (recentlyPlayed.length > 3) {
    recentlyPlayed.pop();
  }
  
  localStorage.setItem('tr_recently_played', JSON.stringify(recentlyPlayed));
  updateKeepWatchingSidebar();
}

// Renderizar dinámicamente la lista de "Continuar Viendo" en la barra lateral
function updateKeepWatchingSidebar() {
  const listEl = document.getElementById('keep-watching-list');
  if (!listEl) return;
  
  if (recentlyPlayed.length === 0) {
    listEl.innerHTML = `
      <div class="keep-watching-skeleton">
        <div class="skeleton-thumb"></div>
        <div class="skeleton-text">
          <div class="sk-line-1"></div>
          <div class="sk-line-2"></div>
        </div>
      </div>
    `;
    return;
  }
  
  listEl.innerHTML = recentlyPlayed.map(id => {
    const video = state.videos.find(v => v.id === id);
    if (!video) return '';
    return `
      <div class="keep-watching-item" data-video-id="${video.id}">
        <div class="keep-watching-thumb">
          <img src="${video.thumbnailUrl}" alt="${video.title}">
          <div class="keep-watching-thumb-overlay">
            <i class="fa-solid fa-play"></i>
          </div>
        </div>
        <div class="keep-watching-details">
          <div class="keep-watching-title">${video.title}</div>
          <div class="keep-watching-meta">${(video.school || 'General').split(' - ')[0]}</div>
        </div>
      </div>
    `;
  }).join('');
  
  // Asignar click para reproducir instantáneamente el video seleccionado
  listEl.querySelectorAll('.keep-watching-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = parseInt(item.getAttribute('data-video-id'));
      state.activeVideoId = id;
      switchView('feed');
      
      if (window.innerWidth >= 992) {
        document.querySelectorAll('.short-card').forEach(c => c.classList.remove('active-desktop'));
        const targetCard = document.getElementById(`short-card-${id}`);
        if (targetCard) targetCard.classList.add('active-desktop');
      } else {
        const targetCard = document.getElementById(`short-card-${id}`);
        if (targetCard) {
          targetCard.scrollIntoView({ behavior: 'smooth' });
        }
      }
      
      setTimeout(playActiveVideo, 200);
    });
  });
}

// ----------------------------------------------------------------------
// LLUVIA DE CONFETI DE ALTA FIDELIDAD (Efecto Checkout Exitoso)
// ----------------------------------------------------------------------
function triggerConfetti() {
  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const colors = ['#a855f7', '#ec4899', '#f97316', '#22c55e', '#3b82f6'];
  
  const interval = setInterval(() => {
    if (Date.now() > animationEnd) {
      return clearInterval(interval);
    }
    
    // Crear un confeti (elemento DOM circular de color brillante)
    const confetti = document.createElement('div');
    confetti.className = 'confetti-particle';
    confetti.style.position = 'fixed';
    confetti.style.zIndex = '9999';
    confetti.style.width = Math.random() * 8 + 6 + 'px';
    confetti.style.height = Math.random() * 8 + 6 + 'px';
    confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.borderRadius = '50%';
    confetti.style.left = Math.random() * 100 + 'vw';
    confetti.style.top = '-10px';
    confetti.style.opacity = Math.random() * 0.7 + 0.3;
    confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
    
    document.body.appendChild(confetti);
    
    // Animar la caída del confeti con una trayectoria curva premium
    const animation = confetti.animate([
      { transform: `translate3d(0, 0, 0) rotate(0deg)`, opacity: confetti.style.opacity },
      { transform: `translate3d(${(Math.random() - 0.5) * 160}px, 105vh, 0) rotate(${Math.random() * 540}deg)`, opacity: 0 }
    ], {
      duration: Math.random() * 1800 + 1200,
      easing: 'cubic-bezier(.1, .7, .3, 1)'
    });
    
    animation.onfinish = () => confetti.remove();
  }, 35);
}

// Habilitar Gesto Pull-to-Refresh en Móvil
function setupPullToRefresh() {
  const feedView = document.getElementById('shorts-feed-view');
  if (!feedView) return;

  // Creamos e inyectamos el indicador dinámicamente si no existe
  let indicator = document.getElementById('pull-to-refresh-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'pull-to-refresh-indicator';
    indicator.className = 'pull-to-refresh-indicator';
    indicator.innerHTML = '<i class="fa-solid fa-arrows-rotate spinner-icon"></i>';
    feedView.appendChild(indicator);
  }

  let startY = 0;
  let currentY = 0;
  let isPulling = false;
  const threshold = 90; // Distancia para activar recarga

  feedView.addEventListener('touchstart', (e) => {
    // Solo permitir pull-to-refresh si estamos en el tope superior
    if (feedView.scrollTop === 0) {
      startY = e.touches[0].pageY;
      isPulling = true;
      indicator.classList.remove('loading');
      indicator.style.top = '-60px';
      indicator.style.opacity = '0';
    } else {
      isPulling = false;
    }
  }, { passive: true });

  feedView.addEventListener('touchmove', (e) => {
    if (!isPulling) return;

    currentY = e.touches[0].pageY;
    const dy = currentY - startY;

    if (dy > 0) {
      // Registrar que estamos deslizando hacia abajo
      indicator.classList.add('pulling');
      // Limitar el estiramiento máximo (resistencia física)
      const pullDist = Math.min(dy * 0.4, 120); 
      indicator.style.top = `${-60 + pullDist}px`;
      indicator.style.opacity = `${Math.min(pullDist / 60, 1)}`;
      
      // Si pasa el umbral, cambiar color para feedback
      if (pullDist >= 60) {
        indicator.style.color = 'var(--neon-purple)';
        indicator.style.borderColor = 'rgba(168, 85, 247, 0.4)';
      } else {
        indicator.style.color = 'var(--neon-pink)';
        indicator.style.borderColor = 'var(--glass-border)';
      }
    }
  }, { passive: true });

  feedView.addEventListener('touchend', () => {
    if (!isPulling) return;
    isPulling = false;
    indicator.classList.remove('pulling');

    const topVal = parseInt(indicator.style.top || '-60');
    if (topVal >= -20) {
      // Activar animación de carga
      indicator.classList.add('loading');
      indicator.style.top = '80px';
      indicator.style.opacity = '1';
      
      // Recargar la página (esto también limpia la caché móvil gracias al cache busting ?v=1.0.8)
      setTimeout(() => {
        location.reload();
      }, 800);
    } else {
      // Cancelar y ocultar
      indicator.style.top = '-60px';
      indicator.style.opacity = '0';
    }
  });
}

