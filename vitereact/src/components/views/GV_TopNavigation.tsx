import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

const GV_TopNavigation: React.FC = () => {
  const navigate = useNavigate();
  
  // Individual Zustand selectors - CRITICAL to avoid infinite loops
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const unreadCount = useAppStore(state => state.notification_state.unread_count);
  const logoutUser = useAppStore(state => state.logout_user);
  const setLanguage = useAppStore(state => state.set_language);
  const preferredLanguage = useAppStore(state => state.ui_preferences.preferred_language);
  
  // Local state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  
  // Refs for click outside detection
  const userMenuRef = useRef<HTMLDivElement>(null);
  const languageMenuRef = useRef<HTMLDivElement>(null);

  // Query to fetch unread message count
  const { data: messageData } = useQuery({
    queryKey: ['unread-messages'],
    queryFn: async () => {
      if (!isAuthenticated || !currentUser?.id) return { count: 0 };
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/messages`,
          {
            headers: {
              Authorization: `Bearer ${useAppStore.getState().authentication_state.auth_token}`
            }
          }
        );
        
        // Calculate total unread count from threads
        const totalUnread = response.data.reduce((sum: number, thread: any) => sum + thread.unread_count, 0);
        
        // Update store with latest count
        useAppStore.getState().update_unread_count(totalUnread);
        
        return { count: totalUnread };
      } catch (error) {
        console.error('Failed to fetch messages:', error);
        return { count: 0 };
      }
    },
    enabled: isAuthenticated && !!currentUser?.id,
    refetchInterval: 30000, // Poll every 30 seconds
    staleTime: 25000,
  });

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target as Node)) {
        setIsLanguageMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle language change
  const handleLanguageChange = (language: 'ar' | 'en') => {
    setLanguage(language);
    setIsLanguageMenuOpen(false);
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/auth/logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${useAppStore.getState().authentication_state.auth_token}`
          }
        }
      );
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      logoutUser();
      navigate('/');
      setIsUserMenuOpen(false);
    }
  };

  // Get user avatar fallback
  const getUserInitial = () => {
    if (currentUser?.name) {
      return currentUser.name.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <>
      <nav className={`bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50 ${preferredLanguage === 'ar' ? 'rtl' : 'ltr'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo - Left side */}
            <div className="flex items-center">
              <Link 
                to="/"
                className={`text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors ${preferredLanguage === 'ar' ? 'ml-4' : 'mr-4'}`}
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsUserMenuOpen(false);
                }}
              >
                Dar Libya
              </Link>
            </div>

            {/* Desktop Center Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              {!isAuthenticated && (
                <Link
                  to="/signup?account_type=host"
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
                >
                  {preferredLanguage === 'ar' ? 'كن مضيفاً' : 'Become a Host'}
                </Link>
              )}
              
              {isAuthenticated && currentUser?.account_type === 'guest' && (
                <Link
                  to="/signup?account_type=host"
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
                >
                  {preferredLanguage === 'ar' ? 'تحويل إلى الاستضافة' : 'Switch to Hosting'}
                </Link>
              )}
              
              {isAuthenticated && currentUser?.account_type === 'host' && (
                <>
                  <Link
                    to="/host/dashboard"
                    className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
                  >
                    {preferredLanguage === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
                  </Link>
                  <Link
                    to="/host/listing/new"
                    className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
                  >
                    {preferredLanguage === 'ar' ? 'إضافة إعلان' : 'New Listing'}
                  </Link>
                </>
              )}
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Language Switcher */}
              <div className="relative" ref={languageMenuRef}>
                <button
                  onClick={() => {
                    setIsLanguageMenuOpen(!isLanguageMenuOpen);
                    setIsUserMenuOpen(false);
                  }}
                  className={`px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md transition-colors ${
                    preferredLanguage === 'ar' ? 'ml-2' : 'mr-2'
                  }`}
                  aria-label="Change language"
                >
                  {preferredLanguage === 'ar' ? 'العربية' : 'English'}
                  <svg className="inline-block w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isLanguageMenuOpen && (
                  <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => handleLanguageChange('ar')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      العربية
                    </button>
                    <button
                      onClick={() => handleLanguageChange('en')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      English
                    </button>
                  </div>
                )}
              </div>

              {/* Unauthenticated Actions */}
              {!isAuthenticated ? (
                <div className="hidden sm:flex items-center space-x-2">
                  <Link
                    to="/login"
                    className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
                  >
                    {preferredLanguage === 'ar' ? 'تسجيل الدخول' : 'Login'}
                  </Link>
                  <Link
                    to="/signup"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition-colors"
                  >
                    {preferredLanguage === 'ar' ? 'إنشاء حساب' : 'Sign Up'}
                  </Link>
                </div>
              ) : (
                /* Authenticated Actions */
                <div className="flex items-center space-x-3">
                  {/* Inbox */}
                  <Link
                    to="/inbox"
                    className={`relative p-2 text-gray-700 hover:text-gray-900 transition-colors ${
                      preferredLanguage === 'ar' ? 'ml-2' : 'mr-2'
                    }`}
                    aria-label="Messages"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {(unreadCount > 0 || messageData?.count > 0) && (
                      <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full">
                        {unreadCount || messageData?.count}
                      </span>
                    )}
                  </Link>

                  {/* User Avatar Dropdown */}
                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(!isUserMenuOpen);
                        setIsLanguageMenuOpen(false);
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                      aria-label="User menu"
                    >
                      {currentUser?.profile_picture_url ? (
                        <img
                          src={currentUser.profile_picture_url}
                          alt={currentUser.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                          {getUserInitial()}
                        </div>
                      )}
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isUserMenuOpen && (
                      <div className={`absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 overflow-hidden ${preferredLanguage === 'ar' ? 'text-right' : 'text-left'}`}>
                        <div className="px-4 py-3 border-b border-gray-200">
                          <p className="text-sm font-medium text-gray-900">{currentUser?.name}</p>
                          <p className="text-xs text-gray-500 truncate">{currentUser?.email}</p>
                        </div>
                        
                        <Link
                          to="/profile"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          {preferredLanguage === 'ar' ? 'ملفي الشخصي' : 'My Profile'}
                        </Link>
                        
                        {currentUser?.account_type === 'host' && (
                          <Link
                            to="/host/dashboard"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                            onClick={() => setIsUserMenuOpen(false)}
                          >
                            {preferredLanguage === 'ar' ? 'لوحة التحكم' : 'Host Dashboard'}
                          </Link>
                        )}
                        
                        <button
                          onClick={handleLogout}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          {preferredLanguage === 'ar' ? 'تسجيل الخروج' : 'Log Out'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Mobile Menu Button */}
              <div className="md:hidden">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(!isMobileMenuOpen);
                    setIsUserMenuOpen(false);
                    setIsLanguageMenuOpen(false);
                  }}
                  className={`p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    preferredLanguage === 'ar' ? 'ml-2' : 'mr-2'
                  }`}
                  aria-label="Menu"
                >
                  {isMobileMenuOpen ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {!isAuthenticated ? (
                <>
                  <Link
                    to="/login"
                    className="block px-3 py-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50 font-medium transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {preferredLanguage === 'ar' ? 'تسجيل الدخول' : 'Login'}
                  </Link>
                  <Link
                    to="/signup"
                    className="block px-3 py-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50 font-medium transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {preferredLanguage === 'ar' ? 'إنشاء حساب' : 'Sign Up'}
                  </Link>
                  <Link
                    to="/signup?account_type=host"
                    className="block px-3 py-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50 font-medium transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {preferredLanguage === 'ar' ? 'كن مضيفاً' : 'Become a Host'}
                  </Link>
                </>
              ) : (
                <>
                  {currentUser?.account_type === 'guest' && (
                    <Link
                      to="/signup?account_type=host"
                      className="block px-3 py-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50 font-medium transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {preferredLanguage === 'ar' ? 'تحويل إلى الاستضافة' : 'Switch to Hosting'}
                    </Link>
                  )}
                  
                  {currentUser?.account_type === 'host' && (
                    <>
                      <Link
                        to="/host/dashboard"
                        className="block px-3 py-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50 font-medium transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {preferredLanguage === 'ar' ? 'لوحة التحكم' : 'Dashboard'}
                      </Link>
                      <Link
                        to="/host/listing/new"
                        className="block px-3 py-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50 font-medium transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {preferredLanguage === 'ar' ? 'إضافة إعلان' : 'New Listing'}
                      </Link>
                    </>
                  )}
                  
                  <Link
                    to="/inbox"
                    className="block px-3 py-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50 font-medium transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {preferredLanguage === 'ar' ? 'الرسائل' : 'Messages'}
                    {(unreadCount > 0 || messageData?.count > 0) && (
                      <span className="ml-2 inline-block px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                        {unreadCount || messageData?.count}
                      </span>
                    )}
                  </Link>
                  
                  <Link
                    to="/profile"
                    className="block px-3 py-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-50 font-medium transition-colors"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {preferredLanguage === 'ar' ? 'ملفي الشخصي' : 'My Profile'}
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-3 py-2 rounded-md text-red-600 hover:text-red-900 hover:bg-red-50 font-medium transition-colors"
                  >
                    {preferredLanguage === 'ar' ? 'تسجيل الخروج' : 'Log Out'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export default GV_TopNavigation;