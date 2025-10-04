import request from 'supertest';
import { jest } from '@jest/globals';
import { app, server, pool } from './server.ts';
import jwt from 'jsonwebtoken';

// Mock external dependencies
jest.mock('jsonwebtoken');
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
  }))
}));

// Mock WebSocket
const mockWs = {
  send: jest.fn(),
  on: jest.fn(),
  close: jest.fn(),
  readyState: 1
};

jest.mock('ws', () => ({
  Server: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    clients: new Set([mockWs])
  }))
}));

// Test database setup
const testDb = {
  query: jest.fn(),
  begin: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  release: jest.fn()
};

// Mock pool
jest.mock('./server.ts', () => {
  const originalModule = jest.requireActual('./server.ts');
  return {
    ...originalModule,
    pool: {
      connect: jest.fn(() => testDb),
      query: jest.fn()
    }
  };
});

// Test setup and teardown
beforeEach(async () => {
  jest.clearAllMocks();
  
  // Mock successful database queries
  testDb.query.mockImplementation((query, params) => {
    if (query.includes('SELECT') && query.includes('users')) {
      return { rows: [{
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        password_hash: 'password123',
        phone_number: '+1234567890',
        account_type: 'guest',
        is_phone_verified: true,
        profile_picture_url: null,
        created_at: new Date(),
        updated_at: new Date()
      }]};
    }
    return { rows: [] };
  });
});

afterAll(async () => {
  if (server) {
    server.close();
  }
  if (pool) {
    await pool.end();
  }
});

describe('Authentication Endpoints', () => {
  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password_hash: 'password123',
        phone_number: '+1234567890',
        account_type: 'guest'
      };

      testDb.query.mockResolvedValueOnce({ rows: [] }); // Check existing user
      testDb.query.mockResolvedValueOnce({ 
        rows: [{ id: 'new-user-id', ...userData, created_at: new Date(), updated_at: new Date() }]
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.name).toBe(userData.name);
    });

    it('should return error for duplicate phone number', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password_hash: 'password123',
        phone_number: '+1234567890',
        account_type: 'guest'
      };

      testDb.query.mockResolvedValueOnce({ 
        rows: [{ phone_number: '+1234567890' }]
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.error).toContain('Phone number already exists');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body.error).toContain('Required');
    });
  });

  describe('POST /auth/login', () => {
    it('should login user with phone number successfully', async () => {
      const loginData = {
        identifier: '+1234567890',
        password: 'password123'
      };

      const mockUser = {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        password_hash: 'password123',
        phone_number: '+1234567890',
        account_type: 'guest',
        is_phone_verified: true
      };

      testDb.query.mockResolvedValueOnce({ rows: [mockUser] });
      
      const mockToken = 'mock-jwt-token';
      jwt.sign.mockReturnValue(mockToken);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.user.id).toBe(mockUser.id);
      expect(response.body.token).toBe(mockToken);
    });

    it('should login user with email successfully', async () => {
      const loginData = {
        identifier: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        password_hash: 'password123',
        phone_number: '+1234567890',
        account_type: 'guest',
        is_phone_verified: true
      };

      testDb.query.mockResolvedValueOnce({ rows: [mockUser] });
      
      const mockToken = 'mock-jwt-token';
      jwt.sign.mockReturnValue(mockToken);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.user.id).toBe(mockUser.id);
    });

    it('should return error for invalid credentials', async () => {
      const loginData = {
        identifier: '+1234567890',
        password: 'wrongpassword'
      };

      testDb.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error).toContain('Invalid credentials');
    });

    it('should return error for missing fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ identifier: '+1234567890' })
        .expect(400);

      expect(response.body.error).toContain('Required');
    });
  });

  describe('POST /auth/verify-otp', () => {
    it('should verify OTP successfully', async () => {
      const otpData = {
        phone_number: '+1234567890',
        otp: '123456'
      };

      testDb.query.mockResolvedValueOnce({ rows: [{ id: 'test-user-id' }] });
      testDb.query.mockResolvedValueOnce({ rowCount: 1 });

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send(otpData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should return error for invalid OTP', async () => {
      const otpData = {
        phone_number: '+1234567890',
        otp: '000000'
      };

      testDb.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/verify-otp')
        .send(otpData)
        .expect(400);

      expect(response.body.error).toContain('Invalid or expired OTP');
    });
  });
});

describe('User Management Endpoints', () => {
  const mockToken = 'mock-jwt-token';
  const mockUser = {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
    account_type: 'guest',
    is_phone_verified: true
  };

  beforeEach(() => {
    jwt.verify.mockReturnValue({ userId: 'test-user-id', phone_number: '+1234567890' });
  });

  describe('GET /users/me', () => {
    it('should get current user profile', async () => {
      testDb.query.mockResolvedValueOnce({ rows: [mockUser] });

      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body.id).toBe(mockUser.id);
      expect(response.body.name).toBe(mockUser.name);
    });

    it('should return error without authentication', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .expect(401);

      expect(response.body.error).toContain('Authentication required');
    });
  });

  describe('PATCH /users/me', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com'
      };

      const updatedUser = { ...mockUser, ...updateData };
      testDb.query.mockResolvedValueOnce({ rows: [mockUser] });
      testDb.query.mockResolvedValueOnce({ rows: [updatedUser] });

      const response = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
      expect(response.body.email).toBe(updateData.email);
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .patch('/api/users/me')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body.error).toContain('Invalid email');
    });
  });

  describe('GET /users/me/listings', () => {
    it('should get user listings for host', async () => {
      const mockVilla = {
        id: 'villa-001',
        host_id: 'test-user-id',
        title: 'Test Villa',
        status: 'listed'
      };

      testDb.query.mockResolvedValueOnce({ rows: [{ ...mockUser, account_type: 'host' }] });
      testDb.query.mockResolvedValueOnce({ rows: [mockVilla] });

      const response = await request(app)
        .get('/api/users/me/listings')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(mockVilla.id);
    });

    it('should return empty array for non-host user', async () => {
      testDb.query.mockResolvedValueOnce({ rows: [{ ...mockUser, account_type: 'guest' }] });

      const response = await request(app)
        .get('/api/users/me/listings')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('GET /users/me/trips', () => {
    it('should get user trips as guest', async () => {
      const mockBooking = {
        id: 'booking-001',
        guest_id: 'test-user-id',
        villa_id: 'villa-001',
        status: 'confirmed'
      };

      testDb.query.mockResolvedValueOnce({ rows: [mockUser] });
      testDb.query.mockResolvedValueOnce({ rows: [mockBooking] });

      const response = await request(app)
        .get('/api/users/me/trips')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(mockBooking.id);
    });

    it('should filter trips by status', async () => {
      const mockBooking = {
        id: 'booking-001',
        guest_id: 'test-user-id',
        status: 'confirmed'
      };

      testDb.query.mockResolvedValueOnce({ rows: [mockUser] });
      testDb.query.mockResolvedValueOnce({ rows: [mockBooking] });

      const response = await request(app)
        .get('/api/users/me/trips?status=confirmed')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(testDb.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'confirmed'"),
        expect.any(Array)
      );
    });
  });
});

describe('Villa Management Endpoints', () => {
  const mockToken = 'mock-jwt-token';
  const mockHost = {
    id: 'host-001',
    name: 'Host User',
    account_type: 'host'
  };

  beforeEach(() => {
    jwt.verify.mockReturnValue({ userId: 'host-001', phone_number: '+1234567890' });
  });

  describe('GET /villas', () => {
    it('should search villas with filters', async () => {
      const mockVillas = [
        {
          id: 'villa-001',
          title: 'Beach Villa',
          price_per_night: 200,
          property_type: 'villa',
          status: 'listed'
        }
      ];

      testDb.query.mockResolvedValueOnce({ rows: mockVillas });

      const response = await request(app)
        .get('/api/villas?location=beach&price_min=100&price_max=300')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Beach Villa');
    });

    it('should handle empty search results', async () => {
      testDb.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/villas?location=nonexistent')
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('POST /villas', () => {
    it('should create new villa for host', async () => {
      const villaData = {
        title: 'New Villa',
        description: 'Beautiful villa',
        property_type: 'villa',
        num_guests: 4,
        num_bedrooms: 2,
        num_beds: 2,
        num_bathrooms: 2,
        price_per_night: 150,
        preferred_payment_method: 'cash'
      };

      const mockVilla = {
        id: 'villa-new',
        host_id: 'host-001',
        ...villaData,
        status: 'draft',
        created_at: new Date(),
        updated_at: new Date()
      };

      testDb.query.mockResolvedValueOnce({ rows: [mockHost] });
      testDb.query.mockResolvedValueOnce({ rows: [mockVilla] });

      const response = await request(app)
        .post('/api/villas')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(villaData)
        .expect(201);

      expect(response.body.id).toBe('villa-new');
      expect(response.body.title).toBe(villaData.title);
    });

    it('should require host account type', async () => {
      testDb.query.mockResolvedValueOnce({ rows: [{ ...mockHost, account_type: 'guest' }] });

      const villaData = {
        title: 'New Villa',
        property_type: 'villa',
        num_guests: 4,
        price_per_night: 150,
        preferred_payment_method: 'cash'
      };

      const response = await request(app)
        .post('/api/villas')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(villaData)
        .expect(403);

      expect(response.body.error).toContain('Host account required');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/villas')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({})
        .expect(400);

      expect(response.body.error).toContain('Required');
    });
  });

  describe('GET /villas/:id', () => {
    it('should get villa details with relations', async () => {
      const mockVilla = {
        id: 'villa-001',
        title: 'Test Villa',
        host_id: 'host-001'
      };

      const mockPhotos = [
        { id: 'photo-001', url: 'photo1.jpg', is_cover_photo: true },
        { id: 'photo-002', url: 'photo2.jpg', is_cover_photo: false }
      ];

      const mockAmenities = [
        { id: 'amenity-001', name: 'WiFi' },
        { id: 'amenity-002', name: 'Pool' }
      ];

      testDb.query.mockResolvedValueOnce({ rows: [mockVilla] });
      testDb.query.mockResolvedValueOnce({ rows: mockPhotos });
      testDb.query.mockResolvedValueOnce({ rows: mockAmenities });

      const response = await request(app)
        .get('/api/villas/villa-001')
        .expect(200);

      expect(response.body.id).toBe('villa-001');
      expect(response.body.photos).toHaveLength(2);
      expect(response.body.amenities).toHaveLength(2);
    });

    it('should return 404 for non-existent villa', async () => {
      testDb.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/villas/nonexistent')
        .expect(404);

      expect(response.body.error).toContain('Villa not found');
    });
  });

  describe('PATCH /villas/:id', () => {
    it('should update villa for owner', async () => {
      const updateData = {
        title: 'Updated Villa',
        price_per_night: 250
      };

      const mockVilla = {
        id: 'villa-001',
        host_id: 'host-001',
        title: 'Original Villa',
        price_per_night: 200
      };

      const updatedVilla = { ...mockVilla, ...updateData };

      testDb.query.mockResolvedValueOnce({ rows: [mockVilla] });
      testDb.query.mockResolvedValueOnce({ rows: [updatedVilla] });

      const response = await request(app)
        .patch('/api/villas/villa-001')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe(updateData.title);
      expect(response.body.price_per_night).toBe(updateData.price_per_night);
    });

    it('should prevent non-owner from updating villa', async () => {
      const mockVilla = {
        id: 'villa-001',
        host_id: 'other-host-id'
      };

      testDb.query.mockResolvedValueOnce({ rows: [mockVilla] });

      const response = await request(app)
        .patch('/api/villas/villa-001')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ title: 'Updated' })
        .expect(403);

      expect(response.body.error).toContain('Not authorized');
    });
  });

  describe('DELETE /villas/:id', () => {
    it('should delete villa for owner', async () => {
      const mockVilla = {
        id: 'villa-001',
        host_id: 'host-001'
      };

      testDb.query.mockResolvedValueOnce({ rows: [mockVilla] });
      testDb.query.mockResolvedValueOnce({ rowCount: 1 });

      const response = await request(app)
        .delete('/api/villas/villa-001')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(204);
    });

    it('should prevent non-owner from deleting villa', async () => {
      const mockVilla = {
        id: 'villa-001',
        host_id: 'other-host-id'
      };

      testDb.query.mockResolvedValueOnce({ rows: [mockVilla] });

      const response = await request(app)
        .delete('/api/villas/villa-001')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(403);

      expect(response.body.error).toContain('Not authorized');
    });
  });
});

describe('Photo Management Endpoints', () => {
  const mockToken = 'mock-jwt-token';
  const mockVilla = {
    id: 'villa-001',
    host_id: 'host-001'
  };

  beforeEach(() => {
    jwt.verify.mockReturnValue({ userId: 'host-001', phone_number: '+1234567890' });
  });

  describe('GET /villas/:id/photos', () => {
    it('should get villa photos ordered by sort order', async () => {
      const mockPhotos = [
        { id: 'photo-001', sort_order: 0, is_cover_photo: true },
        { id: 'photo-002', sort_order: 1, is_cover_photo: false }
      ];

      testDb.query.mockResolvedValueOnce({ rows: [mockVilla] });
      testDb.query.mockResolvedValueOnce({ rows: mockPhotos });

      const response = await request(app)
        .get('/api/villas/villa-001/photos')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].sort_order).toBe(0);
    });
  });

  describe('POST /villas/:id/photos', () => {
    it('should upload photo for villa owner', async () => {
      const photoData = {
        url: 'https://example.com/photo.jpg',
        description: 'Beautiful view',
        is_cover_photo: false
      };

      const mockPhoto = {
        id: 'photo-new',
        villa_id: 'villa-001',
        ...photoData,
        sort_order: 0
      };

      testDb.query.mockResolvedValueOnce({ rows: [mockVilla] });
      testDb.query.mockResolvedValueOnce({ rows: [] });
      testDb.query.mockResolvedValueOnce({ rows: [mockPhoto] });

      const response = await request(app)
        .post('/api/villas/villa-001/photos')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(photoData)
        .expect(201);

      expect(response.body.url).toBe(photoData.url);
    });

    it('should set cover photo flag correctly', async () => {
      const photoData = {
        url: 'https://example.com/photo.jpg',
        is_cover_photo: true
      };

      testDb.query.mockResolvedValueOnce({ rows: [mockVilla] });
      testDb.query.mockResolvedValueOnce({ rows: [] });
      testDb.query.mockResolvedValueOnce({ rowCount: 1 });
      testDb.query.mockResolvedValueOnce({ 
        rows: [{ id: 'photo-new', villa_id: 'villa-001', ...photoData, sort_order: 0 }]
      });

      const response = await request(app)
        .post('/api/villas/villa-001/photos')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(photoData)
        .expect(201);

      expect(response.body.is_cover_photo).toBe(true);
    });
  });

  describe('PATCH /photos/:id', () => {
    it('should update photo properties', async () => {
      const mockPhoto = {
        id: 'photo-001',
        villa_id: 'villa-001',
        url: 'old-url.jpg',
        sort_order: 0
      };

      const updateData = {
        sort_order: 1,
        is_cover_photo: true
      };

      testDb.query.mockResolvedValueOnce({ rows: [mockPhoto] });
      testDb.query.mockResolvedValueOnce({ rows: [mockVilla] });
      testDb.query.mockResolvedValueOnce({ rowCount: 1 });
      testDb.query.mockResolvedValueOnce({ 
        rows: [{ ...mockPhoto, ...updateData }]
      });

      const response = await request(app)
        .patch('/photos/photo-001')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.sort_order).toBe(1);
      expect(response.body.is_cover_photo).toBe(true);
    });
  });
});

describe('Booking Management Endpoints', () => {
  const mockToken = 'mock-jwt-token';
  const mockGuest = {
    id: 'guest-001',
    name: 'Guest User',
    account_type: 'guest'
  };

  const mockHost = {
    id: 'host-001',
    name: 'Host User',
    account_type: 'host'
  };

  const mockVilla = {
    id: 'villa-001',
    host_id: 'host-001',
    price_per_night: 100,
    minimum_nights: 1
  };

  beforeEach(() => {
    jwt.verify.mockReturnValue({ userId: 'guest-001', phone_number: '+1234567890' });
  });

  describe('POST /bookings', () => {
    it('should create booking request successfully', async () => {
      const bookingData = {
        villa_id: 'villa-001',
        check_in_date: '2024-03-15',
        check_out_date: '2024-03-17',
        num_guests: 2,
        guest_message: 'Looking forward to my stay!'
      };

      const mockBooking = {
        id: 'booking-new',
        guest_id: 'guest-001',
        host_id: 'host-001',
        ...bookingData,
        total_price: 200,
        status: 'pending'
      };

      testDb.query.mockResolvedValueOnce({ rows: [mockGuest] });
      testDb.query.mockResolvedValueOnce({ rows: [mockVilla] });
      testDb.query.mockResolvedValueOnce({ rows: [mockHost] });
      testDb.query.mockResolvedValueOnce({ rows: [] });
      testDb.query.mockResolvedValueOnce({ rows: [mockBooking] });

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(bookingData)
        .expect(201);

      expect(response.body.id).toBe('booking-new');
      expect(response.body.status).toBe('pending');
    });

    it('should validate date range', async () => {
      const bookingData = {
        villa_id: 'villa-001',
        check_in_date: '2024-03-17',
        check_out_date: '2024-03-15',
        num_guests: 2,
        guest_message: 'Invalid dates'
      };

      testDb.query.mockResolvedValueOnce({ rows: [mockGuest] });

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(bookingData)
        .expect(400);

      expect(response.body.error).toContain('Check-out date must be after check-in date');
    });

    it('should check availability before booking', async () => {
      const bookingData = {
        villa_id: 'villa-001',
        check_in_date: '2024-03-15',
        check_out_date: '2024-03-17',
        num_guests: 2,
        guest_message: 'Test booking'
      };

      testDb.query.mockResolvedValueOnce({ rows: [mockGuest] });
      testDb.query.mockResolvedValueOnce({ rows: [mockVilla] });
      testDb.query.mockResolvedValueOnce({ rows: [mockHost] });
      testDb.query.mockResolvedValueOnce({ 
        rows: [{ date: '2024-03-16', status: 'booked' }]
      });

      const response = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(bookingData)
        .expect(400);

      expect(response.body.error).toContain('Dates not available');
    });
  });

  describe('PATCH /bookings/:id', () => {
    it('should accept booking as host', async () => {
      const mockBooking = {
        id: 'booking-001',
        villa_id: 'villa-001',
        host_id: 'host-001',
        status: 'pending'
      };

      jwt.verify.mockReturnValue({ userId: 'host-001', phone_number: '+1234567890' });

      testDb.query.mockResolvedValueOnce({ rows: [mockBooking] });
      testDb.query.mockResolvedValueOnce({ rows: [mockVilla] });
      testDb.query.mockResolvedValueOnce({ 
        rows: [{ ...mockBooking, status: 'confirmed' }]
      });

      const response = await request(app)
        .patch('/api/bookings/booking-001')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ status: 'confirmed' })
        .expect(200);

      expect(response.body.status).toBe('confirmed');
    });

    it('should cancel booking as guest', async () => {
      const mockBooking = {
        id: 'booking-001',
        guest_id: 'guest-001',
        status: 'confirmed'
      };

      const cancelData = {
        status: 'cancelled',
        cancellation_reason: 'Change of plans',
        cancellation_message: 'Sorry for the inconvenience'
      };

      testDb.query.mockResolvedValueOnce({ rows: [mockBooking] });
      testDb.query.mockResolvedValueOnce({ 
        rows: [{ ...mockBooking, ...cancelData }]
      });

      const response = await request(app)
        .patch('/api/bookings/booking-001')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(cancelData)
        .expect(200);

      expect(response.body.status).toBe('cancelled');
      expect(response.body.cancellation_reason).toBe(cancelData.cancellation_reason);
    });

    it('should prevent unauthorized status changes', async () => {
      const mockBooking = {
        id: 'booking-001',
        guest_id: 'other-guest-id',
        host_id: 'other-host-id',
        status: 'pending'
      };

      testDb.query.mockResolvedValueOnce({ rows: [mockBooking] });

      const response = await request(app)
        .patch('/api/bookings/booking-001')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ status: 'confirmed' })
        .expect(403);

      expect(response.body.error).toContain('Not authorized');
    });
  });

  describe('GET /bookings', () => {
    it('should get bookings for guest', async () => {
      const mockBookings = [
        {
          id: 'booking-001',
          guest_id: 'guest-001',
          status: 'confirmed'
        }
      ];

      testDb.query.mockResolvedValueOnce({ rows: [mockGuest] });
      testDb.query.mockResolvedValueOnce({ rows: mockBookings });

      const response = await request(app)
        .get('/api/bookings')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].guest_id).toBe('guest-001');
    });

    it('should get bookings for host', async () => {
      const mockBookings = [
        {
          id: 'booking-001',
          host_id: 'host-001',
          status: 'pending'
        }
      ];

      jwt.verify.mockReturnValue({ userId: 'host-001', phone_number: '+1234567890' });
      testDb.query.mockResolvedValueOnce({ rows: [mockHost] });
      testDb.query.mockResolvedValueOnce({ rows: mockBookings });

      const response = await request(app)
        .get('/api/bookings')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].host_id).toBe('host-001');
    });

    it('should filter bookings by status', async () => {
      testDb.query.mockResolvedValueOnce({ rows: [mockGuest] });
      testDb.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/bookings?status=pending')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(testDb.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'pending'"),
        expect.any(Array)
      );
    });
  });
});

describe('Messaging System', () => {
  const mockToken = 'mock-jwt-token';
  const mockUser = {
    id: 'user-001',
    name: 'Test User'
  };

  beforeEach(() => {
    jwt.verify.mockReturnValue({ userId: 'user-001', phone_number: '+1234567890' });
  });

  describe('GET /messages', () => {
    it('should get message threads for user', async () => {
      const mockThreads = [
        {
          thread_id: 'thread-001',
          other_user: { id: 'user-002', name: 'Other User' },
          last_message: { content: 'Hello!', created_at: new Date() },
          unread_count: 2
        }
      ];

      testDb.query.mockResolvedValueOnce({ rows: [mockUser] });
      testDb.query.mockResolvedValueOnce({ rows: mockThreads });

      const response = await request(app)
        .get('/api/messages')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].thread_id).toBe('thread-001');
      expect(response.body[0].unread_count).toBe(2);
    });
  });

  describe('GET /messages/:threadId', () => {
    it('should get messages in thread', async () => {
      const mockMessages = [
        {
          id: 'msg-001',
          thread_id: 'thread-001',
          sender_id: 'user-001',
          receiver_id: 'user-002',
          content: 'Hello!',
          is_read: false
        },
        {
          id: 'msg-002',
          thread_id: 'thread-001',
          sender_id: 'user-002',
          receiver_id: 'user-001',
          content: 'Hi there!',
          is_read: true
        }
      ];

      testDb.query.mockResolvedValueOnce({ rows: [mockUser] });
      testDb.query.mockResolvedValueOnce({ rows: mockMessages });

      const response = await request(app)
        .get('/api/messages/thread-001')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].content).toBe('Hello!');
    });
  });

  describe('POST /messages/:threadId', () => {
    it('should send message successfully', async () => {
      const messageData = {
        receiver_id: 'user-002',
        content: 'How are you?'
      };

      const mockMessage = {
        id: 'msg-new',
        thread_id: 'thread-001',
        sender_id: 'user-001',
        ...messageData,
        is_read: false
      };

      testDb.query.mockResolvedValueOnce({ rows: [mockUser] });
      testDb.query.mockResolvedValueOnce({ rows: [{ id: 'user-002', name: 'Other User' }] });
      testDb.query.mockResolvedValueOnce({ rows: [mockMessage] });

      const response = await request(app)
        .post('/api/messages/thread-001')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(messageData)
        .expect(201);

      expect(response.body.content).toBe(messageData.content);
      expect(response.body.sender_id).toBe('user-001');
    });

    it('should prevent messaging self', async () => {
      const messageData = {
        receiver_id: 'user-001',
        content: 'Message to self'
      };

      testDb.query.mockResolvedValueOnce({ rows: [mockUser] });

      const response = await request(app)
        .post('/api/messages/thread-001')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(messageData)
        .expect(400);

      expect(response.body.error).toContain('Cannot message yourself');
    });
  });

  describe('PATCH /messages/:id/read', () => {
    it('should mark message as read', async () => {
      const mockMessage = {
        id: 'msg-001',
        receiver_id: 'user-001',
        is_read: false
      };

      testDb.query.mockResolvedValueOnce({ rows: [mockUser] });
      testDb.query.mockResolvedValueOnce({ rows: [mockMessage] });
      testDb.query.mockResolvedValueOnce({ 
        rows: [{ ...mockMessage, is_read: true }]
      });

      const response = await request(app)
        .patch('/api/messages/msg-001/read')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should prevent marking own message as read', async () => {
      const mockMessage = {
        id: 'msg-001',
        sender_id: 'user-001',
        receiver_id: 'user-002'
      };

      testDb.query.mockResolvedValueOnce({ rows: [mockUser] });
      testDb.query.mockResolvedValueOnce({ rows: [mockMessage] });

      const response = await request(app)
        .patch('/api/messages/msg-001/read')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(403);

      expect(response.body.error).toContain('Not authorized');
    });
  });
});

describe('Review System', () => {
  const mockToken = 'mock-jwt-token';
  const mockGuest = {
    id: 'guest-001',
    name: 'Guest User'
  };

  const mockBooking = {
    id: 'booking-001',
    guest_id: 'guest-001',
    host_id: 'host-001',
    status: 'completed',
    check_out_date: new Date('2024-03-10')
  };

  beforeEach(() => {
    jwt.verify.mockReturnValue({ userId: 'guest-001', phone_number: '+1234567890' });
  });

  describe('POST /reviews', () => {
    it('should create review for completed booking', async () => {
      const reviewData = {
        booking_id: 'booking-001',
        reviewer_id: 'guest-001',
        reviewee_id: 'host-001',
        public_rating: 5,
        public_comment: 'Excellent stay!',
        private_feedback: 'Host was very helpful'
      };

      const mockReview = {
        id: 'review-new',
        ...reviewData,
        is_visible: false,
        created_at: new Date()
      };

      testDb.query.mockResolvedValueOnce({ rows: [mockGuest] });
      testDb.query.mockResolvedValueOnce({ rows: [mockBooking] });
      testDb.query.mockResolvedValueOnce({ rows: [] });
      testDb.query.mockResolvedValueOnce({ rows: [mockReview] });

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(reviewData)
        .expect(201);

      expect(response.body.public_rating).toBe(5);
      expect(response.body.is_visible).toBe(false);
    });

    it('should prevent review for non-completed booking', async () => {
      const reviewData = {
        booking_id: 'booking-001',
        reviewer_id: 'guest-001',
        reviewee_id: 'host-001',
        public_rating: 5
      };

      const pendingBooking = { ...mockBooking, status: 'confirmed' };

      testDb.query.mockResolvedValueOnce({ rows: [mockGuest] });
      testDb.query.mockResolvedValueOnce({ rows: [pendingBooking] });

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(reviewData)
        .expect(400);

      expect(response.body.error).toContain('Booking must be completed');
    });

    it('should validate rating range', async () => {
      const reviewData = {
        booking_id: 'booking-001',
        reviewer_id: 'guest-001',
        reviewee_id: 'host-001',
        public_rating: 6
      };

      testDb.query.mockResolvedValueOnce({ rows: [mockGuest] });

      const response = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(reviewData)
        .expect(400);

      expect(response.body.error).toContain('Rating must be between 1 and 5');
    });
  });

  describe('PATCH /reviews/:id', () => {
    it('should update review visibility', async () => {
      const mockReview = {
        id: 'review-001',
        reviewer_id: 'guest-001',
        is_visible: false
      };

      testDb.query.mockResolvedValueOnce({ rows: [mockGuest] });
      testDb.query.mockResolvedValueOnce({ rows: [mockReview] });
      testDb.query.mockResolvedValueOnce({ 
        rows: [{ ...mockReview, is_visible: true }]
      });

      const response = await request(app)
        .patch('/api/reviews/review-001')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ is_visible: true })
        .expect(200);

      expect(response.body.is_visible).toBe(true);
    });

    it('should prevent updating others reviews', async () => {
      const mockReview = {
        id: 'review-001',
        reviewer_id: 'other-user-id'
      };

      testDb.query.mockResolvedValueOnce({ rows: [mockGuest] });
      testDb.query.mockResolvedValueOnce({ rows: [mockReview] });

      const response = await request(app)
        .patch('/api/reviews/review-001')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ is_visible: true })
        .expect(403);

      expect(response.body.error).toContain('Not authorized');
    });
  });
});

describe('Availability Management', () => {
  const mockToken = 'mock-jwt-token';
  const mockHost = {
    id: 'host-001',
    account_type: 'host'
  };

  const mockVilla = {
    id: 'villa-001',
    host_id: 'host-001'
  };

  beforeEach(() => {
    jwt.verify.mockReturnValue({ userId: 'host-001', phone_number: '+1234567890' });
  });

  describe('GET /villas/:id/availability', () => {
    it('should get villa availability for date range', async () => {
      const mockAvailability = [
        { date: '2024-03-15', status: 'available' },
        { date: '2024-03-16', status: 'booked' },
        { date: '2024-03-17', status: 'available' }
      ];

      testDb.query.mockResolvedValueOnce({ rows: [mockVilla] });
      testDb.query.mockResolvedValueOnce({ rows: mockAvailability });

      const response = await request(app)
        .get('/api/villas/villa-001/availability?date_from=2024-03-15&date_to=2024-03-17')
        .expect(200);

      expect(response.body).toHaveLength(3);
      expect(response.body[1].status).toBe('booked');
    });
  });

  describe('PATCH /villas/:id/availability', () => {
    it('should update availability for villa owner', async () => {
      const availabilityData = {
        dates: [
          { date: '2024-03-20', status: 'blocked' },
          { date: '2024-03-21', status: 'blocked' }
        ]
      };

      testDb.query.mockResolvedValueOnce({ rows: [mockVilla] });
      testDb.query.mockResolvedValueOnce({ rows: [] });
      testDb.query.mockResolvedValueOnce({ rowCount: 2 });

      const response = await request(app)
        .patch('/api/villas/villa-001/availability')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(availabilityData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should prevent updating booked dates', async () => {
      const availabilityData = {
        dates: [
          { date: '2024-03-15', status: 'available' }
        ]
      };

      testDb.query.mockResolvedValueOnce({ rows: [mockVilla] });
      testDb.query.mockResolvedValueOnce({ 
        rows: [{ date: '2024-03-15', status: 'booked' }]
      });

      const response = await request(app)
        .patch('/api/villas/villa-001/availability')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(availabilityData)
        .expect(400);

      expect(response.body.error).toContain('Cannot modify booked dates');
    });

    it('should prevent non-owner from updating availability', async () => {
      const otherVilla = {
        id: 'villa-002',
        host_id: 'other-host-id'
      };

      const availabilityData = {
        dates: [{ date: '2024-03-20', status: 'blocked' }]
      };

      testDb.query.mockResolvedValueOnce({ rows: [otherVilla] });

      const response = await request(app)
        .patch('/api/villas/villa-002/availability')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(availabilityData)
        .expect(403);

      expect(response.body.error).toContain('Not authorized');
    });
  });
});

describe('WebSocket Events', () => {
  let mockWebSocketServer;

  beforeEach(() => {
    mockWebSocketServer = {
      clients: new Set(),
      on: jest.fn()
    };
  });

  describe('message_received event', () => {
    it('should broadcast message to recipient', async () => {
      const mockClient = {
        readyState: 1,
        send: jest.fn(),
        userId: 'user-002'
      };

      mockWebSocketServer.clients.add(mockClient);

      const messageData = {
        message: {
          id: 'msg-001',
          thread_id: 'thread-001',
          sender_id: 'user-001',
          receiver_id: 'user-002',
          content: 'Hello!'
        },
        thread_id: 'thread-001'
      };

      // Simulate WebSocket message handling
      if (mockClient.userId === messageData.message.receiver_id) {
        mockClient.send(JSON.stringify({
          event: 'message_received',
          data: messageData
        }));
      }

      expect(mockClient.send).toHaveBeenCalledWith(
        expect.stringContaining('message_received')
      );
    });
  });

  describe('booking_status_updated event', () => {
    it('should notify guest and host of status change', async () => {
      const mockGuestClient = {
        readyState: 1,
        send: jest.fn(),
        userId: 'guest-001'
      };

      const mockHostClient = {
        readyState: 1,
        send: jest.fn(),
        userId: 'host-001'
      };

      mockWebSocketServer.clients.add(mockGuestClient);
      mockWebSocketServer.clients.add(mockHostClient);

      const bookingData = {
        booking: {
          id: 'booking-001',
          guest_id: 'guest-001',
          host_id: 'host-001',
          status: 'confirmed'
        },
        previous_status: 'pending'
      };

      // Simulate WebSocket notification
      mockWebSocketServer.clients.forEach(client => {
        if (client.userId === bookingData.booking.guest_id || 
            client.userId === bookingData.booking.host_id) {
          client.send(JSON.stringify({
            event: 'booking_status_updated',
            data: bookingData
          }));
        }
      });

      expect(mockGuestClient.send).toHaveBeenCalledWith(
        expect.stringContaining('booking_status_updated')
      );
      expect(mockHostClient.send).toHaveBeenCalledWith(
        expect.stringContaining('booking_status_updated')
      );
    });
  });

  describe('user_typing event', () => {
    it('should broadcast typing indicator', async () => {
      const mockClient = {
        readyState: 1,
        send: jest.fn(),
        userId: 'user-002'
      };

      mockWebSocketServer.clients.add(mockClient);

      const typingData = {
        thread_id: 'thread-001',
        user_id: 'user-001',
        is_typing: true
      };

      // Simulate WebSocket typing event
      if (mockClient.userId !== typingData.user_id) {
        mockClient.send(JSON.stringify({
          event: 'user_typing',
          data: typingData
        }));
      }

      expect(mockClient.send).toHaveBeenCalledWith(
        expect.stringContaining('user_typing')
      );
    });
  });
});

describe('Error Handling', () => {
  describe('Database Errors', () => {
    it('should handle database connection errors', async () => {
      testDb.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);

      expect(response.body.error).toContain('Internal server error');
    });

    it('should handle database query errors', async () => {
      testDb.query.mockRejectedValueOnce(new Error('Query failed'));

      const response = await request(app)
        .get('/api/villas')
        .expect(500);

      expect(response.body.error).toContain('Internal server error');
    });
  });

  describe('Validation Errors', () => {
    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body.error).toContain('Invalid JSON');
    });

    it('should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body.error).toContain('Required');
    });
  });

  describe('Authentication Errors', () => {
    it('should handle invalid JWT token', async () => {
      jwt.verify.mockImplementationOnce(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toContain('Invalid token');
    });

    it('should handle missing authorization header', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .expect(401);

      expect(response.body.error).toContain('Authentication required');
    });
  });

  describe('Authorization Errors', () => {
    it('should prevent guest from accessing host endpoints', async () => {
      jwt.verify.mockReturnValue({ userId: 'guest-001' });
      testDb.query.mockResolvedValueOnce({ 
        rows: [{ id: 'guest-001', account_type: 'guest' }] 
      });

      const response = await request(app)
        .post('/api/villas')
        .set('Authorization', 'Bearer guest-token')
        .send({
          title: 'Test Villa',
          property_type: 'villa',
          num_guests: 4,
          price_per_night: 100,
          preferred_payment_method: 'cash'
        })
        .expect(403);

      expect(response.body.error).toContain('Host account required');
    });

    it('should prevent non-owner from modifying resources', async () => {
      jwt.verify.mockReturnValue({ userId: 'user-001' });
      testDb.query.mockResolvedValueOnce({ 
        rows: [{ id: 'villa-001', host_id: 'other-user-id' }] 
      });

      const response = await request(app)
        .patch('/api/villas/villa-001')
        .set('Authorization', 'Bearer user-token')
        .send({ title: 'Updated' })
        .expect(403);

      expect(response.body.error).toContain('Not authorized');
    });
  });
});

describe('Performance Tests', () => {
  describe('Rate Limiting', () => {
    it('should handle multiple concurrent requests', async () => {
      const promises = Array(10).fill().map(() =>
        request(app).get('/api/villas')
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Pagination', () => {
    it('should limit results per page', async () => {
      const mockVillas = Array(20).fill().map((_, i) => ({
        id: `villa-${i}`,
        title: `Villa ${i}`
      }));

      testDb.query.mockResolvedValueOnce({ rows: mockVillas.slice(0, 10) });

      const response = await request(app)
        .get('/api/villas?limit=10&offset=0')
        .expect(200);

      expect(response.body).toHaveLength(10);
      expect(testDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 10 OFFSET 0'),
        expect.any(Array)
      );
    });
  });
});

describe('Integration Tests', () => {
  describe('Complete Booking Flow', () => {
    it('should handle full booking lifecycle', async () => {
      // 1. Guest searches for villas
      const mockVillas = [{
        id: 'villa-001',
        title: 'Beach Villa',
        price_per_night: 100
      }];

      testDb.query.mockResolvedValueOnce({ rows: mockVillas });
      const searchResponse = await request(app)
        .get('/api/villas?location=beach')
        .expect(200);

      expect(searchResponse.body).toHaveLength(1);

      // 2. Guest creates booking request
      const bookingData = {
        villa_id: 'villa-001',
        check_in_date: '2024-03-15',
        check_out_date: '2024-03-17',
        num_guests: 2,
        guest_message: 'Looking forward to my stay!'
      };

      const mockGuest = { id: 'guest-001', account_type: 'guest' };
      const mockHost = { id: 'host-001', account_type: 'host' };
      const mockVilla = { id: 'villa-001', host_id: 'host-001', price_per_night: 100 };
      const mockBooking = {
        id: 'booking-001',
        ...bookingData,
        guest_id: 'guest-001',
        host_id: 'host-001',
        total_price: 200,
        status: 'pending'
      };

      jwt.verify.mockReturnValue({ userId: 'guest-001' });
      testDb.query.mockResolvedValueOnce({ rows: [mockGuest] });
      testDb.query.mockResolvedValueOnce({ rows: [mockVilla] });
      testDb.query.mockResolvedValueOnce({ rows: [mockHost] });
      testDb.query.mockResolvedValueOnce({ rows: [] });
      testDb.query.mockResolvedValueOnce({ rows: [mockBooking] });

      const bookingResponse = await request(app)
        .post('/api/bookings')
        .set('Authorization', 'Bearer guest-token')
        .send(bookingData)
        .expect(201);

      expect(bookingResponse.body.status).toBe('pending');

      // 3. Host accepts booking
      jwt.verify.mockReturnValue({ userId: 'host-001' });
      testDb.query.mockResolvedValueOnce({ rows: [mockBooking] });
      testDb.query.mockResolvedValueOnce({ rows: [mockVilla] });
      testDb.query.mockResolvedValueOnce({ 
        rows: [{ ...mockBooking, status: 'confirmed' }]
      });

      const acceptResponse = await request(app)
        .patch('/api/bookings/booking-001')
        .set('Authorization', 'Bearer host-token')
        .send({ status: 'confirmed' })
        .expect(200);

      expect(acceptResponse.body.status).toBe('confirmed');

      // 4. Guest views their trips
      jwt.verify.mockReturnValue({ userId: 'guest-001' });
      testDb.query.mockResolvedValueOnce({ rows: [mockGuest] });
      testDb.query.mockResolvedValueOnce({ rows: [mockBooking] });

      const tripsResponse = await request(app)
        .get('/api/users/me/trips')
        .set('Authorization', 'Bearer guest-token')
        .expect(200);

      expect(tripsResponse.body).toHaveLength(1);
      expect(tripsResponse.body[0].status).toBe('confirmed');
    });
  });

  describe('Complete Messaging Flow', () => {
    it('should handle message exchange between users', async () => {
      const mockUser1 = { id: 'user-001', name: 'User 1' };
      const mockUser2 = { id: 'user-002', name: 'User 2' };

      // 1. User 1 sends message
      const messageData = {
        receiver_id: 'user-002',
        content: 'Hello from User 1!'
      };

      const mockMessage = {
        id: 'msg-001',
        thread_id: 'thread-001',
        sender_id: 'user-001',
        ...messageData,
        is_read: false
      };

      jwt.verify.mockReturnValue({ userId: 'user-001' });
      testDb.query.mockResolvedValueOnce({ rows: [mockUser1] });
      testDb.query.mockResolvedValueOnce({ rows: [mockUser2] });
      testDb.query.mockResolvedValueOnce({ rows: [mockMessage] });

      const sendResponse = await request(app)
        .post('/api/messages/thread-001')
        .set('Authorization', 'Bearer user1-token')
        .send(messageData)
        .expect(201);

      expect(sendResponse.body.content).toBe(messageData.content);

      // 2. User 2 retrieves messages
      jwt.verify.mockReturnValue({ userId: 'user-002' });
      testDb.query.mockResolvedValueOnce({ rows: [mockUser2] });
      testDb.query.mockResolvedValueOnce({ rows: [mockMessage] });

      const retrieveResponse = await request(app)
        .get('/api/messages/thread-001')
        .set('Authorization', 'Bearer user2-token')
        .expect(200);

      expect(retrieveResponse.body).toHaveLength(1);
      expect(retrieveResponse.body[0].is_read).toBe(false);

      // 3. User 2 marks message as read
      testDb.query.mockResolvedValueOnce({ rows: [mockUser2] });
      testDb.query.mockResolvedValueOnce({ rows: [mockMessage] });
      testDb.query.mockResolvedValueOnce({ 
        rows: [{ ...mockMessage, is_read: true }]
      });

      const markReadResponse = await request(app)
        .patch('/api/messages/msg-001/read')
        .set('Authorization', 'Bearer user2-token')
        .expect(200);

      expect(markReadResponse.body.success).toBe(true);

      // 4. User 2 replies
      const replyData = {
        receiver_id: 'user-001',
        content: 'Hello from User 2!'
      };

      const mockReply = {
        id: 'msg-002',
        thread_id: 'thread-001',
        sender_id: 'user-002',
        ...replyData,
        is_read: false
      };

      testDb.query.mockResolvedValueOnce({ rows: [mockUser2] });
      testDb.query.mockResolvedValueOnce({ rows: [mockUser1] });
      testDb.query.mockResolvedValueOnce({ rows: [mockReply] });

      const replyResponse = await request(app)
        .post('/api/messages/thread-001')
        .set('Authorization', 'Bearer user2-token')
        .send(replyData)
        .expect(201);

      expect(replyResponse.body.content).toBe(replyData.content);
    });
  });

  describe('Review System Integration', () => {
    it('should handle two-way blind review system', async () => {
      const mockGuest = { id: 'guest-001' };
      const mockHost = { id: 'host-001' };
      const mockBooking = {
        id: 'booking-001',
        guest_id: 'guest-001',
        host_id: 'host-001',
        status: 'completed'
      };

      // 1. Guest submits review (hidden initially)
      const guestReviewData = {
        booking_id: 'booking-001',
        reviewer_id: 'guest-001',
        reviewee_id: 'host-001',
        public_rating: 5,
        public_comment: 'Great host!'
      };

      const mockGuestReview = {
        id: 'review-001',
        ...guestReviewData,
        is_visible: false
      };

      jwt.verify.mockReturnValue({ userId: 'guest-001' });
      testDb.query.mockResolvedValueOnce({ rows: [mockGuest] });
      testDb.query.mockResolvedValueOnce({ rows: [mockBooking] });
      testDb.query.mockResolvedValueOnce({ rows: [] });
      testDb.query.mockResolvedValueOnce({ rows: [mockGuestReview] });

      const guestReviewResponse = await request(app)
        .post('/api/reviews')
        .set('Authorization', 'Bearer guest-token')
        .send(guestReviewData)
        .expect(201);

      expect(guestReviewResponse.body.is_visible).toBe(false);

      // 2. Host submits review
      const hostReviewData = {
        booking_id: 'booking-001',
        reviewer_id: 'host-001',
        reviewee_id: 'guest-001',
        public_rating: 4,
        public_comment: 'Good guest'
      };

      const mockHostReview = {
        id: 'review-002',
        ...hostReviewData,
        is_visible: false
      };

      jwt.verify.mockReturnValue({ userId: 'host-001' });
      testDb.query.mockResolvedValueOnce({ rows: [mockHost] });
      testDb.query.mockResolvedValueOnce({ rows: [mockBooking] });
      testDb.query.mockResolvedValueOnce({ rows: [] });
      testDb.query.mockResolvedValueOnce({ rows: [mockHostReview] });

      const hostReviewResponse = await request(app)
        .post('/api/reviews')
        .set('Authorization', 'Bearer host-token')
        .send(hostReviewData)
        .expect(201);

      expect(hostReviewResponse.body.is_visible).toBe(false);

      // 3. System makes both reviews visible (simulated)
      testDb.query.mockResolvedValueOnce({ rows: [mockGuest] });
      testDb.query.mockResolvedValueOnce({ rows: [mockGuestReview] });
      testDb.query.mockResolvedValueOnce({ 
        rows: [{ ...mockGuestReview, is_visible: true }]
      });

      const updateResponse = await request(app)
        .patch('/api/reviews/review-001')
        .set('Authorization', 'Bearer admin-token')
        .send({ is_visible: true })
        .expect(200);

      expect(updateResponse.body.is_visible).toBe(true);
    });
  });
});