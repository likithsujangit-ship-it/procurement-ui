// Shared Authentication & Routing Guard for Nexpro UI

// Route Guard logic and early stylesheet injection
(function() {
  // Inject style.css immediately to prevent FOUC (Flash of Unstyled Content)
  if (!document.getElementById('np-global-styles')) {
    const link = document.createElement('link');
    link.id = 'np-global-styles';
    link.rel = 'stylesheet';
    link.href = 'assets/style.css';
    document.head.appendChild(link);
  }
  // Inject app.js immediately
  if (!document.getElementById('np-global-app-js')) {
    const script = document.createElement('script');
    script.id = 'np-global-app-js';
    script.src = 'assets/app.js';
    document.head.appendChild(script);
  }

  const path = window.location.pathname;
  const pageName = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
  const user = getCurrentUser();

  if (pageName === 'generate-rfq.html' || pageName === 'profile.html') {
    if (!user) {
      window.location.href = 'login.html';
    }
  } else if (pageName === 'admin.html') {
    if (!user || user.role !== 'admin') {
      window.location.href = 'login.html';
    }
  } else if (pageName === 'vendor.html') {
    if (!user || user.role !== 'vendor') {
      window.location.href = 'login.html';
    }
  } else if (pageName === 'login.html' || pageName === 'signup.html') {
    if (user) {
      window.location.href = 'generate-rfq.html';
    }
  }
})();

// Helper to construct the dynamic header actions block (Search, Notifications, Messages, Avatar Dropdown)
function rebuildHeaderActions(wrap, user) {
  wrap.innerHTML = '';
  // Ensure the np-sans helper is appended without wiping existing class structure
  if (!wrap.classList.contains('np-sans')) {
    wrap.classList.add('np-sans');
  }

  // Search Bar
  const searchWrap = document.createElement('div');
  searchWrap.className = 'np-search-wrap';
  searchWrap.innerHTML = `
    <svg class="np-search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
    <input type="text" class="np-search-input" placeholder="Search..." />
  `;

  // Notifications Button
  const notifBtn = document.createElement('button');
  notifBtn.className = 'np-icon-btn';
  notifBtn.setAttribute('aria-label', 'Notifications');
  notifBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
    <span class="np-badge"></span>
  `;

  // Messages Button
  const msgBtn = document.createElement('button');
  msgBtn.className = 'np-icon-btn';
  msgBtn.setAttribute('aria-label', 'Messages');
  msgBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
    <span class="np-badge"></span>
  `;

  // Compute Initials
  const name = user.profile ? (user.profile.fullName || user.profile.companyName || user.email) : user.email;
  let initials = 'JD';
  if (name && typeof name === 'string' && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    } else {
      initials = name.trim().substring(0, 2).toUpperCase();
    }
  } else {
    initials = user.email.substring(0, 2).toUpperCase();
  }

  // User Dropdown Menu
  const userMenu = document.createElement('div');
  userMenu.className = 'np-user-menu';
  userMenu.innerHTML = `
    <button id="np-avatar-btn" class="np-avatar-btn" aria-expanded="false" onclick="toggleAccountMenu(event)">
      ${initials}
    </button>
    <div id="np-account-panel" class="np-account-menu-panel">
      <a href="profile.html" class="np-account-menu-item">Profile</a>
      <a href="#" id="np-logout-btn" class="np-account-menu-item">Logout</a>
    </div>
  `;

  const logoutBtn = userMenu.querySelector('#np-logout-btn');
  logoutBtn.onclick = (e) => {
    e.preventDefault();
    logoutUser();
  };

  // Header group wrapper
  const headerGroup = document.createElement('div');
  headerGroup.className = 'np-header-group';
  headerGroup.appendChild(searchWrap);
  headerGroup.appendChild(notifBtn);
  headerGroup.appendChild(msgBtn);
  headerGroup.appendChild(userMenu);

  wrap.appendChild(headerGroup);
}

// DOM Adjustments for Navbar
document.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();
  const isLoggedIn = !!user;
  const path = window.location.pathname;
  const pageName = path.substring(path.lastIndexOf('/') + 1) || 'index.html';

  // 1. Show/hide Features dropdown in navbar
  const dropdowns = document.querySelectorAll('.dd.w-dropdown');
  dropdowns.forEach(dd => {
    const btnTxt = dd.querySelector('.button-txt');
    if (btnTxt && btnTxt.innerText.trim() === 'Features') {
      dd.style.setProperty('display', isLoggedIn ? 'block' : 'none', 'important');
      
      // If admin, rewrite the links inside the Features dropdown
      if (isLoggedIn && user.role === 'admin') {
        const ddContent = dd.querySelector('.dd-content');
        if (ddContent) {
          ddContent.innerHTML = `
            <div class="dd-column">
              <a href="generate-rfq.html#cumulative-dashboard" class="dd-navlink w-inline-block">
                <div>Cumulative Dashboard</div>
                <div class="dd-link-txt">System oversight, procurement metrics, and AI performance statistics</div>
                <div class="dd-link-dot"></div>
              </a>
              <a href="generate-rfq.html#users-directory" class="dd-navlink w-inline-block">
                <div>Users Directory</div>
                <div class="dd-link-txt">Access details and onboarding credentials for buyers and vendors</div>
                <div class="dd-link-dot"></div>
              </a>
              <a href="generate-rfq.html#admin-procurements" class="dd-navlink w-inline-block">
                <div>Procurements Oversight</div>
                <div class="dd-link-txt">Monitor sourcing requests, matched suppliers, and evaluations</div>
                <div class="dd-link-dot"></div>
              </a>
              <a href="generate-rfq.html#admin-logs" class="dd-navlink w-inline-block">
                <div>System Activity Log</div>
                <div class="dd-link-txt">Audit records and live system events log</div>
                <div class="dd-link-dot"></div>
              </a>
            </div>
          `;
        }
      } else if (isLoggedIn && user.role === 'vendor') {
        const ddContent = dd.querySelector('.dd-content');
        if (ddContent) {
          ddContent.innerHTML = `
            <div class="dd-column">
              <a href="vendor.html#vendor-dashboard" class="dd-navlink w-inline-block">
                <div>Dashboard</div>
                <div class="dd-link-txt">Overview of invited RFQs, bids, and orders</div>
                <div class="dd-link-dot"></div>
              </a>
              <a href="vendor.html#invited-rfqs" class="dd-navlink w-inline-block">
                <div>Invited RFQs</div>
                <div class="dd-link-txt">View sourcing requests you've been matched with</div>
                <div class="dd-link-dot"></div>
              </a>
              <a href="vendor.html#my-bids" class="dd-navlink w-inline-block">
                <div>My Bids</div>
                <div class="dd-link-txt">Track submitted proposals and their status</div>
                <div class="dd-link-dot"></div>
              </a>
              <a href="vendor.html#my-orders" class="dd-navlink w-inline-block">
                <div>My Orders</div>
                <div class="dd-link-txt">Manage awarded purchase orders and deliveries</div>
                <div class="dd-link-dot"></div>
              </a>
              <a href="vendor.html#my-invoices" class="dd-navlink w-inline-block">
                <div>Invoices &amp; Payments</div>
                <div class="dd-link-txt">Submit invoices and track payment status</div>
                <div class="dd-link-dot"></div>
              </a>
              <a href="vendor.html#vendor-profile" class="dd-navlink w-inline-block">
                <div>Company Profile</div>
                <div class="dd-link-txt">Update your business details and certifications</div>
                <div class="dd-link-dot"></div>
              </a>
            </div>
          `;
        }
      }
    }
  });

  // 2. Build Global Header / Nav for Logged In Users
  if (isLoggedIn) {
    const ctaDivs = document.querySelectorAll('.navbar-cta-div');
    if (ctaDivs.length > 0) {
      ctaDivs.forEach(wrap => {
        rebuildHeaderActions(wrap, user);
      });
      // Hide any standalone Login buttons that might not be inside .navbar-cta-div
      const loginLinks = document.querySelectorAll('.navlink.is-login');
      loginLinks.forEach(link => {
        if (!link.closest('.navbar-cta-div')) {
          link.style.display = 'none';
        }
      });
    } else {
      // Fallback for pages without .navbar-cta-div (simplified pages like profile.html, login.html)
      const navWraps = document.querySelectorAll('.nav-links-wrap');
      navWraps.forEach(wrap => {
        rebuildHeaderActions(wrap, user);
      });
    }
  } else {
    // If not logged in, adjust Login/CTA link class/text
    const loginLinks = document.querySelectorAll('.navlink.is-login');
    loginLinks.forEach(link => {
      link.innerText = 'Login';
      link.href = 'login.html';
    });
  }

  // 3. Dynamic Welcome Toast Injection
  try {
    const welcomeData = localStorage.getItem("show_welcome_toast");
    if (welcomeData) {
      const parsed = JSON.parse(welcomeData);
      localStorage.removeItem("show_welcome_toast");
      
      const toast = document.createElement("div");
      toast.id = "welcome-toast";
      toast.innerText = `Welcome, ${parsed.name}! Welcome to nexPro!`;
      
      const style = document.createElement("style");
      style.innerHTML = `
        #welcome-toast {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translate(-50%, 40px);
          background: #1A1A1A;
          color: #FFFFFF;
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
          z-index: 99999;
          opacity: 0;
          pointer-events: none;
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        #welcome-toast.active {
          transform: translate(-50%, 0);
          opacity: 1;
        }
      `;
      document.head.appendChild(style);
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.classList.add("active");
        setTimeout(() => {
          toast.classList.remove("active");
          setTimeout(() => toast.remove(), 400);
        }, 4000);
      }, 500);
    }
  } catch (e) {
    console.warn("Welcome toast display failed", e);
  }
});
