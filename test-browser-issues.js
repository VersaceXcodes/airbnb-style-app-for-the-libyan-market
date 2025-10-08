#!/usr/bin/env node
/**
 * Comprehensive Browser Testing Script
 * Tests for common issues that cause browser errors during testing
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'https://123airbnb-style-app-for-the-libyan-market.launchpulse.ai';

// Test results storage
const results = {
  passed: 0,
  failed: 0,
  errors: []
};

function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}${details ? ' - ' + details : ''}`);
  
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
    results.errors.push(`${name}: ${details}`);
  }
}

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = res.headers['content-type']?.includes('application/json') ? JSON.parse(data) : data;
          resolve({ statusCode: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: data, headers: res.headers, parseError: e.message });
        }
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => req.destroy(new Error('Request timeout')));
    
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function testHealthEndpoint() {
  try {
    const response = await makeRequest(`${BASE_URL}/api/health`);
    const passed = response.statusCode === 200 && response.data.status === 'ok' && response.data.database === 'connected';
    logTest('Health Endpoint', passed, passed ? 'Server and DB connected' : `Status: ${response.statusCode}, DB: ${response.data?.database}`);
  } catch (error) {
    logTest('Health Endpoint', false, `Connection failed: ${error.message}`);
  }
}

async function testCORSHeaders() {
  try {
    const response = await makeRequest(`${BASE_URL}/api/amenities`, {
      method: 'OPTIONS',
      headers: {
        'Origin': BASE_URL,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    const corsHeaders = response.headers['access-control-allow-origin'] || response.headers['access-control-allow-credentials'];
    const passed = !!corsHeaders;
    logTest('CORS Configuration', passed, passed ? 'CORS headers present' : 'Missing CORS headers');
  } catch (error) {
    logTest('CORS Configuration', false, `CORS test failed: ${error.message}`);
  }
}

async function testAPIEndpoints() {
  const endpoints = [
    { path: '/api/amenities', method: 'GET', expectedStatus: 200 },
    { path: '/api/villas', method: 'GET', expectedStatus: 200 },
    { path: '/api/auth/login', method: 'POST', expectedStatus: 400, body: '{}' },
    { path: '/api/nonexistent', method: 'GET', expectedStatus: 404 }
  ];

  for (const endpoint of endpoints) {
    try {
      const options = {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' }
      };
      
      if (endpoint.body) {
        options.body = endpoint.body;
      }
      
      const response = await makeRequest(`${BASE_URL}${endpoint.path}`, options);
      const passed = response.statusCode === endpoint.expectedStatus;
      logTest(`API ${endpoint.method} ${endpoint.path}`, passed, `Expected ${endpoint.expectedStatus}, got ${response.statusCode}`);
      
      // Check JSON parsing for API endpoints
      if (endpoint.path.startsWith('/api/') && !response.parseError && response.statusCode < 500) {
        logTest(`JSON Response ${endpoint.path}`, true, 'Valid JSON returned');
      } else if (response.parseError && endpoint.path.startsWith('/api/')) {
        logTest(`JSON Response ${endpoint.path}`, false, `Parse error: ${response.parseError}`);
      }
    } catch (error) {
      logTest(`API ${endpoint.method} ${endpoint.path}`, false, `Request failed: ${error.message}`);
    }
  }
}

async function testStaticFiles() {
  try {
    const response = await makeRequest(`${BASE_URL}/`);
    const passed = response.statusCode === 200 && response.data.includes('<div id="root">');
    logTest('Frontend Static Files', passed, passed ? 'React app served correctly' : 'Frontend not serving properly');
  } catch (error) {
    logTest('Frontend Static Files', false, `Static file test failed: ${error.message}`);
  }
}

async function testAuthFlow() {
  try {
    // Test registration with invalid data
    const regResponse = await makeRequest(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test',
        email: 'invalid-email',
        phone_number: '+1234567890',
        password_hash: 'test123'
      })
    });
    
    const passed = regResponse.statusCode === 400 || regResponse.statusCode === 409;
    logTest('Auth Validation', passed, `Registration validation working: ${regResponse.statusCode}`);
    
    // Test login with invalid credentials
    const loginResponse = await makeRequest(`${BASE_URL}/api/auth/login`, {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'nonexistent@test.com',
        password: 'wrongpass'
      })
    });
    
    const loginPassed = loginResponse.statusCode === 401;
    logTest('Auth Error Handling', loginPassed, `Login error handling: ${loginResponse.statusCode}`);
  } catch (error) {
    logTest('Auth Flow', false, `Auth test failed: ${error.message}`);
  }
}

async function testErrorHandling() {
  try {
    // Test malformed JSON
    const response = await makeRequest(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"invalid": json}'
    });
    
    const passed = response.statusCode === 400;
    logTest('Malformed JSON Handling', passed, `Handles bad JSON: ${response.statusCode}`);
  } catch (error) {
    logTest('Malformed JSON Handling', false, `Error handling test failed: ${error.message}`);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Browser Testing Diagnostics...\n');
  
  await testHealthEndpoint();
  await testCORSHeaders();
  await testAPIEndpoints();
  await testStaticFiles();
  await testAuthFlow();
  await testErrorHandling();
  
  console.log('\n📊 Test Results Summary:');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`🎯 Total: ${results.passed + results.failed}`);
  
  if (results.errors.length > 0) {
    console.log('\n🔍 Issues Found:');
    results.errors.forEach(error => console.log(`   • ${error}`));
  } else {
    console.log('\n🎉 All tests passed! No obvious issues detected.');
  }
  
  console.log('\n💡 Recommendations:');
  if (results.failed === 0) {
    console.log('   • The application appears to be functioning correctly');
    console.log('   • Browser errors may be intermittent or environment-specific');
    console.log('   • Check browser developer tools for client-side JavaScript errors');
    console.log('   • Verify network connectivity and DNS resolution');
  } else {
    console.log('   • Review the failed tests above');
    console.log('   • Check server logs for additional error details');
    console.log('   • Verify environment variables and configuration');
  }
}

// Run the tests
runAllTests().catch(console.error);