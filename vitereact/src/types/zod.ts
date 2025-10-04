export interface Villa {
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
  photos?: Array<{
    id: string;
    url: string;
    is_cover_photo: boolean;
  }>;
}

export interface CreateVillaInput {
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
}

export interface Amenity {
  id: string;
  name: string;
  icon_name: string | null;
  category: string | null;
  created_at: string;
}

export interface Photo {
  id: string;
  villa_id: string;
  url: string;
  description: string | null;
  is_cover_photo: boolean;
  sort_order: number;
  uploaded_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewee_id: string;
  public_rating: number;
  public_comment: string | null;
  private_feedback: string | null;
  created_at: string;
}
