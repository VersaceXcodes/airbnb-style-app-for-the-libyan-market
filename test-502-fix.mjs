#!/usr/bin/env node

const API_BASE = 'http://localhost:3000';

const tests = [
  {
    name: 'Health Check',
    url: `${API_BASE}/api/health`,
    validate: (data) => data.status === 'ok' && data.database === 'connected'
  },
  {
    name: 'Featured Villas',
    url: `${API_BASE}/api/villas?limit=6`,
    validate: (data) => Array.isArray(data) && data.length > 0
  },
  {
    name: 'Search for Tripoli (English)',
    url: `${API_BASE}/api/villas?location=Tripoli&num_guests=1`,
    validate: (data) => Array.isArray(data) && data.length >= 2
  },
  {
    name: 'Search for Benghazi (English)',
    url: `${API_BASE}/api/villas?location=Benghazi&num_guests=1`,
    validate: (data) => Array.isArray(data) && data.length >= 1
  },
  {
    name: 'Get Amenities',
    url: `${API_BASE}/api/amenities`,
    validate: (data) => Array.isArray(data) && data.length > 0
  }
];

console.log('🧪 Testing 502 Bad Gateway Fix\n');

let passed = 0;
let failed = 0;

for (const test of tests) {
  process.stdout.write(`Testing: ${test.name}... `);
  
  try {
    const response = await fetch(test.url);
    
    if (response.status === 502) {
      console.log('❌ FAILED - 502 Bad Gateway');
      failed++;
      continue;
    }
    
    if (!response.ok) {
      console.log(`❌ FAILED - Status ${response.status}`);
      failed++;
      continue;
    }
    
    const data = await response.json();
    
    if (test.validate(data)) {
      console.log('✅ PASSED');
      passed++;
    } else {
      console.log('❌ FAILED - Validation failed');
      console.log('   Response:', JSON.stringify(data).substring(0, 100));
      failed++;
    }
  } catch (error) {
    console.log(`❌ FAILED - ${error.message}`);
    failed++;
  }
}

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('✅ All tests passed! The 502 issue is fixed.');
  process.exit(0);
} else {
  console.log('❌ Some tests failed. Please review the errors above.');
  process.exit(1);
}
