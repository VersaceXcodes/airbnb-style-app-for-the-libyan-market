const axios = require('axios');

async function testLogin() {
  try {
    console.log('Testing login functionality...');
    
    // Test login with valid credentials
    const loginResponse = await axios.post('https://123airbnb-style-app-for-the-libyan-market.launchpulse.ai/api/auth/login', {
      identifier: 'versacecodes@gmail.com',
      password: 'Airplanes@99'
    });
    
    console.log('Login successful!');
    console.log('User:', loginResponse.data.user);
    console.log('Token length:', loginResponse.data.token.length);
    
    // Test fetching user profile with the token
    const profileResponse = await axios.get('https://123airbnb-style-app-for-the-libyan-market.launchpulse.ai/api/users/me', {
      headers: {
        Authorization: `Bearer ${loginResponse.data.token}`
      }
    });
    
    console.log('Profile fetch successful!');
    console.log('Profile:', profileResponse.data);
    
    return true;
  } catch (error) {
    console.error('Login test failed:', error.response?.data || error.message);
    return false;
  }
}

testLogin().then(success => {
  process.exit(success ? 0 : 1);
});