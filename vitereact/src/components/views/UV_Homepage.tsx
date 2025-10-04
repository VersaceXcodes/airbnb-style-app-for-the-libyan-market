import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '@/store/main';
import { Search, MapPin, Calendar, Users, Globe, Home, ChevronDown } from 'lucide-react';

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
    selectDates: 'اختر التواريخ'
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
    selectDates: 'Select dates'
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
          <section className="relative bg-gradient-to-br from-blue-50 to-indigo-100">
            {/* Hero Background */}
            <div className="absolute inset-0">
              <img
                src="https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1920&h=1080&fit=crop"
                alt={t.heroImage}
                className="w-full h-full object-cover opacity-30"
              />
            </div>
            
            {/* Search Container */}
            <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
              <div className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight">
                  {t.subtitle}
                </h1>
                <p className="text-lg md:text-xl text-gray-600">
                  {t.heroImage}
                </p>
              </div>

              {/* Search Form */}
              <form onSubmit={handleSearch} className="bg-white rounded-xl shadow-xl p-6 lg:p-8">
                <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-4 md:gap-4">
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full mt-6 bg-blue-600 text-white py-4 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center space-x-2"
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

          {/* Features Section */}
          <section className="py-12 lg:py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <div className="bg-white p-6 rounded-xl shadow-lg">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {preferredLanguage === 'ar' ? 'ابحث بسهولة' : 'Easy Search'}
                  </h3>
                  <p className="text-gray-600">
                    {preferredLanguage === 'ar' 
                      ? 'ابحث عن أفضل المنتجعات في جميع أنحاء ليبيا'
                      : 'Find the best properties across Libya'}
                  </p>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-lg">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Home className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {preferredLanguage === 'ar' ? 'أماكن فريدة' : 'Unique Places'}
                  </h3>
                  <p className="text-gray-600">
                    {preferredLanguage === 'ar' 
                      ? 'اكتشف أماكن إقامة لا مثيل لها'
                      : 'Discover one-of-a-kind stays'}
                  </p>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-lg">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {preferredLanguage === 'ar' ? 'تجربة آمنة' : 'Safe Experience'}
                  </h3>
                  <p className="text-gray-600">
                    {preferredLanguage === 'ar' 
                      ? 'حجز آمن مع دعم موثوق'
                      : 'Secure booking with trusted support'}
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