#!/usr/bin/env node

// Test script to verify registration API works correctly

async function testRegistration() {
  const testUser = {
    name: "Test User",
    email: "test@example.com",
    phone_number: "+218912345678",
    password_hash: "testpassword123",
    account_type: "guest"
  };

  try {
    console.log("Testing user registration...");
    
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testUser)
    });

    const data = await response.json();
    
    if (response.status === 201) {
      console.log("✅ Registration successful!");
      console.log("User ID:", data.user.id);
      console.log("Phone verified:", data.user.is_phone_verified);
      console.log("Token received:", !!data.token);
      
      // Test OTP verification
      console.log("\nTesting OTP verification...");
      const otpResponse = await fetch('http://localhost:3000/api/auth/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone_number: testUser.phone_number,
          otp: "123456"
        })
      });
      
      if (otpResponse.status === 200) {
        console.log("✅ OTP verification successful!");
        return true;
      } else {
        console.log("❌ OTP verification failed:", await otpResponse.text());
        return false;
      }
    } else if (response.status === 409) {
      console.log("⚠️  User already exists - this is expected for repeated tests");
      return true;
    } else {
      console.log("❌ Registration failed:", data);
      return false;
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    return false;
  }
}

testRegistration();