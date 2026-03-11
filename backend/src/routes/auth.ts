import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { generateToken } from '../utils/jwt.js';
import { validateAuthInput, sanitizeString } from '../utils/validation.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Database connection
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'trackher_db',
  user: 'postgres',
  password: 'Ujwal@12345',
});

/**
 * POST /api/auth/signup
 * Create new user account and return JWT token
 */
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate input
    const validation = validateAuthInput(email, password);
    if (!validation.isValid) {
      logger.warn('Invalid signup input', { errors: validation.errors });
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validation.errors 
      });
    }

    // Sanitize email
    const sanitizedEmail = sanitizeString(email).toLowerCase();

    logger.info('Signup attempt', { email: sanitizedEmail });

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [sanitizedEmail]
    );

    if (existingUser.rows.length > 0) {
      logger.warn('Signup failed - user already exists', { email: sanitizedEmail });
      return res.status(409).json({ 
        error: 'User already exists',
        message: 'Email is already registered'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
      [sanitizedEmail, hashedPassword]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    logger.info('✅ User signed up successfully', { 
      userId: user.id,
      email: user.email 
    });

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      token
    });
  } catch (err) {
    logger.error('Signup error', err instanceof Error ? err : new Error(String(err)));
    res.status(500).json({ 
      error: 'Signup failed',
      message: 'An error occurred during signup'
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Validate input
    const validation = validateAuthInput(email, password);
    if (!validation.isValid) {
      logger.warn('Invalid login input', { errors: validation.errors });
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validation.errors 
      });
    }

    // Sanitize email
    const sanitizedEmail = sanitizeString(email).toLowerCase();

    logger.info('Login attempt', { email: sanitizedEmail });

    // Find user
    const result = await pool.query(
      'SELECT id, email, password FROM users WHERE email = $1',
      [sanitizedEmail]
    );

    if (result.rows.length === 0) {
      logger.warn('Login failed - user not found', { email: sanitizedEmail });
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    const user = result.rows[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      logger.warn('Login failed - password mismatch', { email: sanitizedEmail });
      return res.status(401).json({ 
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Generate JWT token
    const token = generateToken(user.id, user.email);

    logger.info('✅ User logged in successfully', { 
      userId: user.id,
      email: user.email 
    });

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      token
    });
  } catch (err) {
    logger.error('Login error', err instanceof Error ? err : new Error(String(err)));
    res.status(500).json({ 
      error: 'Login failed',
      message: 'An error occurred during login'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user info (requires authentication)
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Token verification is done by middleware in actual usage
    // This is just for reference
    
    res.json({
      message: 'Authenticated endpoint - middleware will validate token'
    });
  } catch (err) {
    logger.error('Auth check error', err instanceof Error ? err : new Error(String(err)));
    res.status(500).json({ error: 'Auth check failed' });
  }
});

export { router as authRouter };