import React, { useState, useEffect, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';

// Types
interface BookingContext {
  booking_id: string;
  reviewer_id: string;
  reviewee_id: string;
  villa_title: string;
}

interface UV_SubmitReviewProps {
  isOpen: boolean;
  onClose: () => void;
  bookingData: BookingContext;
}

// API mutation function
const submitReview = async (data: {
  booking_id: string;
  reviewer_id: string;
  reviewee_id: string;
  public_rating: number;
  public_comment?: string;
  private_feedback?: string;
}) => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/reviews`,
    data,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
      },
    }
  );
  return response.data;
};

const UV_SubmitReview: React.FC<UV_SubmitReviewProps> = ({ isOpen, onClose, bookingData }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Form state
  const [rating, setRating] = useState<number>(0);
  const [publicComment, setPublicComment] = useState<string>('');
  const [privateFeedback, setPrivateFeedback] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // State from store
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  
  // React Query mutation
  const submitReviewMutation = useMutation({
    mutationFn: submitReview,
    onSuccess: () => {
      // Reset form and close modal
      setRating(0);
      setPublicComment('');
      setPrivateFeedback('');
      setError(null);
      onClose();
    },
    onError: (error: any) => {
      setError(error.response?.data?.message || 'Failed to submit review. Please try again.');
    },
  });
  
  // Handle ESC key
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);
  
  // Focus management
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validation
    if (rating === 0) {
      setError('Please select a star rating');
      return;
    }
    
    // Submit review
    submitReviewMutation.mutate({
      booking_id: bookingData.booking_id,
      reviewer_id: bookingData.reviewer_id,
      reviewee_id: bookingData.reviewee_id,
      public_rating: rating,
      public_comment: publicComment || null,
      private_feedback: privateFeedback || null,
    });
  };
  
  // Handle rating click
  const handleRatingClick = (value: number) => {
    setRating(value);
    setError(null);
  };
  
  // Handle changing text inputs
  const handlePublicCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPublicComment(e.target.value);
    setError(null);
  };
  
  const handlePrivateFeedbackChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrivateFeedback(e.target.value);
    setError(null);
  };
  
  // Star rating component
  const StarRating = () => {
    const [hoverRating, setHoverRating] = useState<number>(0);
    
    return (
      <div className="flex space-x-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className="text-4xl transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-blue-100 rounded-lg p-1"
            onClick={() => handleRatingClick(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
          >
            <span className={`${star <= (hoverRating || rating) ? 'text-yellow-400' : 'text-gray-300'}`}>
              ★
            </span>
          </button>
        ))}
      </div>
    );
  };
  
  if (!isOpen) return null;
  
  return (
    <>
      {/* Modal overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={onClose}
      >
        {/* Modal content */}
        <div
          ref={modalRef}
          className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto focus:outline-none"
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">
              Your experience at {bookingData.villa_title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200 p-2 hover:bg-gray-100 rounded-lg"
              aria-label="Close review modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Error message */}
            {error && (
              <div 
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md"
                aria-live="polite"
              >
                <p className="text-sm">{error}</p>
              </div>
            )}
            
            {/* Star Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Overall Rating <span className="text-red-500">*</span>
              </label>
              <StarRating />
              {rating > 0 && (
                <p className="mt-2 text-sm text-gray-600">
                  You selected {rating} star{rating !== 1 ? 's' : ''}
                </p>
              )}
            </div>
            
            {/* Public Comment */}
            <div>
              <label htmlFor="public_comment" className="block text-sm font-medium text-gray-700 mb-2">
                Public Comment
              </label>
              <textarea
                id="public_comment"
                rows={4}
                value={publicComment}
                onChange={handlePublicCommentChange}
                placeholder="Share your experience with other guests (this will be visible publicly)"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-colors duration-200 resize-none"
                disabled={submitReviewMutation.isLoading}
              />
              <p className="mt-1 text-xs text-gray-500">
                This will be visible on the listing and host profile
              </p>
            </div>
            
            {/* Private Feedback */}
            <div>
              <label htmlFor="private_feedback" className="block text-sm font-medium text-gray-700 mb-2">
                Private Feedback
              </label>
              <textarea
                id="private_feedback"
                rows={3}
                value={privateFeedback}
                onChange={handlePrivateFeedbackChange}
                placeholder="Any sensitive feedback for the Dar Libya team (this will not be shared publicly)"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-colors duration-200 resize-none"
                disabled={submitReviewMutation.isLoading}
              />
              <p className="mt-1 text-xs text-gray-500">
                This is only visible to the Dar Libya support team
              </p>
            </div>
            
            {/* Blind Review Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    <strong>Blind Review System:</strong> Your review will only be visible after both you and {bookingData.reviewee_id === bookingData.reviewer_id ? 'the other party' : 'the host'} have submitted reviews, or after 14 days. This encourages honest feedback.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={submitReviewMutation.isLoading}
                className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitReviewMutation.isLoading}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {submitReviewMutation.isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  'Submit Review'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default UV_SubmitReview;