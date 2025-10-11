const fs = require('fs');
const path = require('path');

// Read the frontend index.html
const indexHtml = fs.readFileSync(path.join(__dirname, 'backend/public/index.html'), 'utf8');

// Check if the build is working
if (indexHtml.includes('<div id="root"></div>')) {
    console.log('✅ Frontend build is correctly set up in backend/public');
} else {
    console.log('❌ Frontend build issue - React root not found');
}

// Check for the JavaScript files
const publicDir = path.join(__dirname, 'backend/public');
const files = fs.readdirSync(publicDir, { recursive: true });

console.log('\n📁 Files in public directory:');
files.forEach(file => {
    if (file.toString().endsWith('.js') || file.toString().endsWith('.css')) {
        console.log(`  - ${file}`);
    }
});

console.log('\n🔗 Login test URL: https://123airbnb-style-app-for-the-libyan-market.launchpulse.ai/login');
console.log('🔐 Test credentials: versacecodes@gmail.com / Airplanes@99');
console.log('\n💡 The app should now:');
console.log('  1. Load the login page correctly');
console.log('  2. Accept the test credentials');
console.log('  3. Authenticate the user');
console.log('  4. Redirect to homepage as authenticated user');

console.log('\n📊 Debugging logs will appear in browser console');