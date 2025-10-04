# E2E Authentication Tests

## Overview

Comprehensive end-to-end authentication tests for the Dar Libya platform using Vitest and React Testing Library.

## Test Coverage

The test suite (`src/__tests__/auth.e2e.test.tsx`) covers:

### 1. Registration Flow
- ✅ New user registration with unique email/phone
- ✅ Email validation
- ✅ Duplicate email detection
- ✅ Form validation errors

### 2. Login Flow
- ✅ Successful login with valid credentials
- ✅ Login with email
- ✅ Login with phone number
- ✅ Invalid credentials error handling
- ✅ Empty field validation

### 3. Logout Flow
- ✅ Logout after successful login
- ✅ State cleanup verification

### 4. Complete Auth Cycle
- ✅ Register → Logout → Login flow
- ✅ State persistence across auth actions

## Prerequisites

1. **Backend Server Running**
   ```bash
   cd backend
   npm run dev  # Backend must be running on http://localhost:3000
   ```

2. **Environment Variables**
   The `.env.test` file should contain:
   ```
   VITE_API_BASE_URL=http://localhost:3000
   ```

3. **Database**
   - PostgreSQL database must be accessible
   - Seed data loaded (for login tests with existing users)

## Running Tests

### Run all E2E auth tests
```bash
npm run test:e2e
```

### Run all tests (watch mode)
```bash
npm test
```

### Run tests with UI
```bash
npm run test:ui
```

### Run specific test file
```bash
npx vitest src/__tests__/auth.e2e.test.tsx
```

## Test Architecture

### Real API Integration
- **NO MOCKING**: Tests use the real backend API
- API endpoint: `${import.meta.env.VITE_API_BASE_URL}/api/auth/*`
- Database interactions are real

### State Management
- Tests verify Zustand store state directly
- Auth state shape from `/app/vitereact/src/store/main.tsx`:
  ```typescript
  authentication_state: {
    current_user: User | null;
    auth_token: string | null;
    authentication_status: {
      is_authenticated: boolean;
      is_loading: boolean;
    };
    error_message: string | null;
  }
  ```

### Unique Test Data
Tests generate unique emails/phones using timestamps to avoid conflicts:
```typescript
const uniqueEmail = `user${Date.now()}@example.com`;
const uniquePhone = `+218${Date.now().toString().slice(-9)}`;
```

### Test Users (from db.sql)
Pre-seeded users for login tests:
- Email: `john.doe@email.com` / Password: `password123`
- Phone: `+1234567890` / Password: `password123`

## Test Patterns

### 1. Component Setup
```typescript
const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

render(<UV_Login />, { wrapper: Wrapper });
```

### 2. Store Cleanup
```typescript
beforeEach(() => {
  localStorage.clear();
  useAppStore.setState((state) => ({
    authentication_state: {
      ...state.authentication_state,
      current_user: null,
      auth_token: null,
      authentication_status: {
        is_authenticated: false,
        is_loading: false,
      },
      error_message: null,
    },
  }));
});
```

### 3. User Interactions
```typescript
const user = userEvent.setup();
await user.type(emailInput, 'test@example.com');
await user.click(submitButton);
```

### 4. State Assertions
```typescript
await waitFor(
  () => {
    const state = useAppStore.getState();
    expect(state.authentication_state.authentication_status.is_authenticated).toBe(true);
    expect(state.authentication_state.auth_token).toBeTruthy();
  },
  { timeout: 20000 }
);
```

## Troubleshooting

### Backend Not Running
**Error**: Network errors, timeout errors  
**Solution**: Ensure backend is running on `http://localhost:3000`
```bash
cd backend && npm run dev
```

### Port Conflicts
**Error**: `EADDRINUSE: address already in use`  
**Solution**: Change port in `.env.test` or kill process on port 3000

### Database Connection Issues
**Error**: Database connection errors  
**Solution**: 
1. Check PostgreSQL is running
2. Verify DATABASE_URL or PGHOST/PGDATABASE/PGUSER/PGPASSWORD in backend/.env
3. Run database migrations if needed

### Test Timeouts
**Error**: Test exceeded timeout  
**Solution**: Increase timeout in test or vitest.config.ts:
```typescript
test('...', async () => {
  // test code
}, 60000); // 60 second timeout
```

### Duplicate User Errors
**Error**: "User already exists"  
**Solution**: Tests use timestamped unique emails, but if tests run very quickly, you may need to add a delay or use a more complex unique ID strategy

## Configuration Files

### vitest.config.ts
```typescript
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'src/__tests__/**/*.{test,spec}.{ts,tsx}'],
    testTimeout: 30000
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### src/test/setup.ts
```typescript
import '@testing-library/jest-dom';
```

### .env.test
```
VITE_API_BASE_URL=http://localhost:3000
```

## API Endpoints Tested

### POST /api/auth/register
- Creates new user
- Returns: `{ user, token }`

### POST /api/auth/login
- Authenticates user
- Accepts: `{ identifier, password }`
- Returns: `{ user, token }`

### GET /api/users/me
- Gets current user profile
- Requires: `Authorization: Bearer <token>`
- Returns: User object

## Future Improvements

- [ ] Add OTP verification tests (requires mock SMS service)
- [ ] Test password reset flow
- [ ] Test token expiration handling
- [ ] Test concurrent login sessions
- [ ] Add visual regression testing
- [ ] Test offline/network failure scenarios
- [ ] Add performance benchmarks for auth flows

## References

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [User Event API](https://testing-library.com/docs/user-event/intro)
- Backend API: `/app/backend/server.ts`
- Zustand Store: `/app/vitereact/src/store/main.tsx`
- Auth Views: `/app/vitereact/src/components/views/UV_Login.tsx`, `UV_SignUp.tsx`
