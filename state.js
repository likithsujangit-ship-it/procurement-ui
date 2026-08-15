// Centralized Mock Data & State Management for Nexpro UI

const DEFAULT_SUPPLIERS = [];
const DEFAULT_TEMPLATES = [];
const DEFAULT_RESPONSES = [];
const DEFAULT_APPLICATIONS = [];

// Master state initialization
window.appState = {
  users: [
    { 
      email: "buyer@nexpro.com", 
      password: "password", 
      role: "buyer",
      profile: {
        fullName: "Jane Doe",
        designation: "Procurement Manager",
        companyName: "Nexpro Buyers Corp",
        department: "Procurement",
        phone: "+1 555-0199",
        address: "123 Buyer Blvd",
        city: "New York",
        country: "USA"
      }
    },
    { 
      email: "vendor@nexpro.com", 
      password: "password", 
      role: "vendor", 
      onboarded: false,
      profile: {
        companyName: "Acme Supplier Inc",
        contactName: "John Smith",
        category: "Mechanical Parts",
        phone: "+1 555-0244",
        gstin: "10AAAAA1111A1Z1",
        address: "456 Vendor Way",
        city: "San Francisco",
        website: "www.acmesupplier.example"
      }
    },
    { 
      email: "admin@nexpro.com", 
      password: "password", 
      role: "admin",
      profile: {
        fullName: "Alex Admin",
        phone: "+1 555-0100"
      }
    }
  ],
  suppliers: [...DEFAULT_SUPPLIERS],
  templates: [...DEFAULT_TEMPLATES],
  submittedResponses: [...DEFAULT_RESPONSES],
  applications: [...DEFAULT_APPLICATIONS], // Vendor applications: { id, rfqId, rfqTitle, vendorId, vendorName, priority, status ("PENDING" | "ACCEPTED" | "REJECTED"), date, details: {} }
  invoices: [], // Invoice shape: { id, orderId, vendorId, amount, status: "SUBMITTED"|"APPROVED"|"PAID", submittedAt, dueDate }
  currentUser: null
};

const API_URL = (window.location.protocol === 'file:' || window.location.hostname === '') ? 'http://localhost:5000/api' : '/api';

// Syncing with LocalStorage and MongoDB
async function syncProfileToDatabase(email, profile, preferences, password) {
  try {
    const response = await fetch(`${API_URL}/users/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, profile, preferences, password })
    });
    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error("Failed to sync profile to MongoDB:", error);
  }
}

async function syncRfqsToDatabase(rfqs, buyerEmail) {
  try {
    await fetch(`${API_URL}/rfqs/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rfqs, buyerEmail })
    });
  } catch (error) {
    console.error("Failed to sync RFQs to MongoDB:", error);
  }
}

async function syncResponsesToDatabase(responses) {
  try {
    await fetch(`${API_URL}/responses/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responses })
    });
  } catch (error) {
    console.error("Failed to sync responses to MongoDB:", error);
  }
}

async function syncSuppliersToDatabase(suppliers) {
  try {
    await fetch(`${API_URL}/suppliers/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suppliers })
    });
  } catch (error) {
    console.error("Failed to sync suppliers to MongoDB:", error);
  }
}

async function syncDatabaseState() {
  try {
    // 1. Fetch active suppliers
    const sRes = await fetch(`${API_URL}/suppliers`);
    if (sRes.ok) {
      const dbSuppliers = await sRes.json();
      if (dbSuppliers && Array.isArray(dbSuppliers)) {
        window.appState.suppliers = dbSuppliers;
      }
    }

    // 2. Fetch templates (RFQs)
    const currentUser = getCurrentUser();
    let rfqUrl = `${API_URL}/rfqs`;
    if (currentUser) {
      if (currentUser.role === 'buyer') {
        rfqUrl = `${API_URL}/rfqs?buyerEmail=${encodeURIComponent(currentUser.email)}`;
      } else if (currentUser.role === 'vendor') {
        rfqUrl = `${API_URL}/rfqs?vendorEmail=${encodeURIComponent(currentUser.email)}`;
      }
    }
    const rRes = await fetch(rfqUrl);
    if (rRes.ok) {
      const dbRfqs = await rRes.json();
      if (dbRfqs && Array.isArray(dbRfqs)) {
        window.appState.templates = dbRfqs;
      } else if (currentUser && currentUser.role === 'vendor') {
        // If vendor was not invited to any RFQs, clear templates list
        window.appState.templates = [];
      }
    }

    // 3. Fetch responses (Bids)
    let respUrl = `${API_URL}/responses`;
    if (currentUser) {
      if (currentUser.role === 'vendor') {
        respUrl = `${API_URL}/responses?vendorEmail=${encodeURIComponent(currentUser.email)}`;
      }
    }
    const bRes = await fetch(respUrl);
    if (bRes.ok) {
      const dbResponses = await bRes.json();
      if (dbResponses && Array.isArray(dbResponses)) {
        window.appState.submittedResponses = dbResponses;
      }
    }

    // Save final merged state locally
    localStorage.setItem("nexpro_global_state", JSON.stringify(window.appState));
    window.dispatchEvent(new CustomEvent('nexproStateSynced'));
  } catch (error) {
    console.error("Failed to sync database state to client:", error);
  }
}

function saveGlobalState() {
  try {
    localStorage.setItem("nexpro_global_state", JSON.stringify(window.appState));
    // Backward compatibility check for generate-rfq.html page
    const compatState = {
      templates: window.appState.templates,
      suppliers: window.appState.suppliers,
      submittedResponses: window.appState.submittedResponses
    };
    localStorage.setItem("nexpro_rfq_workspace", JSON.stringify(compatState));

    // Asynchronously sync profile, suppliers, rfqs, and responses to MongoDB database
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.email) {
      syncProfileToDatabase(currentUser.email, currentUser.profile, currentUser.preferences, currentUser.password);
      syncRfqsToDatabase(window.appState.templates, currentUser.email);
      syncResponsesToDatabase(window.appState.submittedResponses);
      syncSuppliersToDatabase(window.appState.suppliers);
    }
  } catch (e) {
    console.warn("Storage access failed: localStorage is blocked or disabled.", e);
  }
}

function loadGlobalState() {
  let saved = null;
  try {
    saved = localStorage.getItem("nexpro_global_state");
  } catch (e) {
    console.warn("Storage access failed: localStorage is blocked or disabled.", e);
  }

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Merge keys to ensure future changes are backward compatible
      window.appState = { ...window.appState, ...parsed };
    } catch (e) {
      console.error("Failed to load global state, resetting...", e);
      saveGlobalState();
    }
  } else {
    // Attempt migration from old generate-rfq local storage if present
    let oldRfq = null;
    try {
      oldRfq = localStorage.getItem("nexpro_rfq_workspace");
    } catch (e) {
      console.warn("Storage access failed: localStorage is blocked or disabled.", e);
    }
    if (oldRfq) {
      try {
        const parsed = JSON.parse(oldRfq);
        if (parsed.templates) window.appState.templates = parsed.templates;
        if (parsed.suppliers) window.appState.suppliers = parsed.suppliers;
        if (parsed.submittedResponses) window.appState.submittedResponses = parsed.submittedResponses;
      } catch (e) {
        console.error("Failed to migrate old RFQ workspace state", e);
      }
    }
    saveGlobalState();
  }

  // Defensively ensure that default mock user accounts are always present in the users array
  const defaultUsers = [
    { email: "buyer@nexpro.com", password: "password123", role: "buyer" },
    { email: "vendor@nexpro.com", password: "password123", role: "vendor", onboarded: false },
    { email: "admin@nexpro.com", password: "password123", role: "admin" }
  ];

  if (!window.appState.users || !Array.isArray(window.appState.users)) {
    window.appState.users = defaultUsers;
  } else {
    defaultUsers.forEach(defUser => {
      const exists = window.appState.users.some(
        u => u.email.toLowerCase() === defUser.email.toLowerCase() && u.role === defUser.role
      );
      if (!exists) {
        window.appState.users.push(defUser);
      }
    });
  }

  if (!window.appState.submittedResponses || !Array.isArray(window.appState.submittedResponses)) {
    window.appState.submittedResponses = [...DEFAULT_RESPONSES];
  } else {
    // Clean up old public seed if present
    window.appState.submittedResponses = window.appState.submittedResponses.filter(
      r => r.id !== "resp-propellant-public-seed"
    );
    const seedId = "resp-propellant-public-seed-v2";
    const exists = window.appState.submittedResponses.some(r => r.id === seedId);
    if (!exists) {
      const seedResponse = DEFAULT_RESPONSES.find(r => r.id === seedId);
      if (seedResponse) {
        window.appState.submittedResponses.push(seedResponse);
      }
    }
    saveGlobalState();
  }

  if (!window.appState.applications || !Array.isArray(window.appState.applications)) {
    window.appState.applications = [...DEFAULT_APPLICATIONS];
    saveGlobalState();
  } else {
    // Add Category 2 seed if missing
    if (!window.appState.applications.some(a => a.id === "app-email-sourcing-seed")) {
      const emailSeed = DEFAULT_APPLICATIONS.find(a => a.id === "app-email-sourcing-seed");
      if (emailSeed) {
        window.appState.applications.push(emailSeed);
      }
    }
    // Add Category 3 seed if missing
    if (!window.appState.applications.some(a => a.id === "app-public-sourcing-seed")) {
      const publicSeed = DEFAULT_APPLICATIONS.find(a => a.id === "app-public-sourcing-seed");
      if (publicSeed) {
        window.appState.applications.push(publicSeed);
      }
    }
    saveGlobalState();
  }

  // Asynchronously sync latest from MongoDB in the background
  syncDatabaseState();
}

// Database Auth functions
async function registerUser(email, password, role, profile, consentGivenAt, consentVersion) {
  const response = await fetch(`${API_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role, profile, consentGivenAt, consentVersion })
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Registration failed.');
  }
  return data.user;
}

async function loginUser(email, password) {
  if (!email || !password) {
    throw new Error("Email and password are required.");
  }
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Login failed.');
    }
    return data.user;
  } catch (error) {
    // If the server responded with a specific validation/auth error (defined by our error messages), rethrow it.
    if (error.message && (error.message.includes("Account does not exist") || error.message.includes("Incorrect password") || error.message.includes("required"))) {
      throw error;
    }
    
    console.warn("Server login offline. Falling back to local mock data validation...", error);

    // Local fallback validation
    const localUser = window.appState.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!localUser) {
      throw new Error("Account does not exist.");
    }
    if (localUser.password !== password) {
      throw new Error("Incorrect password.");
    }
    return localUser;
  }
}

// Helper methods for Auth
function getVendorSupplierRecord(user) {
  if (!user || !user.email) return null;
  const suppliers = window.appState.suppliers || [];
  let record = suppliers.find(s => (s.linkedUserEmail || '').toLowerCase() === user.email.toLowerCase());
  if (!record && user.email.toLowerCase() === 'vendor@nexpro.com') {
    record = suppliers.find(s => s.name === 'Acme Supplier Inc' || (s.email || '').toLowerCase() === 'vendor@nexpro.com');
    if (record) {
      record.linkedUserEmail = 'vendor@nexpro.com';
      saveGlobalState();
    }
  }
  return record || null;
}

function getCurrentUser() {
  return window.appState.currentUser;
}

function setCurrentUser(user) {
  window.appState.currentUser = user;
  saveGlobalState();
}

function logoutUser() {
  window.appState.currentUser = null;
  saveGlobalState();
  window.location.href = "login.html";
}

// Initialize immediately on file load
loadGlobalState();
