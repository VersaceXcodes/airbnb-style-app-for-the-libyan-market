const API_URL = 'https://123airbnb-style-app-for-the-libyan-market.launchpulse.ai';

async function testPhone(phone) {
  console.log(`\nTesting: "${phone}"`);
  const digits = phone.replace(/\D/g, '');
  console.log(`Digits: "${digits}" (length: ${digits.length})`);
  console.log(`String length: ${phone.length}`);
  
  try {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Debug Test',
        email: `debug${Date.now()}@example.com`,
        phone_number: phone,
        password_hash: 'TestPass123!',
        account_type: 'guest'
      })
    });
    
    const data = await response.json();
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

testPhone('911234567');
