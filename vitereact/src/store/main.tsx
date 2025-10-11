import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

// Types based on backend OpenAPI schemas
interface User {
  id: string;
  name: string;
  email: string | null;
  phone_number: string;
  account_type: 'guest' | 'host' | 'admin';
  is_phone_verified: boolean;
  profile_picture_url: string | null;
  created_at: string;
  updated_at: string;
}

interface AuthenticationStatus {
  is_authenticated: boolean;
  is_loading: boolean;
}

interface AuthenticationState {
  current_user: User | null;
  auth_token: string | null;
  authentication_status: AuthenticationStatus;
  error_message: string | null;
}

interface CurrentSearchFilters {
  location: string;
  check_in: string | null;
  check_out: string | null;
  num_guests: number;
  price_min: number;
  price_max: number;
  property_types: string[];
  amenities: string[];
  bedrooms: number;
  bathrooms: number;
}

interface UiPreferences {
  preferred_language: 'ar' | 'en';
}

interface NotificationState {
  unread_count: number;
  last_checked: string | null;
}

interface RealtimeState {
  socket: Socket | null;
  is_connected: boolean;
}

interface AppState {
  // State
  authentication_state: AuthenticationState;
  current_search_filters: CurrentSearchFilters;
  ui_preferences: UiPreferences;
  notification_state: NotificationState;
  realtime_state: RealtimeState;
  
  // Auth Actions
  login_user: (identifier: string, password: string) => Promise<void>;
  logout_user: () => void;
  register_user: (user_data: {
    name: string;
    email: string | null;
    phone_number: string;
    password_hash: string;
    account_type?: 'guest' | 'host';
  }) => Promise<void>;
  verify_phone: (phone_number: string, otp: string) => Promise<void>;
  initialize_auth: () => Promise<void>;
  clear_auth_error: () => void;
  update_user_profile: (user_data: Partial<User>) => Promise<void>;
  
  // Search Actions
  update_search_filters: (filters: Partial<CurrentSearchFilters>) => void;
  clear_search_filters: () => void;
  
  // UI Actions
  set_language: (language: 'ar' | 'en') => void;
  
  // Notification Actions
  update_unread_count: (count: number) => void;
  mark_notifications_checked: () => void;
  
  // Realtime Actions
  initialize_socket: () => void;
  disconnect_socket: () => void;
}

// Create the store
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial State
      authentication_state: {
        current_user: null,
        auth_token: null,
        authentication_status: {
          is_authenticated: false,
          is_loading: true, // Start loading for initial auth check
        },
        error_message: null,
      },
      
      current_search_filters: {
        location: '',
        check_in: null,
        check_out: null,
        num_guests: 1,
        price_min: 0,
        price_max: 10000,
        property_types: [],
        amenities: [],
        bedrooms: 0,
        bathrooms: 0,
      },
      
      ui_preferences: {
        preferred_language: 'ar',
      },
      
      notification_state: {
        unread_count: 0,
        last_checked: null,
      },
      
      realtime_state: {
        socket: null,
        is_connected: false,
      },
      
      // Auth Actions
      login_user: async (identifier: string, password: string) => {
        console.log('Starting login process...', { identifier, password: '[REDACTED]' });
        set(() => ({
          authentication_state: {
            ...get().authentication_state,
            authentication_status: {
              ...get().authentication_state.authentication_status,
              is_loading: true,
            },
            error_message: null,
          },
        }));
        
        try {
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
          console.log('Making login request to:', `${apiBaseUrl}/api/auth/login`);
          const response = await axios.post(
            `${apiBaseUrl}/api/auth/login`,
            { identifier, password },
            { 
              headers: { 'Content-Type': 'application/json' },
              timeout: 10000 // 10 second timeout
            }
          );

          console.log('Login response received:', response.status, response.data);
          
          if (!response.data || !response.data.user || !response.data.token) {
            throw new Error('Invalid response from server - missing user or token');
          }
          
          const { user, token } = response.data;

          // Update authentication state with proper persistence
          set(() => ({
            authentication_state: {
              current_user: user,
              auth_token: token,
              authentication_status: {
                is_authenticated: true,
                is_loading: false,
              },
              error_message: null,
            },
          }));
          
          console.log('Login successful, user authenticated:', user.id, 'token length:', token.length);
          console.log('Auth state updated:', get().authentication_state.authentication_status.is_authenticated);
          
          // Initialize socket after successful login
          get().initialize_socket();
          
          // Force a small delay to ensure state is persisted
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error: any) {
          console.error('Login error details:', error);
          let errorMessage = 'Login failed';
          
          if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            errorMessage = 'Request timed out. Please try again.';
          } else if (error.response?.status === 502) {
            errorMessage = 'Server is temporarily unavailable. Please try again later.';
          } else if (error.response?.status === 401) {
            errorMessage = 'Invalid credentials. Please check your email/phone and password.';
          } else if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
          } else if (error.code === 'NETWORK_ERROR' || !error.response) {
            errorMessage = 'Network error. Please check your connection and try again.';
          } else {
            errorMessage = error.message || 'Login failed';
          }
          
          set(() => ({
            authentication_state: {
              current_user: null,
              auth_token: null,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
              },
              error_message: errorMessage,
            },
          }));
          throw new Error(errorMessage);
        }
      },
      
      logout_user: () => {
        // Disconnect socket first
        get().disconnect_socket();
        
        set(() => ({
          authentication_state: {
            current_user: null,
            auth_token: null,
            authentication_status: {
              is_authenticated: false,
              is_loading: false,
            },
            error_message: null,
          },
        }));
      },
      
      register_user: async (user_data) => {
        set(() => ({
          authentication_state: {
            ...get().authentication_state,
            authentication_status: {
              ...get().authentication_state.authentication_status,
              is_loading: true,
            },
            error_message: null,
          },
        }));
        
        try {
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
          console.log('Registering user with API URL:', apiBaseUrl);
          console.log('Registration data:', user_data);
          
          const response = await axios.post(
            `${apiBaseUrl}/api/auth/register`,
            user_data,
            { headers: { 'Content-Type': 'application/json' } }
          );

          console.log('Registration response:', response.data);
          const { user, token } = response.data;

          // Store user and token but don't set as fully authenticated until phone is verified
          set(() => ({
            authentication_state: {
              current_user: user,
              auth_token: token,
              authentication_status: {
                is_authenticated: false, // Will be set to true after OTP verification
                is_loading: false,
              },
              error_message: null,
            },
          }));

          console.log('User registered successfully, awaiting OTP verification');
          // Don't initialize socket until phone is verified
        } catch (error: any) {
          console.error('Registration error:', error);
          let errorMessage = 'Registration failed';
          
          if (error.response?.status === 502) {
            errorMessage = 'Server is temporarily unavailable. Please try again later.';
          } else if (error.response?.status === 409) {
            errorMessage = 'User already exists with this phone number or email.';
          } else if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
          } else if (error.code === 'NETWORK_ERROR' || !error.response) {
            errorMessage = 'Network error. Please check your connection and try again.';
          } else {
            errorMessage = error.message || 'Registration failed';
          }
          
          set(() => ({
            authentication_state: {
              current_user: null,
              auth_token: null,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
              },
              error_message: errorMessage,
            },
          }));
          throw new Error(errorMessage);
        }
      },
      
      verify_phone: async (phone_number: string, otp: string) => {
        try {
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
          console.log('Verifying OTP with API URL:', apiBaseUrl);
          console.log('OTP verification data:', { phone_number, otp });
          
          await axios.post(
            `${apiBaseUrl}/api/auth/verify-otp`,
            { phone_number, otp },
            { headers: { 'Content-Type': 'application/json' } }
          );

          console.log('OTP verification successful');

          // Update user verification status and set as fully authenticated
          const { current_user } = get().authentication_state;
          if (current_user) {
            set(() => ({
              authentication_state: {
                ...get().authentication_state,
                current_user: {
                  ...current_user,
                  is_phone_verified: true,
                },
                authentication_status: {
                  is_authenticated: true, // Now fully authenticated
                  is_loading: false,
                },
              },
            }));
            
            console.log('User is now fully authenticated');
            // Initialize socket connection after successful verification
            get().initialize_socket();
          }
        } catch (error: any) {
          console.error('OTP verification error:', error);
          let errorMessage = 'OTP verification failed';
          
          if (error.response?.status === 502) {
            errorMessage = 'Server is temporarily unavailable. Please try again later.';
          } else if (error.response?.status === 400 && error.response?.data?.error_code === 'INVALID_OTP') {
            errorMessage = 'Invalid OTP code. Please try again.';
          } else if (error.response?.status === 404) {
            errorMessage = 'User not found. Please register first.';
          } else if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
          } else if (error.code === 'NETWORK_ERROR' || !error.response) {
            errorMessage = 'Network error. Please check your connection and try again.';
          } else {
            errorMessage = error.message || 'OTP verification failed';
          }
          
          set(() => ({
            authentication_state: {
              ...get().authentication_state,
              error_message: errorMessage,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
              },
            },
          }));
          throw new Error(errorMessage);
        }
      },
      
      initialize_auth: async () => {
        console.log('Initializing auth...');
        const { authentication_state } = get();
        const token = authentication_state.auth_token;
        const user = authentication_state.current_user;
        console.log('Stored token:', token ? `exists (${token.slice(0, 10)}...)` : 'none');
        console.log('Stored user:', user ? `exists (${user.id})` : 'none');
        
        if (!token || !user) {
          console.log('No token or user found, setting not authenticated');
          set(() => ({
            authentication_state: {
              current_user: null,
              auth_token: null,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
              },
              error_message: null,
            },
          }));
          return;
        }

        try {
          console.log('Verifying token with backend...');
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
          const response = await axios.get(
            `${apiBaseUrl}/api/users/me`,
            { 
              headers: { Authorization: `Bearer ${token}` },
              timeout: 5000 // 5 second timeout for auth check
            }
          );

          const freshUser = response.data;
          console.log('Token valid, user authenticated:', freshUser.id);
          
          set(() => ({
            authentication_state: {
              current_user: freshUser,
              auth_token: token,
              authentication_status: {
                is_authenticated: true,
                is_loading: false,
              },
              error_message: null,
            },
          }));

          // Initialize socket after successful auth check
          get().initialize_socket();
        } catch (error: any) {
          // Token is invalid, clear auth state
          console.log('Token validation failed, clearing auth state:', error.response?.status, error.message);
          set(() => ({
            authentication_state: {
              current_user: null,
              auth_token: null,
              authentication_status: {
                is_authenticated: false,
                is_loading: false,
              },
              error_message: null,
            },
          }));
        }
      },
      
      clear_auth_error: () => {
        set(() => ({
          authentication_state: {
            ...get().authentication_state,
            error_message: null,
          },
        }));
      },
      
      update_user_profile: async (user_data) => {
        const { auth_token, current_user } = get().authentication_state;
        
        if (!auth_token || !current_user) {
          throw new Error('Not authenticated');
        }

        try {
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
          const response = await axios.patch(
            `${apiBaseUrl}/api/users/me`,
            user_data,
            { headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${auth_token}`
            }}
          );

          const updated_user = response.data;
          
          set(() => ({
            authentication_state: {
              ...get().authentication_state,
              current_user: updated_user,
            },
          }));
        } catch (error: any) {
          const errorMessage = error.response?.data?.message || error.message || 'Profile update failed';
          throw new Error(errorMessage);
        }
      },
      
      // Search Actions
      update_search_filters: (filters) => {
        set(() => ({
          current_search_filters: {
            ...get().current_search_filters,
            ...filters,
          },
        }));
      },
      
      clear_search_filters: () => {
        set(() => ({
          current_search_filters: {
            location: '',
            check_in: null,
            check_out: null,
            num_guests: 1,
            price_min: 0,
            price_max: 10000,
            property_types: [],
            amenities: [],
            bedrooms: 0,
            bathrooms: 0,
          },
        }));
      },
      
      // UI Actions
      set_language: (language) => {
        set(() => ({
          ui_preferences: {
            ...get().ui_preferences,
            preferred_language: language,
          },
        }));
      },
      
      // Notification Actions
      update_unread_count: (count) => {
        set(() => ({
          notification_state: {
            ...get().notification_state,
            unread_count: count,
          },
        }));
      },
      
      mark_notifications_checked: () => {
        set(() => ({
          notification_state: {
            ...get().notification_state,
            last_checked: new Date().toISOString(),
          },
        }));
      },
      
      // Realtime Actions
      initialize_socket: () => {
        const { auth_token } = get().authentication_state;
        
        if (!auth_token || get().realtime_state.socket?.connected) {
          return;
        }

        try {
          const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
          const socket = io(
            apiBaseUrl,
            {
              auth: {
                token: auth_token,
              },
              reconnection: true,
              reconnectionAttempts: 3,
              reconnectionDelay: 1000,
              timeout: 5000,
            }
          );

          socket.on('connect', () => {
            set(() => ({
              realtime_state: {
                ...get().realtime_state,
                is_connected: true,
              },
            }));
          });

          socket.on('connect_error', () => {
            // Socket.IO is not yet implemented on backend - suppress warnings
          });

          socket.on('disconnect', () => {
            set(() => ({
              realtime_state: {
                ...get().realtime_state,
                is_connected: false,
              },
            }));
          });

          socket.on('message_received', () => {
            const { unread_count } = get().notification_state;
            get().update_unread_count(unread_count + 1);
          });

          socket.on('booking_status_updated', () => {
            // Handle booking updates - could refresh queries here
          });

          set(() => ({
            realtime_state: {
              socket,
              is_connected: socket.connected,
            },
          }));
        } catch {
          // Socket.IO is not yet implemented - silently fail
        }
      },
      
      disconnect_socket: () => {
        const { socket } = get().realtime_state;
        
        if (socket) {
          socket.disconnect();
          set(() => ({
            realtime_state: {
              socket: null,
              is_connected: false,
            },
          }));
        }
      },
    }),
    {
      name: 'dar-libya-app-storage',
      // Only persist essential data
      partialize: (state) => ({
        authentication_state: {
          current_user: state.authentication_state.current_user,
          auth_token: state.authentication_state.auth_token,
          authentication_status: {
            is_authenticated: state.authentication_state.authentication_status.is_authenticated,
            is_loading: false, // Never persist loading state
          },
          error_message: null, // Never persist errors
        },
        current_search_filters: state.current_search_filters,
        ui_preferences: state.ui_preferences,
        notification_state: {
          unread_count: 0, // Reset unread count on app load
          last_checked: state.notification_state.last_checked,
        },
      }),
    }
  )
);

// Export types for use in components
export type {
  User,
  AuthenticationState,
  AuthenticationStatus,
  CurrentSearchFilters,
  UiPreferences,
  NotificationState,
  RealtimeState,
};