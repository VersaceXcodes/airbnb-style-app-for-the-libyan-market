# Quick Start - E2E Auth Tests

## 🚀 Run Tests in 3 Steps

### Step 1: Start Backend
```bash
cd /app/backend
npm run dev
```
**Wait for**: `Server running on port 3000`

### Step 2: Run Tests
```bash
cd /app/vitereact
npm run test:e2e
```

### Step 3: Check Results
You should see:
```
✓ src/__tests__/auth.e2e.test.tsx (9 tests) 45-60s
  ✓ Auth E2E Flow (Real API)
    ✓ Registration Flow
      ✓ registers a new user successfully with unique email
      ✓ shows validation error for invalid email format
      ✓ shows error for duplicate email
    ✓ Login Flow
      ✓ logs in successfully with valid credentials
      ✓ shows error for invalid credentials
      ✓ shows validation error for empty fields
    ✓ Logout Flow
      ✓ logs out successfully after login
    ✓ Complete Register -> Logout -> Login Flow
      ✓ registers, logs out, and logs back in successfully
    ✓ Phone Number Login
      ✓ logs in with phone number instead of email

Test Files  1 passed (1)
     Tests  9 passed (9)
```

---

## 📋 What Gets Tested

| Test | What It Does |
|------|--------------|
| ✅ Register | Creates new user with unique `user{timestamp}@example.com` |
| ✅ Login Email | Logs in with `john.doe@email.com / password123` |
| ✅ Login Phone | Logs in with `+1234567890 / password123` |
| ✅ Logout | Clears auth state and token |
| ✅ Full Cycle | Register → Logout → Login with same credentials |
| ✅ Validations | Empty fields, invalid email, duplicate users |

---

## 🔍 Verify Backend Is Ready

```bash
# Should return: {"status":"ok","timestamp":"..."}
curl http://localhost:3000/api/health
```

---

## 🐛 Common Issues

### "ECONNREFUSED"
❌ **Problem**: Backend not running  
✅ **Fix**: `cd /app/backend && npm run dev`

### "Invalid credentials"
❌ **Problem**: Test users not in database  
✅ **Fix**: Check `/app/backend/db.sql` was loaded

### Test Timeout
❌ **Problem**: Database or API slow  
✅ **Fix**: Already set to 30s, check network/DB performance

---

## 📊 Test Details

**Location**: `/app/vitereact/src/__tests__/auth.e2e.test.tsx`  
**Type**: Real API E2E (no mocks)  
**Duration**: ~45-60 seconds  
**Dependencies**: Backend must be running  

**Store Checked**: 
- `authentication_state.authentication_status.is_authenticated`
- `authentication_state.auth_token`
- `authentication_state.current_user`

---

## 🎯 Alternative Run Commands

```bash
# Watch mode (re-run on file changes)
npm test

# With UI dashboard
npm run test:ui

# Verbose output
npx vitest run src/__tests__/auth.e2e.test.tsx --reporter=verbose

# Single test by name
npx vitest -t "registers a new user"
```

---

## 📚 More Info

- Full documentation: `TEST_README.md`
- Implementation details: `TESTS_SUMMARY.md`
- Backend API: `/app/backend/server.ts` (lines 175-299)
- Store: `/app/vitereact/src/store/main.tsx` (lines 140-208)

---

**Ready to test!** 🎉
