// Centralized Mock Data & State Management for Nexpro UI

const DEFAULT_SUPPLIERS = [
  {
    id: "sup-orion-alloys",
    name: "Orion Alloys Ltd",
    category: "Mechanical Parts",
    status: "Active",
    contactPerson: "Rajesh Kumar",
    designation: "Sourcing Manager",
    email: "rajesh.kumar@orionalloys.example",
    phone: "+91 98450 12345",
    altPhone: "",
    website: "www.orionalloys.example",
    addressLine: "Plot 14, Peenya Industrial Area",
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    zip: "560058",
    gstin: "29ABCOR1234N1Z8",
    registrationNumber: "U27310KA2011PTC061223",
    yearsInBusiness: 14,
    paymentTerms: "Net 45",
    preferredCurrency: "INR (₹)",
    leadTimeDays: 21,
    minOrderQty: "500 units",
    certifications: ["ISO 9001", "IATF 16949"],
    rating: 4.6,
    pastDealsCount: 12,
    totalBusinessValue: "₹1.8 Cr",
    bankName: "HDFC Bank",
    bankAccountLast4: "4821",
    ifscSwift: "HDFC0000456",
    notes: "Reliable on precision-machined components, occasional delays during monsoon logistics.",
    onboardedDate: "2022-03-11",
    lastDealDate: "2026-05-02"
  },
  {
    id: "sup-blueforge",
    name: "BlueForge Components",
    category: "Electrical Parts",
    status: "Active",
    contactPerson: "Ananya Iyer",
    designation: "Business Development Head",
    email: "ananya.iyer@blueforge.example",
    phone: "+91 90080 33441",
    altPhone: "+91 80 4112 7789",
    website: "www.blueforgecomponents.example",
    addressLine: "Tower B, DLF Cyber City",
    city: "Gurugram",
    state: "Haryana",
    country: "India",
    zip: "122002",
    gstin: "06AACCB5678K1Z2",
    registrationNumber: "U31900HR2015PTC055412",
    yearsInBusiness: 9,
    paymentTerms: "Net 30",
    preferredCurrency: "INR (₹)",
    leadTimeDays: 15,
    minOrderQty: "1000 units",
    certifications: ["ISO 9001", "ISO 14001", "RoHS Compliant"],
    rating: 4.3,
    pastDealsCount: 7,
    totalBusinessValue: "₹68 L",
    bankName: "ICICI Bank",
    bankAccountLast4: "9012",
    ifscSwift: "ICIC0001122",
    notes: "Strong on connector and relay sourcing; requires 50% advance on first-time orders.",
    onboardedDate: "2023-08-20",
    lastDealDate: "2026-06-18"
  },
  {
    id: "sup-meridian-chem",
    name: "Meridian Chemtech Industries",
    category: "Chemical Raw Materials",
    status: "Active",
    contactPerson: "Vikram Suresh",
    designation: "Regional Sales Director",
    email: "vikram.suresh@meridianchem.example",
    phone: "+91 98200 55671",
    altPhone: "",
    website: "www.meridianchemtech.example",
    addressLine: "MIDC Industrial Estate, Taloja",
    city: "Navi Mumbai",
    state: "Maharashtra",
    country: "India",
    zip: "410208",
    gstin: "27AABCM9012J1Z0",
    registrationNumber: "U24110MH2018PTC309876",
    yearsInBusiness: 6,
    paymentTerms: "Net 30",
    preferredCurrency: "INR (₹)",
    leadTimeDays: 10,
    minOrderQty: "250 kg",
    certifications: ["ISO 9001", "ISO 14001", "REACH Registered"],
    rating: 4.8,
    pastDealsCount: 15,
    totalBusinessValue: "₹2.4 Cr",
    bankName: "State Bank of India",
    bankAccountLast4: "5512",
    ifscSwift: "SBIN0000291",
    notes: "Excellent product purity, highly structured delivery protocols, strict billing adherence.",
    onboardedDate: "2024-01-15",
    lastDealDate: "2026-04-30"
  },
  {
    id: "sup-vantage-pack",
    name: "Vantage Packaging Solutions",
    category: "Packaging Materials",
    status: "Active",
    contactPerson: "Neha Sharma",
    designation: "Key Accounts Manager",
    email: "neha.sharma@vantagepack.example",
    phone: "+91 99300 77882",
    altPhone: "",
    website: "www.vantagepackaging.example",
    addressLine: "Sector 4, IMT Manesar",
    city: "Gurugram",
    state: "Haryana",
    country: "India",
    zip: "122050",
    gstin: "06AABCV3456F1Z5",
    registrationNumber: "U74950HR2020PTC088734",
    yearsInBusiness: 4,
    paymentTerms: "Net 30",
    preferredCurrency: "INR (₹)",
    leadTimeDays: 7,
    minOrderQty: "5000 units",
    certifications: ["Food-Grade Certified", "FSC Certified"],
    rating: 3.9,
    pastDealsCount: 2,
    totalBusinessValue: "₹8.5 L",
    bankName: "Kotak Mahindra Bank",
    bankAccountLast4: "7734",
    ifscSwift: "KKBK0000771",
    notes: "New empanelment, documentation verification in progress.",
    onboardedDate: "2026-02-04",
    lastDealDate: "2026-03-10"
  }
];

const DEFAULT_TEMPLATES = [
  {
    id: "template-falcon9",
    name: "Falcon 9 Propellant Sourcing",
    category: "Chemical Raw Materials",
    fields: [
      { id: "field-supplier", label: "Supplier Name", type: "short-text", required: true, options: [], order: 0 },
      { id: "field-spec", label: "Fuel Grade Specifications", type: "long-text", required: true, options: [], order: 1 },
      { id: "field-qty", label: "Estimated Quantity (Metric Tons)", type: "number", required: true, options: [], order: 2 },
      { id: "field-date", label: "Delivery Target Date", type: "date", required: true, options: [], order: 3 },
      { id: "field-cert", label: "Compliance Certification", type: "file", required: false, options: [], order: 4 }
    ]
  }
];

const DEFAULT_RESPONSES = [
  {
    id: "mock-response-1",
    templateId: "template-falcon9",
    templateName: "Falcon 9 Propellant Sourcing",
    responseID: "RESP-F9-001",
    submittedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    status: "SUBMITTED",
    hasProcurement: false,
    procurementStatus: "",
    procurementProgress: 0,
    supplierIds: [],
    distribution: "private", // default
    fields: [
      { id: "field-supplier", label: "Supplier Name", type: "short-text", value: "SpaceX Fuel Corp" },
      { id: "field-spec", label: "Fuel Grade Specifications", type: "long-text", value: "Rocket Propellant-1 (RP-1) ultra-pure grade meeting MIL-P-25576 specs." },
      { id: "field-qty", label: "Estimated Quantity (Metric Tons)", type: "number", value: "850" },
      { id: "field-date", label: "Delivery Target Date", type: "date", value: "2026-10-31" },
      { id: "field-cert", label: "Compliance Certification", type: "file", value: "chem_compliance_cert_2026.pdf" }
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
  applications: [], // Vendor applications: { id, rfqId, rfqTitle, vendorId, vendorName, priority, status ("PENDING" | "ACCEPTED" | "REJECTED"), date, details: {} }
  currentUser: null
};

// Syncing with LocalStorage
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
    { email: "buyer@nexpro.com", password: "password", role: "buyer" },
    { email: "vendor@nexpro.com", password: "password", role: "vendor", onboarded: false },
    { email: "admin@nexpro.com", password: "password", role: "admin" }
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
}

// Helper methods for Auth
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
