import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Types based on Zod schemas
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
  house_rules: string | null;
  preferred_payment_method: string;
  exact_address: string | null;
  directions_landmarks: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface User {
  id: string;
  name: string;
  email: string | null;
  phone_number: string;
  account_type: string;
  is_phone_verified: boolean;
  profile_picture_url: string | null;
  created_at: string;
  updated_at: string;
}

interface Photo {
  id: string;
  villa_id: string;
  url: string;
  description: string | null;
  is_cover_photo: boolean;
  sort_order: number;
  created_at: string;
}

interface Amenity {
  id: string;
  name: string;
  icon_name: string | null;
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
  reviewer?: User;
}

interface VillaResponse {
  villa: Villa;
  host: User;
  photos: Photo[];
  amenities: Amenity[];
  reviews: Review[];
}

const UV_ListingDetails: React.FC = () => {
  const { villa_id } = useParams<{ villa_id: string }>();
  const navigate = useNavigate();
  
  // Global state
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  // const searchFilters = useAppStore(state => state.current_search_filters);
  // const updateSearchFilters = useAppStore(state => state.update_search_filters);

  // Local state for booking widget
  const [bookingDates, setBookingDates] = useState({
    check_in: null as Date | null,
    check_out: null as Date | null,
    num_guests: 1
  });
  const [activeTab, setActiveTab] = useState('description');
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Initialize booking dates from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const checkIn = urlParams.get('check_in');
    const checkOut = urlParams.get('check_out');
    const numGuests = urlParams.get('num_guests');

    setBookingDates({
      check_in: checkIn ? new Date(checkIn) : null,
      check_out: checkOut ? new Date(checkOut) : null,
      num_guests: numGuests ? parseInt(numGuests) : 1
    });
  }, []);

  // Fetch villa details
  const { data: villaData, isLoading, error } = useQuery({
    queryKey: ['villa', villa_id],
    queryFn: async () => {
      const response = await axios.get<VillaResponse>(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/villas/${villa_id}`
      );
      return response.data;
    },
    enabled: !!villa_id,
    staleTime: 60000,
    retry: 1
  });

  const handleRequestToBook = () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    if (!bookingDates.check_in || !bookingDates.check_out) {
      alert('Please select check-in and check-out dates');
      return;
    }

    const params = new URLSearchParams({
      check_in: bookingDates.check_in.toISOString().split('T')[0],
      check_out: bookingDates.check_out.toISOString().split('T')[0],
      num_guests: bookingDates.num_guests.toString()
    });

    navigate(`/booking/request/${villa_id}?${params.toString()}`);
  };

  const handleContactHost = () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    navigate(`/inbox`);
  };

  // const formatDate = (date: Date | null) => {
  //   if (!date) return '';
  //   return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  // };

  const calculateTotalPrice = () => {
    if (!villaData || !bookingDates.check_in || !bookingDates.check_out) return 0;
    
    const nights = Math.ceil((bookingDates.check_out.getTime() - bookingDates.check_in.getTime()) / (1000 * 60 * 60 * 24));
    const nightlyTotal = nights * villaData.villa.price_per_night;
    const cleaningFee = villaData.villa.cleaning_fee || 0;
    
    return nightlyTotal + cleaningFee;
  };

  const calculateNights = () => {
    if (!bookingDates.check_in || !bookingDates.check_out) return 0;
    return Math.ceil((bookingDates.check_out.getTime() - bookingDates.check_in.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (isLoading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50">
          <div className="animate-pulse">
            <div className="h-96 bg-gray-300"></div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="h-8 bg-gray-300 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-300 rounded w-1/2 mb-8"></div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                  <div className="h-64 bg-gray-300 rounded"></div>
                  <div className="h-64 bg-gray-300 rounded"></div>
                </div>
                <div className="h-96 bg-gray-300 rounded sticky top-4"></div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !villaData) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Property not found</h1>
            <p className="text-gray-600 mb-4">The property you're looking for doesn't exist or has been removed.</p>
            <Link to="/search" className="text-blue-600 hover:text-blue-700 font-medium">
              Back to search
            </Link>
          </div>
        </div>
      </>
    );
  }

  const { villa, host, photos, amenities, reviews } = villaData;
  const coverPhoto = photos.find(p => p.is_cover_photo) || photos[0];

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Photo Gallery */}
        <div className="relative">
          {photos.length > 0 ? (
            <>
              <div className="h-96 md:h-screen max-h-screen bg-gray-200">
                <img
                  src={photos[currentPhotoIndex]?.url}
                  alt={photos[currentPhotoIndex]?.description || villa.title}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Photo Navigation */}
              {photos.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length)}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCurrentPhotoIndex((prev) => (prev + 1) % photos.length)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full shadow-lg transition-all"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
              
              {/* Photo Counter */}
              {photos.length > 1 && (
                <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                  {currentPhotoIndex + 1} / {photos.length}
                </div>
              )}
            </>
          ) : (
            <div className="h-96 bg-gray-200 flex items-center justify-center">
              <p className="text-gray-500">No photos available</p>
            </div>
          )}
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Property Header */}
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{villa.title}</h1>
                <div className="flex items-center space-x-4 text-gray-600">
                  <span className="flex items-center">
                    <svg className="w-5 h-5 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    4.8 (24 reviews)
                  </span>
                  <span>·</span>
                  <span>{villa.property_type}</span>
                  <span>·</span>
                  <span>{villa.exact_address?.split(',')[0] || 'Location not specified'}</span>
                </div>
              </div>

              {/* Property Details Grid */}
              <div className="grid grid-cols-4 gap-4 py-6 border-y border-gray-200">
                <div className="text-center">
                  <svg className="w-6 h-6 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-sm font-medium text-gray-900">{villa.num_guests} guests</p>
                </div>
                <div className="text-center">
                  <svg className="w-6 h-6 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  <p className="text-sm font-medium text-gray-900">{villa.num_bedrooms} bedrooms</p>
                </div>
                <div className="text-center">
                  <svg className="w-6 h-6 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <p className="text-sm font-medium text-gray-900">{villa.num_beds} beds</p>
                </div>
                <div className="text-center">
                  <svg className="w-6 h-6 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  <p className="text-sm font-medium text-gray-900">{villa.num_bathrooms} baths</p>
                </div>
              </div>

              {/* Host Info Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <img
                      src={host.profile_picture_url || `https://picsum.photos/seed/${host.id}/100/100.jpg`}
                      alt={host.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900">Hosted by {host.name}</h3>
                      <p className="text-sm text-gray-600">
                        Joined in {new Date(host.created_at).getFullYear()}
                      </p>
                      {host.is_phone_verified && (
                        <div className="flex items-center mt-1">
                          <svg className="w-4 h-4 text-blue-600 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="text-sm text-blue-600">Verified Host</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleContactHost}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Contact Host
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="border-b border-gray-200">
                  <nav className="flex space-x-8 px-6" aria-label="Tabs">
                    {['description', 'amenities', 'location', 'house-rules', 'reviews'].map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                          activeTab === tab
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
                      </button>
                    ))}
                  </nav>
                </div>

                <div className="p-6">
                  {activeTab === 'description' && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">About this place</h3>
                      <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                        {villa.description || 'No description available.'}
                      </p>
                    </div>
                  )}

                  {activeTab === 'amenities' && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Amenities</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {amenities.map((amenity) => (
                          <div key={amenity.id} className="flex items-center space-x-2">
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-gray-700">{amenity.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'location' && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
                      {villa.exact_address ? (
                        <div>
                          <p className="text-gray-600 mb-4">{villa.exact_address}</p>
                          {villa.directions_landmarks && (
                            <p className="text-gray-600 mb-4">
                              <strong>Directions:</strong> {villa.directions_landmarks}
                            </p>
                          )}
                          {villa.latitude && villa.longitude && (
                            <div className="h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                              <p className="text-gray-500">Map view would be displayed here</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-500">Location details not available</p>
                      )}
                    </div>
                  )}

                  {activeTab === 'house-rules' && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">House Rules</h3>
                      <p className="text-gray-600 whitespace-pre-wrap">
                        {villa.house_rules || 'No specific house rules.'}
                      </p>
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">
                          <strong>Check-in:</strong> After 3:00 PM<br />
                          <strong>Check-out:</strong> Before 11:00 AM<br />
                          <strong>Minimum Nights:</strong> {villa.minimum_nights}
                        </p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'reviews' && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Reviews</h3>
                      {reviews.length > 0 ? (
                        <div className="space-y-4">
                          {reviews.map((review) => (
                            <div key={review.id} className="border-b border-gray-200 pb-4 last:border-0">
                              <div className="flex items-center space-x-3 mb-2">
                                <img
                                  src={review.reviewer?.profile_picture_url || `https://picsum.photos/seed/${review.reviewer_id}/50/50.jpg`}
                                  alt={review.reviewer?.name}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                                <div>
                                  <p className="font-medium text-gray-900">{review.reviewer?.name}</p>
                                  <div className="flex items-center">
                                    <div className="flex text-yellow-400">
                                      {[...Array(5)].map((_, i) => (
                                        <svg
                                          key={i}
                                          className={`w-4 h-4 ${i < review.public_rating ? 'text-yellow-400' : 'text-gray-300'}`}
                                          fill="currentColor"
                                          viewBox="0 0 20 20"
                                        >
                                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                      ))}
                                    </div>
                                    <span className="text-sm text-gray-600 ml-2">
                                      {new Date(review.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {review.public_comment && (
                                <p className="text-gray-600">{review.public_comment}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No reviews yet.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Booking Widget */}
            <div className="lg:sticky lg:top-4 h-fit">
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      LYD {villa.price_per_night}
                      <span className="text-sm font-normal text-gray-500"> / night</span>
                    </p>
                    {reviews.length > 0 && (
                      <div className="flex items-center mt-1">
                        <svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-sm text-gray-600">4.8 (24 reviews)</span>
                      </div>
                    )}
                  </div>
                  {coverPhoto && (
                    <img
                      src={coverPhoto.url}
                      alt={coverPhoto.description || villa.title}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                  )}
                </div>

                <div className="space-y-4">
                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">CHECK-IN</label>
                      <input
                        type="date"
                        value={bookingDates.check_in ? bookingDates.check_in.toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                          const date = e.target.value ? new Date(e.target.value) : null;
                          setBookingDates(prev => ({ ...prev, check_in: date }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">CHECKOUT</label>
                      <input
                        type="date"
                        value={bookingDates.check_out ? bookingDates.check_out.toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                          const date = e.target.value ? new Date(e.target.value) : null;
                          setBookingDates(prev => ({ ...prev, check_out: date }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>

                  {/* Guests */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">GUESTS</label>
                    <select
                      value={bookingDates.num_guests}
                      onChange={(e) => setBookingDates(prev => ({ ...prev, num_guests: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      {[...Array(villa.num_guests)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {i + 1} {i === 0 ? 'guest' : 'guests'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Price Breakdown */}
                  {bookingDates.check_in && bookingDates.check_out && (
                    <div className="border-t border-b border-gray-200 py-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>LYD {villa.price_per_night} x {calculateNights()} nights</span>
                        <span>LYD {villa.price_per_night * calculateNights()}</span>
                      </div>
                      {villa.cleaning_fee && (
                        <div className="flex justify-between text-sm">
                          <span>Cleaning fee</span>
                          <span>LYD {villa.cleaning_fee}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold">
                        <span>Total</span>
                        <span>LYD {calculateTotalPrice()}</span>
                      </div>
                    </div>
                  )}

                  {/* Book Button */}
                  <button
                    onClick={handleRequestToBook}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!currentUser && !!currentUser}
                  >
                    {currentUser ? 'Request to Book' : 'Log in to Book'}
                  </button>

                  <p className="text-xs text-gray-500 text-center">
                    You won't be charged yet
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

export default UV_ListingDetails;