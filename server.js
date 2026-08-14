const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const PDFDocument = require('pdfkit');

function isFakeEmail(email) {
  if (!email) return true;
  const domain = email.split('@')[1];
  if (!domain) return true;
  const fakeDomains = ['nexpro.com', 'example.com', 'test.com', 'domain.com', 'invalid.com', 'fake.com', 'sourcing.com'];
  return fakeDomains.includes(domain.toLowerCase());
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const path = require('path');
app.use(express.static(path.join(__dirname, '.')));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nexpro';
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('Successfully connected to MongoDB.');
    await migrateCertificationsToObjects();
    await seedDatabase();
    await migrateUserPasswords();
  })
  .catch(err => console.error('Database connection error:', err));

// -------------------------------------------------------------
// F15: ONE-TIME MIGRATION - certifications: string[] -> {name, expiryDate}[]
// -------------------------------------------------------------
async function migrateCertificationsToObjects() {
  try {
    const suppliers = await Supplier.find({});
    let migratedCount = 0;
    for (const sup of suppliers) {
      const certs = sup.certifications || [];
      const needsMigration = certs.length > 0 && certs.some(c => typeof c === 'string');
      if (needsMigration) {
        const converted = certs.map(c => (typeof c === 'string') ? { name: c, expiryDate: '' } : c);
        sup.certifications = converted;
        await sup.save();
        migratedCount++;
      }
    }
    if (migratedCount > 0) {
      console.log(`Migration: converted certifications to object arrays for ${migratedCount} supplier(s).`);
    }
  } catch (error) {
    console.error('Certification migration error:', error);
  }
}

// -------------------------------------------------------------
// SCHEMAS & MODELS
// -------------------------------------------------------------

// 1. User Schema
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['buyer', 'vendor', 'admin', 'inactive'], default: 'buyer' },
  consentGivenAt: { type: Date },
  consentVersion: { type: String, default: '' },
  deletionRequested: { type: Boolean, default: false },
  deletionRequestedAt: { type: Date },
  onboarded: { type: Boolean },
  profile: {
    fullName: { type: String, default: '' },
    companyName: { type: String, default: '' },
    designation: { type: String, default: '' },
    department: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    country: { type: String, default: '' },
    contactName: { type: String, default: '' },
    category: { type: String, default: '' },
    gstin: { type: String, default: '' },
    website: { type: String, default: '' }
  },
  preferences: {
    theme: { type: String, default: 'light' },
    emailNotifications: { type: Boolean, default: true },
    systemNotifications: { type: Boolean, default: true }
  }
});
const User = mongoose.model('User', UserSchema);

// 2. Supplier Schema
const SupplierSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  linkedUserEmail: { type: String, default: '' },
  consentGivenAt: { type: Date },
  consentVersion: { type: String, default: '' },
  name: { type: String, required: true },
  category: { type: String, default: '' },
  status: { type: String, default: 'Active' },
  contactPerson: { type: String, default: '' },
  designation: { type: String, default: '' },
  email: { type: String, required: true, lowercase: true },
  phone: { type: String, default: '' },
  altPhone: { type: String, default: '' },
  website: { type: String, default: '' },
  addressLine: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: '' },
  country: { type: String, default: '' },
  zip: { type: String, default: '' },
  gstin: { type: String, default: '' },
  registrationNumber: { type: String, default: '' },
  yearsInBusiness: { type: Number, default: 0 },
  paymentTerms: { type: String, default: 'Net 30' },
  preferredCurrency: { type: String, default: 'INR (₹)' },
  leadTimeDays: { type: Number, default: 15 },
  minOrderQty: { type: String, default: '' },
  // F15: certifications is now an array of { name, expiryDate } objects (migrated from plain strings on startup)
  certifications: { type: Array, default: [] },
  rating: { type: Number, default: 5.0 },
  pastDealsCount: { type: Number, default: 0 },
  totalBusinessValue: { type: String, default: '' },
  bankName: { type: String, default: '' },
  bankAccountLast4: { type: String, default: '' },
  ifscSwift: { type: String, default: '' },
  notes: { type: String, default: '' },
  onboardedDate: { type: String, default: '' },
  lastDealDate: { type: String, default: '' },
  // F14: Self-Service Supplier Invite
  inviteSentAt: { type: String, default: '' },
  inviteCount: { type: Number, default: 0 }
});
const Supplier = mongoose.model('Supplier', SupplierSchema);

// 3. RFQ Schema (Templates)
const RFQSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  buyerEmail: { type: String, lowercase: true, default: '' },
  name: { type: String, required: true },
  category: { type: String, default: '' },
  status: { type: String, default: 'ACTIVE' },
  createdDate: { type: String, default: '' },
  supplierIds: { type: Array, default: [] },
  fields: { type: Array, default: [] },
  // F1: Template Versioning - embedded subdocuments, cascade-deletes with the parent RFQ automatically
  // Each entry: { versionNum, name, fields, updatedAt, updatedBy }
  versions: { type: Array, default: [] },
  // F10: Response Scoring / Weighting - [{ fieldName, weight }], Buyer/Admin only, never sent to Vendors
  evaluationWeights: { type: Array, default: [] }
});
const RFQ = mongoose.model('RFQ', RFQSchema);

// 4. Response Schema (Bids)
const ResponseSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  templateId: { type: String, required: true },
  templateName: { type: String, default: '' },
  responseID: { type: String, default: '' },
  submittedAt: { type: String, default: '' },
  status: { type: String, default: 'SUBMITTED' },
  hasProcurement: { type: Boolean, default: false },
  procurementStatus: { type: String, default: '' },
  procurementProgress: { type: Number, default: 0 },
  supplierIds: { type: Array, default: [] },
  distribution: { type: String, default: 'private' },
  vendorEmail: { type: String, lowercase: true, default: '' },
  fields: { type: Array, default: [] },
  // F6: Due Date / SLA Aging
  statusChangedAt: { type: String, default: '' },
  // F11: Audit Trail before Deletion (soft delete)
  archived: { type: Boolean, default: false },
  archivedAt: { type: String, default: '' },
  archivedBy: { type: String, default: '' }
});
const ResponseModel = mongoose.model('Response', ResponseSchema);

// 5. Audit Log Schema (F11)
const AuditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  entityType: { type: String, default: '' },
  entityId: { type: String, default: '' },
  performedBy: { type: String, default: '' },
  details: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
});
const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

// -------------------------------------------------------------
// SEED DATABASE ON STARTUP IF EMPTY
// -------------------------------------------------------------

// DPDP: One-time startup password hashing migration for legacy plaintext users
async function migrateUserPasswords() {
  try {
    const users = await User.find({});
    let migratedCount = 0;
    for (const user of users) {
      const pw = user.password;
      const isHashed = pw && (pw.startsWith('$2a$') || pw.startsWith('$2b$') || pw.startsWith('$2y$'));
      if (!isHashed) {
        user.password = await bcrypt.hash(pw, 10);
        await user.save();
        migratedCount++;
      }
    }
    if (migratedCount > 0) {
      console.log(`Migration: successfully encrypted ${migratedCount} plaintext password(s) via bcrypt.`);
    }
  } catch (error) {
    console.error('Password hashing migration error:', error);
  }
}


async function seedDatabase() {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('Seeding initial Users...');
      const defaultUsers = [
        {
          email: "buyer@nexpro.com",
          password: "password123",
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
          password: "password123",
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
          password: "password123",
          role: "admin",
          profile: {
            fullName: "Alex Admin",
            phone: "+1 555-0100"
          }
        }
      ];
      await User.insertMany(defaultUsers);
    }

    const supplierCount = await Supplier.countDocuments();
    if (supplierCount === 0) {
      console.log('Seeding initial Suppliers...');
      const defaultSuppliers = [
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
          certifications: [
            { name: "ISO 9001", expiryDate: "" },
            { name: "REACH Compliant", expiryDate: "" }
          ],
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
      await Supplier.insertMany(defaultSuppliers);
    }

    const rfqCount = await RFQ.countDocuments();
    if (rfqCount === 0) {
      console.log('Seeding initial RFQs...');
      const defaultRFQs = [
        {
          id: "template-propellant",
          name: "Falcon 9 Propellant Sourcing",
          buyerEmail: "buyer@nexpro.com",
          category: "Chemical Raw Materials",
          status: "ACTIVE",
          createdDate: new Date().toISOString(),
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
          buyerEmail: "buyer@nexpro.com",
          category: "MRO Spares",
          status: "ACTIVE",
          createdDate: new Date().toISOString(),
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
      await RFQ.insertMany(defaultRFQs);
    }

    const responseCount = await ResponseModel.countDocuments();
    if (responseCount === 0) {
      console.log('Seeding initial Responses...');
      const defaultResponses = [
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
      await ResponseModel.insertMany(defaultResponses);
    }

    // Delete old seed if it exists to avoid duplicates
    await ResponseModel.deleteMany({ id: "resp-propellant-public-seed" });

    const publicSeedExists = await ResponseModel.findOne({ id: "resp-propellant-public-seed-v2" });
    if (!publicSeedExists) {
      console.log('Seeding public RFQ response v2...');
      await ResponseModel.create({
        id: "resp-propellant-public-seed-v2",
        templateId: "template-propellant",
        templateName: "Falcon Heavy Liquid Oxygen Sourcing",
        responseID: "RESP-LOX-999",
        submittedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
        status: "EVALUATING",
        hasProcurement: true,
        procurementStatus: "EVALUATING",
        procurementProgress: 66,
        supplierIds: [],
        distribution: "public",
        vendorEmail: "buyer@nexpro.com",
        emailSubject: "Invitation to bid on Falcon Heavy Liquid Oxygen Sourcing",
        emailBody: "Dear Sourcing Partners,\n\nWe are looking to secure liquid oxygen supplies for the upcoming Falcon Heavy launch schedule. Please review the specifications and submit your best bids.",
        emailAttachments: ["lox_specs_datasheet.pdf", "launch_schedule_q4.xlsx"],
        fields: [
      { id: "f-company", label: "Supplier Corporate Name", type: "short-text", required: true, value: "" },
      { id: "f-plant", label: "Manufacturing Plant Location", type: "short-text", required: true, value: "" },
      { id: "f-purity", label: "Liquid Oxygen Purity Grade (%)", type: "number", required: true, value: "" },
      { id: "f-moisture", label: "Max Impurities - Moisture Limit (ppm)", type: "number", required: true, value: "" },
      { id: "f-co2", label: "Max Impurities - Carbon Dioxide Limit (ppm)", type: "number", required: true, value: "" },
      { id: "f-msds", label: "Material Safety Data Sheet (MSDS) Upload", type: "file", required: true, value: "" },
      { id: "f-capacity", label: "Total Available Supply Capacity (Tons)", type: "number", required: true, value: "" },
      { id: "f-price", label: "Unit Cost per Ton ($)", type: "number", required: true, value: "" },
      { id: "f-moq", label: "Minimum Order Quantity (MOQ)", type: "number", required: true, value: "" },
      { id: "f-payterms", label: "Preferred Payment Terms", type: "dropdown", required: true, options: ["Net 30", "Net 45", "Net 60", "Advance Payment"], value: "" },
      { id: "f-tanker", label: "Cryogenic Tanker Delivery Capability", type: "checkbox", required: true, value: false },
      { id: "f-lead", label: "Estimated Delivery Lead Time (Days)", type: "number", required: true, value: "" },
      { id: "f-iso", label: "ISO 9001 Sourcing Quality Certificate", type: "file", required: true, value: "" },
      { id: "f-epa", label: "Clean Air Act/EPA Compliance Statement", type: "checkbox", required: true, value: false }
    ]
      });
    }
  } catch (error) {
    console.error('Seeding database error:', error);
  }
}

// -------------------------------------------------------------
// API ENDPOINTS
// -------------------------------------------------------------

// 1. Signup Route
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, role, profile } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User already registered.' });
    }

    const { consentGivenAt, consentVersion } = req.body;
    if (!consentGivenAt || consentVersion !== '1.0') {
      return res.status(400).json({ message: 'Consent to the Privacy Notice is required to sign up.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role,
      onboarded: role === 'vendor' ? false : undefined,
      profile: profile || {},
      consentGivenAt: new Date(consentGivenAt),
      consentVersion
    });

    await newUser.save();
    res.status(201).json({ message: 'User created successfully.', user: newUser });
  } catch (error) {
    console.error('Signup error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'User already registered.' });
    }
    res.status(500).json({ message: 'Error signing up.', error: error.message });
  }
});

// 2. Login Route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    
    if (!user) {
      return res.status(404).json({ message: 'Account does not exist.' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password.' });
    }

    res.json({
      message: 'Login successful.',
      user: {
        email: user.email,
        role: user.role,
        onboarded: user.onboarded,
        profile: user.profile,
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error logging in.', error: error.message });
  }
});

// 3. Update Profile Route
app.put('/api/users/profile', async (req, res) => {
  try {
    const { email, profile, preferences, password, oldPassword } = req.body;
    
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const updateData = {};
    if (profile) updateData.profile = profile;
    if (preferences) updateData.preferences = preferences;
    if (password) {
      if (!oldPassword) {
        return res.status(400).json({ message: 'Current password is required to change password.' });
      }
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Incorrect current password.' });
      }
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { $set: updateData },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({
      message: 'Profile updated successfully.',
      user: {
        email: updatedUser.email,
        role: updatedUser.role,
        onboarded: updatedUser.onboarded,
        profile: updatedUser.profile,
        preferences: updatedUser.preferences
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Error updating profile.', error: error.message });
  }
});

// 4. Suppliers Route
app.get('/api/suppliers', async (req, res) => {
  try {
    const suppliers = await Supplier.find({});
    const vendorUsers = await User.find({ role: 'vendor' });
    const registeredEmails = new Set(vendorUsers.map(u => u.email.toLowerCase()));

    const suppliersWithReg = suppliers.map(sup => {
      const isRegistered = registeredEmails.has(sup.email.toLowerCase());
      return {
        ...sup.toObject(),
        isRegistered: isRegistered
      };
    });

    res.json(suppliersWithReg);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching suppliers.', error: error.message });
  }
});

app.post('/api/suppliers/bulk', async (req, res) => {
  try {
    const { suppliers } = req.body;
    if (!suppliers || !Array.isArray(suppliers)) {
      return res.status(400).json({ message: 'Suppliers array required' });
    }
    for (const sup of suppliers) {
      // Validate consent flag
      if (!sup.consentGivenAt || sup.consentVersion !== '1.0') {
        return res.status(400).json({ message: 'Consent is required for storing supplier contact details.' });
      }
      await Supplier.findOneAndUpdate(
        { id: sup.id },
        sup,
        { upsert: true, new: true }
      );
    }
    res.json({ message: 'Suppliers synced successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error syncing suppliers', error: error.message });
  }
});

// F12: Supplier Performance History
app.get('/api/suppliers/:id/performance', async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ id: req.params.id });
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found.' });
    }

    const responses = await ResponseModel.find({ supplierIds: supplier.id, archived: { $ne: true } });

    const totalBids = responses.length;
    const wonBids = responses.filter(r => r.procurementStatus === 'COMPLETED').length;
    const winRate = totalBids > 0 ? Math.round((wonBids / totalBids) * 100) : 0;

    // Average response time: hours between submission and the last status change
    let totalHours = 0;
    let timedCount = 0;
    responses.forEach(r => {
      if (r.submittedAt && r.statusChangedAt) {
        const diffMs = new Date(r.statusChangedAt) - new Date(r.submittedAt);
        if (!isNaN(diffMs) && diffMs >= 0) {
          totalHours += diffMs / (1000 * 60 * 60);
          timedCount++;
        }
      }
    });
    const avgResponseTimeHours = timedCount > 0 ? Math.round(totalHours / timedCount) : 0;

    const pricingHistory = responses
      .filter(r => r.procurementStatus === 'COMPLETED')
      .map(r => ({
        responseID: r.responseID,
        templateName: r.templateName,
        submittedAt: r.submittedAt,
        completedAt: r.statusChangedAt
      }));

    res.json({
      supplierId: supplier.id,
      supplierName: supplier.name,
      totalBids,
      wonBids,
      winRate,
      avgResponseTimeHours,
      pricingHistory
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching supplier performance.', error: error.message });
  }
});

// F14: Self-Service Supplier Invite
// Basic in-memory cooldown to stop a single caller from spamming a supplier's inbox
// by hitting this endpoint repeatedly. Resets on server restart - fine for this scale;
// swap for a Redis-backed limiter if this is ever deployed with multiple server instances.
const inviteCooldowns = new Map(); // supplierId -> last invite timestamp (ms)
const INVITE_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

app.post('/api/suppliers/:id/invite', async (req, res) => {
  try {
    const supplier = await Supplier.findOne({ id: req.params.id });
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found.' });
    }

    const lastSent = inviteCooldowns.get(supplier.id);
    if (lastSent && (Date.now() - lastSent) < INVITE_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((INVITE_COOLDOWN_MS - (Date.now() - lastSent)) / 1000);
      return res.status(429).json({ message: `Please wait ${waitSeconds}s before resending an invite to this supplier.` });
    }

    const inviteSentAt = new Date().toISOString();
    const signupLink = `${req.protocol}://${req.get('host')}/signup.html?role=vendor&email=${encodeURIComponent(supplier.email)}&company=${encodeURIComponent(supplier.name)}`;

    const subject = `You're invited to register on nexPro Sourcing`;
    const body = `Hello ${supplier.contactPerson || supplier.name},

${supplier.name} has been added as a supplier on the nexPro Sourcing platform. To respond to RFQs and manage your profile directly, please complete your self-service registration using the link below:

${signupLink}

Once registered, you'll be able to track sourcing invitations, submit bids, and manage your certifications directly.

Sincerely,
Procurement Team, nexPro Sourcing Division`;

    let simulated = true;
    if (process.env.SMTP_USER && process.env.SMTP_PASS && !isFakeEmail(supplier.email)) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: (process.env.SMTP_PORT == 465),
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        });
        await transporter.sendMail({
          from: `"nexPro Sourcing" <${process.env.SMTP_USER}>`,
          to: supplier.email,
          subject,
          text: body
        });
        simulated = false;
      } catch (mailErr) {
        console.warn('Invite email SMTP send failed, falling back to simulated response.', mailErr);
      }
    }

    supplier.inviteSentAt = inviteSentAt;
    supplier.inviteCount = (supplier.inviteCount || 0) + 1;
    await supplier.save();
    inviteCooldowns.set(supplier.id, Date.now());

    res.json({
      message: simulated ? `Simulated invite dispatched to ${supplier.email}.` : `Invite email sent to ${supplier.email}.`,
      simulated,
      inviteSentAt,
      signupLink
    });
  } catch (error) {
    res.status(500).json({ message: 'Error sending supplier invite.', error: error.message });
  }
});

// 5. RFQs Route
app.get('/api/rfqs', async (req, res) => {
  try {
    const query = {};
    if (req.query.buyerEmail) {
      query.buyerEmail = req.query.buyerEmail.toLowerCase();
    }
    
    // Relational Connection: If queried by a vendor, find RFQs where this vendor was invited by the buyer
    if (req.query.vendorEmail) {
      const vendorEmail = req.query.vendorEmail.toLowerCase();
      const supplier = await Supplier.findOne({ email: vendorEmail });
      if (supplier) {
        query.supplierIds = supplier.id; // Mongoose matches if the value is present inside the array
      } else {
        return res.json([]);
      }
    }

    const rfqs = await RFQ.find(query);

    // Security: when this list is being fetched for a vendor, never let template-internal
    // data (version history, evaluation weights) leave the server. Previously this was only
    // hidden client-side, so a vendor could read it directly from the network response.
    if (req.query.vendorEmail) {
      const sanitized = rfqs.map(rfq => {
        const obj = rfq.toObject();
        delete obj.versions;
        delete obj.evaluationWeights;
        return obj;
      });
      return res.json(sanitized);
    }

    res.json(rfqs);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching RFQs.', error: error.message });
  }
});

app.post('/api/rfqs/bulk', async (req, res) => {
  try {
    const { rfqs, buyerEmail } = req.body;
    if (!rfqs || !Array.isArray(rfqs)) {
      return res.status(400).json({ message: 'RFQs array required' });
    }
    for (const rfq of rfqs) {
      // F1: Template Versioning - before overwriting an existing template, snapshot its
      // current name/fields into its versions array and bump the version counter.
      // This also covers "restore": since restoring flows through this same save pipeline,
      // the pre-restored config is captured as a new version before the restored one is written.
      const existing = await RFQ.findOne({ id: rfq.id });
      let versions = (rfq.versions && Array.isArray(rfq.versions)) ? rfq.versions.slice() : (existing ? (existing.versions || []) : []);

      if (existing) {
        const fieldsChanged = JSON.stringify(existing.fields || []) !== JSON.stringify(rfq.fields || []);
        const nameChanged = existing.name !== rfq.name;
        if (fieldsChanged || nameChanged) {
          const nextVersionNum = versions.length > 0 ? Math.max(...versions.map(v => v.versionNum || 0)) + 1 : 1;
          versions = versions.concat([{
            versionNum: nextVersionNum,
            name: existing.name,
            fields: existing.fields || [],
            updatedAt: existing.createdDate || new Date().toISOString(),
            updatedBy: existing.buyerEmail || buyerEmail || ''
          }]);
        }
      }

      await RFQ.findOneAndUpdate(
        { id: rfq.id },
        { ...rfq, buyerEmail: rfq.buyerEmail || buyerEmail, versions },
        { upsert: true, new: true }
      );
    }
    res.json({ message: 'RFQs synced successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error syncing RFQs', error: error.message });
  }
});

// F1: Fetch version history for a template. Buyers/Admins only.
// Security: role is looked up server-side from the User record for the given email,
// rather than trusted from a client-supplied "role" query param (which any caller
// could set to anything and bypass the check entirely).
app.get('/api/rfqs/:id/versions', async (req, res) => {
  try {
    const rfq = await RFQ.findOne({ id: req.params.id });
    if (!rfq) {
      return res.status(404).json({ message: 'Template not found.' });
    }

    const email = (req.query.email || '').toLowerCase();
    let isVendor = true; // deny by default - only known non-vendor users get version history
    if (email) {
      const user = await User.findOne({ email });
      if (user && user.role !== 'vendor') {
        isVendor = false;
      }
    }

    if (isVendor) {
      return res.json({ versions: [] });
    }

    const versions = (rfq.versions || []).slice().sort((a, b) => (b.versionNum || 0) - (a.versionNum || 0));
    res.json({ versions });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching template versions.', error: error.message });
  }
});

// 6. Responses Route (Bids)
app.get('/api/responses', async (req, res) => {
  try {
    // F11: archived (soft-deleted) responses never leak into the active cockpit lists
    const query = { archived: { $ne: true } };
    if (req.query.vendorEmail) {
      const email = req.query.vendorEmail.toLowerCase();
      // Find the supplier ID for this email if any
      const supplier = await SupplierModel.findOne({ email: email });
      const supplierId = supplier ? supplier.id : null;

      query.$or = [
        { distribution: "public" },
        { vendorEmail: email }
      ];
      if (supplierId) {
        query.$or.push({ supplierIds: supplierId });
      }
    }
    const responses = await ResponseModel.find(query);
    res.json(responses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching responses.', error: error.message });
  }
});

// F11: Archived Bids tab
app.get('/api/responses/archived', async (req, res) => {
  try {
    const query = { archived: true };
    if (req.query.vendorEmail) {
      query.vendorEmail = req.query.vendorEmail.toLowerCase();
    }
    const responses = await ResponseModel.find(query);
    res.json(responses);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching archived responses.', error: error.message });
  }
});

app.post('/api/responses/bulk', async (req, res) => {
  try {
    const { responses } = req.body;
    if (!responses || !Array.isArray(responses)) {
      return res.status(400).json({ message: 'Responses array required' });
    }
    for (const resp of responses) {
      // F6: bump statusChangedAt whenever the procurement status changes
      const existing = await ResponseModel.findOne({ id: resp.id });
      const payload = { ...resp };
      const statusChanged = !existing || existing.procurementStatus !== resp.procurementStatus;
      if (statusChanged) {
        payload.statusChangedAt = new Date().toISOString();
      }

      // F11: log a DELETE_RESPONSE audit event the moment a response transitions into archived
      if (resp.archived && (!existing || !existing.archived)) {
        await AuditLog.create({
          action: 'DELETE_RESPONSE',
          entityType: 'Response',
          entityId: resp.id,
          performedBy: resp.archivedBy || '',
          details: `Response "${resp.responseID || resp.id}" archived (soft-deleted).`
        });
      }

      await ResponseModel.findOneAndUpdate(
        { id: resp.id },
        payload,
        { upsert: true, new: true }
      );
    }
    res.json({ message: 'Responses synced successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error syncing responses', error: error.message });
  }
});

// 7. AI Sourcing Agent Extraction Route
app.post('/api/responses/extract', async (req, res) => {
  try {
    const { templateId, files } = req.body;
    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ message: 'Files array is required.' });
    }

    const extractedFields = {};
    let mergedText = "";

    files.forEach(f => {
      mergedText += `=== FILE: ${f.name} ===\n`;
      if (f.content) {
        mergedText += f.content + "\n";
      }
    });

    const lowerText = mergedText.toLowerCase();

    // 1. Supplier Name extraction
    let supplierName = null;
    if (lowerText.includes("acme")) {
      supplierName = "Acme Supplier Inc";
    } else if (lowerText.includes("spacex")) {
      supplierName = "SpaceX Fuel Corp";
    } else if (lowerText.includes("blueforge")) {
      supplierName = "BlueForge Components";
    } else if (lowerText.includes("meridian")) {
      supplierName = "Meridian Chemtech Industries";
    } else if (lowerText.includes("vantage")) {
      supplierName = "Vantage Packaging Solutions";
    } else if (lowerText.includes("jaspar")) {
      supplierName = "Jaspar Enterprises";
    } else if (lowerText.includes("matoshri")) {
      supplierName = "Matoshri Electrics";
    }
    if (supplierName) {
      extractedFields["field-supplier"] = supplierName;
    }

    // 2. Quantity extraction (Estimated Quantity)
    let quantity = null;
    const qtyRegexes = [
      /\b(?:qty|quantity|volume)\s*[:=]?\s*(\d+[\d,]*)\b/i,
      /\b(\d+[\d,]*)\s*(?:metric\s+)?tons?\b/i,
      /\b(\d+[\d,]*)\s*(?:units?|pcs|kg)\b/i,
      /\b(?:estimated|est\.?)\s*(?:qty|quantity)?\s*[:=]?\s*(\d+[\d,]*)\b/i
    ];
    for (const regex of qtyRegexes) {
      const match = mergedText.match(regex);
      if (match) {
        quantity = parseFloat(match[1].replace(/,/g, ""));
        break;
      }
    }
    // File name number sniffer fallback
    if (!quantity) {
      files.forEach(f => {
        const numMatch = f.name.match(/\b(\d{3,5})\b/);
        if (numMatch) {
          quantity = parseInt(numMatch[1]);
        }
      });
    }
    if (quantity) {
      extractedFields["field-qty"] = quantity;
    }

    // 3. Delivery Date extraction
    let deliveryDate = null;
    const dateRegexes = [
      /\b(\d{4})[-/](\d{2})[-/](\d{2})\b/, // YYYY-MM-DD
      /\b(\d{2})[-/](\d{2})[-/](\d{4})\b/  // DD-MM-YYYY
    ];
    for (const regex of dateRegexes) {
      const match = mergedText.match(regex);
      if (match) {
        if (match[1].length === 4) {
          deliveryDate = `${match[1]}-${match[2]}-${match[3]}`;
        } else {
          deliveryDate = `${match[3]}-${match[2]}-${match[1]}`;
        }
        break;
      }
    }
    if (deliveryDate) {
      extractedFields["field-date"] = deliveryDate;
    }

    // 4. Fuel Specifications (Fuel Grade Specifications)
    let specs = null;
    const specRegexes = [
      /(?:grade|specifications|specs|purity)\s*[:=]?\s*([^\n.]{10,80})/i,
      /(rocket propellant[^.\n]{5,50})/i,
      /(ultra-pure[^.\n]{5,50})/i
    ];
    for (const regex of specRegexes) {
      const match = mergedText.match(regex);
      if (match) {
        specs = match[1].trim();
        break;
      }
    }
    if (specs) {
      extractedFields["field-spec"] = specs;
    }

    // --- Smart Category Fallback (AI Synthesizer Fallback) ---
    // --- Smart Category Fallback (AI Synthesizer Fallback) ---
    if (templateId === "template-50point") {
      // Commercial Terms
      extractedFields["field-1"] = supplierName || "Acme Supplier Inc";
      
      const quoteMatch = mergedText.match(/quote\s*(?:ref|reference)?\s*(?:number|no)?\s*[:=]?\s*([A-Z0-9-]+)/i);
      extractedFields["field-2"] = quoteMatch ? quoteMatch[1] : "ACME-2026-MRO-99";
      
      const currencyMatch = mergedText.match(/(USD|EUR|INR|GBP|JPY)/i);
      extractedFields["field-3"] = currencyMatch ? currencyMatch[1].toUpperCase() + " ($)" : "USD ($)";
      
      const priceMatch = mergedText.match(/base\s*(?:unit)?\s*price\s*[:=]?\s*(?:\$|rs\.?)?\s*(\d+)/i);
      extractedFields["field-4"] = priceMatch ? parseInt(priceMatch[1]) : 450;
      
      const discountMatch = mergedText.match(/discount\s*[:=]?\s*(\d+)/i);
      extractedFields["field-5"] = discountMatch ? parseInt(discountMatch[1]) : 5;
      
      const taxMatch = mergedText.match(/tax\s*(?:rate)?\s*[:=]?\s*(\d+)/i);
      extractedFields["field-6"] = taxMatch ? parseInt(taxMatch[1]) : 18;
      
      const payMatch = mergedText.match(/net\s*(30|45|60|90)/i);
      extractedFields["field-7"] = payMatch ? "Net " + payMatch[1] : "Net 30";
      
      extractedFields["field-8"] = deliveryDate || "2026-12-31";
      
      const warrantyMatch = mergedText.match(/warranty\s*(?:period)?\s*[:=]?\s*(\d+)/i);
      extractedFields["field-9"] = warrantyMatch ? parseInt(warrantyMatch[1]) : 24;
      
      const leadMatch = mergedText.match(/(?:lead\s*time|delivery)\s*[:=]?\s*(\d+)/i);
      extractedFields["field-10"] = leadMatch ? parseInt(leadMatch[1]) : 12;
      
      const shipMatch = mergedText.match(/(air|ocean|road|rail)\s*freight/i);
      extractedFields["field-11"] = shipMatch ? shipMatch[1].charAt(0).toUpperCase() + shipMatch[1].slice(1) + " Freight" : "Ocean Freight";
      
      const incoMatch = mergedText.match(/(EXW|FOB|CIF|DDP|DAP)/i);
      extractedFields["field-12"] = incoMatch ? incoMatch[1].toUpperCase() : "DDP";
      
      const moqMatch = mergedText.match(/moq|minimum\s*order\s*[:=]?\s*(\d+)/i);
      extractedFields["field-13"] = moqMatch ? parseInt(moqMatch[1]) : 500;
      
      const packMatch = mergedText.match(/packaging\s*[:=]?\s*([^\n.]+)/i);
      extractedFields["field-14"] = packMatch ? packMatch[1].trim() : "Standard heavy-duty industrial wooden pallets with shrink wrapping.";
      
      const freightMatch = mergedText.match(/freight\s*(?:cost|costs)?\s*[:=]?\s*(?:\$|rs\.?)?\s*(\d+)/i);
      extractedFields["field-15"] = freightMatch ? parseInt(freightMatch[1]) : 1200;

      // Technical (16-25)
      const mpnMatch = mergedText.match(/mpn|part\s*(?:number|no)?\s*[:=]?\s*([A-Z0-9-]+)/i);
      extractedFields["field-16"] = mpnMatch ? mpnMatch[1] : "ACME-VCB-772";
      
      const oemMatch = mergedText.match(/oem\s*[:=]?\s*([A-Za-z0-9- ]+)/i);
      extractedFields["field-17"] = oemMatch ? oemMatch[1].trim() : "Acme Sourcing OEM";
      
      const originMatch = mergedText.match(/country\s*(?:of\s*origin)?\s*[:=]?\s*([A-Za-z]+)/i);
      extractedFields["field-18"] = originMatch ? originMatch[1].trim() : "USA";
      
      const gradeMatch = mergedText.match(/material\s*grade\s*[:=]?\s*([A-Za-z0-9- ]+)/i);
      extractedFields["field-19"] = gradeMatch ? gradeMatch[1].trim() : "High-Tensile Steel Grade 80";
      
      const purityMatch = mergedText.match(/purity\s*[:=]?\s*(\d+(?:\.\d+)?)/i);
      extractedFields["field-20"] = purityMatch ? parseFloat(purityMatch[1]) : 99.8;
      
      extractedFields["field-21"] = lowerText.includes("drawing compliance") || lowerText.includes("complies with drawing") || true;
      extractedFields["field-22"] = lowerText.includes("operations manual") || lowerText.includes("ops manual") || true;
      
      const tempMatch = mergedText.match(/temperature\s*range\s*[:=]?\s*([^\n.]+)/i);
      extractedFields["field-23"] = tempMatch ? tempMatch[1].trim() : "-40C to 85C";
      
      const pressureMatch = mergedText.match(/pressure\s*(?:rating)?\s*[:=]?\s*(\d+)\s*psi/i);
      extractedFields["field-24"] = pressureMatch ? parseInt(pressureMatch[1]) : 150;
      
      extractedFields["field-25"] = lowerText.includes("certificate of analysis") || lowerText.includes("coa included") || true;

      // Compliance (26-35)
      const iso9Match = mergedText.match(/iso\s*9001\s*(certified|in progress|not certified)/i);
      extractedFields["field-26"] = iso9Match ? iso9Match[1].charAt(0).toUpperCase() + iso9Match[1].slice(1) : "Certified";
      
      const iso14Match = mergedText.match(/iso\s*14001\s*(certified|in progress|not certified)/i);
      extractedFields["field-27"] = iso14Match ? iso14Match[1].charAt(0).toUpperCase() + iso14Match[1].slice(1) : "Certified";
      
      extractedFields["field-28"] = lowerText.includes("rohs") || lowerText.includes("restriction of hazardous") || true;
      extractedFields["field-29"] = lowerText.includes("reach") || lowerText.includes("registration, evaluation") || true;
      
      const envMatch = mergedText.match(/environmental\s*impact\s*(?:score)?\s*[:=]?\s*(\d+)/i);
      extractedFields["field-30"] = envMatch ? parseInt(envMatch[1]) : 85;
      
      extractedFields["field-31"] = lowerText.includes("safety data sheet") || lowerText.includes("sds attached") || true;
      
      const carbonMatch = mergedText.match(/carbon\s*offset\s*[:=]?\s*(\d+)/i);
      extractedFields["field-32"] = carbonMatch ? parseInt(carbonMatch[1]) : 15;
      
      extractedFields["field-33"] = lowerText.includes("conflict minerals free") || lowerText.includes("no conflict minerals") || true;
      extractedFields["field-34"] = lowerText.includes("labor standards audit") || lowerText.includes("labor audit") || true;
      extractedFields["field-35"] = lowerText.includes("child labor policy") || lowerText.includes("no child labor") || true;

      // Risk (36-43)
      const businessYearsMatch = mergedText.match(/years\s*in\s*business\s*[:=]?\s*(\d+)/i);
      extractedFields["field-36"] = businessYearsMatch ? parseInt(businessYearsMatch[1]) : 15;
      
      const creditMatch = mergedText.match(/credit\s*risk\s*score\s*[:=]?\s*(\d+)/i);
      extractedFields["field-37"] = creditMatch ? parseInt(creditMatch[1]) : 88;
      
      const revenueMatch = mergedText.match(/annual\s*revenue\s*[:=]?\s*(?:\$)?\s*(\d+)/i);
      extractedFields["field-38"] = revenueMatch ? parseInt(revenueMatch[1]) : 12000000;
      
      const referencesMatch = mergedText.match(/references\s*[:=]?\s*(\d+)/i);
      extractedFields["field-39"] = referencesMatch ? parseInt(referencesMatch[1]) : 8;
      
      const riskMatch = mergedText.match(/(low|medium|high)\s*risk/i);
      extractedFields["field-40"] = riskMatch ? riskMatch[1].charAt(0).toUpperCase() + riskMatch[1].slice(1) + " Risk" : "Low Risk";
      
      extractedFields["field-41"] = lowerText.includes("business continuity plan") || lowerText.includes("bcp") || true;
      extractedFields["field-42"] = lowerText.includes("cybersecurity") || lowerText.includes("soc2") || lowerText.includes("iso 27001") || true;
      extractedFields["field-43"] = lowerText.includes("subcontractor") || true;

      // Service (44-50)
      extractedFields["field-44"] = lowerText.includes("24/7") || lowerText.includes("round-the-clock") || true;
      
      const responseSlaMatch = mergedText.match(/incident\s*response\s*sla\s*[:=]?\s*(\d+)/i);
      extractedFields["field-45"] = responseSlaMatch ? parseInt(responseSlaMatch[1]) : 4;
      
      extractedFields["field-46"] = lowerText.includes("training material") || lowerText.includes("operator training") || true;
      extractedFields["field-47"] = lowerText.includes("installation included") || lowerText.includes("on-site installation") || true;
      extractedFields["field-48"] = lowerText.includes("annual maintenance") || lowerText.includes("amc option") || true;
      extractedFields["field-49"] = lowerText.includes("liquidated damages") || lowerText.includes("penalty clause") || true;
      
      const lawMatch = mergedText.match(/governing\s*law\s*[:=]?\s*([^\n.]+)/i);
      extractedFields["field-50"] = lawMatch ? lawMatch[1].trim() : "State of Delaware, USA";
    } else if (templateId === "template-propellant" || templateId === "template-falcon9") {
      if (!extractedFields["field-supplier"]) extractedFields["field-supplier"] = "Acme Supplier Inc";
      if (!extractedFields["field-spec"]) extractedFields["field-spec"] = "Ultra-pure rocket propellant meeting MIL-P-25576 military standards.";
      if (!extractedFields["field-qty"]) extractedFields["field-qty"] = 1200;
      if (!extractedFields["field-date"]) extractedFields["field-date"] = "2026-09-30";
    } else {
      if (!extractedFields["field-supplier"]) extractedFields["field-supplier"] = "Acme Supplier Inc";
      if (!extractedFields["field-qty"]) extractedFields["field-qty"] = 1000;
      if (!extractedFields["field-date"]) extractedFields["field-date"] = new Date(Date.now() + 30 * 24 * 3600000).toISOString().split('T')[0];
    }

    res.json({
      message: "AI extraction successful.",
      fields: extractedFields
    });
  } catch (error) {
    console.error("AI extraction endpoint error:", error);
    res.status(500).json({ message: "Failed to extract document contents.", error: error.message });
  }
});

app.post('/api/rfqs/draft-prompt', async (req, res) => {
  try {
    const { promptText, category, rfqName } = req.body;
    if (!promptText) {
      return res.status(400).json({ message: 'Prompt text is required.' });
    }

    const finalCategory = category || 'Other';
    const finalName = rfqName || 'Sourcing Event - ' + new Date().toLocaleDateString();

    let fields = [];

    if (process.env.OPENROUTER_API_KEY) {
      console.log("Drafting RFQ template fields via OpenRouter prompt...");
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'http://localhost:5000',
            'X-Title': 'nexPro AI Sourcing Agent'
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: 'You are an AI Sourcing Agent. The user wants to source a product. Based on their natural language prompt description, compile a customized list of criteria fields to build a professional sourcing template. Return a JSON object with: "name" (RFQ Name), "category" (one of: "Mechanical Parts", "Electrical Parts", "Chemical Raw Materials", "Packaging Materials", "Other"), and "fields" (an array of fields, where each field has: "id" (string), "label" (string), "type" ("short-text", "long-text", "number", "date", "checkbox", "dropdown", "file"), "required" (boolean), "options" (array of strings if type is dropdown, else empty)). Output ONLY the valid JSON object without wrapping in markdown blocks.'
              },
              {
                role: 'user',
                content: `Prompt Text: ${promptText}\nRFQ Name Suggestion: ${finalName}\nProduct Category Hint: ${finalCategory}`
              }
            ],
            response_format: { type: "json_object" }
          })
        });

        if (response.ok) {
          let text = await response.text();
          text = text.replace(/```json/g, '').replace(/```/g, '').trim();
          const data = JSON.parse(text);
          if (data.fields && Array.isArray(data.fields)) {
            return res.json({
              message: "AI prompt drafting successful.",
              name: data.name || finalName,
              category: data.category || finalCategory,
              fields: data.fields
            });
          }
        }
      } catch (err) {
        console.warn("OpenRouter prompt drafting failed. Falling back to local keyword compiler.", err);
      }
    }

    // Local smart keyword compiler fallback
    const norm = promptText.toLowerCase();
    let detectedCategory = finalCategory;
    if (norm.includes('propellant') || norm.includes('fuel') || norm.includes('chemical') || norm.includes('solvent')) {
      detectedCategory = 'Chemical Raw Materials';
      fields = [
        { id: 'f-supplier', label: 'Supplier Name', type: 'short-text', required: true, options: [] },
        { id: 'f-composition', label: 'Chemical Composition / Purity Level (%)', type: 'number', required: true, options: [] },
        { id: 'f-sds', label: 'Safety Data Sheet (SDS) Attached', type: 'checkbox', required: true, options: [] },
        { id: 'f-mtr', label: 'Material Test Report (MTR)', type: 'file', required: true, options: [] },
        { id: 'f-qty', label: 'Quantity Offered (Tons)', type: 'number', required: true, options: [] },
        { id: 'f-delivery', label: 'Delivery Lead Time (Days)', type: 'number', required: true, options: [] },
        { id: 'f-payment', label: 'Payment Terms Offered', type: 'dropdown', required: true, options: ['Net 30', 'Net 45', 'Net 60', 'Cash on Delivery'] }
      ];
    } else if (norm.includes('bolt') || norm.includes('screw') || norm.includes('metal') || norm.includes('machin') || norm.includes('titanium') || norm.includes('steel')) {
      detectedCategory = 'Mechanical Parts';
      fields = [
        { id: 'f-supplier', label: 'Supplier Name', type: 'short-text', required: true, options: [] },
        { id: 'f-mpn', label: 'Manufacturer Part Number (MPN)', type: 'short-text', required: true, options: [] },
        { id: 'f-drawing', label: 'Technical Drawing Compliance', type: 'checkbox', required: true, options: [] },
        { id: 'f-tolerance', label: 'Surface Finish & Tolerances met', type: 'short-text', required: false, options: [] },
        { id: 'f-qty', label: 'Quantity (Units)', type: 'number', required: true, options: [] },
        { id: 'f-leadtime', label: 'Lead Time (Days)', type: 'number', required: true, options: [] },
        { id: 'f-price', label: 'Unit Price ($)', type: 'number', required: true, options: [] }
      ];
    } else if (norm.includes('wire') || norm.includes('pcb') || norm.includes('led') || norm.includes('sensor') || norm.includes('switch') || norm.includes('electrical')) {
      detectedCategory = 'Electrical Parts';
      fields = [
        { id: 'f-supplier', label: 'Supplier Name', type: 'short-text', required: true, options: [] },
        { id: 'f-voltage', label: 'Voltage & Current Rating Specs', type: 'short-text', required: true, options: [] },
        { id: 'f-esd', label: 'ESD Safety Standard compliance', type: 'checkbox', required: true, options: [] },
        { id: 'f-soc2', label: 'Cybersecurity Certification (SOC2)', type: 'checkbox', required: false, options: [] },
        { id: 'f-leadtime', label: 'Delivery Lead Time (Days)', type: 'number', required: true, options: [] }
      ];
    } else {
      // General sourcing fields
      fields = [
        { id: 'f-supplier', label: 'Supplier Name', type: 'short-text', required: true, options: [] },
        { id: 'f-spec', label: 'Product Specifications', type: 'long-text', required: true, options: [] },
        { id: 'f-qty', label: 'Required Sourcing Volume', type: 'number', required: true, options: [] },
        { id: 'f-delivery', label: 'Delivery Date Target', type: 'date', required: true, options: [] },
        { id: 'f-price', label: 'Unit Price Offer', type: 'number', required: true, options: [] }
      ];
    }

    res.json({
      message: "AI Sourcing prompt draft compiled successfully.",
      name: finalName,
      category: detectedCategory,
      fields: fields
    });
  } catch (error) {
    console.error("AI Sourcing prompt draft error:", error);
    res.status(500).json({ message: "Failed to compile prompt draft.", error: error.message });
  }
});

// 8. AI RFQ Document Field Extractor Route
app.post('/api/rfqs/parse-fields', async (req, res) => {
  try {
    const { rfqText, category, rfqName } = req.body;
    if (!rfqText) {
      return res.status(400).json({ message: 'RFQ document text is required.' });
    }

    const lowerText = rfqText.toLowerCase();
    let fields = [];

    // Analyze keywords to generate custom fields tailored to the document contents
    if (lowerText.includes("propellant") || lowerText.includes("fuel") || lowerText.includes("mil-p")) {
      fields = [
        { id: "field-supplier", label: "Supplier Name", type: "short-text", required: true, options: [], order: 0 },
        { id: "field-spec", label: "Fuel Grade Specifications", type: "long-text", required: true, options: [], order: 1 },
        { id: "field-qty", label: "Estimated Quantity (Metric Tons)", type: "number", required: true, options: [], order: 2 },
        { id: "field-date", label: "Delivery Target Date", type: "date", required: true, options: [], order: 3 },
        { id: "field-cert", label: "Compliance Certification", type: "file", required: false, options: [], order: 4 }
      ];
    } else if (lowerText.includes("50 point") || lowerText.includes("mro") || lowerText.includes("commercial terms") || lowerText.includes("technical compliance") || lowerText.includes("acme")) {
      // Generate a smart subset of 20 core fields matching the MRO spares / 50 point assessment structure
      fields = [
        { id: "field-1", label: "Supplier Name", type: "short-text", required: true, options: [], order: 0 },
        { id: "field-2", label: "Quote Reference Number", type: "short-text", required: true, options: [], order: 1 },
        { id: "field-3", label: "Preferred Currency", type: "dropdown", required: true, options: ["USD ($)", "EUR (€)", "INR (₹)"], order: 2 },
        { id: "field-4", label: "Base Unit Price", type: "number", required: true, options: [], order: 3 },
        { id: "field-5", label: "Volume Discount Percentage", type: "number", required: false, options: [], order: 4 },
        { id: "field-6", label: "Applicable Tax Rate (%)", type: "number", required: true, options: [], order: 5 },
        { id: "field-7", label: "Payment Terms Days", type: "dropdown", required: true, options: ["Net 30", "Net 45", "Net 60"], order: 6 },
        { id: "field-8", label: "Quotation Validity Date", type: "date", required: true, options: [], order: 7 },
        { id: "field-9", label: "Warranty Period (Months)", type: "number", required: true, options: [], order: 8 },
        { id: "field-10", label: "Estimated Delivery Lead Time (Days)", type: "number", required: true, options: [], order: 9 },
        { id: "field-16", label: "Manufacturer Part Number (MPN)", type: "short-text", required: true, options: [], order: 10 },
        { id: "field-18", label: "Country of Origin", type: "short-text", required: true, options: [], order: 11 },
        { id: "field-21", label: "Technical Drawings Compliance", type: "checkbox", required: false, options: [], order: 12 },
        { id: "field-24", label: "Maximum Operating Pressure (PSI)", type: "number", required: true, options: [], order: 13 },
        { id: "field-26", label: "ISO 9001 Certification Status", type: "dropdown", required: true, options: ["Certified", "In Progress", "Not Certified"], order: 14 },
        { id: "field-28", label: "RoHS Directive Compliance", type: "checkbox", required: false, options: [], order: 15 },
        { id: "field-36", label: "Supplier Years in Business", type: "number", required: true, options: [], order: 16 },
        { id: "field-40", label: "Supply Chain Disruption Risk Level", type: "dropdown", required: true, options: ["Low Risk", "Medium Risk", "High Risk"], order: 17 },
        { id: "field-45", label: "Incident Support SLA (Hours)", type: "number", required: true, options: [], order: 18 },
        { id: "field-50", label: "Governing Law Jurisdiction", type: "short-text", required: true, options: [], order: 19 }
      ];
    } else {
      // Default general layout (12 fields)
      fields = [
        { id: "field-1", label: "Supplier Name", type: "short-text", required: true, options: [], order: 0 },
        { id: "field-2", label: "Proposal Reference ID", type: "short-text", required: true, options: [], order: 1 },
        { id: "field-3", label: "Proposed Unit Cost", type: "number", required: true, options: [], order: 2 },
        { id: "field-4", label: "Delivery Lead Time (Days)", type: "number", required: true, options: [], order: 3 },
        { id: "field-5", label: "Payment Terms", type: "dropdown", required: true, options: ["Net 30", "Net 45", "Net 60", "Due on Receipt"], order: 4 },
        { id: "field-6", label: "Warranty Period (Months)", type: "number", required: true, options: [], order: 5 },
        { id: "field-7", label: "Country of Origin", type: "short-text", required: false, options: [], order: 6 },
        { id: "field-8", label: "ISO 9001 Compliance", type: "checkbox", required: false, options: [], order: 7 },
        { id: "field-9", label: "Technical Compliance Certificate", type: "file", required: false, options: [], order: 8 },
        { id: "field-10", label: "Compliance Statement", type: "long-text", required: true, options: [], order: 9 },
        { id: "field-11", label: "Supplier Risk Assessment Score", type: "number", required: false, options: [], order: 10 },
        { id: "field-12", label: "Additional Support Service Offered", type: "long-text", required: false, options: [], order: 11 }
      ];
    }

    res.json({
      message: "Fields parsed successfully from RFQ document.",
      name: rfqName || "Parsed RFQ Sourcing Requirements",
      category: category || "Mechanical Parts",
      fields: fields
    });
  } catch (error) {
    console.error("AI RFQ field parser error:", error);
    res.status(500).json({ message: "Failed to parse RFQ fields.", error: error.message });
  }
});

// Email Agent Routes
app.post('/api/email/draft', async (req, res) => {
  try {
    const { rfqName, category, suppliers, attachments, toneDirectives } = req.body;
    if (!rfqName) {
      return res.status(400).json({ message: "RFQ Name is required." });
    }

    const mockResult = compileMockEmail(rfqName, category, suppliers || [], attachments || [], toneDirectives);

    if (process.env.OPENROUTER_API_KEY) {
      console.log("Drafting email using OpenRouter API...");
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'http://localhost:5000',
            'X-Title': 'nexPro AI Sourcing Agent'
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              {
                role: 'system',
                content: 'You are an AI Sourcing Agent. Draft a highly professional invitation-to-bid email for suppliers. Return a JSON object with two fields: "subject" and "body". Do not return any other text, markdown blocks, or wrappers. The output must be valid parsable JSON.'
              },
              {
                role: 'user',
                content: `Draft an invitation email for:
RFQ Name: ${rfqName}
Product Category: ${category}
Selected Suppliers: ${(suppliers || []).map(s => s.name).join(', ')}
Attachments: ${(attachments || []).join(', ')}
Tone Directives / Instructions: ${toneDirectives || 'Standard Professional'}`
              }
            ],
            response_format: { type: "json_object" }
          })
        });

        if (response.ok) {
          let text = await response.text();
          text = text.replace(/```json/g, '').replace(/```/g, '').trim();
          const data = JSON.parse(text);
          if (data.subject && data.body) {
            return res.json({ subject: data.subject, body: data.body, source: 'ai' });
          }
        }
      } catch (err) {
        console.warn("OpenRouter API failed or timed out. Falling back to local mock generator.", err);
      }
    }

    // Fallback/Mock response
    res.json({ ...mockResult, source: 'mock' });
  } catch (error) {
    console.error("AI Email drafting error:", error);
    res.status(500).json({ message: "Failed to draft email.", error: error.message });
  }
});


function generateRFQPDFBuffer(templateName, templateFields, category) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers = [];
      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', err => reject(err));

      // PDF Title
      doc.fillColor('#1f1430')
         .fontSize(22)
         .text('RFQ SPECIFICATION DOCUMENT', { align: 'center', underline: true });
      doc.moveDown(1.5);

      // Metadata Block
      doc.fillColor('#333333').fontSize(11);
      doc.font('Helvetica-Bold').text('RFQ Name: ', { continued: true })
         .font('Helvetica').text(`${templateName || 'Sourcing Event'}`);
      doc.font('Helvetica-Bold').text('Category: ', { continued: true })
         .font('Helvetica').text(`${category || 'Other'}`);
      doc.font('Helvetica-Bold').text('Date: ', { continued: true })
         .font('Helvetica').text(`${new Date().toLocaleDateString()}`);
      doc.moveDown(1.5);

      // Criteria header
      doc.fillColor('#7600e6')
         .fontSize(14)
         .text('Active Sourcing Criteria Fields:', { underline: true });
      doc.moveDown(0.8);

      // Render each field
      if (templateFields && Array.isArray(templateFields) && templateFields.length > 0) {
        templateFields.forEach((field, i) => {
          doc.fillColor('#111111')
             .font('Helvetica-Bold')
             .fontSize(11)
             .text(`${i + 1}. ${field.label || 'Field Name'}`);
          
          doc.fillColor('#555555')
             .font('Helvetica')
             .fontSize(9.5)
             .text(`   Type: ${field.type || 'text'}  |  Required: ${field.required ? 'Yes' : 'No'}`);
          
          if (field.options && Array.isArray(field.options) && field.options.length > 0) {
            doc.text(`   Options: ${field.options.join(', ')}`);
          }
          doc.moveDown(0.8);
        });
      } else {
        doc.font('Helvetica-Oblique').text('No criteria fields defined in this RFQ.');
      }

      // Footer
      doc.moveDown(2);
      doc.fillColor('#888888')
         .fontSize(8)
         .text('Generated automatically by the nexPro Sourcing Platform.', { align: 'center' });

      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}


app.post('/api/email/send', async (req, res) => {
  try {
    const { suppliers, subject, body, attachments, templateName, templateFields, category } = req.body;
    if (!suppliers || !Array.isArray(suppliers) || suppliers.length === 0) {
      return res.status(400).json({ message: "Suppliers recipient array is required." });
    }

    const emailList = suppliers.map(s => s.email).join(', ');
    console.log(`\n--- SOURCING DISPATCH TRIGGERED ---`);
    console.log(`Recipients: ${emailList}`);
    console.log(`Subject: ${subject}`);
    
    const attachmentNames = (attachments || []).map(a => a.name || a);
    console.log(`Attachments: ${attachmentNames.join(', ')}`);
    console.log(`Body:\n${body}\n-----------------------------------\n`);

    // Prepare attachments array for Nodemailer
    const mailAttachments = [];

    // Add actual attachments sent from the client
    if (attachments && Array.isArray(attachments)) {
      attachments.forEach(a => {
        if (a && typeof a === 'object' && a.content) {
          mailAttachments.push({
            filename: a.name,
            content: Buffer.from(a.content, 'base64')
          });
        } else {
          // Fallback to simulation if filename-only is passed
          const fileName = a && typeof a === 'object' ? a.name : a;
          mailAttachments.push({
            filename: fileName,
            content: `Simulation of file content for: ${fileName}`
          });
        }
      });
    }

    // Add the dynamically generated RFQ PDF specification
    const rfqPdfName = `${(templateName || 'RFQ_Specification').replace(/[^a-z0-9]/gi, '_')}.pdf`;
    let rfqPdfBuffer;
    try {
      rfqPdfBuffer = await generateRFQPDFBuffer(templateName, templateFields, category);
    } catch (pdfErr) {
      console.error("PDF generation failed, falling back to text representation:", pdfErr);
      const rfqPdfContent = `=== RFQ SPECIFICATION DOCUMENT ===\n\nRFQ Name: ${templateName || 'Sourcing Event'}\nCategory: ${category || 'Other'}\nGenerated Date: ${new Date().toLocaleDateString()}\n\nCRITERIA FIELDS:\n` + 
        (templateFields || []).map((f, i) => `${i + 1}. ${f.label} (${f.type})${f.required ? ' *Required' : ''}`).join('\n') +
        `\n\n=== END OF DOCUMENT ===`;
      rfqPdfBuffer = Buffer.from(rfqPdfContent, 'utf-8');
    }

    mailAttachments.push({
      filename: rfqPdfName,
      content: rfqPdfBuffer
    });

    let simulated = true;
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      console.log("Sending real SMTP emails...");
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: (process.env.SMTP_PORT == 465),
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });

        let sentRealCount = 0;
        // Send to each supplier individually
        for (const sup of suppliers) {
          if (isFakeEmail(sup.email)) {
            console.log(`[SIMULATION] Skipped SMTP for mock supplier email: ${sup.email}`);
            continue;
          }
          await transporter.sendMail({
            from: `"nexPro Sourcing" <${process.env.SMTP_USER}>`,
            to: sup.email,
            subject: subject,
            text: body,
            attachments: mailAttachments
          });
          sentRealCount++;
        }
        if (sentRealCount > 0) {
          simulated = false;
        }
      } catch (mailErr) {
        console.warn('Sourcing email SMTP send failed, falling back to simulated response.', mailErr);
      }
    }

    res.json({
      message: simulated ? `Simulated dispatch: Invitation emails (with attachments & RFQ PDF) dispatched to ${suppliers.length} vendors.` : `Emails sent successfully via SMTP to ${suppliers.length} vendors.`,
      simulated,
      recipients: suppliers.map(s => s.name + " (" + s.email + ")"),
      attachmentsSent: mailAttachments.map(ma => ma.filename)
    });
  } catch (error) {
    console.error("Email sending error:", error);
    res.status(500).json({ message: "Failed to send emails.", error: error.message });
  }
});

function compileMockEmail(rfqName, category, suppliers, attachments, toneDirectives) {
  const attachText = attachments.length > 0 ? attachments.map(a => `\n- 📎 ${a}`).join('') : '\n- No attached specifications.';
  const subject = `Invitation to Bid: Sourcing S-RFQ - ${rfqName}`;
  const body = `Dear Sourcing and Proposals Team,

We are pleased to invite you to participate in our active procurement run for the following category: ${category}.

Our team has initiated the "${rfqName}" sourcing event on the nexPro platform. We have identified your company as a qualified supplier matching our technical requirements.

Event Scope:
- Sourcing Event Name: ${rfqName}
- Product Category: ${category}
- Attached Sourcing Documents: ${attachText}

AI Tone Directive Applied: ${toneDirectives || "Standard Professional"}

Please log in to your nexPro vendor portal at http://localhost:5000/login.html to view the complete technical criteria list and submit your commercial bid.

Sincerely,
Procurement Team, nexPro Sourcing Division`;

  return { subject, body };
}

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));



// =============================================================
// DPDP COMPLIANCE APIS
// =============================================================

// A. Export personal data log
app.get('/api/users/me/export', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ message: 'Email query parameter is required.' });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const suppliers = await Supplier.find({ email: email.toLowerCase() });
    const responses = await ResponseModel.find({ vendorEmail: email.toLowerCase() });
    const rfqs = await RFQ.find({ buyerEmail: email.toLowerCase() });

    const exportData = {
      exportTimestamp: new Date().toISOString(),
      profile: {
        email: user.email,
        role: user.role,
        profile: user.profile,
        preferences: user.preferences,
        consentGivenAt: user.consentGivenAt,
        consentVersion: user.consentVersion
      },
      suppliersLinked: suppliers.map(s => ({
        id: s.id,
        name: s.name,
        category: s.category,
        contactPerson: s.contactPerson,
        email: s.email,
        phone: s.phone,
        gstin: s.gstin,
        certifications: s.certifications,
        consentGivenAt: s.consentGivenAt
      })),
      responsesSubmitted: responses.map(r => ({
        id: r.id,
        responseID: r.responseID,
        templateName: r.templateName,
        submittedAt: r.submittedAt,
        status: r.status,
        fields: r.fields
      })),
      rfqsCreated: rfqs.map(q => ({
        id: q.id,
        name: q.name,
        category: q.category,
        status: q.status,
        createdDate: q.createdDate
      }))
    };

    // Log the data export event
    const audit = new AuditLog({
      action: 'EXPORT_DATA',
      entityType: 'User',
      entityId: user.email,
      performedBy: user.email,
      details: 'User exported their personal data log.'
    });
    await audit.save();

    res.setHeader('Content-disposition', `attachment; filename=nexpro_data_export_${user.email}.json`);
    res.setHeader('Content-type', 'application/json');
    res.json(exportData);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ message: 'Failed to export data.', error: error.message });
  }
});

// B. Request Account Deletion (soft delete)
app.post('/api/users/me/delete-request', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.deletionRequested = true;
    user.deletionRequestedAt = new Date();
    await user.save();

    // Log the delete request
    const audit = new AuditLog({
      action: 'DELETE_REQUEST',
      entityType: 'User',
      entityId: user.email,
      performedBy: user.email,
      details: 'User submitted account deletion request.'
    });
    await audit.save();

    res.json({ message: 'Account deletion request submitted. Pending administrator approval.' });
  } catch (error) {
    console.error('Delete request error:', error);
    res.status(500).json({ message: 'Failed to submit deletion request.', error: error.message });
  }
});

// C. Admin List Deletion Requests
app.get('/api/admin/data-requests', async (req, res) => {
  try {
    const { email } = req.query;
    const adminUser = await User.findOne({ email: email ? email.toLowerCase() : '' });
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access only.' });
    }

    const requests = await User.find({ deletionRequested: true });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch deletion requests.', error: error.message });
  }
});

// D. Admin Approve Deletion (scrub details, preserve records)
app.post('/api/admin/data-requests/:id/approve', async (req, res) => {
  try {
    const { adminEmail } = req.body;
    const adminUser = await User.findOne({ email: adminEmail ? adminEmail.toLowerCase() : '' });
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access only.' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const oldEmail = targetUser.email;
    const anonEmail = `anonymized-${Date.now()}@nexpro.com`;

    // 1. Scrub User
    targetUser.email = anonEmail;
    targetUser.password = `SCRUBBED-${Math.random().toString(36).slice(-8)}`;
    targetUser.role = 'inactive';
    targetUser.deletionRequested = false;
    targetUser.profile = {
      fullName: 'Anonymized User',
      companyName: 'Anonymized Company',
      designation: '',
      department: '',
      phone: '',
      address: '',
      city: '',
      country: '',
      gstin: '',
      website: ''
    };
    await targetUser.save();

    // 2. Scrub Supplier records matching the email
    const suppliers = await Supplier.find({ email: oldEmail });
    for (const sup of suppliers) {
      sup.email = anonEmail;
      sup.name = `Anonymized Supplier (${sup.id})`;
      sup.contactPerson = 'Anonymized Person';
      sup.phone = '';
      sup.altPhone = '';
      sup.addressLine = '';
      sup.gstin = '';
      sup.registrationNumber = '';
      sup.website = '';
      sup.bankName = '';
      sup.bankAccountLast4 = '';
      sup.ifscSwift = '';
      await sup.save();
    }

    // 3. Log Audit
    const audit = new AuditLog({
      action: 'DELETE_APPROVE',
      entityType: 'User',
      entityId: oldEmail,
      performedBy: adminUser.email,
      details: 'Admin approved data deletion. Scrubbed personal details from user and supplier databases.'
    });
    await audit.save();

    res.json({ message: 'Deletion approved and user data anonymized successfully.' });
  } catch (error) {
    console.error('Delete approve error:', error);
    res.status(500).json({ message: 'Failed to approve deletion.', error: error.message });
  }
});

// E. Admin Reject Deletion
app.post('/api/admin/data-requests/:id/reject', async (req, res) => {
  try {
    const { adminEmail } = req.body;
    const adminUser = await User.findOne({ email: adminEmail ? adminEmail.toLowerCase() : '' });
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access only.' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    targetUser.deletionRequested = false;
    await targetUser.save();

    // Log Audit
    const audit = new AuditLog({
      action: 'DELETE_REJECT',
      entityType: 'User',
      entityId: targetUser.email,
      performedBy: adminUser.email,
      details: 'Admin rejected data deletion request.'
    });
    await audit.save();

    res.json({ message: 'Deletion request rejected successfully.' });
  } catch (error) {
    console.error('Delete reject error:', error);
    res.status(500).json({ message: 'Failed to reject deletion.', error: error.message });
  }
});
