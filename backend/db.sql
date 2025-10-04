-- Create tables with proper constraints and relationships
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    phone_number TEXT UNIQUE NOT NULL,
    account_type TEXT NOT NULL DEFAULT 'guest',
    is_phone_verified BOOLEAN NOT NULL DEFAULT false,
    profile_picture_url TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS villas (
    id TEXT PRIMARY KEY,
    host_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    property_type TEXT NOT NULL,
    num_guests INTEGER NOT NULL,
    num_bedrooms INTEGER NOT NULL,
    num_beds INTEGER NOT NULL,
    num_bathrooms INTEGER NOT NULL,
    price_per_night NUMERIC(10,2) NOT NULL,
    cleaning_fee NUMERIC(10,2),
    minimum_nights INTEGER NOT NULL DEFAULT 1,
    house_rules TEXT,
    preferred_payment_method TEXT NOT NULL,
    exact_address TEXT,
    directions_landmarks TEXT,
    latitude NUMERIC(10,8),
    longitude NUMERIC(11,8),
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS amenities (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    icon_name TEXT
);

CREATE TABLE IF NOT EXISTS villa_amenities (
    villa_id TEXT NOT NULL REFERENCES villas(id) ON DELETE CASCADE,
    amenity_id TEXT NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
    PRIMARY KEY (villa_id, amenity_id)
);

CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    villa_id TEXT NOT NULL REFERENCES villas(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    description TEXT,
    is_cover_photo BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    UNIQUE(villa_id, sort_order)
);

CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    villa_id TEXT NOT NULL REFERENCES villas(id) ON DELETE RESTRICT,
    guest_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    host_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    check_in_date TEXT NOT NULL,
    check_out_date TEXT NOT NULL,
    num_guests INTEGER NOT NULL,
    total_price NUMERIC(10,2) NOT NULL,
    status TEXT NOT NULL,
    guest_message TEXT NOT NULL,
    cancellation_reason TEXT,
    cancellation_message TEXT,
    check_in_instructions TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (check_out_date > check_in_date)
);

CREATE TABLE IF NOT EXISTS availability (
    id TEXT PRIMARY KEY,
    villa_id TEXT NOT NULL REFERENCES villas(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'available',
    UNIQUE(villa_id, date)
);

CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    CHECK (sender_id != receiver_id)
);

CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    reviewer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    public_rating INTEGER NOT NULL CHECK (public_rating >= 1 AND public_rating <= 5),
    public_comment TEXT,
    private_feedback TEXT,
    is_visible BOOLEAN NOT NULL DEFAULT false,
    created_at TEXT NOT NULL,
    CHECK (reviewer_id != reviewee_id),
    UNIQUE(booking_id, reviewer_id, reviewee_id)
);

-- Seed data
-- Users table
INSERT INTO users (id, name, email, password_hash, phone_number, account_type, is_phone_verified, profile_picture_url, created_at, updated_at) VALUES
('user_001', 'John Doe', 'john.doe@email.com', 'password123', '+1234567890', 'host', true, 'https://picsum.photos/seed/user001/200/200.jpg', '2024-01-15T10:00:00Z', '2024-01-15T10:00:00Z'),
('user_002', 'Jane Smith', 'jane.smith@email.com', 'password123', '+1234567891', 'host', true, 'https://picsum.photos/seed/user002/200/200.jpg', '2024-01-16T11:30:00Z', '2024-01-16T11:30:00Z'),
('user_003', 'Mike Johnson', 'mike.j@email.com', 'admin123', '+1234567892', 'guest', true, 'https://picsum.photos/seed/user003/200/200.jpg', '2024-01-17T09:15:00Z', '2024-01-17T09:15:00Z'),
('user_004', 'Sarah Williams', 'sarah.w@email.com', 'user123', '+1234567893', 'guest', false, 'https://picsum.photos/seed/user004/200/200.jpg', '2024-01-18T14:20:00Z', '2024-01-18T14:20:00Z'),
('user_005', 'David Brown', 'david.brown@email.com', 'password123', '+1234567894', 'host', true, 'https://picsum.photos/seed/user005/200/200.jpg', '2024-01-19T16:45:00Z', '2024-01-19T16:45:00Z'),
('user_006', 'Emily Davis', 'emily.davis@email.com', 'password123', '+1234567895', 'guest', true, NULL, '2024-01-20T08:30:00Z', '2024-01-20T08:30:00Z'),
('user_007', 'Robert Wilson', 'robert.wilson@email.com', 'user123', '+1234567896', 'guest', true, 'https://picsum.photos/seed/user007/200/200.jpg', '2024-01-21T12:10:00Z', '2024-01-21T12:10:00Z'),
('user_008', 'Lisa Anderson', 'lisa.anderson@email.com', 'password123', '+1234567897', 'host', true, 'https://picsum.photos/seed/user008/200/200.jpg', '2024-01-22T17:25:00Z', '2024-01-22T17:25:00Z')
ON CONFLICT (id) DO NOTHING;

-- Villas table
INSERT INTO villas (id, host_id, title, description, property_type, num_guests, num_bedrooms, num_beds, num_bathrooms, price_per_night, cleaning_fee, minimum_nights, house_rules, preferred_payment_method, exact_address, directions_landmarks, latitude, longitude, status, created_at, updated_at) VALUES
('villa_001', 'user_001', 'Luxury Beach Villa with Ocean View', 'Experience paradise in this stunning beachfront villa with panoramic ocean views. Perfect for families and groups looking for a tropical getaway.', 'villa', 8, 4, 5, 3, 450.00, 150.00, 3, 'No smoking indoors. Quiet hours after 10 PM. No parties without prior approval.', 'credit_card', '123 Ocean Drive, Miami Beach, FL', 'Located on South Beach, near Miami Beach Marina. Look for the blue gates.', 25.7617, -80.1918, 'listed', '2024-01-15T12:00:00Z', '2024-01-20T15:30:00Z'),
('villa_002', 'user_002', 'Mountain Retreat with Hot Tub', 'Escape to this cozy mountain retreat nestled among tall pines. Features a private hot tub and breathtaking mountain views from the deck.', 'cabin', 6, 3, 4, 2, 280.00, 100.00, 2, 'Pets allowed with additional fee. No fires during dry season. Check-out by 10 AM.', 'paypal', '456 Pine Ridge Road, Aspen, CO', 'Take the scenic route up Aspen Mountain. Property is on the left after the 3-mile marker.', 39.1911, -106.8175, 'listed', '2024-01-16T14:00:00Z', '2024-01-19T09:20:00Z'),
('villa_003', 'user_005', 'Modern Downtown Loft', 'Stylish modern loft in the heart of downtown. Walking distance to restaurants, shops, and entertainment venues.', 'apartment', 4, 2, 2, 2, 200.00, 75.00, 1, 'No loud music after 11 PM. No smoking. Additional guests must be approved in advance.', 'credit_card', '789 Market Street, Downtown, NY', 'Entrance is on the side of the building. Ring apartment 4B.', 40.7589, -73.9851, 'listed', '2024-01-19T10:00:00Z', '2024-01-19T10:00:00Z'),
('villa_004', 'user_001', 'Tropical Paradise Villa', 'Your own private oasis in the midst of lush tropical gardens. Private pool and outdoor kitchen make this the perfect vacation spot.', 'villa', 10, 5, 6, 4, 580.00, 200.00, 5, 'No children under 10. No glassware near the pool. Respect quiet hours.', 'bank_transfer', '321 Palm Avenue, Key West, FL', 'Look for the white gates with tropical plants. Free parking on premises.', 24.5551, -81.7800, 'listed', '2024-01-20T16:00:00Z', '2024-01-22T14:45:00Z'),
('villa_005', 'user_008', 'Countryside Farmhouse', 'Authentic farmhouse experience on working organic farm. Fresh eggs and vegetables included. Children welcome to help with farm chores.', 'farmhouse', 8, 4, 5, 3, 220.00, 80.00, 2, 'No smoking in the barn. Respect farm animals. Children must be supervised.', 'cash', '567 Country Lane, Vermont', 'Take Route 7 North for 15 miles, turn right at the red barn.', 44.4759, -73.2121, 'listed', '2024-01-22T09:00:00Z', '2024-01-22T11:30:00Z'),
('villa_006', 'user_002', 'Lakeside Cottage with Dock', 'Beautiful cottage right on the lake with private dock for fishing and boating. Perfect getaway for nature lovers.', 'cottage', 6, 3, 3, 2, 195.00, 60.00, 2, 'Fishing license required. Life jackets must be worn on boats. No motor boats after sunset.', 'paypal', '888 Lakeshore Drive, Lake Tahoe, CA', 'Follow the lake road north for 5 miles from the town center.', 39.0968, -120.0324, 'draft', '2024-01-18T13:00:00Z', '2024-01-18T13:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- Amenities table
INSERT INTO amenities (id, name, icon_name) VALUES
('amenity_001', 'WiFi', 'wifi'),
('amenity_002', 'Air Conditioning', 'ac'),
('amenity_003', 'Kitchen', 'kitchen'),
('amenity_004', 'Pool', 'pool'),
('amenity_005', 'Hot Tub', 'hot_tub'),
('amenity_006', 'Parking', 'parking'),
('amenity_007', 'TV', 'tv'),
('amenity_008', 'Washer/Dryer', 'laundry'),
('amenity_009', 'Outdoor Grill', 'grill'),
('amenity_010', 'Fireplace', 'fireplace'),
('amenity_011', 'Beach Access', 'beach'),
('amenity_012', 'Gym', 'gym'),
('amenity_013', 'Pets Allowed', 'pets'),
('amenity_014', 'Workspace', 'desk'),
('amenity_015', 'Coffee Maker', 'coffee'),
('amenity_016', 'Dishwasher', 'dishwasher'),
('amenity_017', 'Mountain View', 'mountain'),
('amenity_018', 'Lake Access', 'lake'),
('amenity_019', 'Free Parking', 'free_parking'),
('amenity_020', 'Garden', 'garden')
ON CONFLICT (id) DO NOTHING;

-- Villa Amenities junction table
INSERT INTO villa_amenities (villa_id, amenity_id) VALUES
('villa_001', 'amenity_001'), ('villa_001', 'amenity_002'), ('villa_001', 'amenity_003'),
('villa_001', 'amenity_004'), ('villa_001', 'amenity_006'), ('villa_001', 'amenity_008'),
('villa_001', 'amenity_011'), ('villa_001', 'amenity_015'), ('villa_001', 'amenity_019'),
    
('villa_002', 'amenity_001'), ('villa_002', 'amenity_005'), ('villa_002', 'amenity_006'),
('villa_002', 'amenity_007'), ('villa_002', 'amenity_010'), ('villa_002', 'amenity_013'),
('villa_002', 'amenity_017'), ('villa_002', 'amenity_019'),
    
('villa_003', 'amenity_001'), ('villa_003', 'amenity_002'), ('villa_003', 'amenity_003'),
('villa_003', 'amenity_006'), ('villa_003', 'amenity_007'), ('villa_003', 'amenity_008'),
('villa_003', 'amenity_014'), ('villa_003', 'amenity_015'), ('villa_003', 'amenity_016'),
    
('villa_004', 'amenity_001'), ('villa_004', 'amenity_002'), ('villa_004', 'amenity_003'),
('villa_004', 'amenity_004'), ('villa_004', 'amenity_006'), ('villa_004', 'amenity_008'),
('villa_004', 'amenity_009'), ('villa_004', 'amenity_011'), ('villa_004', 'amenity_019'),
('villa_004', 'amenity_020'),
    
('villa_005', 'amenity_001'), ('villa_005', 'amenity_003'), ('villa_005', 'amenity_006'),
('villa_005', 'amenity_008'), ('villa_005', 'amenity_009'), ('villa_005', 'amenity_010'),
('villa_005', 'amenity_013'), ('villa_005', 'amenity_020'),
    
('villa_006', 'amenity_001'), ('villa_006', 'amenity_006'), ('villa_006', 'amenity_008'),
('villa_006', 'amenity_018'), ('villa_006', 'amenity_019')
ON CONFLICT (villa_id, amenity_id) DO NOTHING;

-- Photos table
INSERT INTO photos (id, villa_id, url, description, is_cover_photo, sort_order, created_at) VALUES
('photo_001', 'villa_001', 'https://picsum.photos/seed/villa1cover/1200/800.jpg', 'Ocean view from master bedroom balcony', true, 0, '2024-01-15T12:30:00Z'),
('photo_002', 'villa_001', 'https://picsum.photos/seed/villa1living/1200/800.jpg', 'Spacious living room with panoramic windows', false, 1, '2024-01-15T12:31:00Z'),
('photo_003', 'villa_001', 'https://picsum.photos/seed/villa1pool/1200/800.jpg', 'Infinity pool overlooking the ocean', false, 2, '2024-01-15T12:32:00Z'),
('photo_004', 'villa_001', 'https://picsum.photos/seed/villa1kitchen/1200/800.jpg', 'Modern gourmet kitchen', false, 3, '2024-01-15T12:33:00Z'),
('photo_005', 'villa_001', 'https://picsum.photos/seed/villa1beach/1200/800.jpg', 'Private beach access', false, 4, '2024-01-15T12:34:00Z'),

('photo_006', 'villa_002', 'https://picsum.photos/seed/villa2cover/1200/800.jpg', 'Mountain view from hot tub deck', true, 0, '2024-01-16T14:30:00Z'),
('photo_007', 'villa_002', 'https://picsum.photos/seed/villa2fireplace/1200/800.jpg', 'Cozy stone fireplace in living room', false, 1, '2024-01-16T14:31:00Z'),
('photo_008', 'villa_002', 'https://picsum.photos/seed/villa2bedroom/1200/800.jpg', 'Master bedroom with mountain view', false, 2, '2024-01-16T14:32:00Z'),
('photo_009', 'villa_002', 'https://picsum.photos/seed/villa2deck/1200/800.jpg', 'Wrap-around deck with BBQ', false, 3, '2024-01-16T14:33:00Z'),

('photo_010', 'villa_003', 'https://picsum.photos/seed/villa3cover/1200/800.jpg', 'Open concept living space', true, 0, '2024-01-19T10:30:00Z'),
('photo_011', 'villa_003', 'https://picsum.photos/seed/villa3view/1200/800.jpg', 'City view from balcony', false, 1, '2024-01-19T10:31:00Z'),
('photo_012', 'villa_003', 'https://picsum.photos/seed/villa3kitchen/1200/800.jpg', 'Fully equipped kitchen', false, 2, '2024-01-19T10:32:00Z'),

('photo_013', 'villa_004', 'https://picsum.photos/seed/villa4cover/1200/800.jpg', 'Tropical pool setting', true, 0, '2024-01-20T16:30:00Z'),
('photo_014', 'villa_004', 'https://picsum.photos/seed/villa4outdoor/1200/800.jpg', 'Outdoor kitchen and dining area', false, 1, '2024-01-20T16:31:00Z'),
('photo_015', 'villa_004', 'https://picsum.photos/seed/villa4garden/1200/800.jpg', 'Lush tropical gardens', false, 2, '2024-01-20T16:32:00Z'),

('photo_016', 'villa_005', 'https://picsum.photos/seed/villa5cover/1200/800.jpg', 'Farmhouse exterior', true, 0, '2024-01-22T09:30:00Z'),
('photo_017', 'villa_005', 'https://picsum.photos/seed/villa5farm/1200/800.jpg', 'View of the organic farm', false, 1, '2024-01-22T09:31:00Z'),

('photo_018', 'villa_006', 'https://picsum.photos/seed/villa6cover/1200/800.jpg', 'Cottage by the lake', true, 0, '2024-01-18T13:30:00Z'),
('photo_019', 'villa_006', 'https://picsum.photos/seed/villa6dock/1200/800.jpg', 'Private dock for fishing', false, 1, '2024-01-18T13:31:00Z')
ON CONFLICT (id) DO NOTHING;

-- Bookings table
INSERT INTO bookings (id, villa_id, guest_id, host_id, check_in_date, check_out_date, num_guests, total_price, status, guest_message, cancellation_reason, cancellation_message, check_in_instructions, created_at, updated_at) VALUES
('booking_001', 'villa_001', 'user_003', 'user_001', '2024-03-15', '2024-03-20', 4, 1950.00, 'confirmed', 'Looking forward to our spring break vacation! Is there a grocery store nearby?', NULL, NULL, 'Keys will be in the lockbox. Code: 1234. Pool service comes at 9 AM on Wednesday.', '2024-01-25T10:00:00Z', '2024-01-25T14:30:00Z'),
('booking_002', 'villa_002', 'user_004', 'user_002', '2024-04-01', '2024-04-05', 2, 1120.00, 'pending', 'Can''t wait for our mountain getaway! We have a small dog, is that okay?', NULL, NULL, NULL, '2024-01-26T16:20:00Z', '2024-01-26T16:20:00Z'),
('booking_003', 'villa_003', 'user_006', 'user_008', '2024-02-10', '2024-02-12', 3, 550.00, 'confirmed', 'Quick weekend trip for a conference downtown. Need early check-in if possible.', NULL, NULL, 'Doorman will let you in. Unit keys are at the front desk.', '2024-01-24T09:15:00Z', '2024-01-24T11:45:00Z'),
('booking_004', 'villa_004', 'user_007', 'user_001', '2024-05-15', '2024-05-25', 8, 6000.00, 'confirmed', 'Our annual family reunion! Is the pool heated?', NULL, NULL, 'Use the intercom at the gate. Our property manager will meet you.', '2024-01-27T14:00:00Z', '2024-01-28T09:30:00Z'),
('booking_005', 'villa_002', 'user_006', 'user_002', '2024-02-14', '2024-02-17', 4, 990.00, 'cancelled', 'We had a change of plans, sorry for the inconvenience.', 'Emergency family matter', 'We understand, hope everything is okay. Full refund processed.', NULL, '2024-01-23T18:30:00Z', '2024-01-29T10:15:00Z'),
('booking_006', 'villa_005', 'user_003', 'user_008', '2024-06-01', '2024-06-05', 6, 1200.00, 'confirmed', 'Kids are excited to see farm animals! Will there be farm activities?', NULL, NULL, 'Check-in at the red farmhouse door. We''ll have fresh eggs waiting!', '2024-01-30T12:45:00Z', '2024-01-30T12:45:00Z'),
('booking_007', 'villa_003', 'user_007', 'user_008', '2024-03-01', '2024-03-04', 2, 675.00, 'confirmed', 'Just need a place to stay for a concert', NULL, NULL, 'Your code for the building is 5678. Elevator to 4th floor.', '2024-01-29T11:00:00Z', '2024-01-29T13:20:00Z')
ON CONFLICT (id) DO NOTHING;

-- Availability table
INSERT INTO availability (id, villa_id, date, status) VALUES
-- Villa 001 (March 2024 - June 2024)
('avail_001', 'villa_001', '2024-03-01', 'available'), ('avail_002', 'villa_001', '2024-03-02', 'available'),
('avail_003', 'villa_001', '2024-03-03', 'available'), ('avail_004', 'villa_001', '2024-03-04', 'available'),
('avail_005', 'villa_001', '2024-03-05', 'available'), ('avail_006', 'villa_001', '2024-03-06', 'available'),
('avail_007', 'villa_001', '2024-03-07', 'available'), ('avail_008', 'villa_001', '2024-03-08', 'available'),
('avail_009', 'villa_001', '2024-03-09', 'available'), ('avail_010', 'villa_001', '2024-03-10', 'available'),
('avail_011', 'villa_001', '2024-03-11', 'available'), ('avail_012', 'villa_001', '2024-03-12', 'available'),
('avail_013', 'villa_001', '2024-03-13', 'available'), ('avail_014', 'villa_001', '2024-03-14', 'available'),
('avail_015', 'villa_001', '2024-03-15', 'booked'), ('avail_016', 'villa_001', '2024-03-16', 'booked'),
('avail_017', 'villa_001', '2024-03-17', 'booked'), ('avail_018', 'villa_001', '2024-03-18', 'booked'),
('avail_019', 'villa_001', '2024-03-19', 'booked'), ('avail_020', 'villa_001', '2024-03-20', 'booked'),
('avail_021', 'villa_001', '2024-03-21', 'available'), ('avail_022', 'villa_001', '2024-03-22', 'available'),

-- Villa 002 (February 2024 - May 2024)
('avail_023', 'villa_002', '2024-04-01', 'booked'), ('avail_024', 'villa_002', '2024-04-02', 'booked'),
('avail_025', 'villa_002', '2024-04-03', 'booked'), ('avail_026', 'villa_002', '2024-04-04', 'booked'),
('avail_027', 'villa_002', '2024-04-05', 'booked'), ('avail_028', 'villa_002', '2024-04-06', 'available'),
('avail_029', 'villa_002', '2024-02-14', 'available'), ('avail_030', 'villa_002', '2024-02-15', 'available'),
('avail_031', 'villa_002', '2024-02-16', 'available'), ('avail_032', 'villa_002', '2024-02-17', 'available'),

-- Villa 003 (February 2024 - March 2024)
('avail_033', 'villa_003', '2024-02-10', 'booked'), ('avail_034', 'villa_003', '2024-02-11', 'booked'),
('avail_035', 'villa_003', '2024-02-12', 'booked'), ('avail_036', 'villa_003', '2024-02-13', 'available'),
('avail_037', 'villa_003', '2024-03-01', 'booked'), ('avail_038', 'villa_003', '2024-03-02', 'booked'),
('avail_039', 'villa_003', '2024-03-03', 'booked'), ('avail_040', 'villa_003', '2024-03-04', 'booked'),

-- Villa 005 (June 2024)
('avail_041', 'villa_005', '2024-06-01', 'booked'), ('avail_042', 'villa_005', '2024-06-02', 'booked'),
('avail_043', 'villa_005', '2024-06-03', 'booked'), ('avail_044', 'villa_005', '2024-06-04', 'booked'),
('avail_045', 'villa_005', '2024-06-05', 'booked')
ON CONFLICT (id) DO NOTHING;

-- Messages table
INSERT INTO messages (id, thread_id, sender_id, receiver_id, content, is_read, booking_id, created_at) VALUES
('msg_001', 'thread_001', 'user_003', 'user_001', 'Hello! We''re very excited about our booking at the beach villa. Do you provide beach towels?', false, 'booking_001', '2024-01-25T14:30:00Z'),
('msg_002', 'thread_001', 'user_001', 'user_003', 'Hi there! Yes, we provide beach towels and also beach chairs. Looking forward to hosting you!', true, 'booking_001', '2024-01-25T16:45:00Z'),
('msg_003', 'thread_002', 'user_004', 'user_002', 'Hi! I made a booking request for the mountain retreat. I forgot to mention we have a small dog. Is that OK?', false, 'booking_002', '2024-01-26T16:20:00Z'),
('msg_004', 'thread_003', 'user_006', 'user_008', 'Hi! I need to check in early for my conference. Is 11 AM possible?', false, 'booking_003', '2024-01-24T09:15:00Z'),
('msg_005', 'thread_003', 'user_008', 'user_006', 'Absolutely! 11 AM works. The elevator will be ready for you.', true, 'booking_003', '2024-01-24T11:45:00Z'),
('msg_006', 'thread_004', 'user_007', 'user_001', 'Question about the family reunion booking - do you have extra blankets and pillows available?', false, 'booking_004', '2024-01-27T14:00:00Z'),
('msg_007', 'thread_004', 'user_001', 'user_007', 'We have plenty of extras! The pool is also heated. Let us know if you need anything else.', true, 'booking_004', '2024-01-28T09:30:00Z'),
('msg_008', 'thread_005', 'user_006', 'user_002', 'I''m so sorry but we need to cancel our booking due to a family emergency.', false, 'booking_005', '2024-01-23T18:30:00Z'),
('msg_009', 'thread_005', 'user_002', 'user_006', 'I completely understand. I hope everything is okay. Full refund has been processed.', true, 'booking_005', '2024-01-24T09:00:00Z'),
('msg_010', 'thread_006', 'user_003', 'user_008', 'The kids are counting down the days! Can they help with feeding the chickens?', false, 'booking_006', '2024-01-30T12:45:00Z'),
('msg_011', 'thread_006', 'user_008', 'user_003', 'They would love that! Morning chores start at 7:30 if they''re interested.', true, 'booking_006', '2024-01-30T14:20:00Z'),
('msg_012', 'thread_007', 'user_007', 'user_008', 'Just confirming our booking for the concert weekend. Will we have WiFi?', false, 'booking_007', '2024-01-29T11:00:00Z'),
('msg_013', 'thread_007', 'user_008', 'user_007', 'Yes, high-speed WiFi is included. The building is also very secure with 24/7 doorman.', true, 'booking_007', '2024-01-29T13:20:00Z')
ON CONFLICT (id) DO NOTHING;

-- Reviews table
INSERT INTO reviews (id, booking_id, reviewer_id, reviewee_id, public_rating, public_comment, private_feedback, is_visible, created_at) VALUES
('review_001', 'booking_001', 'user_003', 'user_001', 5, 'Absolutely stunning villa! The ocean views were breathtaking and the pool was perfect for our group. John was an excellent host and provided great recommendations for local restaurants. Would definitely book again!', 'Check-in instructions were very clear. Property was even better than photos.', true, '2024-03-21T10:00:00Z'),
('review_002', 'booking_001', 'user_001', 'user_003', 5, 'Great guests! Very respectful of the property and left the place spotless. Would host them again anytime.', NULL, true, '2024-03-21T11:30:00Z'),
('review_003', 'booking_003', 'user_006', 'user_008', 4, 'Perfect location for downtown events. The loft was modern and clean. The only issue was the wireless printer in the workspace didn''t work properly.', 'The early check-in arrangement worked perfectly. Communication was excellent.', true, '2024-02-13T09:00:00Z'),
('review_004', 'booking_003', 'user_008', 'user_006', 5, 'Emily was a wonderful guest. Very understanding about the building rules and kept the apartment very neat.', NULL, true, '2024-02-13T10:45:00Z'),
('review_005', 'booking_006', 'user_003', 'user_008', 5, 'The kids had an amazing time at the farm! They loved helping with the morning chores and learning about farm life. The farmhouse was comfortable and had everything we needed. Fresh eggs every morning were a bonus!', 'The hosts went above and beyond to make our family feel welcome. Their knowledge of farming was fascinating.', true, '2024-06-06T14:00:00Z'),
('review_006', 'booking_006', 'user_008', 'user_003', 5, 'Mike and his family were perfect guests for our farm. The kids were respectful and genuinely interested in farm life. Left everything in perfect condition.', NULL, true, '2024-06-06T16:30:00Z'),
('review_007', 'booking_007', 'user_007', 'user_008', 4, 'Great downtown location and very secure building. The loft was exactly as described. Parking was a bit challenging but that''s typical for downtown.', 'Robert was easy to communicate with and followed all checkout instructions perfectly.', true, '2024-03-05T09:00:00Z'),
('review_008', 'booking_007', 'user_008', 'user_007', 5, 'Robert was an excellent guest. Very quiet and respectful of the space. Would host again.', NULL, true, '2024-03-05T11:15:00Z')
ON CONFLICT (id) DO NOTHING;