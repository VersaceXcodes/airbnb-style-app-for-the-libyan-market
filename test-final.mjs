const API_URL = 'https://123airbnb-style-app-for-the-libyan-market.launchpulse.ai';

async function testPhone(phone) {
  const timestamp = Date.now();
  console.log(`\nTesting: "${phone}"`);
  
  try {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: `test${timestamp}@example.com`,
        phone_number: phone,
        password_hash: 'TestPass123!',
        account_type: 'guest'
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ SUCCESS`);
      return true;
    } else {
      console.log(`❌ FAILED - Status ${response.status}`);
      console.log(`   ${data.message}`);
      if (data.details) {
        console.log(`   Details: ${JSON.stringify(data.details.message).substring(0, 100)}`);
      }
      return false;
    }
  } catch (error) {
    console.log(`❌ ERROR - ${error.message}`);
    return false;
  }
}

console.log('Testing ALL browser test formats:\n');
const formats = ['911234567', '+218 91 1234567', '91 1234567', '218911234567', '0911234567'];

for (const phone of formats) {
  await testPhone(phone);
  await new Promise(r => setTimeout(r, 500));
}
