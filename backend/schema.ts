import { z } from 'zod';

// ==================== USERS ====================

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  password_hash: z.string(),
  phone_number: z.string(),
  account_type: z.enum(['guest', 'host', 'admin']).default('guest'),
  is_phone_verified: z.boolean().default(false),
  profile_picture_url: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const createUserInputSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().nullable(),
  password_hash: z.string().min(8),
  phone_number: z.string().min(10),
  account_type: z.enum(['guest', 'host', 'admin']).default('guest'),
  profile_picture_url: z.string().url().nullable().optional()
});

export const updateUserInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().nullable().optional(),
  phone_number: z.string().min(10).optional(),
  profile_picture_url: z.string().url().nullable().optional(),
  is_phone_verified: z.boolean().optional()
});

export const searchUserInputSchema = z.object({
  query: z.string().optional(),
  account_type: z.enum(['guest', 'host', 'admin']).optional(),
  is_phone_verified: z.boolean().optional(),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['name', 'email', 'created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

export type User = z.infer<typeof userSchema>;
export type CreateUserInput = z.infer<typeof createUserInputSchema>;
export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;
export type SearchUserInput = z.infer<typeof searchUserInputSchema>;

// ==================== VILLAS ====================

export const villaSchema = z.object({
  id: z.string(),
  host_id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  property_type: z.string(),
  num_guests: z.number(),
  num_bedrooms: z.number(),
  num_beds: z.number(),
  num_bathrooms: z.number(),
  price_per_night: z.number(),
  cleaning_fee: z.number().nullable(),
  minimum_nights: z.number().default(1),
  house_rules: z.string().nullable(),
  preferred_payment_method: z.string(),
  exact_address: z.string().nullable(),
  directions_landmarks: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  status: z.enum(['draft', 'listed', 'unlisted']).default('draft'),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const createVillaInputSchema = z.object({
  host_id: z.string(),
  title: z.string().min(1).max(255),
  description: z.string().nullable(),
  property_type: z.enum(['villa', 'cabin', 'apartment', 'cottage', 'farmhouse', 'house']),
  num_guests: z.number().int().positive(),
  num_bedrooms: z.number().int().nonnegative(),
  num_beds: z.number().int().nonnegative(),
  num_bathrooms: z.number().int().nonnegative(),
  price_per_night: z.number().positive(),
  cleaning_fee: z.number().nonnegative().nullable(),
  minimum_nights: z.number().int().positive().default(1),
  house_rules: z.string().nullable(),
  preferred_payment_method: z.enum(['credit_card', 'paypal', 'bank_transfer', 'cash']),
  exact_address: z.string().nullable(),
  directions_landmarks: z.string().nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable()
});

export const updateVillaInputSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().nullable().optional(),
  property_type: z.enum(['villa', 'cabin', 'apartment', 'cottage', 'farmhouse', 'house']).optional(),
  num_guests: z.number().int().positive().optional(),
  num_bedrooms: z.number().int().nonnegative().optional(),
  num_beds: z.number().int().nonnegative().optional(),
  num_bathrooms: z.number().int().nonnegative().optional(),
  price_per_night: z.number().positive().optional(),
  cleaning_fee: z.number().nonnegative().nullable().optional(),
  minimum_nights: z.number().int().positive().optional(),
  house_rules: z.string().nullable().optional(),
  preferred_payment_method: z.enum(['credit_card', 'paypal', 'bank_transfer', 'cash']).optional(),
  exact_address: z.string().nullable().optional(),
  directions_landmarks: z.string().nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  status: z.enum(['draft', 'listed', 'unlisted']).optional()
});

export const searchVillaInputSchema = z.object({
  query: z.string().optional(),
  host_id: z.string().optional(),
  property_type: z.enum(['villa', 'cabin', 'apartment', 'cottage', 'farmhouse', 'house']).optional(),
  num_guests_min: z.number().int().positive().optional(),
  num_guests_max: z.number().int().positive().optional(),
  price_min: z.number().positive().optional(),
  price_max: z.number().positive().optional(),
  status: z.enum(['draft', 'listed', 'unlisted']).optional(),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['title', 'price_per_night', 'created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

export type Villa = z.infer<typeof villaSchema>;
export type CreateVillaInput = z.infer<typeof createVillaInputSchema>;
export type UpdateVillaInput = z.infer<typeof updateVillaInputSchema>;
export type SearchVillaInput = z.infer<typeof searchVillaInputSchema>;

// ==================== AMENITIES ====================

export const amenitySchema = z.object({
  id: z.string(),
  name: z.string(),
  icon_name: z.string().nullable()
});

export const createAmenityInputSchema = z.object({
  name: z.string().min(1).max(100),
  icon_name: z.string().max(50).nullable()
});

export const updateAmenityInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100).optional(),
  icon_name: z.string().max(50).nullable().optional()
});

export const searchAmenityInputSchema = z.object({
  query: z.string().optional(),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['name']).default('name'),
  sort_order: z.enum(['asc', 'desc']).default('asc')
});

export type Amenity = z.infer<typeof amenitySchema>;
export type CreateAmenityInput = z.infer<typeof createAmenityInputSchema>;
export type UpdateAmenityInput = z.infer<typeof updateAmenityInputSchema>;
export type SearchAmenityInput = z.infer<typeof searchAmenityInputSchema>;

// ==================== VILLA AMENITIES (JUNCTION TABLE) ====================

export const villaAmenitySchema = z.object({
  villa_id: z.string(),
  amenity_id: z.string()
});

export const createVillaAmenityInputSchema = z.object({
  villa_id: z.string(),
  amenity_id: z.string()
});

export const updateVillaAmenityInputSchema = z.object({
  villa_id: z.string(),
  amenity_id: z.string(),
  new_amenity_id: z.string().optional()
});

export const searchVillaAmenityInputSchema = z.object({
  villa_id: z.string().optional(),
  amenity_id: z.string().optional(),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0)
});

export type VillaAmenity = z.infer<typeof villaAmenitySchema>;
export type CreateVillaAmenityInput = z.infer<typeof createVillaAmenityInputSchema>;
export type UpdateVillaAmenityInput = z.infer<typeof updateVillaAmenityInputSchema>;
export type SearchVillaAmenityInput = z.infer<typeof searchVillaAmenityInputSchema>;

// ==================== PHOTOS ====================

export const photoSchema = z.object({
  id: z.string(),
  villa_id: z.string(),
  url: z.string(),
  description: z.string().nullable(),
  is_cover_photo: z.boolean().default(false),
  sort_order: z.number().default(0),
  created_at: z.coerce.date()
});

export const createPhotoInputSchema = z.object({
  villa_id: z.string(),
  url: z.string().url(),
  description: z.string().nullable(),
  is_cover_photo: z.boolean().default(false),
  sort_order: z.number().int().nonnegative().default(0)
});

export const updatePhotoInputSchema = z.object({
  id: z.string(),
  url: z.string().url().optional(),
  description: z.string().nullable().optional(),
  is_cover_photo: z.boolean().optional(),
  sort_order: z.number().int().nonnegative().optional()
});

export const searchPhotoInputSchema = z.object({
  villa_id: z.string().optional(),
  is_cover_photo: z.boolean().optional(),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['sort_order', 'created_at']).default('sort_order'),
  sort_order: z.enum(['asc', 'desc']).default('asc')
});

export type Photo = z.infer<typeof photoSchema>;
export type CreatePhotoInput = z.infer<typeof createPhotoInputSchema>;
export type UpdatePhotoInput = z.infer<typeof updatePhotoInputSchema>;
export type SearchPhotoInput = z.infer<typeof searchPhotoInputSchema>;

// ==================== BOOKINGS ====================

export const bookingSchema = z.object({
  id: z.string(),
  villa_id: z.string(),
  guest_id: z.string(),
  host_id: z.string(),
  check_in_date: z.coerce.date(),
  check_out_date: z.coerce.date(),
  num_guests: z.number(),
  total_price: z.number(),
  status: z.enum(['confirmed', 'pending', 'cancelled', 'completed']),
  guest_message: z.string(),
  cancellation_reason: z.string().nullable(),
  cancellation_message: z.string().nullable(),
  check_in_instructions: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export const createBookingInputSchema = z.object({
  villa_id: z.string(),
  guest_id: z.string(),
  check_in_date: z.coerce.date(),
  check_out_date: z.coerce.date(),
  num_guests: z.number().int().positive(),
  guest_message: z.string().min(1),
  check_in_instructions: z.string().nullable().optional()
}).refine((data) => data.check_out_date > data.check_in_date, {
  message: "Check-out date must be after check-in date"
});

export const updateBookingInputSchema = z.object({
  id: z.string(),
  status: z.enum(['confirmed', 'pending', 'cancelled', 'completed']).optional(),
  cancellation_reason: z.string().nullable().optional(),
  cancellation_message: z.string().nullable().optional(),
  check_in_instructions: z.string().nullable().optional()
});

export const searchBookingInputSchema = z.object({
  query: z.string().optional(),
  villa_id: z.string().optional(),
  guest_id: z.string().optional(),
  host_id: z.string().optional(),
  status: z.enum(['confirmed', 'pending', 'cancelled', 'completed']).optional(),
  check_in_date_from: z.coerce.date().optional(),
  check_in_date_to: z.coerce.date().optional(),
  check_out_date_from: z.coerce.date().optional(),
  check_out_date_to: z.coerce.date().optional(),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['check_in_date', 'total_price', 'created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

export type Booking = z.infer<typeof bookingSchema>;
export type CreateBookingInput = z.infer<typeof createBookingInputSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingInputSchema>;
export type SearchBookingInput = z.infer<typeof searchBookingInputSchema>;

// ==================== AVAILABILITY ====================

export const availabilitySchema = z.object({
  id: z.string(),
  villa_id: z.string(),
  date: z.coerce.date(),
  status: z.enum(['available', 'booked', 'blocked']).default('available')
});

export const createAvailabilityInputSchema = z.object({
  villa_id: z.string(),
  date: z.coerce.date(),
  status: z.enum(['available', 'booked', 'blocked']).default('available')
});

export const updateAvailabilityInputSchema = z.object({
  id: z.string(),
  status: z.enum(['available', 'booked', 'blocked']).optional()
});

export const searchAvailabilityInputSchema = z.object({
  villa_id: z.string().optional(),
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
  status: z.enum(['available', 'booked', 'blocked']).optional(),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['date']).default('date'),
  sort_order: z.enum(['asc', 'desc']).default('asc')
});

export type Availability = z.infer<typeof availabilitySchema>;
export type CreateAvailabilityInput = z.infer<typeof createAvailabilityInputSchema>;
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilityInputSchema>;
export type SearchAvailabilityInput = z.infer<typeof searchAvailabilityInputSchema>;

// ==================== MESSAGES ====================

export const messageSchema = z.object({
  id: z.string(),
  thread_id: z.string(),
  sender_id: z.string(),
  receiver_id: z.string(),
  content: z.string(),
  is_read: z.boolean().default(false),
  booking_id: z.string().nullable(),
  created_at: z.coerce.date()
});

export const createMessageInputSchema = z.object({
  thread_id: z.string(),
  sender_id: z.string(),
  receiver_id: z.string(),
  content: z.string().min(1),
  booking_id: z.string().nullable()
}).refine((data) => data.sender_id !== data.receiver_id, {
  message: "Sender and receiver cannot be the same"
});

export const updateMessageInputSchema = z.object({
  id: z.string(),
  is_read: z.boolean().optional()
});

export const searchMessageInputSchema = z.object({
  query: z.string().optional(),
  thread_id: z.string().optional(),
  sender_id: z.string().optional(),
  receiver_id: z.string().optional(),
  booking_id: z.string().optional(),
  is_read: z.boolean().optional(),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

export type Message = z.infer<typeof messageSchema>;
export type CreateMessageInput = z.infer<typeof createMessageInputSchema>;
export type UpdateMessageInput = z.infer<typeof updateMessageInputSchema>;
export type SearchMessageInput = z.infer<typeof searchMessageInputSchema>;

// ==================== REVIEWS ====================

export const reviewSchema = z.object({
  id: z.string(),
  booking_id: z.string(),
  reviewer_id: z.string(),
  reviewee_id: z.string(),
  public_rating: z.number().int().min(1).max(5),
  public_comment: z.string().nullable(),
  private_feedback: z.string().nullable(),
  is_visible: z.boolean().default(false),
  created_at: z.coerce.date()
});

export const createReviewInputSchema = z.object({
  booking_id: z.string(),
  reviewer_id: z.string(),
  reviewee_id: z.string(),
  public_rating: z.number().int().min(1).max(5),
  public_comment: z.string().nullable(),
  private_feedback: z.string().nullable(),
  is_visible: z.boolean().default(false)
}).refine((data) => data.reviewer_id !== data.reviewee_id, {
  message: "Reviewer and reviewee cannot be the same"
});

export const updateReviewInputSchema = z.object({
  id: z.string(),
  public_comment: z.string().nullable().optional(),
  private_feedback: z.string().nullable().optional(),
  is_visible: z.boolean().optional()
});

export const searchReviewInputSchema = z.object({
  query: z.string().optional(),
  booking_id: z.string().optional(),
  reviewer_id: z.string().optional(),
  reviewee_id: z.string().optional(),
  public_rating_min: z.number().int().min(1).max(5).optional(),
  public_rating_max: z.number().int().min(1).max(5).optional(),
  is_visible: z.boolean().optional(),
  limit: z.number().int().positive().default(10),
  offset: z.number().int().nonnegative().default(0),
  sort_by: z.enum(['public_rating', 'created_at']).default('created_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc')
});

export type Review = z.infer<typeof reviewSchema>;
export type CreateReviewInput = z.infer<typeof createReviewInputSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewInputSchema>;
export type SearchReviewInput = z.infer<typeof searchReviewInputSchema>;