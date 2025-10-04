import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/store/main';

const UV_Login: React.FC = () => {
  // Local form state
  const [loginForm, setLoginForm] = useState({
    identifier: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    identifier?: string;
    password?: string;
  }>({});

  // Navigation
  const navigate = useNavigate();

  // Global state - CRITICAL: Individual selectors only
  const isLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);
  const errorMessage = useAppStore(state => state.authentication_state.error_message);
  const loginUser = useAppStore(state => state.login_user);
  const clearAuthError = useAppStore(state => state.clear_auth_error);

  // Clear errors when component unmounts or inputs change
  useEffect(() => {
    return () => {
      clearAuthError();
    };
  }, [clearAuthError]);

  // Validate form
  const validateForm = (): boolean => {
    const errors: {
      identifier?: string;
      password?: string;
    } = {};

    if (!loginForm.identifier.trim()) {
      errors.identifier = 'Phone number or email is required';
    } else if (loginForm.identifier.trim().length < 3) {
      errors.identifier = 'Please enter a valid phone number or email';
    }

    if (!loginForm.password) {
      errors.password = 'Password is required';
    } else if (loginForm.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    clearAuthError();
    setFieldErrors({});

    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      await loginUser(loginForm.identifier, loginForm.password);
      
      // On successful login, redirect to home
      navigate('/');
    } catch (error) {
      // Error is handled in the store
      console.error('Login error:', error);
    }
  };

  // Handle input changes
  const handleInputChange = (field: keyof typeof loginForm, value: string) => {
    setLoginForm(prev => ({ ...prev, [field]: value }));
    // Clear field-specific error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    }
    // Clear global auth error when user makes changes
    if (errorMessage) {
      clearAuthError();
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Login Card */}
          <div className="bg-white rounded-xl shadow-xl shadow-gray-200/50 overflow-hidden">
            {/* Header */}
            <div className="px-8 pt-8 pb-6">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-900 leading-tight">
                  Welcome Back
                </h1>
                <p className="mt-2 text-base text-gray-600 leading-relaxed">
                  Sign in to your Dar Libya account
                </p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-6">
              {/* Global Error Message */}
              {errorMessage && (
                <div 
                  className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3"
                  role="alert"
                  aria-live="polite"
                >
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{errorMessage}</p>
                </div>
              )}

              {/* Identifier Field */}
              <div>
                <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number or Email
                </label>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  autoComplete="email tel"
                  value={loginForm.identifier}
                  onChange={(e) => handleInputChange('identifier', e.target.value)}
                  placeholder="Enter your phone number or email"
                  className={`block w-full px-4 py-3 border-2 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none transition-all duration-200 ${
                    fieldErrors.identifier 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  aria-invalid={!!fieldErrors.identifier}
                  aria-describedby={fieldErrors.identifier ? 'identifier-error' : undefined}
                />
                {fieldErrors.identifier && (
                  <p id="identifier-error" className="mt-2 text-sm text-red-600">
                    {fieldErrors.identifier}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={loginForm.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="Enter your password"
                    className={`block w-full px-4 py-3 pr-12 border-2 rounded-lg focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:outline-none transition-all duration-200 ${
                      fieldErrors.password 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p id="password-error" className="mt-2 text-sm text-red-600">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {/* Remember Me */}
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center items-center px-6 py-3 border border-transparent rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </div>

              {/* Forgot Password */}
              <div className="text-center">
                <Link
                  to="/reset-password"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors duration-200"
                >
                  Forgot your password?
                </Link>
              </div>
            </form>
          </div>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="font-medium text-blue-600 hover:text-blue-700 transition-colors duration-200"
              >
                Sign up
              </Link>
            </p>
          </div>

          {/* Brand Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">
              © 2024 Dar Libya. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_Login;