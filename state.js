// Centralized Mock Data & State Management for Nexpro UI

const DEFAULT_SUPPLIERS = [
  {
    id: "sup-acme-supplier",
    linkedUserEmail: "vendor@nexpro.com",
    name: "Acme Supplier Inc",
    category: "Chemical Raw Materials",
    status: "Active",
    contactPerson: "John Smith",
    designation: "Sourcing Manager",
    email: "vendor@nexpro.com",
    phone: "+1 555-0244",
    altPhone: "",
    website: "www.acmesupplier.example",
    addressLine: "456 Vendor Way",
    city: "San Francisco",
    state: "California",
    country: "USA",
    zip: "94107",
    gstin: "10AAAAA1111A1Z1",
    registrationNumber: "U31900CA2018PTC088734",
    yearsInBusiness: 8,
    paymentTerms: "Net 30",
    preferredCurrency: "USD ($)",
    leadTimeDays: 10,
    minOrderQty: "100 Metric Tons",
    certifications: ["ISO 9001", "REACH Compliant"],
    rating: 4.9,
    pastDealsCount: 4,
    totalBusinessValue: "$2.4M",
    bankName: "Silicon Valley Bank",
    bankAccountLast4: "9044",
    ifscSwift: "SVBCUS33XXX",
    notes: "Preferred propellant and chemical raw material supplier for nexPro enterprise.",
    onboardedDate: "2025-01-15",
    lastDealDate: "2026-05-18"
  }
];

const DEFAULT_TEMPLATES = [
  {
    id: "template-propellant",
    name: "Falcon 9 Propellant Sourcing",
    category: "Chemical Raw Materials",
    supplierIds: ["sup-acme-supplier"],
    fields: [
      { id: "field-supplier", label: "Supplier Name", type: "short-text", required: true, options: [], order: 0 },
      { id: "field-spec", label: "Fuel Grade Specifications", type: "long-text", required: true, options: [], order: 1 },
      { id: "field-qty", label: "Estimated Quantity (Metric Tons)", type: "number", required: true, options: [], order: 2 },
      { id: "field-date", label: "Delivery Target Date", type: "date", required: true, options: [], order: 3 },
      { id: "field-cert", label: "Compliance Certification", type: "file", required: false, options: [], order: 4 }
    ]
  },
  {
    id: "template-50point",
    name: "Enterprise Sourcing - 50 Point Assessment",
    category: "MRO Spares",
    supplierIds: ["sup-acme-supplier"],
    fields: [
      // Commercial Terms (1-15)
      { id: "field-1", label: "Supplier Name", type: "short-text", required: true, options: [], order: 0 },
      { id: "field-2", label: "Quote Reference Number", type: "short-text", required: true, options: [], order: 1 },
      { id: "field-3", label: "Preferred Currency", type: "dropdown", required: true, options: ["USD ($)", "EUR (€)", "INR (₹)", "GBP (£)", "JPY (¥)"], order: 2 },
      { id: "field-4", label: "Base Unit Price", type: "number", required: true, options: [], order: 3 },
      { id: "field-5", label: "Volume Discount Percentage", type: "number", required: false, options: [], order: 4 },
      { id: "field-6", label: "Applicable Tax Rate (%)", type: "number", required: true, options: [], order: 5 },
      { id: "field-7", label: "Payment Terms Days", type: "dropdown", required: true, options: ["Net 30", "Net 45", "Net 60", "Net 90", "Due on Receipt"], order: 6 },
      { id: "field-8", label: "Quotation Validity Date", type: "date", required: true, options: [], order: 7 },
      { id: "field-9", label: "Warranty Period (Months)", type: "number", required: true, options: [], order: 8 },
      { id: "field-10", label: "Estimated Delivery Lead Time (Days)", type: "number", required: true, options: [], order: 9 },
      { id: "field-11", label: "Shipping Mode", type: "dropdown", required: true, options: ["Air Freight", "Ocean Freight", "Road Transport", "Rail Cargo"], order: 10 },
      { id: "field-12", label: "Incoterms Rule", type: "dropdown", required: true, options: ["EXW", "FOB", "CIF", "DDP", "DAP"], order: 11 },
      { id: "field-13", label: "Minimum Order Quantity (MOQ)", type: "number", required: true, options: [], order: 12 },
      { id: "field-14", label: "Standard Packaging Description", type: "long-text", required: false, options: [], order: 13 },
      { id: "field-15", label: "Estimated Freight Costs ($)", type: "number", required: false, options: [], order: 14 },
      
      // Technical Specifications (16-25)
      { id: "field-16", label: "Manufacturer Part Number (MPN)", type: "short-text", required: true, options: [], order: 15 },
      { id: "field-17", label: "Original Equipment Manufacturer (OEM)", type: "short-text", required: true, options: [], order: 16 },
      { id: "field-18", label: "Country of Origin", type: "short-text", required: true, options: [], order: 17 },
      { id: "field-19", label: "Material Grade Specifications", type: "short-text", required: true, options: [], order: 18 },
      { id: "field-20", label: "Purity or Concentration Level (%)", type: "number", required: true, options: [], order: 19 },
      { id: "field-21", label: "Technical Drawing Compliance", type: "checkbox", required: true, options: [], order: 20 },
      { id: "field-22", label: "Operations Manual Provided", type: "checkbox", required: false, options: [], order: 21 },
      { id: "field-23", label: "Safe Operating Temperature Range", type: "short-text", required: false, options: [], order: 22 },
      { id: "field-24", label: "Maximum Pressure Rating (PSI)", type: "number", required: false, options: [], order: 23 },
      { id: "field-25", label: "Certificate of Analysis (CoA) Included", type: "checkbox", required: true, options: [], order: 24 },

      // Compliance & Standards (26-35)
      { id: "field-26", label: "ISO 9001 Certification Status", type: "dropdown", required: true, options: ["Certified", "In Progress", "Not Certified"], order: 25 },
      { id: "field-27", label: "ISO 14001 Environmental Certification", type: "dropdown", required: true, options: ["Certified", "In Progress", "Not Certified"], order: 26 },
      { id: "field-28", label: "RoHS Directive Compliance", type: "checkbox", required: true, options: [], order: 27 },
      { id: "field-29", label: "REACH Chemical Registration", type: "checkbox", required: true, options: [], order: 28 },
      { id: "field-30", label: "Estimated Environmental Impact Score", type: "number", required: false, options: [], order: 29 },
      { id: "field-31", label: "Safety Data Sheet (SDS) Attached", type: "checkbox", required: true, options: [], order: 30 },
      { id: "field-32", label: "Carbon Offset Percentage (%)", type: "number", required: false, options: [], order: 31 },
      { id: "field-33", label: "Conflict Minerals Free Declaration", type: "checkbox", required: true, options: [], order: 32 },
      { id: "field-34", label: "Responsible Labor Standards Audit", type: "checkbox", required: true, options: [], order: 33 },
      { id: "field-35", label: "Child Labor Policy Audited", type: "checkbox", required: true, options: [], order: 34 },

      // Supplier Health & Risk (36-43)
      { id: "field-36", label: "Supplier Years in Business", type: "number", required: true, options: [], order: 35 },
      { id: "field-37", label: "Financial Credit Risk Score", type: "number", required: true, options: [], order: 36 },
      { id: "field-38", label: "Annual Business Revenue ($)", type: "number", required: false, options: [], order: 37 },
      { id: "field-39", label: "Number of Active Enterprise References", type: "number", required: false, options: [], order: 38 },
      { id: "field-40", label: "Overall Supply Chain Risk Rating", type: "dropdown", required: true, options: ["Low Risk", "Medium Risk", "High Risk"], order: 39 },
      { id: "field-41", label: "Business Continuity Plan (BCP) Verified", type: "checkbox", required: true, options: [], order: 40 },
      { id: "field-42", label: "Cybersecurity Certification (SOC2/ISO27001)", type: "checkbox", required: true, options: [], order: 41 },
      { id: "field-43", label: "Subcontractor Usage Disclosed", type: "checkbox", required: true, options: [], order: 42 },

      // Service & Support (44-50)
      { id: "field-44", label: "24/7 Technical Support Availability", type: "checkbox", required: false, options: [], order: 43 },
      { id: "field-45", label: "Incident Response SLA (Hours)", type: "number", required: false, options: [], order: 44 },
      { id: "field-46", label: "Training Material Provided", type: "checkbox", required: false, options: [], order: 45 },
      { id: "field-47", label: "Professional On-site Installation Included", type: "checkbox", required: false, options: [], order: 46 },
      { id: "field-48", label: "Annual Maintenance Contract (AMC) Option", type: "checkbox", required: false, options: [], order: 47 },
      { id: "field-49", label: "Liquidated Damages Clause Accepted", type: "checkbox", required: true, options: [], order: 48 },
      { id: "field-50", label: "Governing Law / Arbitration Jurisdiction", type: "short-text", required: true, options: [], order: 49 }
    ]
  }
];

const DEFAULT_RESPONSES = [
  {
    id: "resp-propellant-acme",
    templateId: "template-propellant",
    templateName: "Falcon 9 Propellant Sourcing",
    responseID: "RESP-ACME-001",
    submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    status: "COMPLETED",
    hasProcurement: true,
    procurementStatus: "COMPLETED",
    procurementProgress: 100,
    supplierIds: ["sup-acme-supplier"],
    distribution: "private",
    vendorEmail: "vendor@nexpro.com",
    fields: [
      { id: "field-supplier", label: "Supplier Name", type: "short-text", value: "Acme Supplier Inc" },
      { id: "field-spec", label: "Fuel Grade Specifications", type: "long-text", value: "Ultra-pure rocket propellant meeting military standards." },
      { id: "field-qty", label: "Estimated Quantity (Metric Tons)", type: "number", value: "1200" },
      { id: "field-date", label: "Delivery Target Date", type: "date", value: "2026-09-30" },
      { id: "field-cert", label: "Compliance Certification", type: "file", value: "fuel_compliance_2026.pdf" }
    ]
  }
];

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
  applications: [
    {
      id: "app-propellant-acme-seed",
      rfqId: "resp-propellant-acme",
      rfqTitle: "Falcon 9 Propellant Sourcing",
      vendorId: "sup-acme-supplier",
      vendorName: "Acme Supplier Inc",
      priority: "normal",
      status: "ACCEPTED",
      date: new Date(Date.now() - 3600000 * 24).toISOString(),
      price: 1200000,
      leadTimeDays: 10,
      deliveryStatus: "Processing",
      details: {
        "field-supplier": "Acme Supplier Inc",
        "field-spec": "Ultra-pure rocket propellant meeting military standards.",
        "field-qty": "1200",
        "field-date": "2026-09-30",
        "field-cert": "fuel_compliance_2026.pdf"
      }
    }
  ], // Vendor applications: { id, rfqId, rfqTitle, vendorId, vendorName, priority, status ("PENDING" | "ACCEPTED" | "REJECTED"), date, details: {} }
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
      if (dbSuppliers && dbSuppliers.length > 0) {
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
      if (dbRfqs && dbRfqs.length > 0) {
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
      if (dbResponses && dbResponses.length > 0) {
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
      // Force clean reload if legacy mock data exists in user storage
      const hasLegacySuppliers = parsed.suppliers && parsed.suppliers.some(s => s.id === "sup-orion-alloys");
      if (hasLegacySuppliers) {
        console.log("Legacy mock data detected. Clearing storage to load clean single buyer/seller workspace.");
        localStorage.removeItem("nexpro_global_state");
        localStorage.removeItem("nexpro_rfq_workspace");
        saveGlobalState();
      } else {
        // Merge keys to ensure future changes are backward compatible
        window.appState = { ...window.appState, ...parsed };
      }
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
  return suppliers.find(s => (s.linkedUserEmail || '').toLowerCase() === user.email.toLowerCase()) || null;
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
