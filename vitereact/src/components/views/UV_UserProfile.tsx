import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Camera, Edit2, Home, Calendar, Star, MessageCircle, Settings, Check } from 'lucide-react';

// Type definitions
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

interface Booking {
  id: string;
  villa_id: string;
  guest_id: string;
  host_id: string;
  check_in_date: string;
  check_out_date: string;
  num_guests: number;
  total_price: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  guest_message: string;
  villa_title: string;
  exact_address: string | null;
  cover_photo_url: string | null;
  host_name: string;
  host_photo: string | null;
}

interface Villa {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  property_type: string;
  num_guests: number;
  num_bedrooms: number;
  num_beds: number;
  num_bathrooms: number;
  price_per_night: number;
  cleaning_fee: number | null;
  minimum_nights: number;
  status: 'draft' | 'listed' | 'unlisted';
  cover_photo_url: string | null;
  photo_count: number;
}

interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewee_id: string;
  public_rating: number;
  public_comment: string | null;
  private_feedback: string | null;
  is_visible: boolean;
  created_at: string;
  villa_id?: string;
  villa_title?: string;
  reviewee_name?: string;
}

const UV_UserProfile: React.FC = () => {
  // Zustand store selectors (following critical pattern)
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const updateUserProfile = useAppStore(state => state.update_user_profile);
  const preferredLanguage = useAppStore(state => state.ui_preferences.preferred_language);

  // Local state
  const [activeTab, setActiveTab] = useState<'trips' | 'listings' | 'reviews'>('trips');
  const [tripsSubTab, setTripsSubTab] = useState<'upcoming' | 'past'>('upcoming');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    profile_picture_url: ''
  });

  // API configuration
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
  const axiosConfig = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    }
  };

  // Fetch user profile
  const { data: userProfile, isLoading, refetch } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const response = await axios.get(`${apiBase}/api/users/me`, axiosConfig);
      return response.data as User;
    },
    enabled: !!authToken,
    staleTime: 60000
  });

  // Fetch user trips
  const { data: userTrips = [], isLoading: isLoadingTrips } = useQuery({
    queryKey: ['userTrips', tripsSubTab],
    queryFn: async () => {
      const status = tripsSubTab === 'upcoming' ? 'upcoming' : 'past';
      const response = await axios.get(
        `${apiBase}/api/users/me/trips?status=${status}`,
        axiosConfig
      );
      return response.data as Booking[];
    },
    enabled: !!authToken && activeTab === 'trips',
    staleTime: 60000
  });

  // Fetch user listings
  const { data: userListings = [], isLoading: isLoadingListings } = useQuery({
    queryKey: ['userListings'],
    queryFn: async () => {
      const response = await axios.get(`${apiBase}/api/users/me/listings`, axiosConfig);
      return response.data as Villa[];
    },
    enabled: !!authToken && activeTab === 'listings',
    staleTime: 60000
  });

  // Fetch user reviews
  const { data: userReviews = [], isLoading: isLoadingReviews } = useQuery({
    queryKey: ['userReviews'],
    queryFn: async () => {
      if (!currentUser) return [];
      const response = await axios.get(
        `${apiBase}/api/reviews?reviewer_id=${currentUser.id}`,
        axiosConfig
      );

      // Enrich reviews with villa reviewee info
      const enrichedReviews = await Promise.all(
        response.data.map(async (review: Review) => {
          try {
            // Get booking details to get villa info
            const bookingResponse = await axios.get(
              `${apiBase}/api/bookings/${review.booking_id}`,
              axiosConfig
            );
            const booking = bookingResponse.data;
            
            // Get villa details
            const villaResponse = await axios.get(
              `${apiBase}/api/villas/${booking.villa_id}`,
              axiosConfig
            );
            const villa = villaResponse.data;

            // Get reviewee info
            const revieweeResponse = await axios.get(
              `${apiBase}/api/users/${review.reviewee_id}`,
              axiosConfig
            );
            const reviewee = revieweeResponse.data;

            return {
              ...review,
              villa_title: villa.title,
              reviewee_name: reviewee.name
            };
          } catch (error) {
            return review;
          }
        })
      );

      return enrichedReviews as Review[];
    },
    enabled: !!authToken && !!currentUser && activeTab === 'reviews',
    staleTime: 60000
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: Partial<User>) => {
      const response = await axios.patch(
        `${apiBase}/api/users/me`,
        profileData,
        axiosConfig
      );
      return response.data;
    },
    onSuccess: (updatedUser) => {
      updateUserProfile(updatedUser);
      setIsEditingProfile(false);
      refetch();
    }
  });

  // Handle edit profile
  const handleEditProfile = () => {
    if (userProfile) {
      setEditForm({
        name: userProfile.name,
        email: userProfile.email || '',
        profile_picture_url: userProfile.profile_picture_url || ''
      });
      setIsEditingProfile(true);
    }
  };

  // Handle save profile
  const handleSaveProfile = () => {
    updateProfileMutation.mutate(editForm);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(preferredLanguage === 'ar' ? 'ar-LY' : 'en-LY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(preferredLanguage === 'ar' ? 'ar-LY' : 'en-LY', {
      style: 'currency',
      currency: 'LYD'
    }).format(price);
  };

  // Loading state
  if (isLoading) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Profile Header */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
              {/* Profile Picture */}
              <div className="relative group">
                <div className="w-32 h-32 rounded-full bg-gray-200 overflow-hidden">
                  {userProfile?.profile_picture_url ? (
                    <img
                      src={userProfile.profile_picture_url}
                      alt={userProfile.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-300">
                      <span className="text-3xl text-gray-600">
                        {userProfile?.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <button className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-4 h-4" />
                </button>
              </div>

              {/* Profile Info */}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-2 sm:space-y-0 sm:space-x-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">{userProfile?.name}</h1>
                    <div className="flex items-center justify-center sm:justify-start space-x-2 mt-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        userProfile?.is_phone_verified 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {userProfile?.is_phone_verified ? (
                          <>
                            <Check className="w-3 h-3 mr-1" />
                            Verified
                          </>
                        ) : (
                          'Not Verified'
                        )}
                      </span>
                      <span className="text-gray-500 text-sm">
                        Member since {userProfile && formatDate(userProfile.created_at)}
                      </span>
                    </div>
                    <p className="text-gray-600 mt-2">{userProfile?.email || userProfile?.phone_number}</p>
                  </div>
                  <button
                    onClick={handleEditProfile}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Edit Profile</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Edit Profile Form */}
            {isEditingProfile && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">Edit Profile</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-4">
                  <button
                    onClick={() => setIsEditingProfile(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={updateProfileMutation.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="bg-white rounded-xl shadow-lg mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('trips')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'trips'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  My Trips
                </button>
                {(userProfile?.account_type === 'host' || userProfile?.account_type === 'admin') && (
                  <button
                    onClick={() => setActiveTab('listings')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'listings'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    My Listings
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'reviews'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  My Reviews
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            {/* Trips Tab */}
            {activeTab === 'trips' && (
              <>
                {/* Sub-tabs for Trips */}
                <div className="border-b border-gray-200 mb-6">
                  <nav className="flex space-x-8">
                    <button
                      onClick={() => setTripsSubTab('upcoming')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        tripsSubTab === 'upcoming'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Upcoming
                    </button>
                    <button
                      onClick={() => setTripsSubTab('past')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        tripsSubTab === 'past'
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      Past
                    </button>
                  </nav>
                </div>

                {isLoadingTrips ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : userTrips.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {tripsSubTab === 'upcoming' ? 'No upcoming trips' : 'No past trips'}
                    </h3>
                    <p className="text-gray-500">
                      {tripsSubTab === 'upcoming' 
                        ? 'Start planning your next adventure!'
                        : 'Your completed trips will appear here'
                      }
                    </p>
                    <Link
                      to="/"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mt-4"
                    >
                      Explore Properties
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {userTrips.map((trip) => (
                      <div key={trip.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                        <Link to={`/trip/${trip.id}`}>
                          <div className="aspect-w-16 aspect-h-9 bg-gray-200">
                            {trip.cover_photo_url ? (
                              <img
                                src={trip.cover_photo_url}
                                alt={trip.villa_title}
                                className="w-full h-48 object-cover"
                              />
                            ) : (
                              <div className="w-full h-48 flex items-center justify-center bg-gray-300">
                                <Home className="w-12 h-12 text-gray-400" />
                              </div>
                            )}
                          </div>
                        </Link>
                        <div className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-gray-900">{trip.villa_title}</h4>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              trip.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                              trip.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              trip.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {trip.status.charAt(0).toUpperCase() + trip.status.slice(1)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{formatDate(trip.check_in_date)} - {formatDate(trip.check_out_date)}</p>
                          <p className="text-sm text-gray-500 mb-2">{trip.num_guests} guests</p>
                          <p className="text-lg font-semibold text-gray-900">{formatPrice(trip.total_price)}</p>
                          <div className="flex items-center justify-between mt-4">
                            <div className="flex items-center space-x-2">
                              {trip.host_photo ? (
                                <img
                                  src={trip.host_photo}
                                  alt={trip.host_name}
                                  className="w-6 h-6 rounded-full"
                                />
                              ) : null}
                              <span className="text-sm text-gray-600">{trip.host_name}</span>
                            </div>
                            <Link
                              to={`/trip/${trip.id}`}
                              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              View Details
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Listings Tab */}
            {activeTab === 'listings' && (
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">My Properties</h2>
                  <Link
                    to="/host/listing/new"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <span>+ Add New Listing</span>
                  </Link>
                  <Link
                    to="/host/dashboard"
                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-2"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Host Dashboard</span>
                  </Link>
                </div>

                {isLoadingListings ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : userListings.length === 0 ? (
                  <div className="text-center py-12">
                    <Home className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No listings yet</h3>
                    <p className="text-gray-500 mb-4">Start earning by listing your property</p>
                    <Link
                      to="/host/listing/new"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Create Your First Listing
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {userListings.map((listing) => (
                      <div key={listing.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                        <div className="aspect-w-16 aspect-h-9 bg-gray-200 relative">
                          {listing.cover_photo_url ? (
                            <img
                              src={listing.cover_photo_url}
                              alt={listing.title}
                              className="w-full h-48 object-cover"
                            />
                          ) : (
                            <div className="w-full h-48 flex items-center justify-center bg-gray-300">
                              <Home className="w-12 h-12 text-gray-400" />
                            </div>
                          )}
                          {listing.photo_count > 0 && (
                            <span className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                              {listing.photo_count} photos
                            </span>
                          )}
                          <span className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium ${
                            listing.status === 'listed' ? 'bg-green-100 text-green-800' :
                            listing.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                          </span>
                        </div>
                        <div className="p-4">
                          <h4 className="font-semibold text-gray-900 mb-2">{listing.title}</h4>
                          <p className="text-sm text-gray-600 mb-2">
                            {listing.num_bedrooms} beds • {listing.num_bathrooms} baths • {listing.num_guests} guests
                          </p>
                          <div className="flex items-center justify-between">
                            <p className="text-lg font-semibold text-gray-900">{formatPrice(listing.price_per_night)}<span className="text-sm text-gray-500">/night</span></p>
                            <div className="flex space-x-2">
                              <Link
                                to={`/listing/${listing.id}`}
                                className="text-blue-600 hover:text-blue-700 text-sm"
                              >
                                View
                              </Link>
                              <Link
                                to={`/host/listing/${listing.id}/edit`}
                                className="text-gray-600 hover:text-gray-700 text-sm"
                              >
                                Edit
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-6">My Reviews</h2>
                
                {isLoadingReviews ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : userReviews.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews yet</h3>
                    <p className="text-gray-500">Your reviews will appear here after you complete trips</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {userReviews.map((review) => (
                      <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="font-semibold text-gray-900">Review for {review.reviewee_name}</h4>
                            {review.villa_title && (
                              <p className="text-sm text-gray-600">Property: {review.villa_title}</p>
                            )}
                            <p className="text-sm text-gray-500 mt-1">
                              {formatDate(review.created_at)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-5 h-5 ${
                                  star <= review.public_rating
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        {review.public_comment && (
                          <p className="text-gray-700">{review.public_comment}</p>
                        )}
                        {!review.is_visible && (
                          <p className="text-sm text-gray-500 mt-2 italic">
                            This review will be visible once the other party also submits their review
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_UserProfile;