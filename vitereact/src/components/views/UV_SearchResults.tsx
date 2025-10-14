import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Types from Zod schemas (defined locally, but not directly used due to type inference)

const UV_SearchResults: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'list' | 'grid' | 'map'>('list');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [bedrooms, setBedrooms] = useState<number>(0);
  const [bathrooms, setBathrooms] = useState<number>(0);

  // Global state
  const language = useAppStore(state => state.ui_preferences.preferred_language);

  // Get current search parameters
  const location = searchParams.get('location') || '';
  const checkIn = searchParams.get('check_in');
  const checkOut = searchParams.get('check_out');
  // const numGuests = searchParams.get('num_guests') || '1';
  const priceMin = searchParams.get('price_min');
  const priceMax = searchParams.get('price_max');
  const propertyTypes = searchParams.get('property_types');
  const amenities = searchParams.get('amenities');
  const bedroomsParam = searchParams.get('bedrooms');
  const bathroomsParam = searchParams.get('bathrooms');

  // Fetch villas based on search parameters
  const {
    data: villas = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['villas', Object.fromEntries(searchParams)],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // Add all search parameters
      searchParams.forEach((value, key) => {
        params.append(key, value);
      });
      
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/villas?${params.toString()}`
      );
      
      // Transform data to include cover photo URL
      return response.data.map((villa: any) => ({
        ...villa,
        cover_photo_url: villa.cover_photo_url || 'https://picsum.photos/seed/default-villa/400/300.jpg'
      }));
    },
    staleTime: 60000,
    refetchOnWindowFocus: false,
    retry: 1
  });

  // Fetch amenities for filters
  const { data: amenitiesList = [] } = useQuery({
    queryKey: ['amenities'],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/amenities`
      );
      return response.data;
    },
    staleTime: 300000 // 5 minutes
  });

  // Initialize filter states from URL params
  useEffect(() => {
    if (priceMin || priceMax) {
      setPriceRange([parseInt(priceMin || '0') || 0, parseInt(priceMax || '10000') || 10000]);
    } else {
      setPriceRange([0, 10000]);
    }
    if (propertyTypes) {
      setSelectedTypes(propertyTypes.split(','));
    } else {
      setSelectedTypes([]);
    }
    if (amenities) {
      setSelectedAmenities(amenities.split(','));
    } else {
      setSelectedAmenities([]);
    }
    if (bedroomsParam) {
      setBedrooms(parseInt(bedroomsParam));
    } else {
      setBedrooms(0);
    }
    if (bathroomsParam) {
      setBathrooms(parseInt(bathroomsParam));
    } else {
      setBathrooms(0);
    }
  }, [priceMin, priceMax, propertyTypes, amenities, bedroomsParam, bathroomsParam]);

  // Reset all filters to initial state
  const resetFilters = useCallback(() => {
    setPriceRange([0, 10000]);
    setSelectedTypes([]);
    setSelectedAmenities([]);
    setBedrooms(0);
    setBathrooms(0);
    
    // Keep the basic search parameters (location, dates, guests) but remove filter parameters
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('price_min');
    newParams.delete('price_max');
    newParams.delete('property_types');
    newParams.delete('amenities');
    newParams.delete('bedrooms');
    newParams.delete('bathrooms');
    
    setSearchParams(newParams);
  }, [searchParams, setSearchParams]);

  

  // Format date range for display
  const formatDateRange = () => {
    if (!checkIn || !checkOut) return location;
    
    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    
    return `${location} · ${startDate.toLocaleDateString('en-US', options)}-${endDate.toLocaleDateString('en-US', options)}`;
  };

  // Property type options
  const propertyTypeOptions = [
    { value: 'apartment', label: 'Apartment' },
    { value: 'villa', label: 'Villa' },
    { value: 'house', label: 'House' },
    { value: 'cabin', label: 'Cabin' },
    { value: 'cottage', label: 'Cottage' },
    { value: 'farmhouse', label: 'Farmhouse' }
  ];

  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Search Summary Bar */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-semibold text-gray-900">
                  {villas.length} {language === 'ar' ? 'مكان' : 'place'}{villas.length !== 1 && (language === 'ar' ? 'ات' : 's')} in {formatDateRange()}
                </h1>
                <Link
                  to="/"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  {language === 'ar' ? 'تعديل' : 'Edit'}
                </Link>
              </div>
              
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {language === 'ar' ? 'قائمة' : 'List'}
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {language === 'ar' ? 'شبكة' : 'Grid'}
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'map' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {language === 'ar' ? 'خريطة' : 'Map'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex gap-6">
            {/* Filter Sidebar */}
            <div className="w-80 flex-shrink-0">
              <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">{language === 'ar' ? 'الفلاتر' : 'Filters'}</h2>
                  <button
                    onClick={resetFilters}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {language === 'ar' ? 'إعادة تعيين' : 'Reset'}
                  </button>
                </div>
                
                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    {language === 'ar' ? 'نطاق السعر' : 'Price range'}
                  </label>
                  <div className="px-2">
                    <input
                      type="range"
                      min="0"
                      max="10000"
                      step="50"
                      value={priceRange[1]}
                      onChange={(e) => {
                        const newRange = [priceRange[0], parseInt(e.target.value)];
                        setPriceRange(newRange);
                        // Update URL immediately
                        const newParams = new URLSearchParams(searchParams);
                        if (newRange[0] > 0) {
                          newParams.set('price_min', newRange[0].toString());
                        } else {
                          newParams.delete('price_min');
                        }
                        if (newRange[1] < 10000) {
                          newParams.set('price_max', newRange[1].toString());
                        } else {
                          newParams.delete('price_max');
                        }
                        setSearchParams(newParams);
                      }}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between mt-2 text-sm text-gray-600">
                      <span>${priceRange[0]}</span>
                      <span>${priceRange[1]}</span>
                    </div>
                  </div>
                </div>

                {/* Property Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    {language === 'ar' ? 'نوع العقار' : 'Property type'}
                  </label>
                  <div className="space-y-2">
                    {propertyTypeOptions.map(type => (
                      <label key={type.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedTypes.includes(type.value)}
                          onChange={(e) => {
                            let newSelectedTypes;
                            if (e.target.checked) {
                              newSelectedTypes = [...selectedTypes, type.value];
                            } else {
                              newSelectedTypes = selectedTypes.filter(t => t !== type.value);
                            }
                            setSelectedTypes(newSelectedTypes);
                            
                            // Update URL immediately
                            const newParams = new URLSearchParams(searchParams);
                            if (newSelectedTypes.length > 0) {
                              newParams.set('property_types', newSelectedTypes.join(','));
                            } else {
                              newParams.delete('property_types');
                            }
                            setSearchParams(newParams);
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">{type.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Amenities */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    {language === 'ar' ? 'المرافق' : 'Amenities'}
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {amenitiesList.map(amenity => (
                      <label key={amenity.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedAmenities.includes(amenity.name)}
                          onChange={(e) => {
                            let newSelectedAmenities;
                            if (e.target.checked) {
                              newSelectedAmenities = [...selectedAmenities, amenity.name];
                            } else {
                              newSelectedAmenities = selectedAmenities.filter(a => a !== amenity.name);
                            }
                            setSelectedAmenities(newSelectedAmenities);
                            
                            // Update URL immediately
                            const newParams = new URLSearchParams(searchParams);
                            if (newSelectedAmenities.length > 0) {
                              newParams.set('amenities', newSelectedAmenities.join(','));
                            } else {
                              newParams.delete('amenities');
                            }
                            setSearchParams(newParams);
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">{amenity.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Bedrooms */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    {language === 'ar' ? 'غرف نوم' : 'Bedrooms'}
                  </label>
                  <select
                    value={bedrooms}
                    onChange={(e) => {
                      const newBedrooms = parseInt(e.target.value);
                      setBedrooms(newBedrooms);
                      
                      // Update URL immediately
                      const newParams = new URLSearchParams(searchParams);
                      if (newBedrooms > 0) {
                        newParams.set('bedrooms', newBedrooms.toString());
                      } else {
                        newParams.delete('bedrooms');
                      }
                      setSearchParams(newParams);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="0">{language === 'ar' ? 'أي' : 'Any'}</option>
                    {[1, 2, 3, 4, 5].map(num => (
                      <option key={num} value={num}>{num}+</option>
                    ))}
                  </select>
                </div>

                {/* Bathrooms */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    {language === 'ar' ? 'حمامات' : 'Bathrooms'}
                  </label>
                  <select
                    value={bathrooms}
                    onChange={(e) => {
                      const newBathrooms = parseInt(e.target.value);
                      setBathrooms(newBathrooms);
                      
                      // Update URL immediately
                      const newParams = new URLSearchParams(searchParams);
                      if (newBathrooms > 0) {
                        newParams.set('bathrooms', newBathrooms.toString());
                      } else {
                        newParams.delete('bathrooms');
                      }
                      setSearchParams(newParams);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="0">{language === 'ar' ? 'أي' : 'Any'}</option>
                    {[1, 2, 3, 4, 5].map(num => (
                      <option key={num} value={num}>{num}+</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Results Area */}
            <div className="flex-1">
              {isLoading ? (
                // Loading State
                <div className="space-y-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
                      <div className="flex gap-4">
                        <div className="w-64 h-48 bg-gray-200 rounded-lg"></div>
                        <div className="flex-1 space-y-3">
                          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                // Error State
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                  <h3 className="text-lg font-medium text-red-900 mb-2">
                    {language === 'ar' ? 'حدث خطأ' : 'Something went wrong'}
                  </h3>
                  <p className="text-red-700 mb-4">
                    {language === 'ar' ? 'لا يمكن تحميل نتائج البحث' : 'Unable to load search results'}
                  </p>
                  <button
                    onClick={() => refetch()}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    {language === 'ar' ? 'حاول مرة أخرى' : 'Try again'}
                  </button>
                </div>
              ) : villas.length === 0 ? (
                // Empty State
                <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                  <div className="text-gray-400 mb-4">
                    <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {language === 'ar' ? 'لا توجد نتائج' : 'No results found'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {language === 'ar' 
                      ? 'حاول تعديل فلاتر البحث للعثور على المزيد من الخيارات'
                      : 'Try adjusting your search filters to find more options'
                    }
                  </p>
                  <button
                    onClick={resetFilters}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {language === 'ar' ? 'بحث جديد' : 'New search'}
                  </button>
                </div>
              ) : viewMode === 'map' ? (
                // Map View
                <div className="bg-white rounded-xl shadow-lg overflow-hidden" style={{ height: '600px' }}>
                  <div className="flex h-full">
                    {/* Map Placeholder */}
                    <div className="flex-1 bg-gray-100 relative">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-gray-400 mb-2">
                            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <p className="text-gray-600">{language === 'ar' ? 'الخريطة التفاعلية' : 'Interactive Map'}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {language === 'ar' ? `${villas.length} عقار في الخريطة` : `${villas.length} properties on map`}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Property List for Map View */}
                    <div className="w-96 overflow-y-auto border-l border-gray-200">
                      <div className="p-4 space-y-4">
                        {villas.map(villa => (
                          <div key={villa.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
                            <div className="flex gap-3">
                              <img
                                src={villa.cover_photo_url}
                                alt={villa.title}
                                className="w-24 h-24 object-cover rounded-lg"
                              />
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">{villa.title}</h3>
                                <p className="text-gray-600 text-xs mt-1">
                                  {villa.num_bedrooms} {language === 'ar' ? 'غرف نوم' : 'bedrooms'} · {villa.num_bathrooms} {language === 'ar' ? 'حمامات' : 'baths'}
                                </p>
                                <p className="text-blue-600 font-semibold text-sm mt-2">
                                  ${villa.price_per_night} <span className="text-gray-500 font-normal">/{language === 'ar' ? 'ليلة' : 'night'}</span>
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // List/Grid View
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-6'}>
                  {villas.map(villa => (
                    <Link key={villa.id} to={`/listing/${villa.id}`} className="block group">
                      <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-200">
                        <div className="relative">
                          <img
                            src={villa.cover_photo_url}
                            alt={villa.title}
                            className={`w-full ${viewMode === 'list' ? 'h-64' : 'h-48'} object-cover`}
                          />
                          {villa.avg_rating && (
                            <div className="absolute top-4 right-4 bg-white px-2 py-1 rounded-lg shadow-md">
                              <div className="flex items-center">
                                <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                <span className="ml-1 text-sm font-semibold">{villa.avg_rating.toFixed(1)}</span>
                                {villa.review_count && (
                                  <span className="ml-1 text-xs text-gray-500">({villa.review_count})</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="p-6">
                          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                            {villa.title}
                          </h3>
                          
                          <div className="mt-2 text-sm text-gray-600">
                            {villa.num_guests} {language === 'ar' ? 'ضيف' : 'guests'} · {villa.num_bedrooms} {language === 'ar' ? 'غرفة نوم' : 'bedrooms'} · {villa.num_bathrooms} {language === 'ar' ? 'حمام' : 'bath'}
                          </div>
                          
                          <div className="mt-4 flex items-center justify-between">
                            <div>
                              <span className="text-2xl font-bold text-gray-900">${villa.price_per_night}</span>
                              <span className="text-gray-500 ml-1">/{language === 'ar' ? 'ليلة' : 'night'}</span>
                            </div>
                            
                            {villa.cleaning_fee && (
                              <div className="text-xs text-gray-500">
                                ${villa.cleaning_fee} {language === 'ar' ? 'رسالة تنظيف' : 'cleaning fee'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_SearchResults;