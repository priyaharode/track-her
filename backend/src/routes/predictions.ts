import express from 'express';
import { Pool } from 'pg';
import { AuthenticatedRequest } from '../middleware/auth-middleware.js';
import { validatePredictionInput, ValidationError } from '../utils/validation.js';
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

// Test connection on startup
pool.query('SELECT NOW()', (err) => {
  if (err) {
    logger.error('Database connection failed', err);
  } else {
    logger.info('✅ Database connection successful');
  }
});

/**
 * POST /api/predictions/full
 * Get ML predictions (requires authentication)
 */
router.post('/full', async (req: AuthenticatedRequest, res) => {
  try {
    const { features, symptoms } = req.body;

    if (!features) {
      logger.warn('ML prediction request missing features', { userId: req.user?.userId });
      return res.status(400).json({ error: 'Features required' });
    }

    logger.info('Getting ML predictions', { 
      userId: req.user?.userId,
      featureCount: Object.keys(features).length 
    });

    const mlResponse = await fetch('http://localhost:5001/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features, symptoms }),
      signal: AbortSignal.timeout(30000) // 30 second timeout - ML models take time to load
    });

    if (!mlResponse.ok) {
      const error = await mlResponse.text();
      logger.error('ML service error', `Status: ${mlResponse.status}`, { error });
      return res.status(503).json({ 
        error: 'ML service unavailable',
        message: 'Could not get predictions. Please try again.'
      });
    }

    const mlResults: any = await mlResponse.json();
    
    logger.info('✅ ML predictions successful', { 
      userId: req.user?.userId,
      cycleLength: mlResults?.cycleLength?.predicted_cycle_length 
    });

    res.json(mlResults);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    
    // Check if it's a timeout
    if (errorMsg.includes('timeout') || errorMsg.includes('Timeout')) {
      logger.warn('ML service timeout - taking too long', { 
        userId: req.user?.userId,
        message: 'Consider increasing timeout or optimizing model loading'
      });
      return res.status(504).json({ 
        error: 'ML service timeout',
        message: 'Predictions are taking too long. Please try again.'
      });
    }

    logger.error('ML Prediction error', err instanceof Error ? err : new Error(errorMsg), { 
      userId: req.user?.userId 
    });
    res.status(500).json({ 
      error: 'Failed to get predictions',
      message: 'An error occurred while processing your request'
    });
  }
});

/**
 * POST /api/predictions/save
 * Save prediction to database (requires authentication)
 */
router.post('/save', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;

    logger.debug('Saving prediction request', { userId });

    // Extract and validate input
    const {
      lastPeriodDate,
      cycleLength,
      periodDuration,
      flowIntensity,
      stressLevel,
      sleepHours,
      exerciseDays,
      moodLevel,
      energyLevel,
      nextPeriodDate,
      ovulationDate,
      currentCycleDay,
      pmsLikelihood
    } = req.body;

    // Validate input
    const validation = validatePredictionInput(req.body);
    if (!validation.isValid) {
      logger.warn('Invalid prediction input', { 
        userId, 
        errors: validation.errors 
      });
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validation.errors 
      });
    }

    logger.info('💾 Saving prediction to database', { 
      userId,
      cycleLength,
      stressLevel 
    });

    // Insert into database - FILTERED BY USER_ID
    const query = `
      INSERT INTO predictions (
        userid,
        lastperioddate,
        nextperioddate,
        ovulationdate,
        currentcycleday,
        pmslikelihood,
        cyclelength,
        periodduration,
        flowintensity,
        stresslevel,
        sleephours,
        exercisedays,
        moodlevel,
        energylevel
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      )
      RETURNING *;
    `;

    const result = await pool.query(query, [
      userId,  // Use authenticated user ID, not hardcoded!
      lastPeriodDate,
      nextPeriodDate,
      ovulationDate,
      currentCycleDay,
      pmsLikelihood,
      cycleLength,
      periodDuration,
      flowIntensity || 1,
      stressLevel,
      sleepHours,
      exerciseDays,
      moodLevel,
      energyLevel
    ]);

    logger.info('✅ Prediction saved successfully', { 
      userId,
      predictionId: result.rows[0].id 
    });

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    logger.error('Save prediction error', err instanceof Error ? err : new Error(String(err)), { 
      userId: req.user?.userId 
    });
    res.status(500).json({ 
      error: 'Failed to save prediction',
      message: 'An error occurred while saving your prediction'
    });
  }
});

/**
 * GET /api/predictions
 * Get authenticated user's prediction history (FILTERED BY USER)
 */
router.get('/', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    logger.debug('Fetching predictions', { userId, limit, offset });

    // IMPORTANT: Filter by userid
    const query = `
      SELECT * FROM predictions
      WHERE userid = $1
      ORDER BY createdat DESC
      LIMIT $2 OFFSET $3;
    `;

    const result = await pool.query(query, [userId, limit, offset]);

    logger.info('Predictions loaded', { 
      userId,
      count: result.rows.length 
    });

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (err) {
    logger.error('Get predictions error', err instanceof Error ? err : new Error(String(err)), { 
      userId: req.user?.userId 
    });
    res.status(500).json({ 
      error: 'Failed to load predictions' 
    });
  }
});

/**
 * GET /api/predictions/latest
 * Get authenticated user's latest prediction
 */
router.get('/latest', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;

    const query = `
      SELECT * FROM predictions
      WHERE userid = $1
      ORDER BY createdat DESC
      LIMIT 1;
    `;

    const result = await pool.query(query, [userId]);

    res.json({
      success: true,
      data: result.rows[0] || null
    });
  } catch (err) {
    logger.error('Get latest prediction error', err instanceof Error ? err : new Error(String(err)), { 
      userId: req.user?.userId 
    });
    res.status(500).json({ 
      error: 'Failed to load latest prediction' 
    });
  }
});

/**
 * GET /api/predictions/stats
 * Get authenticated user's statistics (FILTERED BY USER)
 */
router.get('/stats', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.userId;

    logger.debug('Fetching user stats', { userId });

    // IMPORTANT: Filter by userid
    const query = `
      SELECT
        COUNT(*) as total_predictions,
        ROUND(AVG(cyclelength)::numeric, 1) as avg_cycle_length,
        ROUND(AVG(stresslevel)::numeric, 1) as avg_stress_level,
        ROUND(AVG(sleephours)::numeric, 1) as avg_sleep_hours,
        ROUND(AVG(pmslikelihood)::numeric, 2) as avg_pms_likelihood,
        MIN(createdat) as first_prediction,
        MAX(createdat) as last_prediction
      FROM predictions
      WHERE userid = $1;
    `;

    const result = await pool.query(query, [userId]);

    const stats = result.rows[0];

    logger.info('Stats calculated', { 
      userId,
      totalPredictions: stats.total_predictions 
    });

    res.json({
      success: true,
      data: {
        totalPredictions: parseInt(stats.total_predictions) || 0,
        avgCycleLength: parseFloat(stats.avg_cycle_length) || 0,
        avgStressLevel: parseFloat(stats.avg_stress_level) || 0,
        avgSleepHours: parseFloat(stats.avg_sleep_hours) || 0,
        avgPmsLikelihood: parseFloat(stats.avg_pms_likelihood) || 0,
        firstPrediction: stats.first_prediction,
        lastPrediction: stats.last_prediction
      }
    });
  } catch (err) {
    logger.error('Get stats error', err instanceof Error ? err : new Error(String(err)), { 
      userId: req.user?.userId 
    });
    res.status(500).json({ 
      error: 'Failed to load statistics' 
    });
  }
});

/**
 * POST /api/predictions/health-check
 * Check if both database and ML service are running
 */
router.post('/health-check', async (req: AuthenticatedRequest, res) => {
  try {
    // Check database
    const dbCheck = await pool.query('SELECT NOW()');
    const dbHealthy = !!dbCheck.rows[0];

    // Check ML service
    let mlHealthy = false;
    try {
      const mlCheck = await fetch('http://localhost:5001/health', {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      mlHealthy = mlCheck.ok;
    } catch {
      mlHealthy = false;
    }

    logger.info('Health check', { 
      userId: req.user?.userId,
      dbHealthy,
      mlHealthy 
    });

    res.json({
      status: dbHealthy && mlHealthy ? 'healthy' : 'degraded',
      database: dbHealthy ? 'connected' : 'disconnected',
      mlService: mlHealthy ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    logger.error('Health check error', err instanceof Error ? err : new Error(String(err)));
    res.status(500).json({ 
      status: 'unhealthy',
      error: 'Health check failed'
    });
  }
});

export { router as predictionsRouter };