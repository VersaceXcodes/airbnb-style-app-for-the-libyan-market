import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Types based on backend schemas
interface Booking {
  id: string;
  villa_id: string;
  guest_id: string;
  host_id: string;
  check_in_date: string;
  check_out_date: string;
  num_guests: number;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  guest_message: string;
  cancellation_reason: string | null;
  cancellation_message: string | null;
  check_in_instructions: string | null;
  created_at: string;
  updated_at: string;
}

interface Villa {
  id: string;
  title: string;
  photos: Photo[];
}

interface Guest {
  id: string;
  name: string;
  profile_picture_url: string | null;
}

interface Photo {
  id: string;
  url: string;
}

interface EnrichedBooking extends Booking {
  villa: Villa;
  guest: Guest;
}

interface SummaryStats {
  total_listings: number;
  active_requests: number;
  upcoming_check_ins: number;
}

const UV_HostDashboard: React.FC = () => {
  // Global state access - individual selectors
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);

  const queryClient = useQueryClient();

  // Check if user is a host
  if (!currentUser || currentUser.account_type !== 'host') {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600">This page is only available to hosts.</p>
            <Link 
              to="/"
              className="mt-4 inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Home
            </Link>
          </div>
        </div>
      </>
    );
  }

  // Fetch bookings for the host
  const { 
    data: bookings = [], 
    isLoading: bookingsLoading, 
    error: bookingsError 
  } = useQuery({
    queryKey: ['host-bookings', currentUser.id],
    queryFn: async (): Promise<EnrichedBooking[]> => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/bookings`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      const bookingsData: Booking[] = response.data;

      // Enrich bookings with villa and guest information
      const enrichedBookings = await Promise.all(
        bookingsData.map(async (booking) => {
          // Fetch villa details
          const villaResponse = await axios.get(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/villas/${booking.villa_id}`
          );
          
          // Fetch guest details
          const guestResponse = await axios.get(
            `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/users/${booking.guest_id}`
          );

          return {
            ...booking,
            villa: {
              id: villaResponse.data.id,
              title: villaResponse.data.title,
              photos: villaResponse.data.photos || []
            },
            guest: {
              id: guestResponse.data.id,
              name: guestResponse.data.name,
              profile_picture_url: guestResponse.data.profile_picture_url
            }
          };
        })
      );

      return enrichedBookings;
    },
    enabled: !!currentUser?.id && !!authToken,
    staleTime: 60000,
    refetchOnWindowFocus: false,
    retry: 1
  });

  // Calculate summary stats from bookings
  const summaryStats: SummaryStats = React.useMemo(() => {
    const stats = {
      total_listings: 0,
      active_requests: 0,
      upcoming_check_ins: 0
    };

    // Count unique listings
    const uniqueVillaIds = new Set(bookings.map(b => b.villa_id));
    stats.total_listings = uniqueVillaIds.size;

    // Count pending requests
    stats.active_requests = bookings.filter(b => b.status === 'pending').length;

    // Count upcoming check-ins
    const now = new Date();
    stats.upcoming_check_ins = bookings.filter(b => 
      b.status === 'confirmed' && 
      new Date(b.check_in_date) > now
    ).length;

    return stats;
  }, [bookings]);

  // Mutation for updating booking status
  const updateBookingMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
      const response = await axios.patch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/bookings/${bookingId}`,
        { status },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      // Refresh bookings data
      queryClient.invalidateQueries({ queryKey: ['host-bookings', currentUser.id] });
    }
  });

  const handleAcceptBooking = (bookingId: string) => {
    updateBookingMutation.mutate({ bookingId, status: 'confirmed' });
  };

  const handleDeclineBooking = (bookingId: string) => {
    updateBookingMutation.mutate({ bookingId, status: 'cancelled' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (bookingsLoading) {
    return (
      <>
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </>
    );
  }

  if (bookingsError) {
    return (
      <>
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Dashboard</h1>
            <p className="text-gray-600">Failed to load your dashboard data. Please try again.</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-100">
        {/* Header */}
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Welcome back, {currentUser.name}!
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Here's what's happening with your properties today.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Active Listings
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {summaryStats.total_listings}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Pending Requests
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {summaryStats.active_requests}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Upcoming Check-ins
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {summaryStats.upcoming_check_ins}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/host/listing/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create a New Listing
              </Link>
              <Link
                to="/profile"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                View Your Listings
              </Link>
            </div>
          </div>

          {/* Bookings Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Recent Bookings</h2>
            </div>
            
            {bookings.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No bookings yet</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new listing.</p>
                <div className="mt-6">
                  <Link
                    to="/host/listing/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Listing
                  </Link>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Guest
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Listing
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Check-in
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Check-out
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {bookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              {booking.guest.profile_picture_url ? (
                                <img 
                                  className="h-10 w-10 rounded-full object-cover" 
                                  src={booking.guest.profile_picture_url} 
                                  alt={booking.guest.name}
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                  <span className="text-sm font-medium text-gray-600">
                                    {booking.guest.name.charAt(0)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {booking.guest.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {booking.num_guests} guest{booking.num_guests > 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {booking.villa.title}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Intl.NumberFormat('en-LY', { 
                              style: 'currency', 
                              currency: 'LYD' 
                            }).format(booking.total_price)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(booking.check_in_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(booking.check_out_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {booking.status === 'pending' ? (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleAcceptBooking(booking.id)}
                                disabled={updateBookingMutation.isPending}
                                className="text-green-600 hover:text-green-900 disabled:opacity-50"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => handleDeclineBooking(booking.id)}
                                disabled={updateBookingMutation.isPending}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50"
                              >
                                Decline
                              </button>
                            </div>
                          ) : (
                            <Link
                              to={`/trip/${booking.id}`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View Details
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_HostDashboard;