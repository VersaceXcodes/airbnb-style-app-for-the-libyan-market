// This simulates the exact test case from the browser testing failure
const API_URL = 'https://123airbnb-style-app-for-the-libyan-market.launchpulse.ai';

console.log('='.repeat(70));
console.log('SIMULATING EXACT BROWSER TEST SCENARIO');
console.log('='.repeat(70));
console.log('\nTest Case: Create Booking Request (Registration Step)');
console.log('User: test.signup@example.com');
console.log('Phone formats attempted:');
console.log('  - 911234567');
console.log('  - +218 91 1234567');
console.log('  - 91 1234567');
console.log('  - 218911234567');
console.log('  - 0911234567');
console.log('');

async function testRegistration(email, phone) {
  console.log(`\nTesting: ${phone}`);
  console.log(`  Digits: ${phone.replace(/\D/g, '')} (${phone.replace(/\D/g, '').length} digits)`);
  
  try {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test User',
        email: email,
        phone_number: phone,
        password_hash: 'TestPass123!',
        account_type: 'guest'
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log(`  ✅ SUCCESS - User created with ID: ${data.user?.id}`);
      return true;
    } else if (response.status === 409) {
      console.log(`  ⚠️  User already exists (this is OK - means format is valid)`);
      return true;
    } else {
      console.log(`  ❌ FAILED - Status ${response.status}`);
      console.log(`     Error: ${data.message || JSON.stringify(data)}`);
      return false;
    }
  } catch (error) {
    console.log(`  ❌ ERROR - ${error.message}`);
    return false;
  }
}

async function runTest() {
  const formats = [
    '911234567',
    '+218 91 1234567',
    '91 1234567',
    '218911234567',
    '0911234567'
  ];
  
  console.log('-'.repeat(70));
  console.log('TESTING ALL FORMATS');
  console.log('-'.repeat(70));
  
  let passCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < formats.length; i++) {
    const email = `test.signup${i}@example.com`;
    const result = await testRegistration(email, formats[i]);
    if (result) passCount++;
    else failCount++;
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('RESULTS');
  console.log('='.repeat(70));
  console.log(`Total formats tested: ${formats.length}`);
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  
  if (failCount === 0) {
    console.log('\n🎉 SUCCESS! All phone formats are now accepted!');
    console.log('The browser test blocking issue has been RESOLVED.');
  } else {
    console.log('\n⚠️  Some formats still failing. Additional fixes needed.');
  }
  console.log('='.repeat(70));
}

runTest().catch(console.error);
