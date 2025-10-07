import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import jwt, { JwtPayload } from 'jsonwebtoken';
import morgan from 'morgan';
import { Pool, PoolConfig } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// JWT payload interface
interface JWTPayload extends JwtPayload {
  user_id: string;
}

// Import Zod schemas
import {
  userSchema,
  createUserInputSchema,
  updateUserInputSchema,
  villaSchema,
  createVillaInputSchema,
  updateVillaInputSchema,
  photoSchema,
  createPhotoInputSchema,
  updatePhotoInputSchema,
  amenitySchema,
  createVillaAmenityInputSchema,
  availabilitySchema,
  bookingSchema,
  createBookingInputSchema,
  messageSchema,
  createMessageInputSchema,
  reviewSchema,
  createReviewInputSchema,
  updateReviewInputSchema
} from './schema.ts';

dotenv.config();

// ESM workaround for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT) || 3000;

// Database configuration
const { DATABASE_URL, PGHOST, PGDATABASE, PGUSER, PGPASSWORD, PGPORT = 5432, JWT_SECRET = 'your-secret-key' } = process.env;

const poolConfig: PoolConfig = DATABASE_URL
  ? { 
      connectionString: DATABASE_URL, 
      ssl: { rejectUnauthorized: false } 
    }
  : {
      host: PGHOST,
      database: PGDATABASE,
      user: PGUSER,
      password: PGPASSWORD,
      port: Number(PGPORT),
      ssl: { rejectUnauthorized: false },
    };

const pool = new Pool(poolConfig);

// Middleware
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    process.env.ALLOWED_ORIGINS || '',
    'https://123airbnb-style-app-for-the-libyan-market.launchpulse.ai'
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
}));
app.use(express.json({ limit: "5mb" }));
app.use(morgan('combined'));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Create storage directory if it doesn't exist
const storageDir = path.join(__dirname, 'storage');
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, storageDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Error response utility
interface ErrorResponse {
  success: false;
  message: string;
  error_code?: string;
  details?: any;
  timestamp: string;
}

function createErrorResponse(
  message: string,
  error?: any,
  errorCode?: string
): ErrorResponse {
  const response: ErrorResponse = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  if (errorCode) {
    response.error_code = errorCode;
  }

  if (error) {
    response.details = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return response;
}

// Authentication middleware
const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json(createErrorResponse('Access token required', null, 'AUTH_TOKEN_REQUIRED'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM users WHERE id = $1', [decoded.user_id]);
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(401).json(createErrorResponse('Invalid token', null, 'AUTH_TOKEN_INVALID'));
    }

    req.user = result.rows[0];
    next();
  } catch (error) {
    return res.status(403).json(createErrorResponse('Invalid or expired token', error, 'AUTH_TOKEN_INVALID'));
  }
};

/*
  Authentication endpoints - handles user registration, login, and verification
  Implements phone-based OTP verification for security
*/

// POST /api/auth/register - Register a new user with phone verification
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('Registration request received:', req.body);
    const validatedData = createUserInputSchema.parse(req.body);
    
    const client = await pool.connect();
    
    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1 OR phone_number = $2', 
      [validatedData.email, validatedData.phone_number]
    );
    
    if (existingUser.rows.length > 0) {
      client.release();
      return res.status(409).json(createErrorResponse('User already exists', null, 'USER_ALREADY_EXISTS'));
    }

    // Create new user (no password hashing for development)
    const userId = uuidv4();
    const now = new Date().toISOString();
    
    const result = await client.query(
      `INSERT INTO users (id, name, email, password_hash, phone_number, account_type, is_phone_verified, profile_picture_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        userId,
        validatedData.name,
        validatedData.email,
        validatedData.password_hash, // Store plain text password for development
        validatedData.phone_number,
        validatedData.account_type || 'guest',
        false, // Phone not verified initially
        validatedData.profile_picture_url,
        now,
        now
      ]
    );
    
    client.release();

    const user = result.rows[0];
    
    // Generate JWT token
    const token = jwt.sign(
      { user_id: user.id, phone_number: user.phone_number },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('User registered successfully:', user.id);
    
    res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        account_type: user.account_type,
        is_phone_verified: user.is_phone_verified,
        profile_picture_url: user.profile_picture_url,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json(createErrorResponse('Registration failed', error, 'REGISTRATION_FAILED'));
  }
});

// POST /api/auth/login - Authenticate user with phone/email and password
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json(createErrorResponse('Identifier and password are required', null, 'MISSING_CREDENTIALS'));
    }

    const client = await pool.connect();
    
    // Find user by phone or email
    const result = await client.query(
      'SELECT * FROM users WHERE phone_number = $1 OR email = $1',
      [identifier]
    );
    
    client.release();

    if (result.rows.length === 0) {
      return res.status(401).json(createErrorResponse('Invalid credentials', null, 'INVALID_CREDENTIALS'));
    }

    const user = result.rows[0];

    // Check password (direct comparison for development)
    if (password !== user.password_hash) {
      return res.status(401).json(createErrorResponse('Invalid credentials', null, 'INVALID_CREDENTIALS'));
    }

    // Generate JWT token
    const token = jwt.sign(
      { user_id: user.id, phone_number: user.phone_number },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone_number: user.phone_number,
        account_type: user.account_type,
        is_phone_verified: user.is_phone_verified,
        profile_picture_url: user.profile_picture_url,
        created_at: user.created_at,
        updated_at: user.updated_at
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json(createErrorResponse('Login failed', error, 'LOGIN_FAILED'));
  }
});

/*
  @@need:external-api: SMS service for sending OTP verification codes to user phone numbers
  Should integrate with services like Twilio, AWS SNS, or local Libyan SMS providers
*/
async function sendOTPSMS(phone_number, otp) {
  // Mock response for development - replace with actual SMS service
  console.log(`[MOCK SMS] Sending OTP ${otp} to ${phone_number}`);
  return {
    success: true,
    message_id: `mock_msg_${Date.now()}`,
    phone_number: phone_number
  };
}

// POST /api/auth/verify-otp - Verify phone number with OTP
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    console.log('OTP verification request received:', req.body);
    const { phone_number, otp } = req.body;

    if (!phone_number || !otp) {
      console.log('Missing phone number or OTP');
      return res.status(400).json(createErrorResponse('Phone number and OTP are required', null, 'MISSING_OTP_DATA'));
    }

    // Mock OTP verification - in production, verify against stored OTP
    const isValidOTP = otp === '123456'; // Mock valid OTP
    console.log('OTP validation result:', isValidOTP);

    if (!isValidOTP) {
      console.log('Invalid OTP provided:', otp);
      return res.status(400).json(createErrorResponse('Invalid OTP', null, 'INVALID_OTP'));
    }

    const client = await pool.connect();
    
    // Update user's phone verification status
    const result = await client.query(
      'UPDATE users SET is_phone_verified = true, updated_at = $1 WHERE phone_number = $2 RETURNING *',
      [new Date().toISOString(), phone_number]
    );
    
    client.release();

    if (result.rows.length === 0) {
      console.log('User not found for phone number:', phone_number);
      return res.status(404).json(createErrorResponse('User not found', null, 'USER_NOT_FOUND'));
    }

    console.log('Phone verification successful for user:', result.rows[0].id);
    res.json({ success: true });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json(createErrorResponse('OTP verification failed', error, 'OTP_VERIFICATION_FAILED'));
  }
});

// POST /api/auth/forgot-password - Initiate password reset
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json(createErrorResponse('Phone number or email is required', null, 'MISSING_IDENTIFIER'));
    }

    const client = await pool.connect();
    const result = await client.query(
      'SELECT id, email, phone_number FROM users WHERE phone_number = $1 OR email = $1',
      [identifier]
    );
    client.release();

    if (result.rows.length === 0) {
      // Return success even if user not found for security
      return res.json({ success: true, message: 'If the account exists, reset instructions have been sent' });
    }

    const user = result.rows[0];
    
    // Mock sending reset instructions
    console.log(`[MOCK] Password reset requested for user ${user.id}`);

    res.json({ success: true, message: 'If the account exists, reset instructions have been sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json(createErrorResponse('Password reset failed', error, 'PASSWORD_RESET_FAILED'));
  }
});

// POST /api/auth/reset-password - Reset password with token
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, new_password } = req.body;

    if (!token || !new_password) {
      return res.status(400).json(createErrorResponse('Token and new password are required', null, 'MISSING_RESET_DATA'));
    }

    // Mock token validation - in production, verify JWT token or database token
    const mockUserId = 'user_001'; // Mock user ID from token

    const client = await pool.connect();
    const result = await client.query(
      'UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3 RETURNING id',
      [new_password, new Date().toISOString(), mockUserId]
    );
    client.release();

    if (result.rows.length === 0) {
      return res.status(400).json(createErrorResponse('Invalid reset token', null, 'INVALID_RESET_TOKEN'));
    }

    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json(createErrorResponse('Password reset failed', error, 'PASSWORD_RESET_FAILED'));
  }
});

/*
  User management endpoints - handles profile operations and user data
  Provides access to user listings and trips based on account type
*/

// GET /api/users/me - Get current user profile
app.get('/api/users/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      phone_number: req.user.phone_number,
      account_type: req.user.account_type,
      is_phone_verified: req.user.is_phone_verified,
      profile_picture_url: req.user.profile_picture_url,
      created_at: req.user.created_at,
      updated_at: req.user.updated_at
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json(createErrorResponse('Failed to get user profile', error, 'GET_PROFILE_FAILED'));
  }
});

// PATCH /api/users/me - Update current user profile
app.patch('/api/users/me', authenticateToken, async (req, res) => {
  try {
    const validatedData = updateUserInputSchema.parse({ ...req.body, id: req.user.id });
    
    const client = await pool.connect();
    
    const updates = [];
    const values = [];
    let paramCount = 1;

    // Build dynamic update query
    if (validatedData.name) {
      updates.push(`name = $${paramCount}`);
      values.push(validatedData.name);
      paramCount++;
    }
    if (validatedData.email !== undefined) {
      updates.push(`email = $${paramCount}`);
      values.push(validatedData.email);
      paramCount++;
    }
    if (validatedData.phone_number) {
      updates.push(`phone_number = $${paramCount}`);
      values.push(validatedData.phone_number);
      paramCount++;
    }
    if (validatedData.profile_picture_url !== undefined) {
      updates.push(`profile_picture_url = $${paramCount}`);
      values.push(validatedData.profile_picture_url);
      paramCount++;
    }
    if (validatedData.is_phone_verified !== undefined) {
      updates.push(`is_phone_verified = $${paramCount}`);
      values.push(validatedData.is_phone_verified);
      paramCount++;
    }

    updates.push(`updated_at = $${paramCount}`);
    values.push(new Date().toISOString());
    paramCount++;

    values.push(req.user.id);

    const result = await client.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    
    client.release();

    const user = result.rows[0];
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      phone_number: user.phone_number,
      account_type: user.account_type,
      is_phone_verified: user.is_phone_verified,
      profile_picture_url: user.profile_picture_url,
      created_at: user.created_at,
      updated_at: user.updated_at
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(400).json(createErrorResponse('Profile update failed', error, 'UPDATE_PROFILE_FAILED'));
  }
});

// GET /api/users/{user_id} - Get public user profile by ID
app.get('/api/users/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;

    const client = await pool.connect();
    const result = await client.query(
      'SELECT id, name, profile_picture_url, is_phone_verified, created_at FROM users WHERE id = $1',
      [user_id]
    );
    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('User not found', null, 'USER_NOT_FOUND'));
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json(createErrorResponse('Failed to get user', error, 'GET_USER_FAILED'));
  }
});

// GET /api/users/me/listings - Get current user's property listings (hosts only)
app.get('/api/users/me/listings', authenticateToken, async (req, res) => {
  try {
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT v.*, 
             (SELECT url FROM photos WHERE villa_id = v.id AND is_cover_photo = true LIMIT 1) as cover_photo_url,
             (SELECT COUNT(*) FROM photos WHERE villa_id = v.id) as photo_count
      FROM villas v 
      WHERE v.host_id = $1 
      ORDER BY v.created_at DESC
    `, [req.user.id]);
    
    client.release();

    res.json(result.rows);
  } catch (error) {
    console.error('Get user listings error:', error);
    res.status(500).json(createErrorResponse('Failed to get listings', error, 'GET_LISTINGS_FAILED'));
  }
});

// GET /api/users/me/trips - Get current user's bookings (guests)
app.get('/api/users/me/trips', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    
    const client = await pool.connect();
    
    let query = `
      SELECT b.*, 
             v.title as villa_title,
             v.exact_address,
             v.directions_landmarks,
             (SELECT url FROM photos WHERE villa_id = v.id AND is_cover_photo = true LIMIT 1) as cover_photo_url,
             u.name as host_name,
             u.profile_picture_url as host_photo
      FROM bookings b
      JOIN villas v ON b.villa_id = v.id
      JOIN users u ON b.host_id = u.id
      WHERE b.guest_id = $1
    `;
    
    const params = [req.user.id];
    
    // Filter by status if provided
    if (status === 'upcoming') {
      query += ` AND b.check_in_date >= CURRENT_DATE AND b.status IN ('confirmed', 'pending')`;
    } else if (status === 'past') {
      query += ` AND b.check_out_date < CURRENT_DATE`;
    }
    
    query += ` ORDER BY b.check_in_date DESC`;
    
    const result = await client.query(query, params);
    
    client.release();

    res.json(result.rows);
  } catch (error) {
    console.error('Get user trips error:', error);
    res.status(500).json(createErrorResponse('Failed to get trips', error, 'GET_TRIPS_FAILED'));
  }
});

/*
  Villa management endpoints - handles property listings CRUD operations
  Includes search functionality with complex filtering capabilities
*/

// GET /api/villas - Search and filter properties
app.get('/api/villas', async (req, res) => {
  try {
    const {
      location,
      check_in,
      check_out,
      num_guests,
      price_min,
      price_max,
      property_types,
      amenities,
      bedrooms,
      bathrooms,
      limit = '10',
      offset = '0'
    } = req.query;

    // Coerce query parameters to proper types with fallbacks
    const limitInt = parseInt(limit as string);
    const parsedLimit = Math.min(isNaN(limitInt) ? 10 : limitInt, 50); // Cap at 50
    
    const offsetInt = parseInt(offset as string);
    const parsedOffset = Math.max(isNaN(offsetInt) ? 0 : offsetInt, 0);
    
    // Only use valid parsed values, skip invalid ones (check for NaN)
    const numGuestsInt = parseInt(num_guests as string);
    const parsedNumGuests = num_guests && !isNaN(numGuestsInt) && numGuestsInt > 0 ? numGuestsInt : undefined;
    
    const priceMinFloat = parseFloat(price_min as string);
    const parsedPriceMin = price_min && !isNaN(priceMinFloat) && priceMinFloat >= 0 ? priceMinFloat : undefined;
    
    const priceMaxFloat = parseFloat(price_max as string);
    const parsedPriceMax = price_max && !isNaN(priceMaxFloat) && priceMaxFloat >= 0 ? priceMaxFloat : undefined;
    
    const bedroomsInt = parseInt(bedrooms as string);
    const parsedBedrooms = bedrooms && !isNaN(bedroomsInt) && bedroomsInt >= 0 ? bedroomsInt : undefined;
    
    const bathroomsInt = parseInt(bathrooms as string);
    const parsedBathrooms = bathrooms && !isNaN(bathroomsInt) && bathroomsInt >= 0 ? bathroomsInt : undefined;

    const client = await pool.connect();
    
    let query = `
      SELECT DISTINCT v.*, 
             (SELECT url FROM photos WHERE villa_id = v.id AND is_cover_photo = true LIMIT 1) as cover_photo_url,
             (SELECT COUNT(*) FROM photos WHERE villa_id = v.id) as photo_count,
             u.name as host_name,
             u.profile_picture_url as host_photo,
             (SELECT AVG(public_rating) FROM reviews r JOIN bookings b ON r.booking_id = b.id WHERE b.villa_id = v.id AND r.is_visible = true) as avg_rating,
             (SELECT COUNT(*) FROM reviews r JOIN bookings b ON r.booking_id = b.id WHERE b.villa_id = v.id AND r.is_visible = true) as review_count
      FROM villas v
      JOIN users u ON v.host_id = u.id
      WHERE v.status = 'listed'
    `;
    
    const params = [];
    let paramCount = 1;

    // Add filters
    if (location) {
      query += ` AND (v.exact_address ILIKE $${paramCount} OR v.directions_landmarks ILIKE $${paramCount})`;
      params.push(`%${location}%`);
      paramCount++;
    }

    if (parsedNumGuests) {
      query += ` AND v.num_guests >= $${paramCount}`;
      params.push(parsedNumGuests);
      paramCount++;
    }

    if (parsedPriceMin) {
      query += ` AND v.price_per_night >= $${paramCount}`;
      params.push(parsedPriceMin);
      paramCount++;
    }

    if (parsedPriceMax) {
      query += ` AND v.price_per_night <= $${paramCount}`;
      params.push(parsedPriceMax);
      paramCount++;
    }

    if (property_types) {
      const types = Array.isArray(property_types) ? property_types : [property_types];
      query += ` AND v.property_type = ANY($${paramCount})`;
      params.push(types);
      paramCount++;
    }

    if (parsedBedrooms) {
      query += ` AND v.num_bedrooms >= $${paramCount}`;
      params.push(parsedBedrooms);
      paramCount++;
    }

    if (parsedBathrooms) {
      query += ` AND v.num_bathrooms >= $${paramCount}`;
      params.push(parsedBathrooms);
      paramCount++;
    }

    // Check availability if dates provided
    if (check_in && check_out) {
      query += ` AND NOT EXISTS (
        SELECT 1 FROM availability a 
        WHERE a.villa_id = v.id 
        AND a.date >= $${paramCount} 
        AND a.date < $${paramCount + 1}
        AND a.status IN ('booked', 'blocked')
      )`;
      params.push(check_in, check_out);
      paramCount += 2;
    }

    // Filter by amenities if provided
    if (amenities) {
      const amenityList = Array.isArray(amenities) ? amenities : [amenities];
      query += ` AND EXISTS (
        SELECT 1 FROM villa_amenities va 
        JOIN amenities a ON va.amenity_id = a.id 
        WHERE va.villa_id = v.id 
        AND a.name = ANY($${paramCount})
      )`;
      params.push(amenityList);
      paramCount++;
    }

    query += ` ORDER BY v.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parsedLimit, parsedOffset);

    const result = await client.query(query, params);
    
    client.release();

    res.json(result.rows);
  } catch (error) {
    console.error('Search villas error:', error);
    res.status(500).json(createErrorResponse('Failed to search villas', error, 'SEARCH_VILLAS_FAILED'));
  }
});

// POST /api/villas - Create a new villa listing
app.post('/api/villas', authenticateToken, async (req, res) => {
  try {
    const validatedData = createVillaInputSchema.parse({
      ...req.body,
      host_id: req.user.id
    });

    const client = await pool.connect();
    
    const villaId = uuidv4();
    const now = new Date().toISOString();

    const result = await client.query(`
      INSERT INTO villas (
        id, host_id, title, description, property_type, num_guests, num_bedrooms, 
        num_beds, num_bathrooms, price_per_night, cleaning_fee, minimum_nights, 
        house_rules, preferred_payment_method, exact_address, directions_landmarks, 
        latitude, longitude, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *
    `, [
      villaId,
      validatedData.host_id,
      validatedData.title,
      validatedData.description,
      validatedData.property_type,
      validatedData.num_guests,
      validatedData.num_bedrooms,
      validatedData.num_beds,
      validatedData.num_bathrooms,
      validatedData.price_per_night,
      validatedData.cleaning_fee,
      validatedData.minimum_nights,
      validatedData.house_rules,
      validatedData.preferred_payment_method,
      validatedData.exact_address,
      validatedData.directions_landmarks,
      validatedData.latitude,
      validatedData.longitude,
      'draft',
      now,
      now
    ]);

    client.release();

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create villa error:', error);
    res.status(400).json(createErrorResponse('Failed to create villa', error, 'CREATE_VILLA_FAILED'));
  }
});

// GET /api/villas/{villa_id} - Get detailed villa information
app.get('/api/villas/:villa_id', async (req, res) => {
  try {
    const { villa_id } = req.params;

    const client = await pool.connect();
    
    // Get villa details with host info
    const villaResult = await client.query(`
      SELECT v.*, 
             u.name as host_name,
             u.profile_picture_url as host_photo,
             u.is_phone_verified as host_verified,
             u.created_at as host_joined_date,
             (SELECT AVG(public_rating) FROM reviews r JOIN bookings b ON r.booking_id = b.id WHERE b.villa_id = v.id AND r.is_visible = true) as avg_rating,
             (SELECT COUNT(*) FROM reviews r JOIN bookings b ON r.booking_id = b.id WHERE b.villa_id = v.id AND r.is_visible = true) as review_count
      FROM villas v
      JOIN users u ON v.host_id = u.id
      WHERE v.id = $1
    `, [villa_id]);

    if (villaResult.rows.length === 0) {
      client.release();
      return res.status(404).json(createErrorResponse('Villa not found', null, 'VILLA_NOT_FOUND'));
    }

    const villa = villaResult.rows[0];

    // Get photos
    const photosResult = await client.query(
      'SELECT * FROM photos WHERE villa_id = $1 ORDER BY sort_order ASC',
      [villa_id]
    );

    // Get amenities
    const amenitiesResult = await client.query(`
      SELECT a.* FROM amenities a
      JOIN villa_amenities va ON a.id = va.amenity_id
      WHERE va.villa_id = $1
    `, [villa_id]);

    client.release();

    // Combine all data
    villa.photos = photosResult.rows;
    villa.amenities = amenitiesResult.rows;

    res.json(villa);
  } catch (error) {
    console.error('Get villa error:', error);
    res.status(500).json(createErrorResponse('Failed to get villa', error, 'GET_VILLA_FAILED'));
  }
});

// PATCH /api/villas/{villa_id} - Update villa listing
app.patch('/api/villas/:villa_id', authenticateToken, async (req, res) => {
  try {
    const { villa_id } = req.params;
    const validatedData = updateVillaInputSchema.parse({ ...req.body, id: villa_id });

    const client = await pool.connect();
    
    // Verify ownership
    const ownerCheck = await client.query(
      'SELECT host_id FROM villas WHERE id = $1',
      [villa_id]
    );

    if (ownerCheck.rows.length === 0) {
      client.release();
      return res.status(404).json(createErrorResponse('Villa not found', null, 'VILLA_NOT_FOUND'));
    }

    if (ownerCheck.rows[0].host_id !== req.user.id) {
      client.release();
      return res.status(403).json(createErrorResponse('Access denied', null, 'ACCESS_DENIED'));
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.keys(validatedData).forEach(key => {
      if (key !== 'id' && validatedData[key] !== undefined) {
        updates.push(`${key} = $${paramCount}`);
        values.push(validatedData[key]);
        paramCount++;
      }
    });

    updates.push(`updated_at = $${paramCount}`);
    values.push(new Date().toISOString());
    paramCount++;

    values.push(villa_id);

    const result = await client.query(
      `UPDATE villas SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    client.release();

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update villa error:', error);
    res.status(400).json(createErrorResponse('Failed to update villa', error, 'UPDATE_VILLA_FAILED'));
  }
});

// DELETE /api/villas/{villa_id} - Delete villa listing
app.delete('/api/villas/:villa_id', authenticateToken, async (req, res) => {
  try {
    const { villa_id } = req.params;

    const client = await pool.connect();
    
    // Verify ownership
    const ownerCheck = await client.query(
      'SELECT host_id FROM villas WHERE id = $1',
      [villa_id]
    );

    if (ownerCheck.rows.length === 0) {
      client.release();
      return res.status(404).json(createErrorResponse('Villa not found', null, 'VILLA_NOT_FOUND'));
    }

    if (ownerCheck.rows[0].host_id !== req.user.id) {
      client.release();
      return res.status(403).json(createErrorResponse('Access denied', null, 'ACCESS_DENIED'));
    }

    // Delete villa (cascading deletes will handle related records)
    await client.query('DELETE FROM villas WHERE id = $1', [villa_id]);
    
    client.release();

    res.status(204).send();
  } catch (error) {
    console.error('Delete villa error:', error);
    res.status(500).json(createErrorResponse('Failed to delete villa', error, 'DELETE_VILLA_FAILED'));
  }
});

/*
  Photo management endpoints - handles property image uploads and organization
  Supports setting cover photos and reordering image galleries
*/

// GET /api/villas/{villa_id}/photos - Get villa photos
app.get('/api/villas/:villa_id/photos', async (req, res) => {
  try {
    const { villa_id } = req.params;

    const client = await pool.connect();
    const result = await client.query(
      'SELECT * FROM photos WHERE villa_id = $1 ORDER BY sort_order ASC',
      [villa_id]
    );
    client.release();

    res.json(result.rows);
  } catch (error) {
    console.error('Get villa photos error:', error);
    res.status(500).json(createErrorResponse('Failed to get photos', error, 'GET_PHOTOS_FAILED'));
  }
});

// POST /api/villas/{villa_id}/photos - Upload villa photo
app.post('/api/villas/:villa_id/photos', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    const { villa_id } = req.params;
    
    // For this implementation, we'll expect the photo URL in the request body
    // In a real app, this would handle the file upload and generate the URL
    const validatedData = createPhotoInputSchema.parse({
      ...req.body,
      villa_id: villa_id
    });

    const client = await pool.connect();
    
    // Verify villa ownership
    const ownerCheck = await client.query(
      'SELECT host_id FROM villas WHERE id = $1',
      [villa_id]
    );

    if (ownerCheck.rows.length === 0) {
      client.release();
      return res.status(404).json(createErrorResponse('Villa not found', null, 'VILLA_NOT_FOUND'));
    }

    if (ownerCheck.rows[0].host_id !== req.user.id) {
      client.release();
      return res.status(403).json(createErrorResponse('Access denied', null, 'ACCESS_DENIED'));
    }

    // Get next sort order
    const sortOrderResult = await client.query(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order FROM photos WHERE villa_id = $1',
      [villa_id]
    );

    const photoId = uuidv4();
    const now = new Date().toISOString();
    const sortOrder = validatedData.sort_order || sortOrderResult.rows[0].next_order;

    // If this is set as cover photo, unset others
    if (validatedData.is_cover_photo) {
      await client.query(
        'UPDATE photos SET is_cover_photo = false WHERE villa_id = $1',
        [villa_id]
      );
    }

    const result = await client.query(`
      INSERT INTO photos (id, villa_id, url, description, is_cover_photo, sort_order, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `, [
      photoId,
      villa_id,
      validatedData.url,
      validatedData.description,
      validatedData.is_cover_photo,
      sortOrder,
      now
    ]);

    client.release();

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Upload photo error:', error);
    res.status(400).json(createErrorResponse('Failed to upload photo', error, 'UPLOAD_PHOTO_FAILED'));
  }
});

// PATCH /api/photos/{photo_id} - Update photo properties
app.patch('/api/photos/:photo_id', authenticateToken, async (req, res) => {
  try {
    const { photo_id } = req.params;
    const validatedData = updatePhotoInputSchema.parse(req.body);

    const client = await pool.connect();
    
    // Verify photo exists and user owns the villa
    const photoCheck = await client.query(`
      SELECT p.villa_id, v.host_id FROM photos p
      JOIN villas v ON p.villa_id = v.id
      WHERE p.id = $1
    `, [photo_id]);

    if (photoCheck.rows.length === 0) {
      client.release();
      return res.status(404).json(createErrorResponse('Photo not found', null, 'PHOTO_NOT_FOUND'));
    }

    if (photoCheck.rows[0].host_id !== req.user.id) {
      client.release();
      return res.status(403).json(createErrorResponse('Access denied', null, 'ACCESS_DENIED'));
    }

    // If setting as cover photo, unset others
    if (validatedData.is_cover_photo) {
      await client.query(
        'UPDATE photos SET is_cover_photo = false WHERE villa_id = $1',
        [photoCheck.rows[0].villa_id]
      );
    }

    // Build update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.keys(validatedData).forEach(key => {
      if (validatedData[key] !== undefined) {
        updates.push(`${key} = $${paramCount}`);
        values.push(validatedData[key]);
        paramCount++;
      }
    });

    values.push(photo_id);

    const result = await client.query(
      `UPDATE photos SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    client.release();

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update photo error:', error);
    res.status(400).json(createErrorResponse('Failed to update photo', error, 'UPDATE_PHOTO_FAILED'));
  }
});

// DELETE /api/photos/{photo_id} - Delete photo
app.delete('/api/photos/:photo_id', authenticateToken, async (req, res) => {
  try {
    const { photo_id } = req.params;

    const client = await pool.connect();
    
    // Verify photo exists and user owns the villa
    const photoCheck = await client.query(`
      SELECT p.villa_id, v.host_id FROM photos p
      JOIN villas v ON p.villa_id = v.id
      WHERE p.id = $1
    `, [photo_id]);

    if (photoCheck.rows.length === 0) {
      client.release();
      return res.status(404).json(createErrorResponse('Photo not found', null, 'PHOTO_NOT_FOUND'));
    }

    if (photoCheck.rows[0].host_id !== req.user.id) {
      client.release();
      return res.status(403).json(createErrorResponse('Access denied', null, 'ACCESS_DENIED'));
    }

    await client.query('DELETE FROM photos WHERE id = $1', [photo_id]);
    
    client.release();

    res.status(204).send();
  } catch (error) {
    console.error('Delete photo error:', error);
    res.status(500).json(createErrorResponse('Failed to delete photo', error, 'DELETE_PHOTO_FAILED'));
  }
});

/*
  Amenity management endpoints - handles villa amenities and available amenity options
  Manages the many-to-many relationship between villas and amenities
*/

// GET /api/amenities - Get all available amenities
app.get('/api/amenities', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM amenities ORDER BY name ASC');
    client.release();

    res.json(result.rows);
  } catch (error) {
    console.error('Get amenities error:', error);
    res.status(500).json(createErrorResponse('Failed to get amenities', error, 'GET_AMENITIES_FAILED'));
  }
});

// GET /api/villas/{villa_id}/amenities - Get villa amenities
app.get('/api/villas/:villa_id/amenities', async (req, res) => {
  try {
    const { villa_id } = req.params;

    const client = await pool.connect();
    const result = await client.query(`
      SELECT a.* FROM amenities a
      JOIN villa_amenities va ON a.id = va.amenity_id
      WHERE va.villa_id = $1
      ORDER BY a.name ASC
    `, [villa_id]);
    client.release();

    res.json(result.rows);
  } catch (error) {
    console.error('Get villa amenities error:', error);
    res.status(500).json(createErrorResponse('Failed to get villa amenities', error, 'GET_VILLA_AMENITIES_FAILED'));
  }
});

// POST /api/villas/{villa_id}/amenities - Add amenity to villa
app.post('/api/villas/:villa_id/amenities', authenticateToken, async (req, res) => {
  try {
    const { villa_id } = req.params;
    const validatedData = createVillaAmenityInputSchema.parse({
      ...req.body,
      villa_id: villa_id
    });

    const client = await pool.connect();
    
    // Verify villa ownership
    const ownerCheck = await client.query(
      'SELECT host_id FROM villas WHERE id = $1',
      [villa_id]
    );

    if (ownerCheck.rows.length === 0) {
      client.release();
      return res.status(404).json(createErrorResponse('Villa not found', null, 'VILLA_NOT_FOUND'));
    }

    if (ownerCheck.rows[0].host_id !== req.user.id) {
      client.release();
      return res.status(403).json(createErrorResponse('Access denied', null, 'ACCESS_DENIED'));
    }

    // Add amenity association
    await client.query(
      'INSERT INTO villa_amenities (villa_id, amenity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [villa_id, validatedData.amenity_id]
    );

    client.release();

    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Add villa amenity error:', error);
    res.status(400).json(createErrorResponse('Failed to add amenity', error, 'ADD_AMENITY_FAILED'));
  }
});

// DELETE /api/villas/{villa_id}/amenities - Remove amenity from villa
app.delete('/api/villas/:villa_id/amenities', authenticateToken, async (req, res) => {
  try {
    const { villa_id } = req.params;
    const { amenity_id } = req.query;

    if (!amenity_id) {
      return res.status(400).json(createErrorResponse('Amenity ID is required', null, 'AMENITY_ID_REQUIRED'));
    }

    const client = await pool.connect();
    
    // Verify villa ownership
    const ownerCheck = await client.query(
      'SELECT host_id FROM villas WHERE id = $1',
      [villa_id]
    );

    if (ownerCheck.rows.length === 0) {
      client.release();
      return res.status(404).json(createErrorResponse('Villa not found', null, 'VILLA_NOT_FOUND'));
    }

    if (ownerCheck.rows[0].host_id !== req.user.id) {
      client.release();
      return res.status(403).json(createErrorResponse('Access denied', null, 'ACCESS_DENIED'));
    }

    // Remove amenity association
    await client.query(
      'DELETE FROM villa_amenities WHERE villa_id = $1 AND amenity_id = $2',
      [villa_id, amenity_id]
    );

    client.release();

    res.status(204).send();
  } catch (error) {
    console.error('Remove villa amenity error:', error);
    res.status(500).json(createErrorResponse('Failed to remove amenity', error, 'REMOVE_AMENITY_FAILED'));
  }
});

/*
  Availability management endpoints - handles property calendar and booking conflicts
  Implements row-per-day model for flexible availability management
*/

// GET /api/villas/{villa_id}/availability - Get villa availability calendar
app.get('/api/villas/:villa_id/availability', async (req, res) => {
  try {
    const { villa_id } = req.params;
    const { date_from, date_to } = req.query;

    const client = await pool.connect();
    
    let query = 'SELECT * FROM availability WHERE villa_id = $1';
    const params = [villa_id];
    let paramCount = 2;

    if (date_from) {
      query += ` AND date >= $${paramCount}`;
      params.push(String(date_from));
      paramCount++;
    }

    if (date_to) {
      query += ` AND date <= $${paramCount}`;
      params.push(String(date_to));
      paramCount++;
    }

    query += ' ORDER BY date ASC';

    const result = await client.query(query, params);
    client.release();

    res.json(result.rows);
  } catch (error) {
    console.error('Get villa availability error:', error);
    res.status(500).json(createErrorResponse('Failed to get availability', error, 'GET_AVAILABILITY_FAILED'));
  }
});

// PATCH /api/villas/{villa_id}/availability - Update villa availability
app.patch('/api/villas/:villa_id/availability', authenticateToken, async (req, res) => {
  try {
    const { villa_id } = req.params;
    const { dates } = req.body;

    if (!dates || !Array.isArray(dates)) {
      return res.status(400).json(createErrorResponse('Dates array is required', null, 'DATES_REQUIRED'));
    }

    const client = await pool.connect();
    
    // Verify villa ownership
    const ownerCheck = await client.query(
      'SELECT host_id FROM villas WHERE id = $1',
      [villa_id]
    );

    if (ownerCheck.rows.length === 0) {
      client.release();
      return res.status(404).json(createErrorResponse('Villa not found', null, 'VILLA_NOT_FOUND'));
    }

    if (ownerCheck.rows[0].host_id !== req.user.id) {
      client.release();
      return res.status(403).json(createErrorResponse('Access denied', null, 'ACCESS_DENIED'));
    }

    // Update availability for each date
    const updatedDates = [];
    
    for (const dateEntry of dates) {
      const { date, status } = dateEntry;
      
      // Cannot modify booked dates
      if (status === 'booked') {
        continue;
      }

      const availabilityId = uuidv4();
      
      const result = await client.query(`
        INSERT INTO availability (id, villa_id, date, status)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (villa_id, date) 
        DO UPDATE SET status = $4
        WHERE availability.status != 'booked'
        RETURNING *
      `, [availabilityId, villa_id, date, status]);

      if (result.rows.length > 0) {
        updatedDates.push(result.rows[0]);
      }
    }

    client.release();

    res.json(updatedDates);
  } catch (error) {
    console.error('Update villa availability error:', error);
    res.status(400).json(createErrorResponse('Failed to update availability', error, 'UPDATE_AVAILABILITY_FAILED'));
  }
});

/*
  Booking management endpoints - handles reservation lifecycle from request to completion
  Manages booking status transitions and availability updates
*/

// GET /api/bookings - Get user's bookings (as host or guest)
app.get('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const { status, limit = '10', offset = '0' } = req.query;
    
    // Coerce query parameters to proper types
    const limitInt = parseInt(limit as string);
    const parsedLimit = Math.min(isNaN(limitInt) ? 10 : limitInt, 50); // Cap at 50
    
    const offsetInt = parseInt(offset as string);
    const parsedOffset = Math.max(isNaN(offsetInt) ? 0 : offsetInt, 0);

    const client = await pool.connect();
    
    let query = `
      SELECT b.*, 
             v.title as villa_title,
             v.exact_address,
             (SELECT url FROM photos WHERE villa_id = v.id AND is_cover_photo = true LIMIT 1) as cover_photo_url,
             CASE 
               WHEN b.guest_id = $1 THEN u_host.name
               ELSE u_guest.name
             END as other_user_name,
             CASE 
               WHEN b.guest_id = $1 THEN u_host.profile_picture_url
               ELSE u_guest.profile_picture_url
             END as other_user_photo
      FROM bookings b
      JOIN villas v ON b.villa_id = v.id
      JOIN users u_host ON b.host_id = u_host.id
      JOIN users u_guest ON b.guest_id = u_guest.id
      WHERE (b.guest_id = $1 OR b.host_id = $1)
    `;
    
    const params = [req.user.id];
    let paramCount = 2;

    if (status) {
      query += ` AND b.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    query += ` ORDER BY b.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parsedLimit, parsedOffset);

    const result = await client.query(query, params);
    
    client.release();

    res.json(result.rows);
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json(createErrorResponse('Failed to get bookings', error, 'GET_BOOKINGS_FAILED'));
  }
});

// POST /api/bookings - Create booking request
app.post('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const validatedData = createBookingInputSchema.parse({
      ...req.body,
      guest_id: req.user.id
    });

    const client = await pool.connect();
    
    // Get villa and host info
    const villaResult = await client.query(
      'SELECT host_id, price_per_night, cleaning_fee, minimum_nights FROM villas WHERE id = $1 AND status = $2',
      [validatedData.villa_id, 'listed']
    );

    if (villaResult.rows.length === 0) {
      client.release();
      return res.status(404).json(createErrorResponse('Villa not found or not available', null, 'VILLA_NOT_AVAILABLE'));
    }

    const villa = villaResult.rows[0];

    // Prevent self-booking
    if (villa.host_id === req.user.id) {
      client.release();
      return res.status(400).json(createErrorResponse('Cannot book your own property', null, 'SELF_BOOKING_NOT_ALLOWED'));
    }

    // Check availability for the date range
    const checkInDate = new Date(validatedData.check_in_date);
    const checkOutDate = new Date(validatedData.check_out_date);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

    if (nights < villa.minimum_nights) {
      client.release();
      return res.status(400).json(createErrorResponse(`Minimum ${villa.minimum_nights} nights required`, null, 'MINIMUM_NIGHTS_NOT_MET'));
    }

    // Check for booking conflicts
    const conflictCheck = await client.query(`
      SELECT COUNT(*) as conflicts FROM availability 
      WHERE villa_id = $1 
      AND date >= $2 
      AND date < $3 
      AND status IN ('booked', 'blocked')
    `, [validatedData.villa_id, validatedData.check_in_date, validatedData.check_out_date]);

    if (parseInt(conflictCheck.rows[0].conflicts) > 0) {
      client.release();
      return res.status(400).json(createErrorResponse('Selected dates are not available', null, 'DATES_NOT_AVAILABLE'));
    }

    // Calculate total price
    const basePrice = villa.price_per_night * nights;
    const cleaningFee = villa.cleaning_fee || 0;
    const totalPrice = basePrice + cleaningFee;

    const bookingId = uuidv4();
    const now = new Date().toISOString();

    const result = await client.query(`
      INSERT INTO bookings (
        id, villa_id, guest_id, host_id, check_in_date, check_out_date, 
        num_guests, total_price, status, guest_message, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      bookingId,
      validatedData.villa_id,
      validatedData.guest_id,
      villa.host_id,
      validatedData.check_in_date,
      validatedData.check_out_date,
      validatedData.num_guests,
      totalPrice,
      'pending',
      validatedData.guest_message,
      now,
      now
    ]);

    client.release();

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(400).json(createErrorResponse('Failed to create booking', error, 'CREATE_BOOKING_FAILED'));
  }
});

// GET /api/bookings/{booking_id} - Get booking details
app.get('/api/bookings/:booking_id', authenticateToken, async (req, res) => {
  try {
    const { booking_id } = req.params;

    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT b.*, 
             v.title as villa_title,
             v.exact_address,
             v.directions_landmarks,
             v.house_rules,
             v.preferred_payment_method,
             (SELECT url FROM photos WHERE villa_id = v.id AND is_cover_photo = true LIMIT 1) as cover_photo_url,
             u_host.name as host_name,
             u_host.profile_picture_url as host_photo,
             u_host.phone_number as host_phone,
             u_guest.name as guest_name,
             u_guest.profile_picture_url as guest_photo,
             u_guest.phone_number as guest_phone
      FROM bookings b
      JOIN villas v ON b.villa_id = v.id
      JOIN users u_host ON b.host_id = u_host.id
      JOIN users u_guest ON b.guest_id = u_guest.id
      WHERE b.id = $1 AND (b.guest_id = $2 OR b.host_id = $2)
    `, [booking_id, req.user.id]);

    if (result.rows.length === 0) {
      client.release();
      return res.status(404).json(createErrorResponse('Booking not found', null, 'BOOKING_NOT_FOUND'));
    }

    client.release();

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json(createErrorResponse('Failed to get booking', error, 'GET_BOOKING_FAILED'));
  }
});

// PATCH /api/bookings/{booking_id} - Update booking status
app.patch('/api/bookings/:booking_id', authenticateToken, async (req, res) => {
  try {
    const { booking_id } = req.params;
    const { status, cancellation_reason, cancellation_message, check_in_instructions } = req.body;

    const client = await pool.connect();
    
    // Get current booking
    const bookingResult = await client.query(
      'SELECT * FROM bookings WHERE id = $1',
      [booking_id]
    );

    if (bookingResult.rows.length === 0) {
      client.release();
      return res.status(404).json(createErrorResponse('Booking not found', null, 'BOOKING_NOT_FOUND'));
    }

    const booking = bookingResult.rows[0];

    // Verify authorization
    const isHost = booking.host_id === req.user.id;
    const isGuest = booking.guest_id === req.user.id;

    if (!isHost && !isGuest) {
      client.release();
      return res.status(403).json(createErrorResponse('Access denied', null, 'ACCESS_DENIED'));
    }

    // Validate status transitions
    if (status === 'confirmed' && !isHost) {
      client.release();
      return res.status(403).json(createErrorResponse('Only hosts can confirm bookings', null, 'HOST_ONLY_ACTION'));
    }

    if (status === 'cancelled' && booking.status !== 'pending' && booking.status !== 'confirmed') {
      client.release();
      return res.status(400).json(createErrorResponse('Cannot cancel booking in current status', null, 'INVALID_STATUS_TRANSITION'));
    }

    // Build update query
    const updates = ['updated_at = $2'];
    const values = [new Date().toISOString()];
    let paramCount = 3;

    if (status) {
      updates.push(`status = $${paramCount}`);
      values.push(status);
      paramCount++;
    }

    if (cancellation_reason) {
      updates.push(`cancellation_reason = $${paramCount}`);
      values.push(cancellation_reason);
      paramCount++;
    }

    if (cancellation_message) {
      updates.push(`cancellation_message = $${paramCount}`);
      values.push(cancellation_message);
      paramCount++;
    }

    if (check_in_instructions) {
      updates.push(`check_in_instructions = $${paramCount}`);
      values.push(check_in_instructions);
      paramCount++;
    }

    values.unshift(booking_id);

    const result = await client.query(
      `UPDATE bookings SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
      values
    );

    // Update availability when booking is confirmed or cancelled
    if (status === 'confirmed') {
      // Mark dates as booked
      const checkInDate = new Date(booking.check_in_date);
      const checkOutDate = new Date(booking.check_out_date);
      
      for (let d = new Date(checkInDate); d < checkOutDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const availabilityId = uuidv4();
        
        await client.query(`
          INSERT INTO availability (id, villa_id, date, status)
          VALUES ($1, $2, $3, 'booked')
          ON CONFLICT (villa_id, date) 
          DO UPDATE SET status = 'booked'
        `, [availabilityId, booking.villa_id, dateStr]);
      }
    } else if (status === 'cancelled') {
      // Free up the dates
      await client.query(`
        UPDATE availability 
        SET status = 'available' 
        WHERE villa_id = $1 
        AND date >= $2 
        AND date < $3 
        AND status = 'booked'
      `, [booking.villa_id, booking.check_in_date, booking.check_out_date]);
    }

    client.release();

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(400).json(createErrorResponse('Failed to update booking', error, 'UPDATE_BOOKING_FAILED'));
  }
});

/*
  Messaging system endpoints - handles communication between hosts and guests
  Supports threaded conversations tied to specific bookings
*/

// GET /api/messages - Get user's message threads
app.get('/api/messages', authenticateToken, async (req, res) => {
  try {
    const client = await pool.connect();
    
    const result = await client.query(`
      SELECT DISTINCT 
        m.thread_id,
        CASE 
          WHEN m.sender_id = $1 THEN u_receiver.id 
          ELSE u_sender.id 
        END as other_user_id,
        CASE 
          WHEN m.sender_id = $1 THEN u_receiver.name 
          ELSE u_sender.name 
        END as other_user_name,
        CASE 
          WHEN m.sender_id = $1 THEN u_receiver.profile_picture_url 
          ELSE u_sender.profile_picture_url 
        END as other_user_photo,
        (SELECT content FROM messages WHERE thread_id = m.thread_id ORDER BY created_at DESC LIMIT 1) as last_message_content,
        (SELECT created_at FROM messages WHERE thread_id = m.thread_id ORDER BY created_at DESC LIMIT 1) as last_message_time,
        (SELECT COUNT(*) FROM messages WHERE thread_id = m.thread_id AND receiver_id = $1 AND is_read = false) as unread_count
      FROM messages m
      JOIN users u_sender ON m.sender_id = u_sender.id
      JOIN users u_receiver ON m.receiver_id = u_receiver.id
      WHERE m.sender_id = $1 OR m.receiver_id = $1
      ORDER BY last_message_time DESC
    `, [req.user.id]);

    client.release();

    // Transform result to match expected format
    const threads = result.rows.map(row => ({
      thread_id: row.thread_id,
      other_user: {
        id: row.other_user_id,
        name: row.other_user_name,
        profile_picture_url: row.other_user_photo
      },
      last_message: {
        content: row.last_message_content,
        created_at: row.last_message_time
      },
      unread_count: parseInt(row.unread_count)
    }));

    res.json(threads);
  } catch (error) {
    console.error('Get message threads error:', error);
    res.status(500).json(createErrorResponse('Failed to get message threads', error, 'GET_THREADS_FAILED'));
  }
});

// GET /api/messages/{thread_id} - Get messages in thread
app.get('/api/messages/:thread_id', authenticateToken, async (req, res) => {
  try {
    const { thread_id } = req.params;

    const client = await pool.connect();
    
    // Verify user is part of this thread
    const threadCheck = await client.query(
      'SELECT DISTINCT sender_id, receiver_id FROM messages WHERE thread_id = $1',
      [thread_id]
    );

    const userInThread = threadCheck.rows.some(row => 
      row.sender_id === req.user.id || row.receiver_id === req.user.id
    );

    if (!userInThread) {
      client.release();
      return res.status(403).json(createErrorResponse('Access denied', null, 'ACCESS_DENIED'));
    }

    const result = await client.query(`
      SELECT m.*, 
             u_sender.name as sender_name,
             u_sender.profile_picture_url as sender_photo
      FROM messages m
      JOIN users u_sender ON m.sender_id = u_sender.id
      WHERE m.thread_id = $1
      ORDER BY m.created_at ASC
    `, [thread_id]);

    client.release();

    res.json(result.rows);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json(createErrorResponse('Failed to get messages', error, 'GET_MESSAGES_FAILED'));
  }
});

// POST /api/messages/{thread_id} - Send message
app.post('/api/messages/:thread_id', authenticateToken, async (req, res) => {
  try {
    const { thread_id } = req.params;
    const validatedData = createMessageInputSchema.parse({
      ...req.body,
      thread_id: thread_id,
      sender_id: req.user.id
    });

    const client = await pool.connect();
    
    const messageId = uuidv4();
    const now = new Date().toISOString();

    const result = await client.query(`
      INSERT INTO messages (id, thread_id, sender_id, receiver_id, content, booking_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `, [
      messageId,
      thread_id,
      validatedData.sender_id,
      validatedData.receiver_id,
      validatedData.content,
      validatedData.booking_id,
      now
    ]);

    client.release();

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(400).json(createErrorResponse('Failed to send message', error, 'SEND_MESSAGE_FAILED'));
  }
});

// PATCH /api/messages/{message_id}/read - Mark message as read
app.patch('/api/messages/:message_id/read', authenticateToken, async (req, res) => {
  try {
    const { message_id } = req.params;

    const client = await pool.connect();
    
    // Only receiver can mark as read
    const result = await client.query(
      'UPDATE messages SET is_read = true WHERE id = $1 AND receiver_id = $2 RETURNING *',
      [message_id, req.user.id]
    );

    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json(createErrorResponse('Message not found or access denied', null, 'MESSAGE_NOT_FOUND'));
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Mark message read error:', error);
    res.status(500).json(createErrorResponse('Failed to mark message as read', error, 'MARK_READ_FAILED'));
  }
});

/*
  Review system endpoints - implements two-way blind review system
  Reviews become visible only after both parties submit or timeout period expires
*/

// POST /api/reviews - Create review for completed booking
app.post('/api/reviews', authenticateToken, async (req, res) => {
  try {
    const validatedData = createReviewInputSchema.parse({
      ...req.body,
      reviewer_id: req.user.id
    });

    const client = await pool.connect();
    
    // Verify booking exists and is completed
    const bookingResult = await client.query(
      'SELECT * FROM bookings WHERE id = $1 AND status = $2',
      [validatedData.booking_id, 'completed']
    );

    if (bookingResult.rows.length === 0) {
      client.release();
      return res.status(400).json(createErrorResponse('Booking not found or not completed', null, 'BOOKING_NOT_COMPLETED'));
    }

    const booking = bookingResult.rows[0];

    // Verify user was part of this booking
    if (booking.guest_id !== req.user.id && booking.host_id !== req.user.id) {
      client.release();
      return res.status(403).json(createErrorResponse('Access denied', null, 'ACCESS_DENIED'));
    }

    // Verify reviewee is the other party
    const expectedRevieweeId = booking.guest_id === req.user.id ? booking.host_id : booking.guest_id;
    if (validatedData.reviewee_id !== expectedRevieweeId) {
      client.release();
      return res.status(400).json(createErrorResponse('Invalid reviewee', null, 'INVALID_REVIEWEE'));
    }

    // Check if review already exists
    const existingReview = await client.query(
      'SELECT id FROM reviews WHERE booking_id = $1 AND reviewer_id = $2',
      [validatedData.booking_id, req.user.id]
    );

    if (existingReview.rows.length > 0) {
      client.release();
      return res.status(400).json(createErrorResponse('Review already submitted', null, 'REVIEW_ALREADY_EXISTS'));
    }

    const reviewId = uuidv4();
    const now = new Date().toISOString();

    // Create review
    const result = await client.query(`
      INSERT INTO reviews (
        id, booking_id, reviewer_id, reviewee_id, public_rating, 
        public_comment, private_feedback, is_visible, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      reviewId,
      validatedData.booking_id,
      validatedData.reviewer_id,
      validatedData.reviewee_id,
      validatedData.public_rating,
      validatedData.public_comment,
      validatedData.private_feedback,
      false, // Initially not visible
      now
    ]);

    // Check if both parties have now reviewed
    const reviewCount = await client.query(
      'SELECT COUNT(*) as count FROM reviews WHERE booking_id = $1',
      [validatedData.booking_id]
    );

    // If both reviews exist, make them visible
    if (parseInt(reviewCount.rows[0].count) === 2) {
      await client.query(
        'UPDATE reviews SET is_visible = true WHERE booking_id = $1',
        [validatedData.booking_id]
      );
    }

    client.release();

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create review error:', error);
    res.status(400).json(createErrorResponse('Failed to create review', error, 'CREATE_REVIEW_FAILED'));
  }
});

// PATCH /api/reviews/{review_id} - Update review (before visibility)
app.patch('/api/reviews/:review_id', authenticateToken, async (req, res) => {
  try {
    const { review_id } = req.params;
    const validatedData = updateReviewInputSchema.parse(req.body);

    const client = await pool.connect();
    
    // Verify review exists and user owns it
    const reviewResult = await client.query(
      'SELECT * FROM reviews WHERE id = $1 AND reviewer_id = $2',
      [review_id, req.user.id]
    );

    if (reviewResult.rows.length === 0) {
      client.release();
      return res.status(404).json(createErrorResponse('Review not found', null, 'REVIEW_NOT_FOUND'));
    }

    const review = reviewResult.rows[0];

    // Cannot edit visible reviews
    if (review.is_visible) {
      client.release();
      return res.status(400).json(createErrorResponse('Cannot edit visible review', null, 'REVIEW_ALREADY_VISIBLE'));
    }

    // Build update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    Object.keys(validatedData).forEach(key => {
      if (validatedData[key] !== undefined) {
        updates.push(`${key} = $${paramCount}`);
        values.push(validatedData[key]);
        paramCount++;
      }
    });

    values.push(review_id);

    const result = await client.query(
      `UPDATE reviews SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );

    client.release();

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update review error:', error);
    res.status(400).json(createErrorResponse('Failed to update review', error, 'UPDATE_REVIEW_FAILED'));
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files from storage
app.use('/api/storage', express.static(storageDir));

// SPA catch-all: serve index.html for non-API routes only
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port} and listening on 0.0.0.0`);
});

export { app, server, pool };