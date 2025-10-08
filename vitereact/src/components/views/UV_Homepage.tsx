import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';
import { Search, MapPin, Calendar, Users, Globe, Home, ChevronDown, Star, Quote, TrendingUp, Shield, Award } from 'lucide-react';

const UV_Homepage: React.FC = () => {
  // Individual Zustand selectors - CRITICAL: no object destructuring
  const preferredLanguage = useAppStore(state => state.ui_preferences.preferred_language);
  const setLanguage = useAppStore(state => state.set_language);
  
  const navigate = useNavigate();
  const [searchForm, setSearchForm] = useState({
    location: '',
    check_in_date: null as string | null,
    check_out_date: null as string | null,
    num_guests: 1
  });
  
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [showGuestSelector, setShowGuestSelector] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerType, setDatePickerType] = useState<'checkin' | 'checkout' | null>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const guestSelectorRef = useRef<HTMLDivElement>(null);
  const datePickerRef = useRef<HTMLDivElement>(null);

  const allLocations = [
    'طرابلس', 'بنغازي', 'مصراتة', 'الزاوية', 'الخمس',
    'سرت', 'أجدابيا', 'طبرق', 'درنة', 'غريان',
    'Zuwarah', 'Al Khums', 'Sabha', 'Murzuq', 'Ghat',
    'Tripoli', 'Benghazi', 'Misrata', 'Sirte', 'Tobruk'
  ];

  const fetchLocationSuggestions = async (query: string) => {
    if (!query || query.length < 2) return [];
    
    return new Promise<string[]>((resolve) => {
      setTimeout(() => {
        const filtered = allLocations.filter(loc => 
          loc.toLowerCase().includes(query.toLowerCase())
        ).slice(0, 8);
        resolve(filtered);
      }, 200);
    });
  };

  const { data: locationSuggestions = [] } = useQuery({
    queryKey: ['locationSuggestions', searchForm.location],
    queryFn: () => fetchLocationSuggestions(searchForm.location),
    enabled: searchForm.location.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const fetchFeaturedListings = async () => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';
    const response = await fetch(`${apiBaseUrl}/api/villas?limit=6`);
    if (!response.ok) {
      throw new Error('Failed to fetch listings');
    }
    return response.json();
  };

  const { data: featuredListings = [], isLoading: isLoadingListings, error: listingsError } = useQuery({
    queryKey: ['featuredListings'],
    queryFn: fetchFeaturedListings,
    staleTime: 5 * 60 * 1000,
  });

  // Handle click outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (locationInputRef.current && !locationInputRef.current.contains(event.target as Node)) {
        setShowLocationSuggestions(false);
      }
      if (guestSelectorRef.current && !guestSelectorRef.current.contains(event.target as Node)) {
        setShowGuestSelector(false);
      }
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
        setDatePickerType(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchForm(prev => ({ ...prev, location: e.target.value }));
    if (e.target.value.length >= 2) {
      setShowLocationSuggestions(true);
    } else {
      setShowLocationSuggestions(false);
    }
  };

  const handleLocationSelect = (location: string) => {
    setSearchForm(prev => ({ ...prev, location }));
    setShowLocationSuggestions(false);
  };

  const handleDateSelect = (date: string, type: 'checkin' | 'checkout') => {
    const newForm = { ...searchForm };
    if (type === 'checkin') {
      newForm.check_in_date = date;
      // Auto set checkout to next day if not set or before checkin
      if (!newForm.check_out_date || new Date(newForm.check_out_date) <= new Date(date)) {
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        newForm.check_out_date = nextDay.toISOString().split('T')[0];
      }
    } else {
      newForm.check_out_date = date;
    }
    setSearchForm(newForm);
    setShowDatePicker(false);
    setDatePickerType(null);
  };

  const handleGuestsChange = (type: 'increase' | 'decrease') => {
    if (type === 'increase') {
      setSearchForm(prev => ({ ...prev, num_guests: prev.num_guests + 1 }));
    } else if (type === 'decrease' && searchForm.num_guests > 1) {
      setSearchForm(prev => ({ ...prev, num_guests: prev.num_guests - 1 }));
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchForm.location) {
      return; // Skip navigation if no location
    }

    const queryParams = new URLSearchParams();
    queryParams.append('location', searchForm.location);
    if (searchForm.check_in_date) queryParams.append('check_in', searchForm.check_in_date);
    if (searchForm.check_out_date) queryParams.append('check_out', searchForm.check_out_date);
    queryParams.append('num_guests', searchForm.num_guests.toString());
    
    navigate(`/search?${queryParams.toString()}`);
  };

  const toggleLanguage = () => {
    setLanguage(preferredLanguage === 'ar' ? 'en' : 'ar');
  };

  // Translations
  const t = preferredLanguage === 'ar' ? {
    title: 'دار ليبيا',
    subtitle: 'اكتشف أفضل الإقامات في ليبيا',
    where: 'أين تذهب؟',
    checkIn: 'تسجيل الوصول',
    checkOut: 'تسجيل المغادرة',
    guests: 'الضيوف',
    guest: 'ضيف',
    guests_plural: 'ضيوف',
    search: 'ابحث',
    becomeHost: 'كن مضيفًا',
    becomeHostDesc: 'استغل منزلك وحقق دخلاً إضافياً',
    listProperty: 'أضف عقارك',
    howItWorks: 'كيف يعمل؟',
    aboutUs: 'من نحن',
    contact: 'اتصل بنا',
    heroImage: 'اكتشف وجهاتك المفضلة في ليبيا',
    anyWeek: 'أي أسبوع',
    selectDates: 'اختر التواريخ',
    testimonials: 'آراء العملاء',
    trustedBy: 'موثوق به من قبل الآلاف',
    stats: 'إحصائيات منصتنا',
    properties: 'عقار',
    happyGuests: 'ضيف سعيد',
    cities: 'مدينة',
    yearsFounded: 'سنوات من الخبرة'
  } : {
    title: 'Dar Libya',
    subtitle: 'Discover the best stays in Libya',
    where: 'Where to?',
    checkIn: 'Check in',
    checkOut: 'Check out',
    guests: 'Guests',
    guest: 'guest',
    guests_plural: 'guests',
    search: 'Search',
    becomeHost: 'Become a Host',
    becomeHostDesc: 'Monetize your space and earn extra income',
    listProperty: 'List Your Property',
    howItWorks: 'How it works',
    aboutUs: 'About us',
    contact: 'Contact',
    heroImage: 'Discover your favorite destinations in Libya',
    anyWeek: 'Any week',
    selectDates: 'Select dates',
    testimonials: 'What Our Guests Say',
    trustedBy: 'Trusted by thousands',
    stats: 'Our Platform Stats',
    properties: 'Properties',
    happyGuests: 'Happy Guests',
    cities: 'Cities',
    yearsFounded: 'Years of Experience'
  };

  return (
    <>
      <div className={`min-h-screen bg-gray-50 ${preferredLanguage === 'ar' ? 'rtl' : 'ltr'}`}>
        {/* Header with language toggle */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link to="/" className="flex items-center space-x-2">
                <Home className="h-8 w-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">{t.title}</span>
              </Link>
              
              <div className="flex items-center space-x-4">
                <Link
                  to="/signup"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors"
                >
                  {preferredLanguage === 'ar' ? 'إنشاء حساب' : 'Sign up'}
                </Link>
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium transition-colors"
                >
                  {preferredLanguage === 'ar' ? 'تسجيل الدخول' : 'Log in'}
                </Link>
                <button
                  onClick={toggleLanguage}
                  className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                  aria-label="Toggle language"
                >
                  <Globe className="h-4 w-4" />
                  <span>{preferredLanguage.toUpperCase()}</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section with Search */}
        <main>
          <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 min-h-[80vh] flex items-center">
            {/* Hero Background */}
            <div className="absolute inset-0 overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1920&h=1080&fit=crop"
                alt={t.heroImage}
                className="w-full h-full object-cover opacity-20"
              />
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/80 via-blue-700/60 to-indigo-800/80"></div>
            </div>
            
            {/* Search Container */}
            <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 w-full">
              <div className="text-center mb-12">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight px-4">
                  {t.subtitle}
                </h1>
                <p className="text-lg sm:text-xl md:text-2xl text-blue-100 mb-8 max-w-4xl mx-auto leading-relaxed px-4">
                  {t.heroImage}
                </p>
                {/* Quick stats */}
                <div className="flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-8 mb-8 px-4">
                  <div className="text-center bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3">
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white">1000+</div>
                    <div className="text-blue-200 text-xs sm:text-sm">
                      {preferredLanguage === 'ar' ? 'عقار' : 'Properties'}
                    </div>
                  </div>
                  <div className="text-center bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3">
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white">4.8★</div>
                    <div className="text-blue-200 text-xs sm:text-sm">
                      {preferredLanguage === 'ar' ? 'تقييم' : 'Rating'}
                    </div>
                  </div>
                  <div className="text-center bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3">
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white">25+</div>
                    <div className="text-blue-200 text-xs sm:text-sm">
                      {preferredLanguage === 'ar' ? 'مدينة' : 'Cities'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Search Form */}
              <form onSubmit={handleSearch} className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 border border-white/20 max-w-5xl mx-auto">
                <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-4 lg:gap-4">
                  {/* Location Input */}
                  <div className="relative" ref={locationInputRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="inline h-4 w-4 mr-1" />
                      {t.where}
                    </label>
                    <input
                      type="text"
                      value={searchForm.location}
                      onChange={handleLocationChange}
                      onFocus={() => searchForm.location.length >= 2 && setShowLocationSuggestions(true)}
                      placeholder={t.where}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      required
                    />
                    
                    {/* Location Suggestions Dropdown */}
                    {showLocationSuggestions && locationSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full bg-white mt-1 border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {locationSuggestions.map((location, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handleLocationSelect(location)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                          >
                            <MapPin className="inline h-4 w-4 mr-2 text-gray-400" />
                            {location}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Check-in Date */}
                  <div className="relative" ref={datePickerRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="inline h-4 w-4 mr-1" />
                      {t.checkIn}
                    </label>
                    <button
                      type="button"
                      onClick={() => { setShowDatePicker(!showDatePicker); setDatePickerType('checkin'); }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-left hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    >
                      {searchForm.check_in_date ? (
                        new Date(searchForm.check_in_date).toLocaleDateString(preferredLanguage === 'ar' ? 'ar-LY' : 'en-US')
                      ) : (
                        <span className="text-gray-400">{t.selectDates}</span>
                      )}
                    </button>

                    {/* Date Picker */}
                    {showDatePicker && datePickerType === 'checkin' && (
                      <div className="absolute z-10 w-full bg-white mt-1 border border-gray-200 rounded-lg shadow-lg p-4">
                        <input
                          type="date"
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => handleDateSelect(e.target.value, 'checkin')}
                          className="w-full"
                          autoFocus
                        />
                      </div>
                    )}
                  </div>

                  {/* Check-out Date */}
                  <div className="relative" ref={datePickerRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="inline h-4 w-4 mr-1" />
                      {t.checkOut}
                    </label>
                    <button
                      type="button"
                      onClick={() => { setShowDatePicker(!showDatePicker); setDatePickerType('checkout'); }}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-left hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    >
                      {searchForm.check_out_date ? (
                        new Date(searchForm.check_out_date).toLocaleDateString(preferredLanguage === 'ar' ? 'ar-LY' : 'en-US')
                      ) : (
                        <span className="text-gray-400">{t.selectDates}</span>
                      )}
                    </button>

                    {/* Date Picker */}
                    {showDatePicker && datePickerType === 'checkout' && (
                      <div className="absolute z-10 w-full bg-white mt-1 border border-gray-200 rounded-lg shadow-lg p-4">
                        <input
                          type="date"
                          min={searchForm.check_in_date || new Date().toISOString().split('T')[0]}
                          onChange={(e) => handleDateSelect(e.target.value, 'checkout')}
                          className="w-full"
                          autoFocus
                        />
                      </div>
                    )}
                  </div>

                  {/* Guests Selector */}
                  <div className="relative" ref={guestSelectorRef}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Users className="inline h-4 w-4 mr-1" />
                      {t.guests}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowGuestSelector(!showGuestSelector)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg text-left hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors flex justify-between items-center"
                    >
                      <span>
                        {searchForm.num_guests} {searchForm.num_guests === 1 ? t.guest : t.guests_plural}
                      </span>
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    </button>

                    {/* Guests Dropdown */}
                    {showGuestSelector && (
                      <div className="absolute z-10 w-full bg-white mt-1 border border-gray-200 rounded-lg shadow-lg p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{t.guests}</span>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleGuestsChange('decrease')}
                              disabled={searchForm.num_guests <= 1}
                              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              -
                            </button>
                            <span className="w-8 text-center">{searchForm.num_guests}</span>
                            <button
                              type="button"
                              onClick={() => handleGuestsChange('increase')}
                              className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-8 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  <Search className="h-5 w-5" />
                  <span>{t.search}</span>
                </button>
              </form>
            </div>
          </section>

          {/* Become a Host Section */}
          <section className="py-12 lg:py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  {t.becomeHost}
                </h2>
                <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                  {t.becomeHostDesc}
                </p>
                <Link
                  to="/signup?account_type=host"
                  className="inline-flex items-center px-8 py-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  <Home className="h-5 w-5 mr-2" />
                  {t.listProperty}
                </Link>
              </div>
            </div>
          </section>

          {/* Featured Listings Section */}
          <section className="py-12 lg:py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  {preferredLanguage === 'ar' ? 'إقامات مميزة' : 'Featured Stays'}
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  {preferredLanguage === 'ar' 
                    ? 'اكتشف أفضل العقارات في ليبيا التي اختارها فريقنا خصيصاً لك'
                    : 'Discover the best properties in Libya handpicked by our team just for you'}
                </p>
              </div>

              {/* Loading State */}
              {isLoadingListings && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[1, 2, 3, 4, 5, 6].map((item) => (
                    <div key={item} className="bg-white rounded-xl shadow-lg overflow-hidden animate-pulse">
                      <div className="h-64 bg-gray-300"></div>
                      <div className="p-6 space-y-4">
                        <div className="h-6 bg-gray-300 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-300 rounded w-full"></div>
                        <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                        <div className="flex justify-between">
                          <div className="h-6 bg-gray-300 rounded w-1/3"></div>
                          <div className="h-6 bg-gray-300 rounded w-16"></div>
                        </div>
                        <div className="flex space-x-4">
                          <div className="h-4 bg-gray-300 rounded w-16"></div>
                          <div className="h-4 bg-gray-300 rounded w-16"></div>
                          <div className="h-4 bg-gray-300 rounded w-16"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Error State */}
              {listingsError && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-red-600 text-2xl">⚠️</span>
                  </div>
                  <p className="text-gray-600 text-lg mb-4">
                    {preferredLanguage === 'ar' 
                      ? 'حدث خطأ في تحميل العقارات'
                      : 'Error loading properties'}
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {preferredLanguage === 'ar' ? 'إعادة المحاولة' : 'Try Again'}
                  </button>
                </div>
              )}

              {/* Featured Listings */}
              {!isLoadingListings && !listingsError && featuredListings.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {featuredListings.map((listing: any, index: number) => (
                    <Link
                      key={listing.id}
                      to={`/listing/${listing.id}`}
                      className="group bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="relative h-64 w-full overflow-hidden">
                        <img
                          src={listing.cover_photo_url || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=600&fit=crop'}
                          alt={listing.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          loading="lazy"
                        />
                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-sm font-semibold">
                          {preferredLanguage === 'ar' ? 'مميز' : 'Featured'}
                        </div>
                        {listing.avg_rating && (
                          <div className="absolute bottom-4 left-4 flex items-center space-x-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full">
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            <span className="font-semibold text-sm">{parseFloat(listing.avg_rating).toFixed(1)}</span>
                          </div>
                        )}
                      </div>
                      <div className="p-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
                          {listing.title}
                        </h3>
                        <p className="text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                          {listing.exact_address || listing.directions_landmarks}
                        </p>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <span className="text-2xl font-bold text-gray-900">
                              {listing.price_per_night} {preferredLanguage === 'ar' ? 'د.ل' : 'LYD'}
                            </span>
                            <span className="text-gray-600">
                              {preferredLanguage === 'ar' ? ' / ليلة' : ' / night'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <div className="flex items-center space-x-4">
                            <span>{listing.num_guests} {preferredLanguage === 'ar' ? 'ضيوف' : 'guests'}</span>
                            <span>•</span>
                            <span>{listing.num_bedrooms} {preferredLanguage === 'ar' ? 'غرف' : 'bedrooms'}</span>
                            <span>•</span>
                            <span>{listing.num_bathrooms} {preferredLanguage === 'ar' ? 'حمامات' : 'baths'}</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!isLoadingListings && !listingsError && featuredListings.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Home className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {preferredLanguage === 'ar' ? 'لا توجد عقارات متاحة' : 'No Properties Available'}
                  </h3>
                  <p className="text-gray-600 text-lg mb-6 max-w-md mx-auto">
                    {preferredLanguage === 'ar' 
                      ? 'نحن نعمل على إضافة عقارات جديدة. تحقق مرة أخرى قريبًا!'
                      : 'We are working on adding new properties. Check back soon!'}
                  </p>
                  <Link
                    to="/signup?account_type=host"
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Home className="h-5 w-5 mr-2" />
                    {preferredLanguage === 'ar' ? 'أضف عقارك' : 'List Your Property'}
                  </Link>
                </div>
              )}

              {/* Call to Action */}
              {!isLoadingListings && featuredListings.length > 0 && (
                <div className="text-center mt-12">
                  <Link
                    to="/search"
                    className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <Search className="h-5 w-5 mr-2" />
                    {preferredLanguage === 'ar' ? 'عرض كل العقارات' : 'View All Properties'}
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* Statistics Section */}
          <section className="py-12 lg:py-16 bg-blue-600">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  {t.stats}
                </h2>
                <p className="text-blue-100 text-lg">
                  {t.trustedBy}
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                <div>
                  <div className="text-4xl md:text-5xl font-bold text-white mb-2">1000+</div>
                  <div className="text-blue-100">{t.properties}</div>
                </div>
                <div>
                  <div className="text-4xl md:text-5xl font-bold text-white mb-2">5000+</div>
                  <div className="text-blue-100">{t.happyGuests}</div>
                </div>
                <div>
                  <div className="text-4xl md:text-5xl font-bold text-white mb-2">25+</div>
                  <div className="text-blue-100">{t.cities}</div>
                </div>
                <div>
                  <div className="text-4xl md:text-5xl font-bold text-white mb-2">5+</div>
                  <div className="text-blue-100">{t.yearsFounded}</div>
                </div>
              </div>
            </div>
          </section>

          {/* Testimonials Section */}
          <section className="py-12 lg:py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                  {t.testimonials}
                </h2>
                <p className="text-lg text-gray-600">
                  {preferredLanguage === 'ar' 
                    ? 'اكتشف تجارب ضيوفنا السعداء'
                    : 'Discover the experiences of our happy guests'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="bg-gray-50 p-8 rounded-xl relative">
                  <Quote className="h-8 w-8 text-blue-600 mb-4" />
                  <p className="text-gray-700 mb-6">
                    {preferredLanguage === 'ar' 
                      ? 'تجربة رائعة! الفيلا كانت نظيفة ومريحة، والموقع ممتاز. بالتأكيد سأحجز مرة أخرى.'
                      : 'Amazing experience! The villa was clean and comfortable, and the location was perfect. Will definitely book again.'}
                  </p>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold mr-4">
                      {preferredLanguage === 'ar' ? 'أ' : 'A'}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {preferredLanguage === 'ar' ? 'أحمد محمد' : 'Ahmed Mohammed'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {preferredLanguage === 'ar' ? 'طرابلس' : 'Tripoli'}
                      </div>
                    </div>
                  </div>
                  <div className="flex mt-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 p-8 rounded-xl relative">
                  <Quote className="h-8 w-8 text-blue-600 mb-4" />
                  <p className="text-gray-700 mb-6">
                    {preferredLanguage === 'ar' 
                      ? 'خدمة عملاء ممتازة والحجز كان سهل جداً. أنصح به بقوة لكل من يريد إقامة مريحة.'
                      : 'Excellent customer service and booking was so easy. Highly recommend for anyone looking for a comfortable stay.'}
                  </p>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold mr-4">
                      {preferredLanguage === 'ar' ? 'ف' : 'F'}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {preferredLanguage === 'ar' ? 'فاطمة علي' : 'Fatima Ali'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {preferredLanguage === 'ar' ? 'بنغازي' : 'Benghazi'}
                      </div>
                    </div>
                  </div>
                  <div className="flex mt-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 p-8 rounded-xl relative md:col-span-2 lg:col-span-1">
                  <Quote className="h-8 w-8 text-blue-600 mb-4" />
                  <p className="text-gray-700 mb-6">
                    {preferredLanguage === 'ar' 
                      ? 'المنصة سهلة الاستخدام والعقارات متنوعة. وجدت ما أبحث عنه بسرعة.'
                      : 'Platform is user-friendly and properties are diverse. Found exactly what I was looking for quickly.'}
                  </p>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold mr-4">
                      {preferredLanguage === 'ar' ? 'م' : 'M'}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {preferredLanguage === 'ar' ? 'محمد الزروق' : 'Mohammed Al-Zarouq'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {preferredLanguage === 'ar' ? 'مصراتة' : 'Misrata'}
                      </div>
                    </div>
                  </div>
                  <div className="flex mt-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="py-12 lg:py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Search className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    {preferredLanguage === 'ar' ? 'ابحث بسهولة' : 'Easy Search'}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {preferredLanguage === 'ar' 
                      ? 'ابحث عن أفضل المنتجعات في جميع أنحاء ليبيا بفلاتر متقدمة وواجهة سهلة الاستخدام'
                      : 'Find the best properties across Libya with advanced filters and user-friendly interface'}
                  </p>
                </div>
                
                <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Shield className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    {preferredLanguage === 'ar' ? 'أماكن موثقة' : 'Verified Places'}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {preferredLanguage === 'ar' 
                      ? 'جميع العقارات مُفتّشة ومُوثقة لضمان جودة الإقامة وراحة الضيوف'
                      : 'All properties are inspected and verified to ensure quality stays and guest comfort'}
                  </p>
                </div>
                
                <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Award className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">
                    {preferredLanguage === 'ar' ? 'تجربة مميزة' : 'Premium Experience'}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {preferredLanguage === 'ar' 
                      ? 'دعم على مدار الساعة وضمان الحجز مع خدمة عملاء متميزة'
                      : '24/7 support and booking guarantee with exceptional customer service'}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <Home className="h-6 w-6" />
                  <span className="text-xl font-bold">{t.title}</span>
                </div>
                <p className="text-gray-400">
                  {preferredLanguage === 'ar' 
                    ? 'اكتشف أفضل الإقامات في ليبيا'
                    : 'Discover the best stays in Libya'}
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-4">{t.aboutUs}</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors">{t.howItWorks}</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">{preferredLanguage === 'ar' ? 'المدونة' : 'Blog'}</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">{preferredLanguage === 'ar' ? 'الوظائف' : 'Careers'}</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold mb-4">{t.contact}</h4>
                <ul className="space-y-2 text-gray-400">
                  <li><a href="#" className="hover:text-white transition-colors">{preferredLanguage === 'ar' ? 'الدعم' : 'Support'}</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">{preferredLanguage === 'ar' ? 'الشروط والأحكام' : 'Terms'}</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">{preferredLanguage === 'ar' ? 'سياسة الخصوصية' : 'Privacy'}</a></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-4">{preferredLanguage === 'ar' ? 'تابعنا' : 'Follow Us'}</h4>
                <div className="flex space-x-4">
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    {preferredLanguage === 'ar' ? 'فيسبوك' : 'Facebook'}
                  </a>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    {preferredLanguage === 'ar' ? 'تويتر' : 'Twitter'}
                  </a>
                  <a href="#" className="text-gray-400 hover:text-white transition-colors">
                    {preferredLanguage === 'ar' ? 'انستغرام' : 'Instagram'}
                  </a>
                </div>
              </div>
            </div>
            
            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
              <p>&copy; 2024 {t.title}. {preferredLanguage === 'ar' ? 'جميع الحقوق محفوظة' : 'All rights reserved'}.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default UV_Homepage;