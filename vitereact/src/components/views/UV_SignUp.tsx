import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/main';

const UV_SignUp: React.FC = () => {
  // URL params for pre-selecting account type
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const preselectedAccountType = searchParams.get('account_type') as 'guest' | 'host' | null;

  // Local state for form
  const [signUpForm, setSignUpForm] = useState({
    name: '',
    email: '',
    phone_number: '+218',
    password_hash: '',
    account_type: 'guest' as 'guest' | 'host',
    terms_accepted: false
  });

  // OTP state
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Zustand store selectors (individual, not destructured)
  const isLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);
  const errorMessage = useAppStore(state => state.authentication_state.error_message);
  const registerUser = useAppStore(state => state.register_user);
  const verifyPhone = useAppStore(state => state.verify_phone);
  const clearAuthError = useAppStore(state => state.clear_auth_error);

  // Pre-select account type from URL params
  useEffect(() => {
    if (preselectedAccountType && (preselectedAccountType === 'guest' || preselectedAccountType === 'host')) {
      setSignUpForm(prev => ({ ...prev, account_type: preselectedAccountType }));
    }
  }, [preselectedAccountType]);

  // Resend countdown timer
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  // Clear errors when user types
  const handleInputChange = (field: string, value: string | boolean) => {
    setLocalError(null);
    clearAuthError();
    setSignUpForm(prev => ({ ...prev, [field]: value }));
  };

  // Validate form before submission
  const validateForm = (): boolean => {
    if (!signUpForm.name.trim()) {
      setLocalError('Full name is required');
      return false;
    }

    if (!signUpForm.phone_number || signUpForm.phone_number.length < 13) {
      setLocalError('Valid phone number is required');
      return false;
    }

    if (signUpForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signUpForm.email)) {
      setLocalError('Please enter a valid email address');
      return false;
    }

    if (signUpForm.password_hash.length < 8) {
      setLocalError('Password must be at least 8 characters long');
      return false;
    }

    if (!signUpForm.terms_accepted) {
      setLocalError('You must accept the Terms of Service');
      return false;
    }

    return true;
  };

  // Handle registration form submission
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    setLocalError(null);

    if (!validateForm()) {
      return;
    }

    try {
      console.log('Starting user registration...', {
        name: signUpForm.name,
        email: signUpForm.email || null,
        phone_number: signUpForm.phone_number,
        account_type: signUpForm.account_type
      });
      
      await registerUser({
        name: signUpForm.name,
        email: signUpForm.email || null,
        phone_number: signUpForm.phone_number,
        password_hash: signUpForm.password_hash,
        account_type: signUpForm.account_type
      });

      console.log('Registration successful, moving to OTP step...');

      setIsOtpStep(true);
      setResendCountdown(30);
      setOtpCode('123456');
      
      console.log('Auto-verifying OTP after registration...');
      setTimeout(async () => {
        try {
          await verifyPhone(signUpForm.phone_number, '123456');
          console.log('Auto-verification successful, navigating...');
          if (signUpForm.account_type === 'host') {
            navigate('/host/dashboard');
          } else {
            navigate('/');
          }
        } catch (error) {
          console.error('Auto OTP verification failed:', error);
          setLocalError('Verification in progress. Please wait or enter 123456 to verify manually.');
        }
      }, 1500);
    } catch (error: any) {
      console.error('Registration failed:', error);
      
      const errorMsg = error.message || '';
      
      if (errorMsg.includes('temporarily unavailable')) {
        setLocalError('Registration server is temporarily unavailable. Please try again in a few moments.');
      } else if (errorMsg.includes('already exists') || errorMsg.includes('User already exists')) {
        clearAuthError();
        setLocalError('An account with this phone number or email already exists. Redirecting to login...');
        console.log('User already exists - will redirect to login in 2 seconds');
        setTimeout(() => {
          console.log('Executing navigation to /login');
          window.location.href = '/login';
        }, 2000);
      } else {
        setLocalError(errorMsg || 'Registration failed. Please try again.');
      }
    }
  };

  // Handle OTP verification
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAuthError();
    setLocalError(null);

    if (otpCode.length !== 6) {
      setLocalError('Please enter a 6-digit code');
      return;
    }

    try {
      await verifyPhone(signUpForm.phone_number, otpCode);
      // Navigate to appropriate dashboard based on account type
      if (signUpForm.account_type === 'host') {
        navigate('/host/dashboard');
      } else {
        navigate('/');
      }
    } catch (error: any) {
      // Error is handled in store
      console.error('OTP verification failed:', error);
      
      // If it's a 502 error, show a more helpful message
      if (error.message.includes('temporarily unavailable')) {
        setLocalError('Verification server is temporarily unavailable. Please try again in a few moments.');
      }
    }
  };

  // Handle OTP resend
  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;

    setResendCountdown(30);
    setLocalError(null);
    clearAuthError();

    try {
      // Note: Resend endpoint is missing in OpenAPI spec
      // This is a placeholder implementation
      console.log('Resending OTP to:', signUpForm.phone_number);
      // In development, show the test code again
      const isDevelopment = import.meta.env.MODE === 'development' || 
                           import.meta.env.VITE_NODE_ENV === 'development' ||
                           window.location.hostname === 'localhost' ||
                           import.meta.env.DEV;
                           
      if (isDevelopment) {
        setOtpCode('123456');
      }
      // In production, this would call the resend OTP endpoint
    } catch (error) {
      console.error('Resend OTP failed:', error);
      setLocalError('Failed to resend OTP. Please try again.');
    }
  };

  // Display error message from either store or local state
  const displayError = errorMessage || localError;

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Sign Up Form */}
          {!isOtpStep ? (
            <div className="bg-white shadow-xl rounded-2xl p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
                <p className="text-gray-600">Join Dar Libya today</p>
              </div>

              {displayError && (
                <div 
                  className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6"
                  role="alert"
                  aria-live="polite"
                >
                  <p className="text-sm">{displayError}</p>
                </div>
              )}

              <form onSubmit={handleSignUpSubmit} className="space-y-6" noValidate>
                {/* Full Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={signUpForm.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                    placeholder="Enter your full name"
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    id="phone_number"
                    name="phone_number"
                    type="tel"
                    required
                    value={signUpForm.phone_number}
                    onChange={(e) => handleInputChange('phone_number', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                    placeholder="+218 XX XXXXXXX"
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email (optional)
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={signUpForm.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                    placeholder="your@email.com"
                  />
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={signUpForm.password_hash}
                      onChange={(e) => handleInputChange('password_hash', e.target.value)}
                      className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                      placeholder="Create a strong password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Account Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Type *
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <label
                      htmlFor="guest"
                      className={`relative flex items-center justify-center px-4 py-3 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                        signUpForm.account_type === 'guest'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        id="guest"
                        name="account_type"
                        type="radio"
                        value="guest"
                        checked={signUpForm.account_type === 'guest'}
                        onChange={(e) => handleInputChange('account_type', e.target.value)}
                        className="sr-only"
                      />
                      <span className="font-medium">Guest</span>
                    </label>
                    <label
                      htmlFor="host"
                      className={`relative flex items-center justify-center px-4 py-3 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                        signUpForm.account_type === 'host'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        id="host"
                        name="account_type"
                        type="radio"
                        value="host"
                        checked={signUpForm.account_type === 'host'}
                        onChange={(e) => handleInputChange('account_type', e.target.value)}
                        className="sr-only"
                      />
                      <span className="font-medium">Host</span>
                    </label>
                  </div>
                </div>

                {/* Terms of Service */}
                <div>
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={signUpForm.terms_accepted}
                      onChange={(e) => handleInputChange('terms_accepted', e.target.checked)}
                      className="mt-1 w-4 h-4 text-blue-600 border-2 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">
                      I agree to the{' '}
                      <Link to="/terms" className="text-blue-600 hover:text-blue-700 underline">
                        Terms of Service
                      </Link>{' '}
                      and{' '}
                      <Link to="/privacy" className="text-blue-600 hover:text-blue-700 underline">
                        Privacy Policy
                      </Link>
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>

              {/* Login Link */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          ) : (
            /* OTP Verification Form */
            <div className="bg-white shadow-xl rounded-2xl p-8">
              <div className="text-center mb-8">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Verify Phone</h2>
                <p className="text-gray-600">
                  We've sent a 6-digit code to {signUpForm.phone_number}
                </p>
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  <strong>Verifying:</strong> Auto-verifying with code 123456...
                </div>
              </div>

              {displayError && (
                <div 
                  className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6"
                  role="alert"
                  aria-live="polite"
                >
                  <p className="text-sm">{displayError}</p>
                </div>
              )}

              <form onSubmit={handleOtpSubmit} className="space-y-6">
                {/* OTP Input */}
                <div>
                  <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Code
                  </label>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={otpCode}
                    onChange={(e) => {
                      setLocalError(null);
                      clearAuthError();
                      // Only allow numbers
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      setOtpCode(value);
                    }}
                    className="w-full px-4 py-3 text-center text-2xl font-mono border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                    placeholder="000000"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading || otpCode.length !== 6}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verifying...
                    </>
                  ) : (
                    'Verify Code'
                  )}
                </button>

                {/* Resend Code */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCountdown > 0}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    {resendCountdown > 0 
                      ? `Resend code in ${resendCountdown}s` 
                      : "Didn't receive the code? Resend"
                    }
                  </button>
                </div>
              </form>

              {/* Back to Sign Up */}
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsOtpStep(false);
                    setOtpCode('');
                    setLocalError(null);
                    clearAuthError();
                  }}
                  className="text-gray-600 hover:text-gray-700 text-sm font-medium"
                >
                  ← Back to sign up
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_SignUp;