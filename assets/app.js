// NexPro Shared Application Logic & Helpers

(function() {
  // Ensure nexpro_role is initialized
  try {
    if (!localStorage.getItem('nexpro_role')) {
      localStorage.setItem('nexpro_role', 'buyer');
    }
  } catch (e) {
    console.warn("Storage access not allowed or blocked.", e);
  }
})();

// Role Helpers
function getNexproRole() {
  try {
    return localStorage.getItem('nexpro_role') || 'buyer';
  } catch (e) {
    return 'buyer';
  }
}

function setNexproRole(role) {
  try {
    localStorage.setItem('nexpro_role', role);
  } catch (e) {
    console.warn("Could not set nexpro_role", e);
  }
}

// Global Custom Toast Helper
function showToast(message) {
  let toast = document.getElementById('np-global-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'np-global-toast';
    toast.className = 'np-toast-notif np-sans';
    toast.innerHTML = `<span class="np-toast-success-dot"></span><span class="np-toast-text"></span>`;
    document.body.appendChild(toast);
  }
  
  toast.querySelector('.np-toast-text').innerText = message;
  toast.classList.add('active');
  
  // Auto-dismiss after 2.5s
  if (window.npToastTimeout) clearTimeout(window.npToastTimeout);
  window.npToastTimeout = setTimeout(() => {
    toast.classList.remove('active');
  }, 2500);
}

// Global Avatar dropdown toggle handler
function toggleAccountMenu(event) {
  if (event) event.stopPropagation();
  const panel = document.getElementById('np-account-panel');
  const btn = document.getElementById('np-avatar-btn');
  if (!panel) return;
  
  const isActive = panel.classList.contains('active');
  if (isActive) {
    panel.classList.remove('active');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  } else {
    panel.classList.add('active');
    if (btn) btn.setAttribute('aria-expanded', 'true');
  }
}

// Document click listener to dismiss active menus
document.addEventListener('click', (e) => {
  const panel = document.getElementById('np-account-panel');
  const btn = document.getElementById('np-avatar-btn');
  if (panel && panel.classList.contains('active')) {
    if (!panel.contains(e.target) && !btn.contains(e.target)) {
      panel.classList.remove('active');
      btn.setAttribute('aria-expanded', 'false');
    }
  }
});
