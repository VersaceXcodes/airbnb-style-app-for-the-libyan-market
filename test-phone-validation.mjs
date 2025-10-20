const API_URL = 'https://123airbnb-style-app-for-the-libyan-market.launchpulse.ai';

const testCases = [
  {
    name: 'Test with spaces (+218 91 1234567)',
    phone: '+218 91 1234567',
    email: 'test1@example.com'
  },
  {
    name: 'Test without spaces (+218911234567)',
    phone: '+218911234567',
    email: 'test2@example.com'
  },
  {
    name: 'Test local format (0911234567)',
    phone: '0911234567',
    email: 'test3@example.com'
  },
  {
    name: 'Test short format (91 1234567)',
    phone: '91 1234567',
    email: 'test4@example.com'
  }
];

async function testRegistration(testCase) {
  console.log(`\n${testCase.name}`);
  console.log(`Phone: "${testCase.phone}"`);
  console.log(`Digits only: "${testCase.phone.replace(/\D/g, '')}" (${testCase.phone.replace(/\D/g, '').length} digits)`);
  
  try {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test User',
        email: testCase.email,
        phone_number: testCase.phone,
        password_hash: 'TestPass123!',
        account_type: 'guest'
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS - Registration accepted');
      console.log(`   User ID: ${data.user?.id}`);
    } else {
      console.log(`❌ FAILED - Status ${response.status}`);
      console.log(`   Error: ${data.message || data.error || JSON.stringify(data)}`);
    }
  } catch (error) {
    console.log(`❌ ERROR - ${error.message}`);
  }
}

async function runTests() {
  console.log('Testing Phone Number Validation');
  console.log('='.repeat(60));
  
  for (const testCase of testCases) {
    await testRegistration(testCase);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Tests complete!');
}

runTests().catch(console.error);
