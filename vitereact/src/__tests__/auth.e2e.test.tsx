import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';

import UV_SignUp from '@/components/views/UV_SignUp';
import UV_Login from '@/components/views/UV_Login';
import { useAppStore } from '@/store/main';

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter future={{
    v7_startTransition: true,
    v7_relativeSplatPath: true
  }}>{children}</BrowserRouter>
);

describe('Auth E2E Flow (Real API)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    
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
      realtime_state: {
        socket: null,
        is_connected: false,
      },
    }));
  });

  describe('Registration Flow', () => {
    it('registers a new user successfully with unique email', async () => {
      const uniqueEmail = `user${Date.now()}@example.com`;
      const uniquePhone = `+218${Date.now().toString().slice(-9)}`;
      const password = 'testpass123';
      const userName = 'Test User';

      render(<UV_SignUp />, { wrapper: Wrapper });

      const nameInput = await screen.findByLabelText(/full name/i);
      const phoneInput = await screen.findByLabelText(/phone number/i);
      const emailInput = await screen.findByLabelText(/email/i);
      const passwordInput = await screen.findByLabelText(/^password/i);
      const termsCheckbox = screen.getByRole('checkbox');
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await waitFor(() => {
        expect(nameInput).not.toBeDisabled();
        expect(phoneInput).not.toBeDisabled();
      });

      const user = userEvent.setup();
      
      await user.clear(phoneInput);
      await user.type(nameInput, userName);
      await user.type(phoneInput, uniquePhone);
      await user.type(emailInput, uniqueEmail);
      await user.type(passwordInput, password);
      await user.click(termsCheckbox);

      await waitFor(() => expect(submitButton).not.toBeDisabled());
      await user.click(submitButton);

      await waitFor(() => expect(screen.getByText(/creating account/i)).toBeInTheDocument());

      await waitFor(
        () => {
          const state = useAppStore.getState();
          expect(state.authentication_state.authentication_status.is_authenticated).toBe(true);
          expect(state.authentication_state.auth_token).toBeTruthy();
          expect(state.authentication_state.current_user).toBeTruthy();
          expect(state.authentication_state.current_user?.email).toBe(uniqueEmail);
        },
        { timeout: 20000 }
      );
    }, 30000);

    it('shows validation error for invalid email format', async () => {
      render(<UV_SignUp />, { wrapper: Wrapper });

      const nameInput = await screen.findByLabelText(/full name/i);
      const phoneInput = await screen.findByLabelText(/phone number/i);
      const emailInput = await screen.findByLabelText(/email/i);
      const passwordInput = await screen.findByLabelText(/^password/i);
      const termsCheckbox = screen.getByRole('checkbox');
      const submitButton = screen.getByRole('button', { name: /create account/i });

      const user = userEvent.setup();
      
      await user.clear(phoneInput);
      await user.type(nameInput, 'Test User');
      await user.type(phoneInput, `+218${Date.now().toString().slice(-9)}`);
      await user.type(emailInput, 'invalid-email');
      await user.type(passwordInput, 'testpass123');
      await user.click(termsCheckbox);

      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
      });
    });

    it('shows error for duplicate email', async () => {
      const duplicateEmail = 'john.doe@email.com';
      const uniquePhone = `+218${Date.now().toString().slice(-9)}`;

      render(<UV_SignUp />, { wrapper: Wrapper });

      const nameInput = await screen.findByLabelText(/full name/i);
      const phoneInput = await screen.findByLabelText(/phone number/i);
      const emailInput = await screen.findByLabelText(/email/i);
      const passwordInput = await screen.findByLabelText(/^password/i);
      const termsCheckbox = screen.getByRole('checkbox');
      const submitButton = screen.getByRole('button', { name: /create account/i });

      const user = userEvent.setup();
      
      await user.clear(phoneInput);
      await user.type(nameInput, 'Test User');
      await user.type(phoneInput, uniquePhone);
      await user.type(emailInput, duplicateEmail);
      await user.type(passwordInput, 'testpass123');
      await user.click(termsCheckbox);

      await user.click(submitButton);

      await waitFor(
        () => {
          expect(screen.getByText(/user already exists/i)).toBeInTheDocument();
        },
        { timeout: 10000 }
      );
    });
  });

  describe('Login Flow', () => {
    it('logs in successfully with valid credentials', async () => {
      const testEmail = 'john.doe@email.com';
      const testPassword = 'password123';

      render(<UV_Login />, { wrapper: Wrapper });

      const emailInput = await screen.findByLabelText(/phone number or email/i);
      const passwordInput = await screen.findByLabelText(/^password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      await waitFor(() => {
        expect(emailInput).not.toBeDisabled();
        expect(passwordInput).not.toBeDisabled();
      });

      const user = userEvent.setup();
      
      await user.type(emailInput, testEmail);
      await user.type(passwordInput, testPassword);

      await waitFor(() => expect(submitButton).not.toBeDisabled());
      await user.click(submitButton);

      await waitFor(() => expect(screen.getByText(/signing in/i)).toBeInTheDocument());

      await waitFor(
        () => {
          const state = useAppStore.getState();
          expect(state.authentication_state.authentication_status.is_authenticated).toBe(true);
          expect(state.authentication_state.auth_token).toBeTruthy();
          expect(state.authentication_state.current_user).toBeTruthy();
        },
        { timeout: 20000 }
      );
    }, 30000);

    it('shows error for invalid credentials', async () => {
      render(<UV_Login />, { wrapper: Wrapper });

      const emailInput = await screen.findByLabelText(/phone number or email/i);
      const passwordInput = await screen.findByLabelText(/^password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      const user = userEvent.setup();
      
      await user.type(emailInput, 'nonexistent@example.com');
      await user.type(passwordInput, 'wrongpassword');

      await user.click(submitButton);

      await waitFor(
        () => {
          expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
        },
        { timeout: 10000 }
      );
    });

    it('shows validation error for empty fields', async () => {
      render(<UV_Login />, { wrapper: Wrapper });

      const submitButton = screen.getByRole('button', { name: /sign in/i });

      const user = userEvent.setup();
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/phone number or email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('Logout Flow', () => {
    it('logs out successfully after login', async () => {
      const testEmail = 'john.doe@email.com';
      const testPassword = 'password123';

      render(<UV_Login />, { wrapper: Wrapper });

      const emailInput = await screen.findByLabelText(/phone number or email/i);
      const passwordInput = await screen.findByLabelText(/^password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      const user = userEvent.setup();
      
      await user.type(emailInput, testEmail);
      await user.type(passwordInput, testPassword);
      await user.click(submitButton);

      await waitFor(
        () => {
          const state = useAppStore.getState();
          expect(state.authentication_state.authentication_status.is_authenticated).toBe(true);
        },
        { timeout: 20000 }
      );

      const logoutUser = useAppStore.getState().logout_user;
      logoutUser();

      await waitFor(() => {
        const state = useAppStore.getState();
        expect(state.authentication_state.authentication_status.is_authenticated).toBe(false);
        expect(state.authentication_state.auth_token).toBeNull();
        expect(state.authentication_state.current_user).toBeNull();
      });
    }, 30000);
  });

  describe('Complete Register -> Logout -> Login Flow', () => {
    it('registers, logs out, and logs back in successfully', async () => {
      const uniqueEmail = `user${Date.now()}@example.com`;
      const uniquePhone = `+218${Date.now().toString().slice(-9)}`;
      const password = 'testpass123';
      const userName = 'Test User Flow';

      render(<UV_SignUp />, { wrapper: Wrapper });

      let user = userEvent.setup();

      const nameInput = await screen.findByLabelText(/full name/i);
      const phoneInput = await screen.findByLabelText(/phone number/i);
      const emailInput = await screen.findByLabelText(/email/i);
      const passwordInput = await screen.findByLabelText(/^password/i);
      const termsCheckbox = screen.getByRole('checkbox');
      const submitButton = screen.getByRole('button', { name: /create account/i });

      await user.clear(phoneInput);
      await user.type(nameInput, userName);
      await user.type(phoneInput, uniquePhone);
      await user.type(emailInput, uniqueEmail);
      await user.type(passwordInput, password);
      await user.click(termsCheckbox);
      await user.click(submitButton);

      await waitFor(
        () => {
          const state = useAppStore.getState();
          expect(state.authentication_state.authentication_status.is_authenticated).toBe(true);
          expect(state.authentication_state.current_user?.email).toBe(uniqueEmail);
        },
        { timeout: 20000 }
      );

      const logoutUser = useAppStore.getState().logout_user;
      logoutUser();

      await waitFor(() => {
        const state = useAppStore.getState();
        expect(state.authentication_state.authentication_status.is_authenticated).toBe(false);
      });

      render(<UV_Login />, { wrapper: Wrapper });

      user = userEvent.setup();

      const loginEmailInput = await screen.findByLabelText(/phone number or email/i);
      const loginPasswordInput = await screen.findByLabelText(/^password/i);
      const loginSubmitButton = screen.getByRole('button', { name: /sign in/i });

      await user.type(loginEmailInput, uniqueEmail);
      await user.type(loginPasswordInput, password);
      await user.click(loginSubmitButton);

      await waitFor(
        () => {
          const state = useAppStore.getState();
          expect(state.authentication_state.authentication_status.is_authenticated).toBe(true);
          expect(state.authentication_state.auth_token).toBeTruthy();
          expect(state.authentication_state.current_user?.email).toBe(uniqueEmail);
        },
        { timeout: 20000 }
      );
    }, 60000);
  });

  describe('Phone Number Login', () => {
    it('logs in with phone number instead of email', async () => {
      const testPhone = '+1234567890';
      const testPassword = 'password123';

      render(<UV_Login />, { wrapper: Wrapper });

      const identifierInput = await screen.findByLabelText(/phone number or email/i);
      const passwordInput = await screen.findByLabelText(/^password/i);
      const submitButton = screen.getByRole('button', { name: /sign in/i });

      const user = userEvent.setup();
      
      await user.type(identifierInput, testPhone);
      await user.type(passwordInput, testPassword);
      await user.click(submitButton);

      await waitFor(
        () => {
          const state = useAppStore.getState();
          expect(state.authentication_state.authentication_status.is_authenticated).toBe(true);
          expect(state.authentication_state.current_user?.phone_number).toBe(testPhone);
        },
        { timeout: 20000 }
      );
    }, 30000);
  });
});
