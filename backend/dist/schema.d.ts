import { z } from 'zod';
export declare const userSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    email: z.ZodNullable<z.ZodString>;
    password_hash: z.ZodString;
    phone_number: z.ZodString;
    account_type: z.ZodDefault<z.ZodEnum<["guest", "host", "admin"]>>;
    is_phone_verified: z.ZodDefault<z.ZodBoolean>;
    profile_picture_url: z.ZodNullable<z.ZodString>;
    created_at: z.ZodDate;
    updated_at: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id?: string;
    name?: string;
    email?: string;
    password_hash?: string;
    phone_number?: string;
    account_type?: "guest" | "host" | "admin";
    is_phone_verified?: boolean;
    profile_picture_url?: string;
    created_at?: Date;
    updated_at?: Date;
}, {
    id?: string;
    name?: string;
    email?: string;
    password_hash?: string;
    phone_number?: string;
    account_type?: "guest" | "host" | "admin";
    is_phone_verified?: boolean;
    profile_picture_url?: string;
    created_at?: Date;
    updated_at?: Date;
}>;
export declare const createUserInputSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodNullable<z.ZodString>;
    password_hash: z.ZodString;
    phone_number: z.ZodEffects<z.ZodString, string, string>;
    account_type: z.ZodDefault<z.ZodEnum<["guest", "host", "admin"]>>;
    profile_picture_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    email?: string;
    password_hash?: string;
    phone_number?: string;
    account_type?: "guest" | "host" | "admin";
    profile_picture_url?: string;
}, {
    name?: string;
    email?: string;
    password_hash?: string;
    phone_number?: string;
    account_type?: "guest" | "host" | "admin";
    profile_picture_url?: string;
}>;
export declare const updateUserInputSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    phone_number: z.ZodOptional<z.ZodEffects<z.ZodString, string, string>>;
    profile_picture_url: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    is_phone_verified: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    name?: string;
    email?: string;
    phone_number?: string;
    is_phone_verified?: boolean;
    profile_picture_url?: string;
}, {
    id?: string;
    name?: string;
    email?: string;
    phone_number?: string;
    is_phone_verified?: boolean;
    profile_picture_url?: string;
}>;
export declare const searchUserInputSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    account_type: z.ZodOptional<z.ZodEnum<["guest", "host", "admin"]>>;
    is_phone_verified: z.ZodOptional<z.ZodBoolean>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sort_by: z.ZodDefault<z.ZodEnum<["name", "email", "created_at"]>>;
    sort_order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    account_type?: "guest" | "host" | "admin";
    is_phone_verified?: boolean;
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: "name" | "email" | "created_at";
    sort_order?: "asc" | "desc";
}, {
    account_type?: "guest" | "host" | "admin";
    is_phone_verified?: boolean;
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: "name" | "email" | "created_at";
    sort_order?: "asc" | "desc";
}>;
export type User = z.infer<typeof userSchema>;
export type CreateUserInput = z.infer<typeof createUserInputSchema>;
export type UpdateUserInput = z.infer<typeof updateUserInputSchema>;
export type SearchUserInput = z.infer<typeof searchUserInputSchema>;
export declare const villaSchema: z.ZodObject<{
    id: z.ZodString;
    host_id: z.ZodString;
    title: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    property_type: z.ZodString;
    num_guests: z.ZodNumber;
    num_bedrooms: z.ZodNumber;
    num_beds: z.ZodNumber;
    num_bathrooms: z.ZodNumber;
    price_per_night: z.ZodNumber;
    cleaning_fee: z.ZodNullable<z.ZodNumber>;
    minimum_nights: z.ZodDefault<z.ZodNumber>;
    house_rules: z.ZodNullable<z.ZodString>;
    preferred_payment_method: z.ZodString;
    exact_address: z.ZodNullable<z.ZodString>;
    directions_landmarks: z.ZodNullable<z.ZodString>;
    latitude: z.ZodNullable<z.ZodNumber>;
    longitude: z.ZodNullable<z.ZodNumber>;
    status: z.ZodDefault<z.ZodEnum<["draft", "listed", "unlisted"]>>;
    created_at: z.ZodDate;
    updated_at: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id?: string;
    created_at?: Date;
    updated_at?: Date;
    status?: "draft" | "listed" | "unlisted";
    host_id?: string;
    title?: string;
    description?: string;
    property_type?: string;
    num_guests?: number;
    num_bedrooms?: number;
    num_beds?: number;
    num_bathrooms?: number;
    price_per_night?: number;
    cleaning_fee?: number;
    minimum_nights?: number;
    house_rules?: string;
    preferred_payment_method?: string;
    exact_address?: string;
    directions_landmarks?: string;
    latitude?: number;
    longitude?: number;
}, {
    id?: string;
    created_at?: Date;
    updated_at?: Date;
    status?: "draft" | "listed" | "unlisted";
    host_id?: string;
    title?: string;
    description?: string;
    property_type?: string;
    num_guests?: number;
    num_bedrooms?: number;
    num_beds?: number;
    num_bathrooms?: number;
    price_per_night?: number;
    cleaning_fee?: number;
    minimum_nights?: number;
    house_rules?: string;
    preferred_payment_method?: string;
    exact_address?: string;
    directions_landmarks?: string;
    latitude?: number;
    longitude?: number;
}>;
export declare const createVillaInputSchema: z.ZodObject<{
    host_id: z.ZodString;
    title: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    property_type: z.ZodEnum<["villa", "cabin", "apartment", "cottage", "farmhouse", "house"]>;
    num_guests: z.ZodNumber;
    num_bedrooms: z.ZodNumber;
    num_beds: z.ZodNumber;
    num_bathrooms: z.ZodNumber;
    price_per_night: z.ZodNumber;
    cleaning_fee: z.ZodNullable<z.ZodNumber>;
    minimum_nights: z.ZodDefault<z.ZodNumber>;
    house_rules: z.ZodNullable<z.ZodString>;
    preferred_payment_method: z.ZodEnum<["credit_card", "paypal", "bank_transfer", "cash"]>;
    exact_address: z.ZodNullable<z.ZodString>;
    directions_landmarks: z.ZodNullable<z.ZodString>;
    latitude: z.ZodNullable<z.ZodNumber>;
    longitude: z.ZodNullable<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    host_id?: string;
    title?: string;
    description?: string;
    property_type?: "villa" | "cabin" | "apartment" | "cottage" | "farmhouse" | "house";
    num_guests?: number;
    num_bedrooms?: number;
    num_beds?: number;
    num_bathrooms?: number;
    price_per_night?: number;
    cleaning_fee?: number;
    minimum_nights?: number;
    house_rules?: string;
    preferred_payment_method?: "credit_card" | "paypal" | "bank_transfer" | "cash";
    exact_address?: string;
    directions_landmarks?: string;
    latitude?: number;
    longitude?: number;
}, {
    host_id?: string;
    title?: string;
    description?: string;
    property_type?: "villa" | "cabin" | "apartment" | "cottage" | "farmhouse" | "house";
    num_guests?: number;
    num_bedrooms?: number;
    num_beds?: number;
    num_bathrooms?: number;
    price_per_night?: number;
    cleaning_fee?: number;
    minimum_nights?: number;
    house_rules?: string;
    preferred_payment_method?: "credit_card" | "paypal" | "bank_transfer" | "cash";
    exact_address?: string;
    directions_landmarks?: string;
    latitude?: number;
    longitude?: number;
}>;
export declare const updateVillaInputSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    property_type: z.ZodOptional<z.ZodEnum<["villa", "cabin", "apartment", "cottage", "farmhouse", "house"]>>;
    num_guests: z.ZodOptional<z.ZodNumber>;
    num_bedrooms: z.ZodOptional<z.ZodNumber>;
    num_beds: z.ZodOptional<z.ZodNumber>;
    num_bathrooms: z.ZodOptional<z.ZodNumber>;
    price_per_night: z.ZodOptional<z.ZodNumber>;
    cleaning_fee: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    minimum_nights: z.ZodOptional<z.ZodNumber>;
    house_rules: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    preferred_payment_method: z.ZodOptional<z.ZodEnum<["credit_card", "paypal", "bank_transfer", "cash"]>>;
    exact_address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    directions_landmarks: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    latitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    longitude: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    status: z.ZodOptional<z.ZodEnum<["draft", "listed", "unlisted"]>>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    status?: "draft" | "listed" | "unlisted";
    title?: string;
    description?: string;
    property_type?: "villa" | "cabin" | "apartment" | "cottage" | "farmhouse" | "house";
    num_guests?: number;
    num_bedrooms?: number;
    num_beds?: number;
    num_bathrooms?: number;
    price_per_night?: number;
    cleaning_fee?: number;
    minimum_nights?: number;
    house_rules?: string;
    preferred_payment_method?: "credit_card" | "paypal" | "bank_transfer" | "cash";
    exact_address?: string;
    directions_landmarks?: string;
    latitude?: number;
    longitude?: number;
}, {
    id?: string;
    status?: "draft" | "listed" | "unlisted";
    title?: string;
    description?: string;
    property_type?: "villa" | "cabin" | "apartment" | "cottage" | "farmhouse" | "house";
    num_guests?: number;
    num_bedrooms?: number;
    num_beds?: number;
    num_bathrooms?: number;
    price_per_night?: number;
    cleaning_fee?: number;
    minimum_nights?: number;
    house_rules?: string;
    preferred_payment_method?: "credit_card" | "paypal" | "bank_transfer" | "cash";
    exact_address?: string;
    directions_landmarks?: string;
    latitude?: number;
    longitude?: number;
}>;
export declare const searchVillaInputSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    host_id: z.ZodOptional<z.ZodString>;
    property_type: z.ZodOptional<z.ZodEnum<["villa", "cabin", "apartment", "cottage", "farmhouse", "house"]>>;
    num_guests_min: z.ZodOptional<z.ZodNumber>;
    num_guests_max: z.ZodOptional<z.ZodNumber>;
    price_min: z.ZodOptional<z.ZodNumber>;
    price_max: z.ZodOptional<z.ZodNumber>;
    status: z.ZodOptional<z.ZodEnum<["draft", "listed", "unlisted"]>>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sort_by: z.ZodDefault<z.ZodEnum<["title", "price_per_night", "created_at"]>>;
    sort_order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "draft" | "listed" | "unlisted";
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: "created_at" | "title" | "price_per_night";
    sort_order?: "asc" | "desc";
    host_id?: string;
    property_type?: "villa" | "cabin" | "apartment" | "cottage" | "farmhouse" | "house";
    num_guests_min?: number;
    num_guests_max?: number;
    price_min?: number;
    price_max?: number;
}, {
    status?: "draft" | "listed" | "unlisted";
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: "created_at" | "title" | "price_per_night";
    sort_order?: "asc" | "desc";
    host_id?: string;
    property_type?: "villa" | "cabin" | "apartment" | "cottage" | "farmhouse" | "house";
    num_guests_min?: number;
    num_guests_max?: number;
    price_min?: number;
    price_max?: number;
}>;
export type Villa = z.infer<typeof villaSchema>;
export type CreateVillaInput = z.infer<typeof createVillaInputSchema>;
export type UpdateVillaInput = z.infer<typeof updateVillaInputSchema>;
export type SearchVillaInput = z.infer<typeof searchVillaInputSchema>;
export declare const amenitySchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    icon_name: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    name?: string;
    icon_name?: string;
}, {
    id?: string;
    name?: string;
    icon_name?: string;
}>;
export declare const createAmenityInputSchema: z.ZodObject<{
    name: z.ZodString;
    icon_name: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string;
    icon_name?: string;
}, {
    name?: string;
    icon_name?: string;
}>;
export declare const updateAmenityInputSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
    icon_name: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    name?: string;
    icon_name?: string;
}, {
    id?: string;
    name?: string;
    icon_name?: string;
}>;
export declare const searchAmenityInputSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sort_by: z.ZodDefault<z.ZodEnum<["name"]>>;
    sort_order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: "name";
    sort_order?: "asc" | "desc";
}, {
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: "name";
    sort_order?: "asc" | "desc";
}>;
export type Amenity = z.infer<typeof amenitySchema>;
export type CreateAmenityInput = z.infer<typeof createAmenityInputSchema>;
export type UpdateAmenityInput = z.infer<typeof updateAmenityInputSchema>;
export type SearchAmenityInput = z.infer<typeof searchAmenityInputSchema>;
export declare const villaAmenitySchema: z.ZodObject<{
    villa_id: z.ZodString;
    amenity_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    villa_id?: string;
    amenity_id?: string;
}, {
    villa_id?: string;
    amenity_id?: string;
}>;
export declare const createVillaAmenityInputSchema: z.ZodObject<{
    villa_id: z.ZodString;
    amenity_id: z.ZodString;
}, "strip", z.ZodTypeAny, {
    villa_id?: string;
    amenity_id?: string;
}, {
    villa_id?: string;
    amenity_id?: string;
}>;
export declare const updateVillaAmenityInputSchema: z.ZodObject<{
    villa_id: z.ZodString;
    amenity_id: z.ZodString;
    new_amenity_id: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    villa_id?: string;
    amenity_id?: string;
    new_amenity_id?: string;
}, {
    villa_id?: string;
    amenity_id?: string;
    new_amenity_id?: string;
}>;
export declare const searchVillaAmenityInputSchema: z.ZodObject<{
    villa_id: z.ZodOptional<z.ZodString>;
    amenity_id: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit?: number;
    offset?: number;
    villa_id?: string;
    amenity_id?: string;
}, {
    limit?: number;
    offset?: number;
    villa_id?: string;
    amenity_id?: string;
}>;
export type VillaAmenity = z.infer<typeof villaAmenitySchema>;
export type CreateVillaAmenityInput = z.infer<typeof createVillaAmenityInputSchema>;
export type UpdateVillaAmenityInput = z.infer<typeof updateVillaAmenityInputSchema>;
export type SearchVillaAmenityInput = z.infer<typeof searchVillaAmenityInputSchema>;
export declare const photoSchema: z.ZodObject<{
    id: z.ZodString;
    villa_id: z.ZodString;
    url: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    is_cover_photo: z.ZodDefault<z.ZodBoolean>;
    sort_order: z.ZodDefault<z.ZodNumber>;
    created_at: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id?: string;
    created_at?: Date;
    sort_order?: number;
    description?: string;
    villa_id?: string;
    url?: string;
    is_cover_photo?: boolean;
}, {
    id?: string;
    created_at?: Date;
    sort_order?: number;
    description?: string;
    villa_id?: string;
    url?: string;
    is_cover_photo?: boolean;
}>;
export declare const createPhotoInputSchema: z.ZodObject<{
    villa_id: z.ZodString;
    url: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    is_cover_photo: z.ZodDefault<z.ZodBoolean>;
    sort_order: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    sort_order?: number;
    description?: string;
    villa_id?: string;
    url?: string;
    is_cover_photo?: boolean;
}, {
    sort_order?: number;
    description?: string;
    villa_id?: string;
    url?: string;
    is_cover_photo?: boolean;
}>;
export declare const updatePhotoInputSchema: z.ZodObject<{
    id: z.ZodString;
    url: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    is_cover_photo: z.ZodOptional<z.ZodBoolean>;
    sort_order: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    sort_order?: number;
    description?: string;
    url?: string;
    is_cover_photo?: boolean;
}, {
    id?: string;
    sort_order?: number;
    description?: string;
    url?: string;
    is_cover_photo?: boolean;
}>;
export declare const searchPhotoInputSchema: z.ZodObject<{
    villa_id: z.ZodOptional<z.ZodString>;
    is_cover_photo: z.ZodOptional<z.ZodBoolean>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sort_by: z.ZodDefault<z.ZodEnum<["sort_order", "created_at"]>>;
    sort_order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    limit?: number;
    offset?: number;
    sort_by?: "created_at" | "sort_order";
    sort_order?: "asc" | "desc";
    villa_id?: string;
    is_cover_photo?: boolean;
}, {
    limit?: number;
    offset?: number;
    sort_by?: "created_at" | "sort_order";
    sort_order?: "asc" | "desc";
    villa_id?: string;
    is_cover_photo?: boolean;
}>;
export type Photo = z.infer<typeof photoSchema>;
export type CreatePhotoInput = z.infer<typeof createPhotoInputSchema>;
export type UpdatePhotoInput = z.infer<typeof updatePhotoInputSchema>;
export type SearchPhotoInput = z.infer<typeof searchPhotoInputSchema>;
export declare const bookingSchema: z.ZodObject<{
    id: z.ZodString;
    villa_id: z.ZodString;
    guest_id: z.ZodString;
    host_id: z.ZodString;
    check_in_date: z.ZodDate;
    check_out_date: z.ZodDate;
    num_guests: z.ZodNumber;
    total_price: z.ZodNumber;
    status: z.ZodEnum<["confirmed", "pending", "cancelled", "completed"]>;
    guest_message: z.ZodString;
    cancellation_reason: z.ZodNullable<z.ZodString>;
    cancellation_message: z.ZodNullable<z.ZodString>;
    check_in_instructions: z.ZodNullable<z.ZodString>;
    created_at: z.ZodDate;
    updated_at: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id?: string;
    created_at?: Date;
    updated_at?: Date;
    status?: "confirmed" | "pending" | "cancelled" | "completed";
    host_id?: string;
    num_guests?: number;
    villa_id?: string;
    guest_id?: string;
    check_in_date?: Date;
    check_out_date?: Date;
    total_price?: number;
    guest_message?: string;
    cancellation_reason?: string;
    cancellation_message?: string;
    check_in_instructions?: string;
}, {
    id?: string;
    created_at?: Date;
    updated_at?: Date;
    status?: "confirmed" | "pending" | "cancelled" | "completed";
    host_id?: string;
    num_guests?: number;
    villa_id?: string;
    guest_id?: string;
    check_in_date?: Date;
    check_out_date?: Date;
    total_price?: number;
    guest_message?: string;
    cancellation_reason?: string;
    cancellation_message?: string;
    check_in_instructions?: string;
}>;
export declare const createBookingInputSchema: z.ZodEffects<z.ZodObject<{
    villa_id: z.ZodString;
    guest_id: z.ZodString;
    check_in_date: z.ZodDate;
    check_out_date: z.ZodDate;
    num_guests: z.ZodNumber;
    guest_message: z.ZodString;
    check_in_instructions: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    num_guests?: number;
    villa_id?: string;
    guest_id?: string;
    check_in_date?: Date;
    check_out_date?: Date;
    guest_message?: string;
    check_in_instructions?: string;
}, {
    num_guests?: number;
    villa_id?: string;
    guest_id?: string;
    check_in_date?: Date;
    check_out_date?: Date;
    guest_message?: string;
    check_in_instructions?: string;
}>, {
    num_guests?: number;
    villa_id?: string;
    guest_id?: string;
    check_in_date?: Date;
    check_out_date?: Date;
    guest_message?: string;
    check_in_instructions?: string;
}, {
    num_guests?: number;
    villa_id?: string;
    guest_id?: string;
    check_in_date?: Date;
    check_out_date?: Date;
    guest_message?: string;
    check_in_instructions?: string;
}>;
export declare const updateBookingInputSchema: z.ZodObject<{
    id: z.ZodString;
    status: z.ZodOptional<z.ZodEnum<["confirmed", "pending", "cancelled", "completed"]>>;
    cancellation_reason: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    cancellation_message: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    check_in_instructions: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    status?: "confirmed" | "pending" | "cancelled" | "completed";
    cancellation_reason?: string;
    cancellation_message?: string;
    check_in_instructions?: string;
}, {
    id?: string;
    status?: "confirmed" | "pending" | "cancelled" | "completed";
    cancellation_reason?: string;
    cancellation_message?: string;
    check_in_instructions?: string;
}>;
export declare const searchBookingInputSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    villa_id: z.ZodOptional<z.ZodString>;
    guest_id: z.ZodOptional<z.ZodString>;
    host_id: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["confirmed", "pending", "cancelled", "completed"]>>;
    check_in_date_from: z.ZodOptional<z.ZodDate>;
    check_in_date_to: z.ZodOptional<z.ZodDate>;
    check_out_date_from: z.ZodOptional<z.ZodDate>;
    check_out_date_to: z.ZodOptional<z.ZodDate>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sort_by: z.ZodDefault<z.ZodEnum<["check_in_date", "total_price", "created_at"]>>;
    sort_order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "confirmed" | "pending" | "cancelled" | "completed";
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: "created_at" | "check_in_date" | "total_price";
    sort_order?: "asc" | "desc";
    host_id?: string;
    villa_id?: string;
    guest_id?: string;
    check_in_date_from?: Date;
    check_in_date_to?: Date;
    check_out_date_from?: Date;
    check_out_date_to?: Date;
}, {
    status?: "confirmed" | "pending" | "cancelled" | "completed";
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: "created_at" | "check_in_date" | "total_price";
    sort_order?: "asc" | "desc";
    host_id?: string;
    villa_id?: string;
    guest_id?: string;
    check_in_date_from?: Date;
    check_in_date_to?: Date;
    check_out_date_from?: Date;
    check_out_date_to?: Date;
}>;
export type Booking = z.infer<typeof bookingSchema>;
export type CreateBookingInput = z.infer<typeof createBookingInputSchema>;
export type UpdateBookingInput = z.infer<typeof updateBookingInputSchema>;
export type SearchBookingInput = z.infer<typeof searchBookingInputSchema>;
export declare const availabilitySchema: z.ZodObject<{
    id: z.ZodString;
    villa_id: z.ZodString;
    date: z.ZodDate;
    status: z.ZodDefault<z.ZodEnum<["available", "booked", "blocked"]>>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    status?: "available" | "booked" | "blocked";
    date?: Date;
    villa_id?: string;
}, {
    id?: string;
    status?: "available" | "booked" | "blocked";
    date?: Date;
    villa_id?: string;
}>;
export declare const createAvailabilityInputSchema: z.ZodObject<{
    villa_id: z.ZodString;
    date: z.ZodDate;
    status: z.ZodDefault<z.ZodEnum<["available", "booked", "blocked"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "available" | "booked" | "blocked";
    date?: Date;
    villa_id?: string;
}, {
    status?: "available" | "booked" | "blocked";
    date?: Date;
    villa_id?: string;
}>;
export declare const updateAvailabilityInputSchema: z.ZodObject<{
    id: z.ZodString;
    status: z.ZodOptional<z.ZodEnum<["available", "booked", "blocked"]>>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    status?: "available" | "booked" | "blocked";
}, {
    id?: string;
    status?: "available" | "booked" | "blocked";
}>;
export declare const searchAvailabilityInputSchema: z.ZodObject<{
    villa_id: z.ZodOptional<z.ZodString>;
    date_from: z.ZodOptional<z.ZodDate>;
    date_to: z.ZodOptional<z.ZodDate>;
    status: z.ZodOptional<z.ZodEnum<["available", "booked", "blocked"]>>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sort_by: z.ZodDefault<z.ZodEnum<["date"]>>;
    sort_order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    status?: "available" | "booked" | "blocked";
    limit?: number;
    offset?: number;
    sort_by?: "date";
    sort_order?: "asc" | "desc";
    villa_id?: string;
    date_from?: Date;
    date_to?: Date;
}, {
    status?: "available" | "booked" | "blocked";
    limit?: number;
    offset?: number;
    sort_by?: "date";
    sort_order?: "asc" | "desc";
    villa_id?: string;
    date_from?: Date;
    date_to?: Date;
}>;
export type Availability = z.infer<typeof availabilitySchema>;
export type CreateAvailabilityInput = z.infer<typeof createAvailabilityInputSchema>;
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilityInputSchema>;
export type SearchAvailabilityInput = z.infer<typeof searchAvailabilityInputSchema>;
export declare const messageSchema: z.ZodObject<{
    id: z.ZodString;
    thread_id: z.ZodString;
    sender_id: z.ZodString;
    receiver_id: z.ZodString;
    content: z.ZodString;
    is_read: z.ZodDefault<z.ZodBoolean>;
    booking_id: z.ZodNullable<z.ZodString>;
    created_at: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id?: string;
    created_at?: Date;
    thread_id?: string;
    sender_id?: string;
    receiver_id?: string;
    content?: string;
    is_read?: boolean;
    booking_id?: string;
}, {
    id?: string;
    created_at?: Date;
    thread_id?: string;
    sender_id?: string;
    receiver_id?: string;
    content?: string;
    is_read?: boolean;
    booking_id?: string;
}>;
export declare const createMessageInputSchema: z.ZodEffects<z.ZodObject<{
    thread_id: z.ZodString;
    sender_id: z.ZodString;
    receiver_id: z.ZodString;
    content: z.ZodString;
    booking_id: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    thread_id?: string;
    sender_id?: string;
    receiver_id?: string;
    content?: string;
    booking_id?: string;
}, {
    thread_id?: string;
    sender_id?: string;
    receiver_id?: string;
    content?: string;
    booking_id?: string;
}>, {
    thread_id?: string;
    sender_id?: string;
    receiver_id?: string;
    content?: string;
    booking_id?: string;
}, {
    thread_id?: string;
    sender_id?: string;
    receiver_id?: string;
    content?: string;
    booking_id?: string;
}>;
export declare const updateMessageInputSchema: z.ZodObject<{
    id: z.ZodString;
    is_read: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    is_read?: boolean;
}, {
    id?: string;
    is_read?: boolean;
}>;
export declare const searchMessageInputSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    thread_id: z.ZodOptional<z.ZodString>;
    sender_id: z.ZodOptional<z.ZodString>;
    receiver_id: z.ZodOptional<z.ZodString>;
    booking_id: z.ZodOptional<z.ZodString>;
    is_read: z.ZodOptional<z.ZodBoolean>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sort_by: z.ZodDefault<z.ZodEnum<["created_at"]>>;
    sort_order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: "created_at";
    sort_order?: "asc" | "desc";
    thread_id?: string;
    sender_id?: string;
    receiver_id?: string;
    is_read?: boolean;
    booking_id?: string;
}, {
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: "created_at";
    sort_order?: "asc" | "desc";
    thread_id?: string;
    sender_id?: string;
    receiver_id?: string;
    is_read?: boolean;
    booking_id?: string;
}>;
export type Message = z.infer<typeof messageSchema>;
export type CreateMessageInput = z.infer<typeof createMessageInputSchema>;
export type UpdateMessageInput = z.infer<typeof updateMessageInputSchema>;
export type SearchMessageInput = z.infer<typeof searchMessageInputSchema>;
export declare const reviewSchema: z.ZodObject<{
    id: z.ZodString;
    booking_id: z.ZodString;
    reviewer_id: z.ZodString;
    reviewee_id: z.ZodString;
    public_rating: z.ZodNumber;
    public_comment: z.ZodNullable<z.ZodString>;
    private_feedback: z.ZodNullable<z.ZodString>;
    is_visible: z.ZodDefault<z.ZodBoolean>;
    created_at: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id?: string;
    created_at?: Date;
    booking_id?: string;
    reviewer_id?: string;
    reviewee_id?: string;
    public_rating?: number;
    public_comment?: string;
    private_feedback?: string;
    is_visible?: boolean;
}, {
    id?: string;
    created_at?: Date;
    booking_id?: string;
    reviewer_id?: string;
    reviewee_id?: string;
    public_rating?: number;
    public_comment?: string;
    private_feedback?: string;
    is_visible?: boolean;
}>;
export declare const createReviewInputSchema: z.ZodEffects<z.ZodObject<{
    booking_id: z.ZodString;
    reviewer_id: z.ZodString;
    reviewee_id: z.ZodString;
    public_rating: z.ZodNumber;
    public_comment: z.ZodNullable<z.ZodString>;
    private_feedback: z.ZodNullable<z.ZodString>;
    is_visible: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    booking_id?: string;
    reviewer_id?: string;
    reviewee_id?: string;
    public_rating?: number;
    public_comment?: string;
    private_feedback?: string;
    is_visible?: boolean;
}, {
    booking_id?: string;
    reviewer_id?: string;
    reviewee_id?: string;
    public_rating?: number;
    public_comment?: string;
    private_feedback?: string;
    is_visible?: boolean;
}>, {
    booking_id?: string;
    reviewer_id?: string;
    reviewee_id?: string;
    public_rating?: number;
    public_comment?: string;
    private_feedback?: string;
    is_visible?: boolean;
}, {
    booking_id?: string;
    reviewer_id?: string;
    reviewee_id?: string;
    public_rating?: number;
    public_comment?: string;
    private_feedback?: string;
    is_visible?: boolean;
}>;
export declare const updateReviewInputSchema: z.ZodObject<{
    id: z.ZodString;
    public_comment: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    private_feedback: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    is_visible: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    id?: string;
    public_comment?: string;
    private_feedback?: string;
    is_visible?: boolean;
}, {
    id?: string;
    public_comment?: string;
    private_feedback?: string;
    is_visible?: boolean;
}>;
export declare const searchReviewInputSchema: z.ZodObject<{
    query: z.ZodOptional<z.ZodString>;
    booking_id: z.ZodOptional<z.ZodString>;
    reviewer_id: z.ZodOptional<z.ZodString>;
    reviewee_id: z.ZodOptional<z.ZodString>;
    public_rating_min: z.ZodOptional<z.ZodNumber>;
    public_rating_max: z.ZodOptional<z.ZodNumber>;
    is_visible: z.ZodOptional<z.ZodBoolean>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
    sort_by: z.ZodDefault<z.ZodEnum<["public_rating", "created_at"]>>;
    sort_order: z.ZodDefault<z.ZodEnum<["asc", "desc"]>>;
}, "strip", z.ZodTypeAny, {
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: "created_at" | "public_rating";
    sort_order?: "asc" | "desc";
    booking_id?: string;
    reviewer_id?: string;
    reviewee_id?: string;
    is_visible?: boolean;
    public_rating_min?: number;
    public_rating_max?: number;
}, {
    query?: string;
    limit?: number;
    offset?: number;
    sort_by?: "created_at" | "public_rating";
    sort_order?: "asc" | "desc";
    booking_id?: string;
    reviewer_id?: string;
    reviewee_id?: string;
    is_visible?: boolean;
    public_rating_min?: number;
    public_rating_max?: number;
}>;
export type Review = z.infer<typeof reviewSchema>;
export type CreateReviewInput = z.infer<typeof createReviewInputSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewInputSchema>;
export type SearchReviewInput = z.infer<typeof searchReviewInputSchema>;
//# sourceMappingURL=schema.d.ts.map