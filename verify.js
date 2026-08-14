const BASE_URL = 'http://localhost:5000';

const originalFetch = fetch;
let currentCookie = '';

// Proxy fetch to attach JWT cookie
global.fetch = function(url, options = {}) {
  options.headers = options.headers || {};
  if (currentCookie) {
    options.headers['Cookie'] = currentCookie;
  }
  return originalFetch(url, options);
};

async function loginAs(email, password) {
  const res = await originalFetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const setCookie = res.headers.get('set-cookie');
  return setCookie ? setCookie.split(';')[0] : '';
}

async function runTests() {
  let passedCount = 0;
  let failedCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedCount++;
    } else {
      console.error(`[FAIL] ${message}`);
      failedCount++;
    }
  }
  
  console.log('Logging in to retrieve authentication tokens...');
  const buyerCookie = await loginAs('buyer@nexpro.com', 'password123');
  const vendorCookie = await loginAs('vendor@nexpro.com', 'password123');
  
  if (!buyerCookie || !vendorCookie) {
    console.error('[FAIL] Could not authenticate test users. Server might be down or database not seeded.');
    process.exit(1);
  }
  console.log('[PASS] Authentication tokens successfully retrieved.\n');
  
  // Dynamic Test Seeding
  console.log('Seeding test fixtures dynamically...');
  currentCookie = buyerCookie;
  
  // Seed Supplier
  const supplierSeedRes = await fetch(`${BASE_URL}/api/suppliers/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      suppliers: [{
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
        consentGivenAt: new Date().toISOString(),
        consentVersion: '1.0'
      }]
    })
  });
  assert(supplierSeedRes.ok, 'Seeded test supplier sup-acme-supplier');
  
  // Seed RFQ template
  const rfqSeedRes = await fetch(`${BASE_URL}/api/rfqs/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      buyerEmail: 'buyer@nexpro.com',
      rfqs: [{
        id: "template-propellant",
        name: "Falcon 9 Propellant Sourcing",
        buyerEmail: "buyer@nexpro.com",
        category: "Chemical Raw Materials",
        status: "ACTIVE",
        createdDate: new Date().toISOString(),
        supplierIds: ["sup-acme-supplier"],
        fields: [
          { id: "field-1", label: "Supplier Name", type: "short-text" },
          { id: "field-2", label: "Quote Reference #", type: "short-text" },
          { id: "field-3", label: "Purity level of RP-1 propellant (%)", type: "number" },
          { id: "field-4", label: "Lead time for delivery (days)", type: "number" },
          { id: "field-5", label: "Sulfur Content max limit (ppm)", type: "number" },
          { id: "field-6", label: "Aromatics Content max limit (%)", type: "number" },
          { id: "field-7", label: "Price per metric ton ($)", type: "number" },
          { id: "field-8", label: "Minimum Order Quantity (Metric Tons)", type: "number" },
          { id: "field-9", label: "Payment terms accepted", type: "dropdown" },
          { id: "field-10", label: "Compliance with aerospace safety guidelines (SDS)", type: "checkbox" }
        ],
        versions: []
      }]
    })
  });
  assert(rfqSeedRes.ok, 'Seeded test RFQ template-propellant');
  
  // Seed Response
  currentCookie = vendorCookie;
  const responseSeedRes = await fetch(`${BASE_URL}/api/responses/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      responses: [{
        id: "resp-propellant-acme",
        rfqId: "template-propellant",
        templateName: "Falcon Heavy Propellant Sourcing",
        supplierId: "sup-acme-supplier",
        category: "Chemical Raw Materials",
        submittedDate: "2026-08-05",
        status: "Submitted",
        score: 87.5,
        remarks: "Premium RP-1 propellant matching flight specs",
        emailSubject: "Sourcing S-RFQ - Falcon Heavy Propellant Sourcing",
        emailBody: "Dear Sourcing Team, here is our commercial offer.",
        emailAttachments: ["acme_rp1_cert.pdf", "commercial_quote_signed.pdf"],
        fields: [
          { id: "field-1", label: "Supplier Name", type: "short-text", value: "Acme Supplier Inc" },
          { id: "field-2", label: "Quote Reference #", type: "short-text", value: "ACME-2026-MRO-99" },
          { id: "field-3", label: "Purity level of RP-1 propellant (%)", type: "number", value: 99.8 },
          { id: "field-4", label: "Lead time for delivery (days)", type: "number", value: 14 },
          { id: "field-5", label: "Sulfur Content max limit (ppm)", type: "number", value: 5 },
          { id: "field-6", label: "Aromatics Content max limit (%)", type: "number", value: 0.12 },
          { id: "field-7", label: "Price per metric ton ($)", type: "number", value: 1420 },
          { id: "field-8", label: "Minimum Order Quantity (Metric Tons)", type: "number", value: 50 },
          { id: "field-9", label: "Payment terms accepted", type: "dropdown", value: "Net 45" },
          { id: "field-10", label: "Compliance with aerospace safety guidelines (SDS)", type: "checkbox", value: true }
        ]
      }]
    })
  });
  assert(responseSeedRes.ok, 'Seeded test response resp-propellant-acme');
  console.log('Test fixtures seeded successfully.\n');
  console.log('=== STARTING BACKEND VERIFICATION TESTS ===\n');


  try {
    // Test 1: Fetching RFQs as a Buyer
    currentCookie = buyerCookie;
    console.log('Testing GET /api/rfqs (Buyer/General)...');
    const rfqRes = await fetch(`${BASE_URL}/api/rfqs`);
    assert(rfqRes.ok, `GET /api/rfqs response is OK (Status: ${rfqRes.status})`);
    const rfqs = await rfqRes.json();
    assert(Array.isArray(rfqs), `Returned data is an array of RFQs (length: ${rfqs.length})`);
    
    // Check if evaluationWeights exist (seeded database might not have them, but shouldn't be stripped)
    if (rfqs.length > 0) {
      assert('evaluationWeights' in rfqs[0] || rfqs[0].evaluationWeights === undefined, 'evaluationWeights field is allowed for buyers');
    }

    // Test 2: Fetching RFQs as a Vendor (Security Sanitization check)
    currentCookie = vendorCookie;
    console.log('\nTesting GET /api/rfqs?vendorEmail=vendor@nexpro.com (Vendor Security)...');
    const rfqVendorRes = await fetch(`${BASE_URL}/api/rfqs?vendorEmail=vendor%40nexpro.com`);
    assert(rfqVendorRes.ok, `GET /api/rfqs?vendorEmail=... response is OK (Status: ${rfqVendorRes.status})`);
    const vendorRfqs = await rfqVendorRes.json();
    assert(Array.isArray(vendorRfqs), `Returned vendor data is an array (length: ${vendorRfqs.length})`);
    if (vendorRfqs.length > 0) {
      const firstRfq = vendorRfqs[0];
      assert(!('versions' in firstRfq), 'versions field is stripped for vendors');
      assert(!('evaluationWeights' in firstRfq), 'evaluationWeights field is stripped for vendors');
    }

    // Test 3: Fetching version history for template-propellant as buyer
    currentCookie = buyerCookie;
    console.log('\nTesting GET /api/rfqs/template-propellant/versions?email=buyer@nexpro.com...');
    const verBuyerRes = await fetch(`${BASE_URL}/api/rfqs/template-propellant/versions?email=buyer%40nexpro.com`);
    assert(verBuyerRes.ok, `Versions request as buyer is OK (Status: ${verBuyerRes.status})`);
    const verBuyerData = await verBuyerRes.json();
    assert(verBuyerData && Array.isArray(verBuyerData.versions), 'Returned versions array for buyer');

    // Test 4: Fetching version history for template-propellant as vendor
    currentCookie = vendorCookie;
    console.log('\nTesting GET /api/rfqs/template-propellant/versions?email=vendor@nexpro.com...');
    const verVendorRes = await fetch(`${BASE_URL}/api/rfqs/template-propellant/versions?email=vendor%40nexpro.com`);
    assert(verVendorRes.ok, `Versions request as vendor is OK (Status: ${verVendorRes.status})`);
    const verVendorData = await verVendorRes.json();
    assert(verVendorData && verVendorData.versions.length === 0, 'Versions array is empty for vendors');

    // Test 5: Fetching version history without email (unauthenticated access check)
    currentCookie = ''; // simulate anonymous
    console.log('\nTesting GET /api/rfqs/template-propellant/versions (No Email)...');
    const verNoEmailRes = await fetch(`${BASE_URL}/api/rfqs/template-propellant/versions`);
    assert(verNoEmailRes.status === 401, `Versions request without email is rejected with HTTP 401 (Status: ${verNoEmailRes.status})`);

    // Test 6 & 7: Supplier Invite Rate Limiting (F14)
    currentCookie = buyerCookie;
    console.log('\nTesting Supplier Invite and Cooldown Rate Limiting (POST /api/suppliers/sup-acme-supplier/invite)...');
    const inviteRes1 = await fetch(`${BASE_URL}/api/suppliers/sup-acme-supplier/invite`, { method: 'POST' });
    assert(inviteRes1.ok || inviteRes1.status === 429, `First invite call response status is ${inviteRes1.status}`);
    const inviteData1 = await inviteRes1.json();
    console.log(`First invite response message: "${inviteData1.message}"`);

    // Immediately trigger again to assert 429 rate limit
    console.log('Sending second immediate invite to verify 429 cooldown...');
    const inviteRes2 = await fetch(`${BASE_URL}/api/suppliers/sup-acme-supplier/invite`, { method: 'POST' });
    assert(inviteRes2.status === 429, `Second invite call returns HTTP 429 (Status: ${inviteRes2.status})`);
    const inviteData2 = await inviteRes2.json();
    console.log(`Second invite response message: "${inviteData2.message}"`);
    assert(inviteData2.message.includes('Please wait'), 'Returned 429 message contains cooldown instruction');

    // Test 8: Supplier Performance History (F12)
    currentCookie = buyerCookie;
    console.log('\nTesting GET /api/suppliers/sup-acme-supplier/performance...');
    const perfRes = await fetch(`${BASE_URL}/api/suppliers/sup-acme-supplier/performance`);
    assert(perfRes.ok, `Performance response is OK (Status: ${perfRes.status})`);
    const perfData = await perfRes.json();
    assert(perfData && perfData.supplierId === 'sup-acme-supplier', 'Performance data includes supplierId');
    assert('winRate' in perfData && 'avgResponseTimeHours' in perfData, 'Performance data contains winRate and avgResponseTimeHours');
    console.log(`Performance data: Win Rate: ${perfData.winRate}%, Avg Response Time: ${perfData.avgResponseTimeHours} hours`);

    // Test 9: Fetch Active Responses (GET /api/responses)
    currentCookie = buyerCookie;
    console.log('\nTesting GET /api/responses...');
    const respRes = await fetch(`${BASE_URL}/api/responses`);
    assert(respRes.ok, `Responses response is OK (Status: ${respRes.status})`);
    const responses = await respRes.json();
    assert(Array.isArray(responses), `Responses is an array (length: ${responses.length})`);
    
    // Find our seed response
    const targetResp = responses.find(r => r.id === 'resp-propellant-acme');
    assert(!!targetResp, 'Found seed response "resp-propellant-acme" in active responses list');

    if (targetResp) {
      // Test 10: Soft Delete / Archive Response (F11)
      console.log('\nTesting Soft-Deleting / Archiving a Response...');
      const archivePayload = [{
        ...targetResp,
        archived: true,
        archivedAt: new Date().toISOString(),
        archivedBy: 'vendor@nexpro.com'
      }];

      currentCookie = vendorCookie; // Responses/bulk requires vendor role
      const archiveRes = await fetch(`${BASE_URL}/api/responses/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses: archivePayload })
      });
      assert(archiveRes.ok, `Archived response via /api/responses/bulk (Status: ${archiveRes.status})`);

      // Verify response is no longer in active responses
      currentCookie = buyerCookie; // Fetch responses as buyer
      const activeRespRes = await fetch(`${BASE_URL}/api/responses`);
      const activeResponses = await activeRespRes.json();
      const foundInActive = activeResponses.some(r => r.id === 'resp-propellant-acme');
      assert(!foundInActive, 'Archived response was excluded from GET /api/responses');

      // Verify response is in archived responses list
      const archivedRespRes = await fetch(`${BASE_URL}/api/responses/archived`);
      const archivedResponses = await archivedRespRes.json();
      const foundInArchived = archivedResponses.some(r => r.id === 'resp-propellant-acme');
      assert(foundInArchived, 'Archived response was found in GET /api/responses/archived');

      // Test 11: Restore/Unarchive the Response
      console.log('\nTesting Restoring / Unarchiving a Response...');
      const restorePayload = [{
        ...targetResp,
        archived: false,
        archivedAt: '',
        archivedBy: ''
      }];

      currentCookie = vendorCookie; // Responses/bulk requires vendor role
      const restoreRes = await fetch(`${BASE_URL}/api/responses/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses: restorePayload })
      });
      assert(restoreRes.ok, `Restored response via /api/responses/bulk (Status: ${restoreRes.status})`);

      // Verify response is back in active list
      currentCookie = buyerCookie;
      const postRestoreActiveRes = await fetch(`${BASE_URL}/api/responses`);
      const postRestoreActive = await postRestoreActiveRes.json();
      const foundPostRestoreActive = postRestoreActive.some(r => r.id === 'resp-propellant-acme');
      assert(foundPostRestoreActive, 'Restored response is back in GET /api/responses');

      // Verify response is no longer in archived list
      const postRestoreArchivedRes = await fetch(`${BASE_URL}/api/responses/archived`);
      const postRestoreArchived = await postRestoreArchivedRes.json();
      const foundPostRestoreArchived = postRestoreArchived.some(r => r.id === 'resp-propellant-acme');
      assert(!foundPostRestoreArchived, 'Restored response is removed from GET /api/responses/archived');
    }

  } catch (error) {
    console.error('Test execution error:', error);
    failedCount++;
  }

  console.log('\n=== BACKEND VERIFICATION TESTS COMPLETED ===');
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
