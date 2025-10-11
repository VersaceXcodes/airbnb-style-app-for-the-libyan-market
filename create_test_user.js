const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Database configuration
const poolConfig = process.env.DATABASE_URL
  ? { 
      connectionString: process.env.DATABASE_URL, 
      ssl: { rejectUnauthorized: false } 
    }
  : {
      host: process.env.PGHOST,
      database: process.env.PGDATABASE,
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      port: Number(process.env.PGPORT) || 5432,
      ssl: { rejectUnauthorized: false },
    };

const pool = new Pool(poolConfig);

async function createTestUser() {
  try {
    const client = await pool.connect();
    
    // Check if user already exists
    const existingUser = await client.query(
      'SELECT * FROM users WHERE email = $1 OR phone_number = $1', 
      ['versacecodes@gmail.com']
    );
    
    if (existingUser.rows.length > 0) {
      console.log('✅ Test user already exists:', {
        id: existingUser.rows[0].id,
        name: existingUser.rows[0].name,
        email: existingUser.rows[0].email,
        phone: existingUser.rows[0].phone_number,
        password_hash: existingUser.rows[0].password_hash
      });
      client.release();
      return existingUser.rows[0];
    }

    // Create new test user
    const userId = uuidv4();
    const now = new Date().toISOString();
    
    const result = await client.query(
      `INSERT INTO users (id, name, email, password_hash, phone_number, account_type, is_phone_verified, profile_picture_url, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        userId,
        'Test Guest User',
        'versacecodes@gmail.com',
        'Airplanes@99', // Plain text password for development
        '+218912345678',
        'guest',
        true, // Phone verified for easier testing
        null,
        now,
        now
      ]
    );
    
    console.log('✅ Test user created:', {
      id: result.rows[0].id,
      name: result.rows[0].name,
      email: result.rows[0].email,
      phone: result.rows[0].phone_number
    });
    
    client.release();
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    throw error;
  } finally {
    pool.end();
  }
}

if (require.main === module) {
  createTestUser()
    .then(() => {
      console.log('🎉 Test user setup complete');
      process.exit(0);
    })
    .catch(err => {
      console.error('💥 Failed to create test user:', err);
      process.exit(1);
    });
}

module.exports = { createTestUser };