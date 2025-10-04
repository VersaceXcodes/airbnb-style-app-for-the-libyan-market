import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

const UV_PasswordReset: React.FC = () => {
  const navigate = useNavigate();
  
  // State management
  const [current_step, setCurrentStep] = useState<number>(1);
  const [identifier, setIdentifier] = useState<string>('');
  const [reset_code, setResetCode] = useState<string>('');
  const [new_password, setNewPassword] = useState<string>('');
  const [confirm_password, setConfirmPassword] = useState<string>('');
  const [show_password, setShowPassword] = useState<boolean>(false);
  const [error_message, setErrorMessage] = useState<string | null>(null);
  const [success_message, setSuccessMessage] = useState<string | null>(null);

  // API mutation for sending reset code
  const sendResetCodeMutation = useMutation({
    mutationFn: async (identifier: string) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/forgot-password`,
        { identifier },
        { headers: { 'Content-Type': 'application/json' } }
      );
      return response.data;
    },
    onSuccess: () => {
      setCurrentStep(2);
      setSuccessMessage('Reset code sent successfully. Please check your email or phone.');
      setErrorMessage(null);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to send reset code';
      setErrorMessage(message);
      setSuccessMessage(null);
    }
  });

  // API mutation for verifying code and resetting password
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ token, new_password }: { token: string; new_password: string }) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/reset-password`,
        { token, new_password },
        { headers: { 'Content-Type': 'application/json' } }
      );
      return response.data;
    },
    onSuccess: () => {
      setCurrentStep(3);
      setSuccessMessage('Password reset successfully! You can now login with your new password.');
      setErrorMessage(null);
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to reset password';
      setErrorMessage(message);
      setSuccessMessage(null);
    }
  });

  // Handle Step 1 submission
  const handleSendResetCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    
    if (!identifier.trim()) {
      setErrorMessage('Please enter your email or phone number');
      return;
    }

    sendResetCodeMutation.mutate(identifier);
  };

  // Handle Step 2 submission
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    
    if (!reset_code.trim()) {
      setErrorMessage('Please enter the reset code');
      return;
    }

    if (reset_code.length !== 6) {
      setErrorMessage('Reset code must be 6 digits');
      return;
    }

    // Store code and move to password step
    setCurrentStep(3);
  };

  // Handle Step 3 submission
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    
    if (!new_password) {
      setErrorMessage('Please enter a new password');
      return;
    }

    if (new_password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long');
      return;
    }

    if (new_password !== confirm_password) {
      setErrorMessage('Passwords do not match');
      return;
    }

    resetPasswordMutation.mutate({ token: reset_code, new_password });
  };

  // Handle code input change
  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setResetCode(value);
    setErrorMessage(null);
  };

  // Clear errors on input changes
  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIdentifier(e.target.value);
    setErrorMessage(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewPassword(e.target.value);
    setErrorMessage(null);
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    setErrorMessage(null);
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h1>
            <p className="text-gray-600">
              {current_step === 1 && "Enter your email or phone number to receive a reset code"}
              {current_step === 2 && "Enter the 6-digit code sent to your email or phone"}
              {current_step === 3 && "Create your new password"}
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${current_step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'} text-sm font-medium`}>
                1
              </div>
              <div className={`flex-1 h-1 mx-2 ${current_step >= 2 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${current_step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'} text-sm font-medium`}>
                2
              </div>
              <div className={`flex-1 h-1 mx-2 ${current_step >= 3 ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${current_step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'} text-sm font-medium`}>
                3
              </div>
            </div>
          </div>

          {/* Card Container */}
          <div className="bg-white shadow-lg rounded-xl p-6 lg:p-8">
            {/* Success Message */}
            {success_message && (
              <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md" role="alert">
                <p className="text-sm">{success_message}</p>
              </div>
            )}

            {/* Error Message */}
            {error_message && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md" role="alert">
                <p className="text-sm">{error_message}</p>
              </div>
            )}

            {/* Step 1: Enter Identifier */}
            {current_step === 1 && (
              <form onSubmit={handleSendResetCode} className="space-y-6">
                <div>
                  <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-2">
                    Email or Phone Number
                  </label>
                  <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    value={identifier}
                    onChange={handleIdentifierChange}
                    placeholder="Enter your email or phone number"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                    disabled={sendResetCodeMutation.isPending}
                  />
                </div>

                <button
                  type="submit"
                  disabled={sendResetCodeMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  {sendResetCodeMutation.isPending ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    'Send Reset Code'
                  )}
                </button>
              </form>
            )}

            {/* Step 2: Enter Reset Code */}
            {current_step === 2 && (
              <form onSubmit={handleVerifyCode} className="space-y-6">
                <div>
                  <label htmlFor="reset_code" className="block text-sm font-medium text-gray-700 mb-2">
                    Reset Code
                  </label>
                  <input
                    id="reset_code"
                    name="reset_code"
                    type="text"
                    value={reset_code}
                    onChange={handleCodeChange}
                    placeholder="Enter 6-digit code"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200 text-center text-lg font-mono"
                    maxLength={6}
                  />
                  <p className="mt-2 text-sm text-gray-500">
                    Enter the 6-digit code sent to {identifier}
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Verify Code
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep(1);
                      setResetCode('');
                      setErrorMessage(null);
                    }}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium py-3 px-6 rounded-lg transition-all duration-200 border border-gray-300"
                  >
                    Back
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: Set New Password */}
            {current_step === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div>
                  <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="new_password"
                      name="new_password"
                      type={show_password ? 'text' : 'password'}
                      value={new_password}
                      onChange={handlePasswordChange}
                      placeholder="Enter new password"
                      className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                      disabled={resetPasswordMutation.isPending}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!show_password)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      aria-label={show_password ? 'Hide password' : 'Show password'}
                    >
                      {show_password ? (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    Password must be at least 8 characters long
                  </p>
                </div>

                <div>
                  <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    id="confirm_password"
                    name="confirm_password"
                    type={show_password ? 'text' : 'password'}
                    value={confirm_password}
                    onChange={handleConfirmPasswordChange}
                    placeholder="Confirm new password"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all duration-200"
                    disabled={resetPasswordMutation.isPending}
                  />
                </div>

                <button
                  type="submit"
                  disabled={resetPasswordMutation.isPending}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                >
                  {resetPasswordMutation.isPending ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Resetting...
                    </span>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </form>
            )}

            {/* Success State */}
            {current_step === 3 && success_message && (
              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Go to Login
                </Link>
              </div>
            )}
          </div>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_PasswordReset;