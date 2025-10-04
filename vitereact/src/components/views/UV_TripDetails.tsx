import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Types
interface BookingDetails {
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
  villa_title: string;
  exact_address: string | null;
  directions_landmarks: string | null;
  house_rules: string | null;
  preferred_payment_method: string;
  cover_photo_url: string | null;
  host_name: string;
  host_photo: string | null;
  host_phone: string;
  guest_name: string;
  guest_photo: string | null;
  guest_phone: string;
}

interface CancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (message: string) => void;
  isCancelling: boolean;
  isHost: boolean;
}

const CancellationModal: React.FC<CancellationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isCancelling,
  isHost
}) => {
  const [message, setMessage] = useState('');
  const [reason, setReason] = isHost ? useState('') : undefined;

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(isHost ? reason || message : message);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">
          {isHost ? 'Cancel Booking' : 'Cancel Your Booking'}
        </h3>
        
        {isHost && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Cancellation
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select a reason</option>
              <option value="Property Unavailable">Property Unavailable</option>
              <option value="Force Majeure">Force Majeure</option>
              <option value="Guest Issue">Guest Issue</option>
              <option value="Other">Other</option>
            </select>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Message {isHost ? 'to Guest' : '(Optional)'}
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={isHost ? 'Please explain the reason for cancellation...' : 'Add an optional message...'}
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isCancelling}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            Back
          </button>
          <button
            onClick={handleSubmit}
            disabled={isCancelling || (isHost && !reason)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCancelling ? 'Cancelling...' : 'Confirm Cancellation'}
          </button>
        </div>
      </div>
    </div>
  );
};

const UV_TripDetails: React.FC = () => {
  const { booking_id } = useParams<{ booking_id: string }>();
  const queryClient = useQueryClient();
  
  // Individual Zustand selectors
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);

  // Local state
  const [showCancellationModal, setShowCancellationModal] = useState(false);

  // Fetch booking details
  const {
    data: booking,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['booking', booking_id],
    queryFn: async () => {
      if (!booking_id || !authToken) throw new Error('Missing booking ID or auth token');
      
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/bookings/${booking_id}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data as BookingDetails;
    },
    enabled: !!booking_id && !!authToken,
    retry: 1,
    staleTime: 60000
  });

  // Check if user is authorized to view this booking
  const isAuthorized = booking && (
    currentUser?.id === booking.guest_id || 
    currentUser?.id === booking.host_id
  );
  
  const isHost = booking && currentUser?.id === booking.host_id;
  const isGuest = booking && currentUser?.id === booking.guest_id;

  // Accept booking mutation
  const acceptBookingMutation = useMutation({
    mutationFn: async () => {
      if (!booking_id || !authToken) throw new Error('Missing booking ID or auth token');
      
      const response = await axios.patch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/bookings/${booking_id}`,
        { status: 'confirmed' },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', booking_id] });
    }
  });

  // Decline booking mutation
  const declineBookingMutation = useMutation({
    mutationFn: async (reason: string) => {
      if (!booking_id || !authToken) throw new Error('Missing booking ID or auth token');
      
      const response = await axios.patch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/bookings/${booking_id}`,
        { 
          status: 'cancelled',
          cancellation_reason: reason
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', booking_id] });
      setShowCancellationModal(false);
    }
  });

  // Cancel booking mutation
  const cancelBookingMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!booking_id || !authToken) throw new Error('Missing booking ID or auth token');
      
      const response = await axios.patch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/bookings/${booking_id}`,
        { 
          status: 'cancelled',
          cancellation_message: message
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', booking_id] });
      setShowCancellationModal(false);
    }
  });

  const handleAcceptBooking = () => {
    acceptBookingMutation.mutate();
  };

  const handleDeclineBooking = (reason: string) => {
    declineBookingMutation.mutate(reason);
  };

  const handleCancelBooking = (message: string) => {
    cancelBookingMutation.mutate(message);
  };

  const getStatusBanner = () => {
    if (!booking) return null;

    const statusConfig = {
      pending: {
        bg: 'bg-yellow-50 border-yellow-200',
        text: 'text-yellow-800',
        dot: 'bg-yellow-400',
        label: 'Pending Confirmation',
        description: 'The host has not yet responded to your booking request'
      },
      confirmed: {
        bg: 'bg-green-50 border-green-200',
        text: 'text-green-800',
        dot: 'bg-green-400',
        label: 'Booking Confirmed',
        description: 'Your booking has been confirmed. See you soon!'
      },
      cancelled: {
        bg: 'bg-red-50 border-red-200',
        text: 'text-red-800',
        dot: 'bg-red-400',
        label: 'Booking Cancelled',
        description: booking.cancellation_message || booking.cancellation_reason || 'This booking has been cancelled'
      },
      completed: {
        bg: 'bg-blue-50 border-blue-200',
        text: 'text-blue-800',
        dot: 'bg-blue-400',
        label: 'Completed',
        description: 'Your stay has been completed. We hope you enjoyed it!'
      }
    };

    const config = statusConfig[booking.status];

    return (
      <div className={`border-l-4 p-4 ${config.bg} ${config.text}`}>
        <div className="flex items-center">
          <div className={`flex-shrink-0 w-3 h-3 rounded-full ${config.dot} animate-pulse`}></div>
          <div className="ml-3">
            <h3 className="text-sm font-medium">{config.label}</h3>
            <div className="mt-1 text-sm">{config.description}</div>
          </div>
        </div>
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const checkIfCheckInInstructionsVisible = () => {
    if (!booking || booking.status !== 'confirmed') return false;
    const checkInDateTime = new Date(booking.check_in_date);
    const now = new Date();
    const hoursUntilCheckIn = (checkInDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilCheckIn <= 48;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Not Found</h2>
          <p className="text-gray-600 mb-4">The booking you're looking for doesn't exist or you don't have permission to view it.</p>
          <Link to="/profile" className="text-blue-600 hover:text-blue-700 font-medium">
            Back to Profile
          </Link>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">You don't have permission to view this booking.</p>
          <Link to="/profile" className="text-blue-600 hover:text-blue-700 font-medium">
            Back to Profile
          </Link>
        </div>
      </div>
    );
  }

  const otherParty = isHost ? {
    name: booking.guest_name,
    photo: booking.guest_photo,
    phone: booking.guest_phone,
    id: booking.guest_id,
    label: 'Guest'
  } : {
    name: booking.host_name,
    photo: booking.host_photo,
    phone: booking.host_phone,
    id: booking.host_id,
    label: 'Host'
  };

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="mb-6">
            <ol className="flex items-center space-x-2 text-sm text-gray-500">
              <li>
                <Link to="/profile" className="hover:text-gray-700">Profile</Link>
              </li>
              <li>/</li>
              <li className="text-gray-900">Trip Details</li>
            </ol>
          </nav>

          {/* Status Banner */}
          <div className="mb-6">
            {getStatusBanner()}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Property Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Property Information</h2>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    {booking.cover_photo_url && (
                      <img
                        src={booking.cover_photo_url}
                        alt={booking.villa_title}
                        className="w-full sm:w-48 h-32 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {booking.villa_title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-2">
                        Booking ID: {booking.id}
                      </p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-900">Check-in:</span>
                          <p className="text-gray-600">{formatDate(booking.check_in_date)}</p>
                          <p className="text-gray-500">{formatTime(booking.check_in_date)}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">Check-out:</span>
                          <p className="text-gray-600">{formatDate(booking.check_out_date)}</p>
                          <p className="text-gray-500">{formatTime(booking.check_out_date)}</p>
                        </div>
                      </div>
                      
                      <div className="mt-3 text-sm">
                        <span className="font-medium text-gray-900">Guests:</span>
                        <span className="text-gray-600 ml-1">{booking.num_guests}</span>
                      </div>

                      {booking.status === 'confirmed' && booking.exact_address && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-700 mb-1">Address:</p>
                          <p className="text-sm text-gray-600">{booking.exact_address}</p>
                          {booking.directions_landmarks && (
                            <p className="text-sm text-gray-500 mt-1">{booking.directions_landmarks}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex justify-end">
                    <Link
                      to={`/listing/${booking.villa_id}`}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View Property Details →
                    </Link>
                  </div>
                </div>
              </div>

              {/* Check-in Instructions */}
              {checkIfCheckInInstructionsVisible() && booking.check_in_instructions && (
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">
                    📍 Check-in Instructions
                  </h3>
                  <div className="text-blue-800 whitespace-pre-wrap">
                    {booking.check_in_instructions}
                  </div>
                </div>
              )}

              {/* House Rules */}
              {booking.house_rules && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">House Rules</h3>
                  <div className="text-gray-600 whitespace-pre-wrap">
                    {booking.house_rules}
                  </div>
                </div>
              )}

              {/* Guest Message */}
              {booking.guest_message && (
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {isHost ? "Guest's Message" : "Your Message"}
                  </h3>
                  <div className="text-gray-600 bg-white p-4 rounded-lg border border-gray-200">
                    "{booking.guest_message}"
                  </div>
                </div>
              )}

              {/* Cancellation Details */}
              {booking.status === 'cancelled' && (
                <div className="bg-red-50 rounded-xl p-6 border border-red-200">
                  <h3 className="text-lg font-semibold text-red-900 mb-3">Cancellation Details</h3>
                  {booking.cancellation_reason && (
                    <p className="text-red-800 mb-2">
                      <strong>Reason:</strong> {booking.cancellation_reason}
                    </p>
                  )}
                  {booking.cancellation_message && (
                    <p className="text-red-800">
                      <strong>Message:</strong> {booking.cancellation_message}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Contact Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Contact {otherParty.label}
                </h3>
                <div className="flex items-center mb-4">
                  <img
                    src={otherParty.photo || 'https://picsum.photos/seed/default/100/100.jpg'}
                    alt={otherParty.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">{otherParty.name}</p>
                    <p className="text-sm text-gray-500">{otherParty.label}</p>
                  </div>
                </div>
                <Link
                  to={`/inbox`}
                  className="w-full block text-center bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Send Message
                </Link>
                <Link
                  to={`/profile/${otherParty.id}`}
                  className="w-full block text-center mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  View Profile
                </Link>
              </div>

              {/* Payment Information */}
              {booking.status === 'confirmed' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Method:</span>
                      <span className="font-medium capitalize">
                        {booking.preferred_payment_method.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Amount:</span>
                      <span className="font-bold text-lg text-gray-900">
                        LYD {booking.total_price.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  {booking.preferred_payment_method === 'cash' && (
                    <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                      <p className="text-xs text-yellow-800">
                        💰 Please prepare cash for payment upon arrival
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
                <div className="space-y-3">
                  {booking.status === 'pending' && isHost && (
                    <>
                      <button
                        onClick={handleAcceptBooking}
                        disabled={acceptBookingMutation.isPending}
                        className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {acceptBookingMutation.isPending ? 'Accepting...' : 'Accept Booking'}
                      </button>
                      <button
                        onClick={() => setShowCancellationModal(true)}
                        className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Decline Booking
                      </button>
                    </>
                  )}

                  {booking.status === 'confirmed' && (
                    <button
                      onClick={() => setShowCancellationModal(true)}
                      className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Cancel Booking
                    </button>
                  )}

                  {booking.status === 'completed' && (
                    <button
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Leave a Review
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Modal */}
      <CancellationModal
        isOpen={showCancellationModal}
        onClose={() => setShowCancellationModal(false)}
        onConfirm={booking.status === 'pending' && isHost ? handleDeclineBooking : handleCancelBooking}
        isCancelling={declineBookingMutation.isPending || cancelBookingMutation.isPending}
        isHost={booking.status === 'pending' && isHost}
      />
    </>
  );
};

export default UV_TripDetails;