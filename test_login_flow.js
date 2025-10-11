const https = require('https');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: responseData
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

async function testLoginFlow() {
  console.log('🧪 Testing Login Flow');
  console.log('====================');
  
  try {
    // Test 1: Check if homepage loads
    console.log('1. Testing homepage...');
    const homepageResponse = await makeRequest({
      hostname: '123airbnb-style-app-for-the-libyan-market.launchpulse.ai',
      port: 443,
      path: '/',
      method: 'GET'
    });
    
    if (homepageResponse.statusCode === 200) {
      console.log('   ✅ Homepage loads successfully');
    } else {
      console.log(`   ❌ Homepage failed: ${homepageResponse.statusCode}`);
    }
    
    // Test 2: Check if login page loads
    console.log('2. Testing login page...');
    const loginPageResponse = await makeRequest({
      hostname: '123airbnb-style-app-for-the-libyan-market.launchpulse.ai',
      port: 443,
      path: '/login',
      method: 'GET'
    });
    
    if (loginPageResponse.statusCode === 200) {
      console.log('   ✅ Login page loads successfully');
    } else {
      console.log(`   ❌ Login page failed: ${loginPageResponse.statusCode}`);
    }
    
    // Test 3: Check if JavaScript assets load correctly
    console.log('3. Testing JavaScript assets...');
    const jsAssetResponse = await makeRequest({
      hostname: '123airbnb-style-app-for-the-libyan-market.launchpulse.ai',
      port: 443,
      path: '/assets/index-B8riAOMF.js',
      method: 'HEAD'
    });
    
    if (jsAssetResponse.statusCode === 200 && jsAssetResponse.headers['content-type'] === 'application/javascript') {
      console.log('   ✅ JavaScript assets load with correct MIME type');
    } else {
      console.log(`   ❌ JavaScript asset failed: ${jsAssetResponse.statusCode}, MIME: ${jsAssetResponse.headers['content-type']}`);
    }
    
    // Test 4: Test login API
    console.log('4. Testing login API...');
    const loginResponse = await makeRequest({
      hostname: '123airbnb-style-app-for-the-libyan-market.launchpulse.ai',
      port: 443,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(JSON.stringify({
          identifier: 'versacecodes@gmail.com',
          password: 'Airplanes@99'
        }))
      }
    }, JSON.stringify({
      identifier: 'versacecodes@gmail.com',
      password: 'Airplanes@99'
    }));
    
    if (loginResponse.statusCode === 200) {
      const responseData = JSON.parse(loginResponse.body);
      if (responseData.user && responseData.token) {
        console.log('   ✅ Login API works correctly');
        console.log(`      User: ${responseData.user.name} (${responseData.user.email})`);
      } else {
        console.log('   ❌ Login API response missing user or token');
      }
    } else {
      console.log(`   ❌ Login API failed: ${loginResponse.statusCode}`);
      console.log(`      Response: ${loginResponse.body}`);
    }
    
    console.log('');
    console.log('🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testLoginFlow();