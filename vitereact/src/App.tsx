import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';

// --- Component Imports ---
import GV_TopNavigation from '@/components/views/GV_TopNavigation.tsx';
import GV_Footer from '@/components/views/GV_Footer.tsx';

import UV_Homepage from '@/components/views/UV_Homepage.tsx';
import UV_SignUp from '@/components/views/UV_SignUp.tsx';
import UV_Login from '@/components/views/UV_Login.tsx';
import UV_PasswordReset from '@/components/views/UV_PasswordReset.tsx';
import UV_SearchResults from '@/components/views/UV_SearchResults.tsx';
import UV_ListingDetails from '@/components/views/UV_ListingDetails.tsx';
import UV_BookingConfirmation from '@/components/views/UV_BookingConfirmation.tsx';
import UV_TripDetails from '@/components/views/UV_TripDetails.tsx';
import UV_CreateListing from '@/components/views/UV_CreateListing.tsx';
import UV_HostDashboard from '@/components/views/UV_HostDashboard.tsx';
import UV_Inbox from '@/components/views/UV_Inbox.tsx';
import UV_UserProfile from '@/components/views/UV_UserProfile.tsx';
import UV_HostPublicProfile from '@/components/views/UV_HostPublicProfile.tsx';
// UV_SubmitReview is a modal, not a standalone route view

// --- Query Client Setup ---
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// --- Loading Spinner ---
const LoadingSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

// --- Layout Components ---
const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col min-h-screen">
    <GV_TopNavigation />
    <main className="flex-grow">
      {children}
    </main>
    <GV_Footer />
  </div>
);

const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="w-full max-w-md p-4">
      {children}
    </div>
  </div>
);

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex flex-col min-h-screen">
    <GV_TopNavigation />
    <main className="flex-grow bg-gray-100">
      {children}
    </main>
    <GV_Footer />
  </div>
);

// --- Route Protection Wrapper ---
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const isLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// --- Authentication Guard for Login/Signup pages ---
const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const isLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  // If user is already authenticated, redirect to dashboard/homepage
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// --- Root App Component ---
const App: React.FC = () => {
  const isLoading = useAppStore(state => state.authentication_state.authentication_status.is_loading);
  const initializeAuth = useAppStore(state => state.initialize_auth);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Router future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}>
        <Routes>
          {/* Public Routes with Standard Layout */}
          <Route path="/" element={<PublicLayout><UV_Homepage /></PublicLayout>} />
          <Route path="/search" element={<PublicLayout><UV_SearchResults /></PublicLayout>} />
          <Route path="/listing/:villa_id" element={<PublicLayout><UV_ListingDetails /></PublicLayout>} />
          <Route path="/profile/:host_id" element={<PublicLayout><UV_HostPublicProfile /></PublicLayout>} />
          
          {/* Authentication Routes with Minimalist Layout */}
          <Route path="/login" element={<AuthGuard><AuthLayout><UV_Login /></AuthLayout></AuthGuard>} />
          <Route path="/signup" element={<AuthGuard><AuthLayout><UV_SignUp /></AuthLayout></AuthGuard>} />
          <Route path="/reset-password" element={<AuthGuard><AuthLayout><UV_PasswordReset /></AuthLayout></AuthGuard>} />
          
          {/* Protected Routes */}
          <Route 
            path="/booking/request/:villa_id" 
            element={
              <ProtectedRoute>
                <PublicLayout><UV_BookingConfirmation /></PublicLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/trip/:booking_id" 
            element={
              <ProtectedRoute>
                <PublicLayout><UV_TripDetails /></PublicLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/inbox/:thread_id" 
            element={
              <ProtectedRoute>
                <PublicLayout><UV_Inbox /></PublicLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <DashboardLayout><UV_UserProfile /></DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/host/listing/new" 
            element={
              <ProtectedRoute>
                <DashboardLayout><UV_CreateListing /></DashboardLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/host/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardLayout><UV_HostDashboard /></DashboardLayout>
              </ProtectedRoute>
            } 
          />

          {/* Catch-all Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
};

export default App;