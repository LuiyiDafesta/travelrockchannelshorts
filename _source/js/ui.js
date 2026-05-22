/**
 * TravelRock Channel Shorts - Gestión de Interfaz Visual (ui.js)
 * 
 * Controla la navegación entre vistas (Feed vs Netflix), selección de categorías,
 * y efectos estéticos.
 */

// Elementos de la interfaz
const mainHeader = document.getElementById('main-header');
const categoriesNav = document.getElementById('categories-nav');
const feedView = document.getElementById('shorts-feed-view');
const explorerView = document.getElementById('netflix-explorer-view');

const modeFeedBtn = document.getElementById('mode-feed-btn');
const modeExplorerBtn = document.getElementById('mode-explorer-btn');
const btnLogo = document.getElementById('btn-logo');

// Inicializar eventos de navegación de la interfaz
export function initNavigation(onViewChange) {
  // Ir a vista Feed
  modeFeedBtn.addEventListener('click', () => {
    switchView('feed');
    if (onViewChange) onViewChange('feed');
  });

  // Ir a vista Netflix Explorer
  modeExplorerBtn.addEventListener('click', () => {
    switchView('explorer');
    if (onViewChange) onViewChange('explorer');
  });

  // Logo lleva a Catálogo por defecto
  btnLogo.addEventListener('click', () => {
    switchView('explorer');
    if (onViewChange) onViewChange('explorer');
  });

  // Inicializar control de Categorías (chips dentro del catálogo)
  const categoryChips = document.querySelectorAll('.category-chip');
  categoryChips.forEach(chip => {
    chip.addEventListener('click', (e) => {
      // Activar chip
      categoryChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      
      const selectedCategory = chip.getAttribute('data-category');
      
      if (onViewChange) {
        onViewChange('filter', selectedCategory);
      }
    });
  });

  // Efecto dinámico de scroll en el Header (se vuelve más oscuro al hacer scroll en Explorer)
  explorerView.addEventListener('scroll', () => {
    if (explorerView.scrollTop > 50) {
      mainHeader.style.background = 'rgba(8, 8, 10, 0.9)';
      mainHeader.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.8)';
    } else {
      mainHeader.style.background = 'rgba(8, 8, 10, 0.4)';
      mainHeader.style.boxShadow = 'none';
    }
  });
}

// Función para alternar visualmente entre Feed y Explorer
export function switchView(targetView) {
  if (targetView === 'feed') {
    modeFeedBtn.classList.add('active');
    modeExplorerBtn.classList.remove('active');
    
    feedView.classList.remove('hidden');
    explorerView.classList.add('hidden');
  } else if (targetView === 'explorer') {
    modeExplorerBtn.classList.add('active');
    modeFeedBtn.classList.remove('active');
    
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
