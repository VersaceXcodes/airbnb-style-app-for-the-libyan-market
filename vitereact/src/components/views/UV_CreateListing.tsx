import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { CreateVillaInput, Amenity, Villa } from '@/types/zod';
import { MapPin, Upload, Home, Wifi, Car, Tv, Wind, Droplets, ChefHat, BookOpen, X, Check, AlertCircle, Loader2 } from 'lucide-react';

interface PhotoData {
  file: File;
  url: string;
  description: string | null;
  is_cover_photo: boolean;
  sort_order: number;
}

const UV_CreateListing: React.FC = () => {
  const navigate = useNavigate();

  // Auth state - CRITICAL: Individual selectors
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);

  // Form state
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form data
  const [listingForm, setListingForm] = useState<CreateVillaInput>({
    host_id: currentUser?.id || '',
    title: '',
    description: null,
    property_type: 'apartment',
    num_guests: 1,
    num_bedrooms: 0,
    num_beds: 0,
    num_bathrooms: 0,
    price_per_night: 0,
    cleaning_fee: null,
    minimum_nights: 1,
    house_rules: null,
    preferred_payment_method: 'cash',
    exact_address: null,
    directions_landmarks: null,
    latitude: null,
    longitude: null,
  });

  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<PhotoData[]>([]);
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);

  // Redirect if not authenticated or not a host
  useEffect(() => {
    if (!currentUser || currentUser.account_type !== 'host') {
      navigate('/profile');
    } else {
      setListingForm(prev => ({ ...prev, host_id: currentUser.id }));
    }
  }, [currentUser, navigate]);

  // Fetch amenities
  const { data: amenities = [], isLoading: amenitiesLoading } = useQuery({
    queryKey: ['amenities'],
    queryFn: async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/amenities`);
      return response.data;
    },
    staleTime: 60000,
  });

  // Save progress to localStorage
  useEffect(() => {
    const progress = {
      currentStep,
      listingForm,
      selectedAmenities,
      uploadedPhotos: uploadedPhotos.map(p => ({ ...p, file: null })), // Can't store File in localStorage
      blockedDates,
    };
    localStorage.setItem('listing-progress', JSON.stringify(progress));
  }, [currentStep, listingForm, selectedAmenities, uploadedPhotos, blockedDates]);

  // Load progress from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('listing-progress');
    if (saved) {
      try {
        const progress = JSON.parse(saved);
        setCurrentStep(progress.currentStep || 1);
        setListingForm(prev => ({ ...prev, ...progress.listingForm }));
        setSelectedAmenities(progress.selectedAmenities || []);
        setBlockedDates(progress.blockedDates ? progress.blockedDates.map((d: string) => new Date(d)) : []);
      } catch (e) {
        console.error('Failed to load progress:', e);
      }
    }
  }, []);

  // Create villa mutation
  const createVillaMutation = useMutation({
    mutationFn: async (data: CreateVillaInput) => {
      const response = await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/villas`, data, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      return response.data;
    },
    onSuccess: async (villa: Villa) => {
      // Associate amenities
      for (const amenityId of selectedAmenities) {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/villas/${villa.id}/amenities`, 
          { amenity_id: amenityId },
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
      }

      // Upload photos
      for (const photo of uploadedPhotos) {
        await axios.post(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/villas/${villa.id}/photos`,
          {
            url: photo.url,
            description: photo.description,
            is_cover_photo: photo.is_cover_photo,
            sort_order: photo.sort_order,
          },
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
      }

      // Set availability
      if (blockedDates.length > 0) {
        await axios.patch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/villas/${villa.id}/availability`,
          {
            dates: blockedDates.map(date => ({
              date: date.toISOString().split('T')[0],
              status: 'blocked'
            }))
          },
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
      }

      // Update status to listed
      await axios.patch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/villas/${villa.id}`,
        { status: 'listed' },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      // Clear progress
      localStorage.removeItem('listing-progress');
      
      // Navigate to host dashboard
      navigate('/host/dashboard');
    },
    onError: (error: any) => {
      setErrors({ submit: error.response?.data?.message || 'Failed to create listing' });
      setIsSubmitting(false);
    },
  });

  // Step validation
  const validateStep = useCallback((step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (listingForm.num_guests < 1) newErrors.num_guests = 'Must accommodate at least 1 guest';
        if (listingForm.num_bedrooms < 0) newErrors.num_bedrooms = 'Cannot be negative';
        if (listingForm.num_beds < 0) newErrors.num_beds = 'Cannot be negative';
        if (listingForm.num_bathrooms < 0) newErrors.num_bathrooms = 'Cannot be negative';
        break;
      case 2:
        if (!listingForm.exact_address) newErrors.exact_address = 'Address is required';
        break;
      case 4:
        if (uploadedPhotos.length < 5) newErrors.photos = 'At least 5 photos are required';
        if (!uploadedPhotos.some(p => p.is_cover_photo)) newErrors.cover_photo = 'Please select a cover photo';
        break;
      case 5:
        if (!listingForm.title || listingForm.title.length < 10) newErrors.title = 'Title must be at least 10 characters';
        if (!listingForm.description || listingForm.description.length < 50) newErrors.description = 'Description must be at least 50 characters';
        break;
      case 7:
        if (listingForm.price_per_night <= 0) newErrors.price_per_night = 'Price must be greater than 0';
        if (listingForm.minimum_nights < 1) newErrors.minimum_nights = 'Minimum nights must be at least 1';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [listingForm, uploadedPhotos]);

  // Navigation functions
  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 9));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setErrors({});
  };

  const handleSubmit = async () => {
    if (validateStep(currentStep)) {
      setIsSubmitting(true);
      createVillaMutation.mutate(listingForm);
    }
  };

  // Photo handling
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newPhotos: PhotoData[] = files.map((file, index) => ({
      file,
      url: URL.createObjectURL(file),
      description: null,
      is_cover_photo: uploadedPhotos.length === 0 && index === 0,
      sort_order: uploadedPhotos.length + index,
    }));
    setUploadedPhotos(prev => [...prev, ...newPhotos]);
    setErrors({});
  };

  const removePhoto = (index: number) => {
    setUploadedPhotos(prev => {
      const updated = prev.filter((_, i) => i !== index);
      // If cover photo was removed, set first photo as cover
      if (prev[index].is_cover_photo && updated.length > 0) {
        updated[0].is_cover_photo = true;
      }
      return updated.map((p, i) => ({ ...p, sort_order: i }));
    });
  };

  const setCoverPhoto = (index: number) => {
    setUploadedPhotos(prev => prev.map((p, i) => ({ ...p, is_cover_photo: i === index })));
  };

  // Date handling
  const toggleBlockedDate = (date: Date) => {
    setBlockedDates(prev => {
      const exists = prev.some(d => d.toDateString() === date.toDateString());
      if (exists) {
        return prev.filter(d => d.toDateString() !== date.toDateString());
      } else {
        return [...prev, date];
      }
    });
  };

  // Amenity icons
  const getAmenityIcon = (name: string) => {
    const icons: Record<string, React.ReactNode> = {
      'WiFi': <Wifi className="w-5 h-5" />,
      'Parking': <Car className="w-5 h-5" />,
      'TV': <Tv className="w-5 h-5" />,
      'Air Conditioning': <Wind className="w-5 h-5" />,
      'Pool': <Droplets className="w-5 h-5" />,
      'Kitchen': <ChefHat className="w-5 h-5" />,
      'Generator': <Home className="w-5 h-5" />,
      'Water Tank': <Droplets className="w-5 h-5" />,
      'Prayer Mats': <BookOpen className="w-5 h-5" />,
      'Quran': <BookOpen className="w-5 h-5" />,
    };
    return icons[name] || <Home className="w-5 h-5" />;
  };

  const steps = [
    { title: 'Basics', description: 'Property type and capacity' },
    { title: 'Location', description: 'Where your property is located' },
    { title: 'Amenities', description: 'What you offer' },
    { title: 'Photos', description: 'Show off your space' },
    { title: 'Description', description: 'Tell guests about your place' },
    { title: 'Availability', description: 'When guests can book' },
    { title: 'Pricing', description: 'Set your rates' },
    { title: 'House Rules', description: 'Guest requirements' },
    { title: 'Payment', description: 'How you get paid' },
  ];

  if (!currentUser || currentUser.account_type !== 'host') {
    return null;
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create a New Listing</h1>
            <p className="text-gray-600">Complete the steps below to list your property on Dar Libya</p>
          </div>

          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {steps.map((_step, index) => (
                <div key={index} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    currentStep > index + 1
                      ? 'bg-green-600 border-green-600 text-white'
                      : currentStep === index + 1
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-white border-gray-300 text-gray-500'
                  }`}>
                    {currentStep > index + 1 ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-full h-1 mx-2 ${
                      currentStep > index + 1 ? 'bg-green-600' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Step {currentStep} of {steps.length}: {steps[currentStep - 1].title}
              </h2>
              <p className="text-gray-600 mt-1">{steps[currentStep - 1].description}</p>
            </div>
          </div>

          {/* Error Display */}
          {errors.submit && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{errors.submit}</p>
                </div>
              </div>
            </div>
          )}

          {/* Form Content */}
          <div className="bg-white rounded-lg shadow-lg p-6 lg:p-8">
            {/* Step 1: Basics */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Type
                  </label>
                  <select
                    value={listingForm.property_type}
                    onChange={(e) => {
                      setListingForm(prev => ({ ...prev, property_type: e.target.value as any }));
                      setErrors({});
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="apartment">Apartment</option>
                    <option value="house">House</option>
                    <option value="villa">Villa</option>
                    <option value="cottage">Cottage</option>
                    <option value="farmhouse">Farmhouse</option>
                    <option value="cabin">Cabin</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Guests
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={listingForm.num_guests}
                      onChange={(e) => {
                        setListingForm(prev => ({ ...prev, num_guests: parseInt(e.target.value) || 0 }));
                        setErrors({});
                      }}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.num_guests ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.num_guests && (
                      <p className="mt-1 text-sm text-red-600">{errors.num_guests}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Bedrooms
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={listingForm.num_bedrooms}
                      onChange={(e) => {
                        setListingForm(prev => ({ ...prev, num_bedrooms: parseInt(e.target.value) || 0 }));
                        setErrors({});
                      }}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.num_bedrooms ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.num_bedrooms && (
                      <p className="mt-1 text-sm text-red-600">{errors.num_bedrooms}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Beds
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={listingForm.num_beds}
                      onChange={(e) => {
                        setListingForm(prev => ({ ...prev, num_beds: parseInt(e.target.value) || 0 }));
                        setErrors({});
                      }}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.num_beds ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.num_beds && (
                      <p className="mt-1 text-sm text-red-600">{errors.num_beds}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of Bathrooms
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={listingForm.num_bathrooms}
                      onChange={(e) => {
                        setListingForm(prev => ({ ...prev, num_bathrooms: parseInt(e.target.value) || 0 }));
                        setErrors({});
                      }}
                      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        errors.num_bathrooms ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.num_bathrooms && (
                      <p className="mt-1 text-sm text-red-600">{errors.num_bathrooms}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Location */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exact Address (Private - Shared only after booking)
                  </label>
                  <textarea
                    rows={3}
                    value={listingForm.exact_address || ''}
                    onChange={(e) => {
                      setListingForm(prev => ({ ...prev, exact_address: e.target.value }));
                      setErrors({});
                    }}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.exact_address ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter the complete address of your property"
                  />
                  {errors.exact_address && (
                    <p className="mt-1 text-sm text-red-600">{errors.exact_address}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Directions & Landmarks (Public)
                  </label>
                  <textarea
                    rows={3}
                    value={listingForm.directions_landmarks || ''}
                    onChange={(e) => {
                      setListingForm(prev => ({ ...prev, directions_landmarks: e.target.value }));
                      setErrors({});
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Near the Al-Mansourya roundabout, next to the blue building"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex">
                    <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="ml-3">
                      <p className="text-sm text-blue-800">
                        <strong>Map Integration:</strong> In the full version, you'll be able to place a pin on an interactive map to precisely locate your property.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Amenities */}
            {currentStep === 3 && (
              <div className="space-y-6">
                {amenitiesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {amenities.map((amenity: Amenity) => (
                      <label
                        key={amenity.id}
                        className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedAmenities.includes(amenity.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedAmenities.includes(amenity.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAmenities(prev => [...prev, amenity.id]);
                            } else {
                              setSelectedAmenities(prev => prev.filter(id => id !== amenity.id));
                            }
                          }}
                          className="sr-only"
                        />
                        <div className="flex items-center">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            selectedAmenities.includes(amenity.id) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {getAmenityIcon(amenity.name)}
                          </div>
                          <span className="ml-3 text-sm font-medium text-gray-900">{amenity.name}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Photos */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Photos (Minimum 5 required)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      id="photo-upload"
                    />
                    <label htmlFor="photo-upload" className="cursor-pointer">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 10MB</p>
                    </label>
                  </div>
                  {errors.photos && (
                    <p className="mt-1 text-sm text-red-600">{errors.photos}</p>
                  )}
                  {errors.cover_photo && (
                    <p className="mt-1 text-sm text-red-600">{errors.cover_photo}</p>
                  )}
                </div>

                {uploadedPhotos.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">Uploaded Photos ({uploadedPhotos.length})</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {uploadedPhotos.map((photo, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={photo.url}
                            alt={`Photo ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center space-x-2">
                            <button
                              onClick={() => setCoverPhoto(index)}
                              className={`p-2 rounded ${
                                photo.is_cover_photo
                                  ? 'bg-green-600 text-white'
                                  : 'bg-white text-gray-700 hover:bg-gray-100'
                              }`}
                              title={photo.is_cover_photo ? 'Cover Photo' : 'Set as Cover'}
                            >
                              {photo.is_cover_photo ? <Check className="w-4 h-4" /> : <Home className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => removePhoto(index)}
                              className="p-2 bg-red-600 text-white rounded hover:bg-red-700"
                              title="Remove"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          {photo.is_cover_photo && (
                            <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                              Cover
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Description */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Title (50 character limit)
                  </label>
                  <input
                    type="text"
                    maxLength={50}
                    value={listingForm.title}
                    onChange={(e) => {
                      setListingForm(prev => ({ ...prev, title: e.target.value }));
                      setErrors({});
                    }}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.title ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Beautiful Apartment in Tripoli City Center"
                  />
                  <p className="mt-1 text-sm text-gray-500">{listingForm.title.length}/50 characters</p>
                  {errors.title && (
                    <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    rows={6}
                    value={listingForm.description || ''}
                    onChange={(e) => {
                      setListingForm(prev => ({ ...prev, description: e.target.value }));
                      setErrors({});
                    }}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.description ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Describe your property, its unique features, and what makes it special for guests..."
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 6: Availability */}
            {currentStep === 6 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Block Unavailable Dates
                  </label>
                  <p className="text-sm text-gray-600 mb-4">
                    Click on dates to block them. Guests won't be able to book these dates.
                  </p>
                  
                  {/* Simple Calendar Implementation */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-7 gap-2 text-center">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-xs font-medium text-gray-700 py-2">
                          {day}
                        </div>
                      ))}
                      {Array.from({ length: 35 }, (_, i) => {
                        const date = new Date();
                        date.setDate(date.getDate() - date.getDay() + i);
                        const isBlocked = blockedDates.some(d => d.toDateString() === date.toDateString());
                        const isPast = date.getTime() < new Date().setHours(0, 0, 0, 0);
                        
                        return (
                          <button
                            key={i}
                            onClick={() => !isPast && toggleBlockedDate(date)}
                            disabled={isPast}
                            className={`p-2 text-sm rounded transition-colors ${
                              isPast
                                ? 'text-gray-400 cursor-not-allowed'
                                : isBlocked
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                            }`}
                          >
                            {date.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {blockedDates.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Blocked Dates:</p>
                    <div className="flex flex-wrap gap-2">
                      {blockedDates.map((date, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800"
                        >
                          {date.toLocaleDateString()}
                          <button
                            onClick={() => toggleBlockedDate(date)}
                            className="ml-2 text-red-600 hover:text-red-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 7: Pricing */}
            {currentStep === 7 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price per Night (LYD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={listingForm.price_per_night}
                    onChange={(e) => {
                      setListingForm(prev => ({ ...prev, price_per_night: parseFloat(e.target.value) || 0 }));
                      setErrors({});
                    }}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.price_per_night ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.price_per_night && (
                    <p className="mt-1 text-sm text-red-600">{errors.price_per_night}</p>
                  )}
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={listingForm.cleaning_fee !== null}
                      onChange={(e) => {
                        setListingForm(prev => ({
                          ...prev,
                          cleaning_fee: e.target.checked ? 0 : null
                        }));
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Add Cleaning Fee</span>
                  </label>
                  
                  {listingForm.cleaning_fee !== null && (
                    <div className="mt-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={listingForm.cleaning_fee || 0}
                        onChange={(e) => {
                          setListingForm(prev => ({ ...prev, cleaning_fee: parseFloat(e.target.value) || 0 }));
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Cleaning fee amount"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Nights Stay
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={listingForm.minimum_nights}
                    onChange={(e) => {
                      setListingForm(prev => ({ ...prev, minimum_nights: parseInt(e.target.value) || 1 }));
                      setErrors({});
                    }}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.minimum_nights ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.minimum_nights && (
                    <p className="mt-1 text-sm text-red-600">{errors.minimum_nights}</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 8: House Rules */}
            {currentStep === 8 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    House Rules
                  </label>
                  <textarea
                    rows={6}
                    value={listingForm.house_rules || ''}
                    onChange={(e) => {
                      setListingForm(prev => ({ ...prev, house_rules: e.target.value }));
                      setErrors({});
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., No smoking, No parties, Quiet hours after 10 PM, ID required on arrival..."
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Be clear about your expectations to ensure a good experience for both you and your guests.
                  </p>
                </div>
              </div>
            )}

            {/* Step 9: Payment */}
            {currentStep === 9 && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preferred Payment Method
                  </label>
                  <select
                    value={listingForm.preferred_payment_method}
                    onChange={(e) => {
                      setListingForm(prev => ({ ...prev, preferred_payment_method: e.target.value as any }));
                      setErrors({});
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="cash">Cash on Arrival</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                  <p className="mt-2 text-sm text-gray-600">
                    {listingForm.preferred_payment_method === 'cash'
                      ? 'Guests will pay in cash when they arrive at your property.'
                      : 'Your bank details will be shared with guests after booking confirmation.'}
                  </p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex">
                    <Check className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="ml-3">
                      <p className="text-sm text-green-800">
                        <strong>Ready to publish!</strong> Your listing will be visible to guests once you click the Publish button.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={prevStep}
                disabled={currentStep === 1}
                className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Back
              </button>
              
              <button
                onClick={currentStep === 9 ? handleSubmit : nextStep}
                disabled={isSubmitting || createVillaMutation.isPending}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {isSubmitting || createVillaMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {currentStep === 9 ? 'Publishing...' : 'Loading...'}
                  </>
                ) : (
                  currentStep === 9 ? 'Publish Listing' : 'Next'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_CreateListing;