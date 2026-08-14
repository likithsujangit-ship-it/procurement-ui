// Shared Authentication & Routing Guard for Nexpro UI

// Route Guard logic
(function() {
  const path = window.location.pathname;
  const pageName = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
  const user = getCurrentUser();

  if (pageName === 'generate-rfq.html' || pageName === 'profile.html' || pageName === 'platformOverview.html') {
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
      window.location.href = 'platformOverview.html';
    }
  }
})();

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
              <a href="generate-rfq.html#bidded-vendors" class="dd-navlink w-inline-block">
                <div>Vendor Bids Directory</div>
                <div class="dd-link-txt">Classify and monitor registered, email, and public bidders</div>
                <div class="dd-link-dot"></div>
              </a>
              <a href="generate-rfq.html#admin-logs" class="dd-navlink w-inline-block">
                <div>System Activity Log</div>
                <div class="dd-link-txt">Audit records and live system events log</div>
                <div class="dd-link-dot"></div>
              </a>
              <a href="generate-rfq.html#data-requests" class="dd-navlink w-inline-block">
                <div>Data Requests</div>
                <div class="dd-link-txt">Manage DPDP Act account deletion and data requests</div>
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
              <a href="vendor.html#invited-rfqs" class="dd-navlink w-inline-block">
                <div>Invited RFQs</div>
                <div class="dd-link-txt">View sourcing requests you've been matched with</div>
                <div class="dd-link-dot"></div>
              </a>
              <a href="vendor.html#public-rfqs" class="dd-navlink w-inline-block">
                <div>Public Opportunities</div>
                <div class="dd-link-txt">Browse and participate in open sourcing runs</div>
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
      } else if (isLoggedIn && user.role === 'buyer') {
        const ddContent = dd.querySelector('.dd-content');
        if (ddContent) {
          ddContent.innerHTML = `
            <div class="dd-column">
              <a href="generate-rfq.html#new-procurement" class="dd-navlink w-inline-block">
                <div>New Procurement</div>
                <div class="dd-link-txt">Manage active procurements and check responses</div>
                <div class="dd-link-dot"></div>
              </a>
              <a href="generate-rfq.html" class="dd-navlink w-inline-block">
                <div>Generate RFQ</div>
                <div class="dd-link-txt">Create and customize RFQ workspaces and templates</div>
                <div class="dd-link-dot"></div>
              </a>
              <a href="generate-rfq.html#bidded-vendors" class="dd-navlink w-inline-block">
                <div>Vendor Bids Directory</div>
                <div class="dd-link-txt">Classify and monitor registered, email, and public bidders</div>
                <div class="dd-link-dot"></div>
              </a>
              <a href="generate-rfq.html#submitted-responses" class="dd-navlink w-inline-block">
                <div>Submitted Responses</div>
                <div class="dd-link-txt">Browse and manage submitted supplier responses</div>
                <div class="dd-link-dot"></div>
              </a>
              <a href="generate-rfq.html#suppliers" class="dd-navlink w-inline-block">
                <div>Supplier Chain</div>
                <div class="dd-link-txt">Manage vendors and onboard new suppliers</div>
                <div class="dd-link-dot"></div>
              </a>
            </div>
          `;
      }

      // Hide dropdown when any of its feature links are clicked
      const navLinks = dd.querySelectorAll('.dd-navlink');
      navLinks.forEach(link => {
        link.addEventListener('click', () => {
          dd.classList.remove('w--open');
          const toggle = dd.querySelector('.w-dropdown-toggle, .dropdown-toggle');
          if (toggle) toggle.classList.remove('w--open');
          const list = dd.querySelector('.w-dropdown-list, .dd-content');
          if (list) {
            list.classList.remove('w--open');
            list.style.removeProperty('display');
          }
        });
      });
    }
  });

  // 2. Adjust Login/CTA links
  const loginLinks = document.querySelectorAll('.navlink.is-login');
  loginLinks.forEach(link => {
    if (isLoggedIn) {
      const isWorkspacePage = pageName === 'generate-rfq.html' || pageName === 'profile.html' || pageName === 'vendor.html';
      
      // Find or create profile link
      let profileBtn = document.getElementById('nav-profile-btn');
      if (!profileBtn) {
        profileBtn = document.createElement('a');
        profileBtn.id = 'nav-profile-btn';
        profileBtn.className = 'navlink is-login';
        profileBtn.innerText = 'Profile';
        profileBtn.href = 'profile.html';
        profileBtn.style.cursor = 'pointer';
        profileBtn.style.display = 'inline-block';
      }

      if (isWorkspacePage) {
        profileBtn.style.marginRight = '16px';
        profileBtn.style.marginLeft = '0px';
        link.parentNode.insertBefore(profileBtn, link);

        link.innerText = 'Logout';
        link.href = '#';
        link.onclick = (e) => {
          e.preventDefault();
          logoutUser();
        };
        const oldLogout = document.getElementById('nav-logout-btn');
        if (oldLogout) oldLogout.remove();
      } else {
        link.innerText = 'Workspace';
        link.href = (user.role === 'vendor') ? 'vendor.html' : 'generate-rfq.html';
        link.style.display = 'inline-block';
        
        profileBtn.style.marginLeft = '16px';
        profileBtn.style.marginRight = '0px';
        link.parentNode.insertBefore(profileBtn, link.nextSibling);

        // Also add a logout link right next to it
        if (!document.getElementById('nav-logout-btn')) {
          const logoutBtn = document.createElement('a');
          logoutBtn.id = 'nav-logout-btn';
          logoutBtn.className = 'navlink is-login';
          logoutBtn.innerText = 'Logout';
          logoutBtn.href = '#';
          logoutBtn.style.marginLeft = '16px';
          logoutBtn.style.cursor = 'pointer';
          logoutBtn.onclick = (e) => {
            e.preventDefault();
            logoutUser();
          };
          link.parentNode.appendChild(logoutBtn);
        }
      }
    } else {
      link.innerText = 'Login';
      link.href = 'login.html';
      const oldProfile = document.getElementById('nav-profile-btn');
      if (oldProfile) oldProfile.remove();
    }
  });

  // 3. Hide CTA button if logged in, otherwise configure to Sign Up
  const ctaButtons = document.querySelectorAll('.navlink.is-nav-cta');
  ctaButtons.forEach(btn => {
    if (isLoggedIn) {
      btn.style.setProperty('display', 'none', 'important');
    } else {
      btn.style.setProperty('display', 'inline-block', 'important');
      btn.href = 'signup.html';
      const btnTxt = btn.querySelector('.button-txt');
      if (btnTxt) {
        btnTxt.innerText = 'Sign Up';
      }
    }
  });

  // Inject global style to prevent horizontal scrollbar and horizontal scroll
  try {
    const styleEl = document.createElement('style');
    styleEl.id = 'hide-global-scrollbars-style';
    styleEl.innerHTML = `
      /* Prevent horizontal scroll entirely and remove horizontal scrollbar without blocking touchpad vertical gestures */
      html, body {
        overflow-x: clip !important;
      }
      /* Fix default black background hover pills globally */
      .hover-bg {
        background-color: rgba(118, 0, 230, 0.06) !important;
      }
      /* Ensure CTA button text is always white and doesn't inherit the navbar dark color */
      .navbar-div .navlink.is-nav-cta .button-txt,
      .navlink.is-nav-cta .button-txt {
        color: #ffffff !important;
      }
      .navbar-div .navlink.is-nav-cta:hover .button-txt,
      .navlink.is-nav-cta:hover .button-txt {
        color: #ffffff !important;
      }
    `;
    document.head.appendChild(styleEl);
  } catch (e) {
    console.error("Scrollbar style injection failed", e);
  }


  // 4. Dynamic Welcome Toast Injection
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
