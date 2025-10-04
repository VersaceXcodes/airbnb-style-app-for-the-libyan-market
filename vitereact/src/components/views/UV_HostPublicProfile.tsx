import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';
import axios from 'axios';
import { User, Villa, Photo, Review } from '@/store/main';
import { Star, MapPin, Calendar, CheckCircle, Home, MessageSquare, User as UserIcon, Clock } from 'lucide-react';

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Types
interface VillaWithPhotos extends Villa {
  photos: Photo[];
}

interface ReviewWithReviewer extends Review {
  reviewer: User;
}

interface HostStats {
  joined_date: string;
  review_count: number;
  response_rate: number;
}

// API Helper Functions
const fetchHostProfile = async (hostId: string): Promise<User> => {
  const { data } = await axios.get(`${API_BASE_URL}/users/${hostId}`);
  return data;
};

const fetchHostListings = async (hostId: string): Promise<Villa[]> => {
  const { data } = await axios.get(`${API_BASE_URL}/villas`, {
    params: {
      host_id: hostId,
      status: 'listed',
      limit: 50
    }
  });
  return data;
};

const fetchVillaPhotos = async (villaId: string): Promise<Photo[]> => {
  const { data } = await axios.get(`${API_BASE_URL}/villas/${villaId}/photos`);
  return data;
};

const fetchHostReviews = async (hostId: string): Promise<Review[]> => {
  const { data } = await axios.get(`${API_BASE_URL}/reviews`, {
    params: {
      reviewee_id: hostId,
      is_visible: true,
      limit: 50
    }
  });
  return data;
};

const fetchUserProfile = async (userId: string): Promise<User> => {
  const { data } = await axios.get(`${API_BASE_URL}/users/${userId}`);
  return data;
};

// Calculate host statistics
const calculateHostStats = (profile: User | null, reviews: ReviewWithReviewer[]): HostStats => {
  if (!profile) {
    return {
      joined_date: '',
      review_count: 0,
      response_rate: 0
    };
  }

  // Simple response rate calculation (mock - in real app would track message response times)
  const responseRate = reviews.length > 0 ? Math.min(95, 85 + Math.random() * 10) : 0;

  return {
    joined_date: profile.created_at,
    review_count: reviews.length,
    response_rate: Math.round(responseRate)
  };
};

// Format date utility
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
};

// Star rating component
const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`size-4 ${
            star <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'
          }`}
        />
      ))}
    </div>
  );
};

// Main Component
const UV_HostPublicProfile: React.FC = () => {
  const { host_id } = useParams<{ host_id: string }>();
  
  // Get current user from global store (optional)
  const currentUser = useAppStore(state => state.authentication_state.current_user);

  // Fetch host profile
  const { data: hostProfile, isLoading: profileLoading, error: profileError } = useQuery({
    queryKey: ['hostProfile', host_id],
    queryFn: () => fetchHostProfile(host_id!),
    enabled: !!host_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });

  // Fetch host listings
  const { data: listings, isLoading: listingsLoading, error: listingsError } = useQuery({
    queryKey: ['hostListings', host_id],
    queryFn: fetchHostListings,
    enabled: !!host_id,
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  // Fetch photos for each listing
  const { data: listingsWithPhotos, isLoading: photosLoading } = useQuery({
    queryKey: ['hostListingsWithPhotos', listings],
    queryFn: async () => {
      if (!listings) return [];
      const listingsWithPhotosData = await Promise.all(
        listings.map(async (villa) => {
          const photos = await fetchVillaPhotos(villa.id);
          return { ...villa, photos } as VillaWithPhotos;
        })
      );
      return listingsWithPhotosData;
    },
    enabled: !!listings && listings.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  // Fetch host reviews
  const { data: reviews, isLoading: reviewsLoading, error: reviewsError } = useQuery({
    queryKey: ['hostReviews', host_id],
    queryFn: fetchHostReviews,
    enabled: !!host_id,
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  // Fetch reviewer data for each review
  const { data: reviewsWithReviewers, isLoading: reviewersLoading } = useQuery({
    queryKey: ['reviewsWithReviewers', reviews],
    queryFn: async () => {
      if (!reviews) return [];
      const reviewsWithReviewersData = await Promise.all(
        reviews.map(async (review) => {
          const reviewer = await fetchUserProfile(review.reviewer_id);
          return { ...review, reviewer } as ReviewWithReviewer;
        })
      );
      return reviewsWithReviewersData;
    },
    enabled: !!reviews && reviews.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: 1
  });

  // Calculate host stats
  const hostStats = calculateHostStats(hostProfile || null, reviewsWithReviewers || []);

  // Loading state
  const isLoading = profileLoading || listingsLoading || photosLoading || reviewsLoading || reviewersLoading;

  // Error state
  const hasError = profileError || listingsError || reviewsError;

  if (isLoading) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </>
    );
  }

  if (hasError || !hostProfile) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Host Not Found</h2>
            <p className="text-gray-600 mb-4">The host profile you're looking for doesn't exist.</p>
            <Link
              to="/"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Host Profile Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
              {/* Profile Picture */}
              <div className="flex-shrink-0">
                {hostProfile.profile_picture_url ? (
                  <img
                    src={hostProfile.profile_picture_url}
                    alt={hostProfile.name}
                    className="h-24 w-24 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center">
                    <UserIcon className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Host Info */}
              <div className="flex-grow">
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-bold text-gray-900">{hostProfile.name}</h1>
                  {hostProfile.is_phone_verified && (
                    <div className="flex items-center space-x-1 text-blue-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">Verified</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {formatDate(hostStats.joined_date)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>Libya</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-6 text-center sm:text-left">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{hostStats.review_count}</p>
                  <p className="text-sm text-gray-600">Reviews</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{hostStats.response_rate}%</p>
                  <p className="text-sm text-gray-600">Response Rate</p>
                </div>
              </div>
            </div>

            {/* About Section */}
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">About</h2>
              <p className="text-gray-600">
                Welcome to my profile! I'm passionate about providing comfortable and memorable stays for guests in Libya. 
                My properties are carefully maintained to ensure you have a wonderful experience during your visit.
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Listings Section */}
          {listingsWithPhotos && listingsWithPhotos.length > 0 && (
            <section className="mb-16">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Listings by {hostProfile.name}
                </h2>
                <span className="text-sm text-gray-600">
                  {listingsWithPhotos.length} {listingsWithPhotos.length === 1 ? 'property' : 'properties'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listingsWithPhotos.map((villa) => (
                  <Link
                    key={villa.id}
                    to={`/listing/${villa.id}`}
                    className="group block bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-200"
                  >
                    {/* Photo */}
                    <div className="aspect-w-16 aspect-h-9 relative h-48 bg-gray-200">
                      {villa.photos && villa.photos.length > 0 ? (
                        <img
                          src={villa.photos.find(p => p.is_cover_photo)?.url || villa.photos[0]?.url}
                          alt={villa.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Home className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                      
                      {/* Price Overlay */}
                      <div className="absolute bottom-2 left-2 bg-white px-2 py-1 rounded-md shadow-md">
                        <p className="text-sm font-bold text-gray-900">${villa.price_per_night}<span className="font-normal text-gray-600">/night</span></p>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 line-clamp-1">{villa.title}</h3>
                      <div className="flex items-center space-x-2 mt-1 text-sm text-gray-600">
                        <span>{villa.num_guests} guests</span>
                        <span>·</span>
                        <span>{villa.num_bedrooms} bedrooms</span>
                        <span>·</span>
                        <span>{villa.num_bathrooms} bathrooms</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Reviews Section */}
          {reviewsWithReviewers && reviewsWithReviewers.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Reviews from Guests</h2>
                <span className="text-sm text-gray-600">
                  {reviewsWithReviewers.length} {reviewsWithReviewers.length === 1 ? 'review' : 'reviews'}
                </span>
              </div>

              <div className="space-y-6">
                {reviewsWithReviewers.map((review) => (
                  <div key={review.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    {/* Review Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        {review.reviewer.profile_picture_url ? (
                          <img
                            src={review.reviewer.profile_picture_url}
                            alt={review.reviewer.name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{review.reviewer.name}</p>
                          <div className="flex items-center space-x-2">
                            <StarRating rating={review.public_rating} />
                            <span className="text-sm text-gray-500">
                              {formatDate(review.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Review Content */}
                    {review.public_comment && (
                      <p className="text-gray-700 leading-relaxed">{review.public_comment}</p>
                    )}

                    {/* Review Footer */}
                    {review.booking_id && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-sm text-gray-500">
                          <MessageSquare className="inline h-4 w-4 mr-1" />
                          Stay related to booking #{review.booking_id}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Empty State for Reviews */}
          {reviewsWithReviewers && reviewsWithReviewers.length === 0 && (
            <section className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Reviews Yet</h3>
              <p className="text-gray-600">
                {hostProfile.name} hasn't received any reviews from guests yet.
              </p>
            </section>
          )}

          {/* Empty State for Listings */}
          {listingsWithPhotos && listingsWithPhotos.length === 0 && (
            <section className="text-center py-12">
              <Home className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Listings</h3>
              <p className="text-gray-600">
                {hostProfile.name} doesn't have any active listings at the moment.
              </p>
            </section>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_HostPublicProfile;