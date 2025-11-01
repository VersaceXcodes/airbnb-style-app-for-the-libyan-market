import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Types based on Zod schemas
interface Villa {
  id: string;
  title: string;
  price_per_night: number;
  cleaning_fee: number | null;
  house_rules: string | null;
  photos?: Array<{
    id: string;
    url: string;
    is_cover_photo: boolean;
  }>;
}

interface BookingRequest {
  villa_id: string;
  check_in_date: Date;
  check_out_date: Date;
  num_guests: number;
  guest_message: string;
}

interface PriceBreakdown {
  nightly_total: number;
  cleaning_fee: number | null;
  total: number;
}

interface CreateBookingResponse {
  id: string;
  status: string;
}

const UV_BookingConfirmation: React.FC = () => {
  const { villa_id } = useParams<{ villa_id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Global state access
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);

  // URL parameters
  const searchParams = new URLSearchParams(window.location.search);
  const check_in = searchParams.get('check_in');
  const check_out = searchParams.get('check_out');
  const num_guests = searchParams.get('num_guests');

  // Validate that we have required parameters
  useEffect(() => {
    console.log('BookingConfirmation: Component mounted', {
      villa_id,
      check_in,
      check_out,
      num_guests,
      currentUser: !!currentUser,
      authToken: !!authToken
    });
    
    if (!villa_id) {
      console.error('BookingConfirmation: Missing villa_id parameter');
    }
    if (!check_in || !check_out) {
      console.error('BookingConfirmation: Missing date parameters:', { check_in, check_out });
    }
  }, [villa_id, check_in, check_out, num_guests, currentUser, authToken]);

  // Local state
  const [bookingRequest, setBookingRequest] = useState<BookingRequest>({
    villa_id: villa_id || '',
    check_in_date: check_in ? new Date(check_in) : new Date(),
    check_out_date: check_out ? new Date(check_out) : new Date(),
    num_guests: num_guests ? parseInt(num_guests) : 1,
    guest_message: ''
  });
  const [houseRulesAccepted, setHouseRulesAccepted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch villa details
  const { data: villa, isLoading, error } = useQuery<Villa>({
    queryKey: ['villa', villa_id],
    queryFn: async () => {
      if (!villa_id) throw new Error('Villa ID is required');
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/villas/${villa_id}`
      );
      return response.data;
    },
    enabled: !!villa_id,
    staleTime: 60000,
    retry: 1
  });

  // Calculate price breakdown
  const priceBreakdown: PriceBreakdown = React.useMemo(() => {
    if (!villa || !bookingRequest.check_in_date || !bookingRequest.check_out_date) {
      return { nightly_total: 0, cleaning_fee: null, total: 0 };
    }

    const nights = Math.ceil(
      (bookingRequest.check_out_date.getTime() - bookingRequest.check_in_date.getTime()) / 
      (1000 * 60 * 60 * 24)
    );

    if (nights <= 0) {
      return { nightly_total: 0, cleaning_fee: null, total: 0 };
    }

    const nightly_total = nights * villa.price_per_night;
    const total = nightly_total + (villa.cleaning_fee || 0);

    return {
      nightly_total,
      cleaning_fee: villa.cleaning_fee,
      total
    };
  }, [villa, bookingRequest.check_in_date, bookingRequest.check_out_date]);

  // Submit booking mutation
  const submitBookingMutation = useMutation<CreateBookingResponse, Error, BookingRequest>({
    mutationFn: async (data) => {
      if (!authToken) throw new Error('Not authenticated');
      
      const payload = {
        villa_id: data.villa_id,
        check_in_date: data.check_in_date.toISOString(),
        check_out_date: data.check_out_date.toISOString(),
        num_guests: data.num_guests,
        guest_message: data.guest_message
      };

      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/bookings`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      return response.data;
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['userTrips'] });
      
      // Navigate to trip details
      navigate(`/trip/${data.id}`);
    },
    onError: (error: any) => {
      setSubmitError(error.response?.data?.message || error.message || 'Failed to submit booking request');
    }
  });

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Validation
    if (!bookingRequest.guest_message.trim()) {
      setSubmitError('Please introduce yourself to the host');
      return;
    }

    if (!houseRulesAccepted) {
      setSubmitError('You must accept the house rules to proceed');
      return;
    }

    if (!currentUser) {
      setSubmitError('You must be logged in to make a booking');
      return;
    }

    // Submit booking
    submitBookingMutation.mutate(bookingRequest);
  };

  // Handle message change
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBookingRequest(prev => ({ ...prev, guest_message: e.target.value }));
    setSubmitError(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50" data-testid="booking-confirmation-loading">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading booking details...</p>
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (error || !villa) {
    console.error('BookingConfirmation: Error loading villa', { error, villa_id });
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50" data-testid="booking-confirmation-error">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Property Not Found</h2>
            <p className="text-gray-600 mb-6">
              {error ? 'Error loading property details.' : 'The property you\'re trying to book could not be found.'}
            </p>
            {error && (
              <p className="text-sm text-red-600 mb-4">{error.message}</p>
            )}
            <Link 
              to="/search"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Search Properties
            </Link>
          </div>
        </div>
      </>
    );
  }

  // Format dates
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const nights = Math.ceil(
    (bookingRequest.check_out_date.getTime() - bookingRequest.check_in_date.getTime()) / 
    (1000 * 60 * 60 * 24)
  );

  console.log('BookingConfirmation: Rendering page', { 
    villa_id, 
    check_in, 
    check_out, 
    num_guests,
    villa: !!villa,
    currentUser: !!currentUser 
  });

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8" data-testid="booking-confirmation-page">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2" data-testid="booking-confirmation-title">Confirm Your Booking</h1>
            <p className="text-gray-600">Please review the details below before sending your request</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Property Card */}
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="flex">
                  {/* Property Image */}
                  <div className="w-48 h-48 flex-shrink-0">
                    {villa.photos && villa.photos.length > 0 ? (
                      <img
                        src={villa.photos.find(p => p.is_cover_photo)?.url || villa.photos[0].url}
                        alt={villa.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-400 text-sm">No Photo</span>
                      </div>
                    )}
                  </div>

                  {/* Property Info */}
                  <div className="p-6 flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">{villa.title}</h2>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(bookingRequest.check_in_date)} - {formatDate(bookingRequest.check_out_date)}
                      </div>
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {bookingRequest.num_guests} guest{bookingRequest.num_guests > 1 ? 's' : ''}
                      </div>
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {nights} night{nights > 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Message to Host */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Message to Host <span className="text-red-500">*</span>
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Introduce yourself and let the host know why you're interested in their property.
                </p>
                <textarea
                  value={bookingRequest.guest_message}
                  onChange={handleMessageChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Hi! I'm interested in booking your property. I'm visiting for..."
                  aria-label="Message to host"
                  data-testid="guest-message-textarea"
                  required
                />
                {bookingRequest.guest_message.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    {bookingRequest.guest_message.length} characters
                  </p>
                )}
              </div>

              {/* House Rules */}
              {villa.house_rules && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">House Rules</h3>
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{villa.house_rules}</p>
                  </div>
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      checked={houseRulesAccepted}
                      onChange={(e) => {
                        setHouseRulesAccepted(e.target.checked);
                        setSubmitError(null);
                      }}
                      className="mt-1 mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      data-testid="house-rules-checkbox"
                    />
                    <span className="text-sm text-gray-700">
                      I have read and agree to the house rules
                    </span>
                  </label>
                </div>
              )}

              {/* Cancellation Policy */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancellation Policy</h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-yellow-800 mb-1">Free Cancellation</p>
                      <p className="text-sm text-yellow-700">
                        You can cancel this booking up to 24 hours before check-in and receive a full refund.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Price Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg p-6 sticky top-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Details</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      ${villa.price_per_night} × {nights} night{nights > 1 ? 's' : ''}
                    </span>
                    <span className="font-medium text-gray-900">${priceBreakdown.nightly_total.toFixed(2)}</span>
                  </div>
                  
                  {priceBreakdown.cleaning_fee && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Cleaning fee</span>
                      <span className="font-medium text-gray-900">${priceBreakdown.cleaning_fee.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span className="text-base font-semibold text-gray-900">Total</span>
                      <span className="text-base font-semibold text-gray-900">${priceBreakdown.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <form onSubmit={handleSubmit} className="mt-6">
                  {submitError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-700">{submitError}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitBookingMutation.isPending}
                    className="w-full flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    data-testid="submit-booking-button"
                    aria-label="Send Booking Request"
                  >
                    {submitBookingMutation.isPending ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Sending Request...
                      </>
                    ) : (
                      'Send Booking Request'
                    )}
                  </button>

                  <p className="text-xs text-gray-500 text-center mt-4">
                    You won't be charged yet
                  </p>
                </form>

                {/* Payment Method Note */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 text-center">
                    Payment will be arranged directly with the host after booking confirmation
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_BookingConfirmation;