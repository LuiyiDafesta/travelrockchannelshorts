/**
 * TravelRock Channel Shorts - Gestión de Interfaz Visual (ui.js)
 * 
 * Controla la navegación entre vistas (Feed vs Netflix), selección de categorías,
 * y efectos estéticos del menú lateral (sidebar) y barra inferior de pestañas (tab bar).
 * Version 1.1.2
 */

// Elementos de la interfaz
const feedView = document.getElementById('shorts-feed-view');
const explorerView = document.getElementById('netflix-explorer-view');

// Botones de Navegación Desktop
const sidebarBtnLogo = document.getElementById('sidebar-btn-logo');
const sidebarSearchTrigger = document.getElementById('sidebar-search-trigger');
const sidebarBtnExplorer = document.getElementById('sidebar-btn-explorer');
const sidebarBtnFeed = document.getElementById('sidebar-btn-feed');
const btnSidebarSubscribe = document.getElementById('btn-sidebar-subscribe');

// Botones de Navegación Móvil
const mobileBtnLogo = document.getElementById('mobile-btn-logo');
const mobileHeaderPremiumBtn = document.getElementById('mobile-header-premium-btn');

const tabBtnExplorer = document.getElementById('tab-btn-explorer');
const tabBtnFeed = document.getElementById('tab-btn-feed');
const tabBtnSearch = document.getElementById('tab-btn-search');
const tabBtnPremium = document.getElementById('tab-btn-premium');

// Modal Premium
const premiumCheckoutModal = document.getElementById('premium-checkout-modal');
const btnClosePremiumModal = document.getElementById('btn-close-premium-modal');

// Inicializar eventos de navegación de la interfaz
export function initNavigation(onViewChange) {
  
  // 1. Ir a vista Catálogo (Explorer)
  const setExplorerView = () => {
    switchView('explorer');
    if (onViewChange) onViewChange('explorer');
  };

  if (sidebarBtnExplorer) sidebarBtnExplorer.addEventListener('click', setExplorerView);
  if (tabBtnExplorer) tabBtnExplorer.addEventListener('click', setExplorerView);
  if (sidebarBtnLogo) sidebarBtnLogo.addEventListener('click', setExplorerView);
  if (mobileBtnLogo) mobileBtnLogo.addEventListener('click', setExplorerView);

  // 2. Ir a vista Shorts (Feed)
  const setFeedView = () => {
    switchView('feed');
    if (onViewChange) onViewChange('feed');
  };

  if (sidebarBtnFeed) sidebarBtnFeed.addEventListener('click', setFeedView);
  if (tabBtnFeed) tabBtnFeed.addEventListener('click', setFeedView);

  // 3. Acción de Búsqueda Rápida (Sincroniza y hace focus)
  const triggerQuickSearch = () => {
    switchView('explorer');
    if (onViewChange) onViewChange('explorer');
    
    // Enfocar buscador de catálogo principal
    const catalogSearchInput = document.getElementById('catalog-search-input');
    if (catalogSearchInput) {
      catalogSearchInput.focus();
      // Scroll suave hasta el buscador
      catalogSearchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  if (sidebarSearchTrigger) sidebarSearchTrigger.addEventListener('click', triggerQuickSearch);
  if (tabBtnSearch) tabBtnSearch.addEventListener('click', triggerQuickSearch);

  // 4. Modal de Suscripción Premium
  const openPremiumModal = () => {
    document.querySelectorAll('.short-video').forEach(v => v.pause()); // Pausar videos al abrir suscripción
    if (premiumCheckoutModal) {
      premiumCheckoutModal.classList.add('active');
    }
  };

  const closePremiumModal = () => {
    if (premiumCheckoutModal) {
      premiumCheckoutModal.classList.remove('active');
      // Resetear pasos del modal en app.js al cerrar
      setTimeout(resetPremiumModalSteps, 300);
    }
  };

  if (btnSidebarSubscribe) btnSidebarSubscribe.addEventListener('click', openPremiumModal);
  if (mobileHeaderPremiumBtn) mobileHeaderPremiumBtn.addEventListener('click', openPremiumModal);
  if (tabBtnPremium) tabBtnPremium.addEventListener('click', openPremiumModal);
  if (btnClosePremiumModal) btnClosePremiumModal.addEventListener('click', closePremiumModal);

  // Cerrar modal al hacer click fuera de la tarjeta
  if (premiumCheckoutModal) {
    premiumCheckoutModal.addEventListener('click', (e) => {
      if (e.target === premiumCheckoutModal) {
        closePremiumModal();
      }
    });
  }

  // Inicializar control de Categorías (chips dentro del catálogo con delegación de eventos)
  const categoriesNav = document.getElementById('categories-nav');
  if (categoriesNav) {
    categoriesNav.addEventListener('click', (e) => {
      const chip = e.target.closest('.category-chip');
      if (!chip) return;
      
      // Activar chip
      categoriesNav.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      
      const selectedCategory = chip.getAttribute('data-category');
      if (onViewChange) {
        onViewChange('filter', selectedCategory);
      }
    });
  }

  // Efecto dinámico de scroll en el Header Móvil (se vuelve más oscuro al hacer scroll en Explorer)
  explorerView.addEventListener('scroll', () => {
    const mobileHeader = document.getElementById('mobile-header');
    if (mobileHeader) {
      if (explorerView.scrollTop > 50) {
        mobileHeader.style.background = 'rgba(8, 8, 10, 0.9)';
        mobileHeader.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.8)';
      } else {
        mobileHeader.style.background = 'rgba(8, 8, 10, 0.4)';
        mobileHeader.style.boxShadow = 'none';
      }
    }
  });
}

// Función para alternar visualmente entre Feed y Explorer
export function switchView(targetView) {
  document.querySelectorAll('.short-video').forEach(v => v.pause()); // Pausar videos al cambiar de pestaña
  if (targetView === 'feed') {
    // Activar botón del Sidebar
    if (sidebarBtnFeed) sidebarBtnFeed.classList.add('active');
    if (sidebarBtnExplorer) sidebarBtnExplorer.classList.remove('active');
    
    // Activar botón de la barra de pestañas móvil
    if (tabBtnFeed) tabBtnFeed.classList.add('active');
    if (tabBtnExplorer) tabBtnExplorer.classList.remove('active');
    if (tabBtnSearch) tabBtnSearch.classList.remove('active');
    if (tabBtnPremium) tabBtnPremium.classList.remove('active');
    
    // Mostrar/Ocultar paneles
    feedView.classList.remove('hidden');
    explorerView.classList.add('hidden');
  } else if (targetView === 'explorer') {
    // Activar botón del Sidebar
    if (sidebarBtnExplorer) sidebarBtnExplorer.classList.add('active');
    if (sidebarBtnFeed) sidebarBtnFeed.classList.remove('active');
    
    // Activar botón de la barra de pestañas móvil
    if (tabBtnExplorer) tabBtnExplorer.classList.add('active');
    if (tabBtnFeed) tabBtnFeed.classList.remove('active');
    if (tabBtnSearch) tabBtnSearch.classList.remove('active');
    if (tabBtnPremium) tabBtnPremium.classList.remove('active');
    
    // Mostrar/Ocultar paneles
    explorerView.classList.remove('hidden');
    feedView.classList.add('hidden');
  }
}

// Micro-animación de Like (Confeti o efecto flotante sobre botón)
export function triggerLikeAnimation(buttonElement) {
  if (!buttonElement) return;
  buttonElement.classList.add('liked');
  
  // Agregar un micro-efecto de escala y resplandor temporal
  setTimeout(() => {
    buttonElement.style.transform = 'scale(1.2)';
    setTimeout(() => {
      buttonElement.style.transform = '';
    }, 150);
  }, 100);
}

// Función interna para resetear los pasos del modal (se define/accede en app.js)
function resetPremiumModalSteps() {
  const step1 = document.getElementById('premium-modal-content-step1');
  const step2 = document.getElementById('premium-modal-content-step2');
  const step3 = document.getElementById('premium-modal-content-step3');
  if (step1 && step2 && step3) {
    step1.classList.remove('hidden');
    step2.classList.add('hidden');
    step3.classList.add('hidden');
  }
}
