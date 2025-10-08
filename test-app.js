const https = require('https');

async function testEndpoint(url, description) {
  return new Promise((resolve) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TestBot/1.0)'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`✓ ${description}: ${res.statusCode}`);
        resolve({ url, status: res.statusCode, success: res.statusCode < 400 });
      });
    }).on('error', (err) => {
      console.log(`✗ ${description}: ${err.message}`);
      resolve({ url, status: 0, success: false, error: err.message });
    });
  });
}

async function runTests() {
  console.log('Testing application endpoints...\n');
  
  const tests = [
    ['https://123airbnb-style-app-for-the-libyan-market.launchpulse.ai/', 'Homepage'],
    ['https://123airbnb-style-app-for-the-libyan-market.launchpulse.ai/api/villas?limit=1', 'Villas API'],
    ['https://123airbnb-style-app-for-the-libyan-market.launchpulse.ai/api/amenities', 'Amenities API'],
    ['https://123airbnb-style-app-for-the-libyan-market.launchpulse.ai/assets/index-CAu0bkPZ.js', 'Main JS Bundle'],
    ['https://123airbnb-style-app-for-the-libyan-market.launchpulse.ai/assets/index-DuJt5ZDB.css', 'Main CSS'],
  ];
  
  for (const [url, desc] of tests) {
    await testEndpoint(url, desc);
  }
  
  console.log('\nAll tests completed.');
}

runTests();
