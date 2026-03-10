import express, { Request, Response } from 'express';
import { Pool } from 'pg';

const router = express.Router();

// Create pool connection - MATCHING YOUR EXACT DATABASE
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'trackher_db',
  user: 'postgres',
  password: 'PASSWORD' // REPLACE WITH YOUR DB PASSWORD,
});

// Test the connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
  } else {
    console.log('✅ Database connection successful');
  }
});

// Middleware: Check if user is authenticated
const authenticate = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.user = { id: 1 };
  next();
};

/**
 * POST /api/predictions/full
 * Get ML predictions
 */
router.post('/full', authenticate, async (req: any, res) => {
  try {
    const { features, symptoms } = req.body;
    if (!features) {
      return res.status(400).json({ error: 'Features required' });
    }

    const mlResponse = await fetch('http://localhost:5001/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features, symptoms })
    });

    if (!mlResponse.ok) {
      throw new Error(`ML service error: ${mlResponse.statusText}`);
    }

    const mlResults = await mlResponse.json();
    res.json(mlResults);
  } catch (err) {
    console.error('ML Prediction error:', err);
    res.status(500).json({ error: 'Failed to get ML predictions' });
  }
});

/**
 * POST /api/predictions/save
 * Save prediction to database
 */
router.post('/save', authenticate, async (req: any, res) => {
  try {
    console.log('💾 Saving prediction to database...');
    console.log('Data:', req.body);

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

    if (!lastPeriodDate || !cycleLength) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // First, verify the table exists and has columns
    const checkTable = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'predictions'
    `);
    
    console.log('✅ Table columns:', checkTable.rows.map((r: any) => r.column_name));

    // Insert with CORRECT camelCase column names INCLUDING userid
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

    console.log('Running query...');
    
    const result = await pool.query(query, [
      1,  // userid
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

    console.log('✅ Saved successfully:', result.rows[0]);

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    console.error('❌ Save prediction error:', err);
    res.status(500).json({ error: 'Failed to save prediction' });
  }
});

/**
 * GET /api/predictions
 * Get user's prediction history
 */
router.get('/', authenticate, async (req: any, res) => {
  try {
    const query = `
      SELECT * FROM predictions
      ORDER BY createdat DESC
      LIMIT 50;
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error('Get predictions error:', err);
    res.status(500).json({ error: 'Failed to load predictions' });
  }
});

/**
 * GET /api/stats
 * Get user statistics
 */
router.get('/stats', authenticate, async (req: any, res) => {
  try {
    const query = `
      SELECT
        COUNT(*) as total_predictions,
        ROUND(AVG(cyclelength)::numeric, 1) as avg_cycle_length,
        ROUND(AVG(stresslevel)::numeric, 1) as avg_stress_level,
        ROUND(AVG(sleephours)::numeric, 1) as avg_sleep_hours,
        ROUND(AVG(pmslikelihood)::numeric, 2) as avg_pms_likelihood
      FROM predictions;
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: {
        totalPredictions: parseInt(result.rows[0].total_predictions) || 0,
        avgCycleLength: parseFloat(result.rows[0].avg_cycle_length) || 28,
        avgStressLevel: parseFloat(result.rows[0].avg_stress_level) || 5,
        avgSleepHours: parseFloat(result.rows[0].avg_sleep_hours) || 7,
        avgPmsLikelihood: parseFloat(result.rows[0].avg_pms_likelihood) || 0
      }
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

/**
 * POST /api/predictions/health-check
 */
router.post('/health-check', authenticate, async (req: any, res) => {
  try {
    const mlCheck = await fetch('http://localhost:5001/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        features: {
          MeanCycleLength: 28,
          LengthofLutealPhase: 14,
          LengthofMenses: 5,
          MeanBleedingIntensity: 2.5,
          TotalNumberofHighDays: 5,
          TotalNumberofPeakDays: 2,
          TotalDaysofFertility: 6,
          Age: 30,
          BMI: 22,
          Numberpreg: 1,
          Livingkids: 1,
          Miscarriages: 0,
          Abortions: 0,
          Reprocate: 1,
          Breastfeeding: 0,
          NumberofDaysofIntercourse: 3,
          IntercourseInFertileWindow: 2,
          TotalMensesScore: 15,
          UnusualBleeding: 0,
          PhasesBleeding: 0
        },
        symptoms: {
          unusual_bleeding: 0,
          mean_bleeding_intensity: 2.5,
          length_of_menses: 5,
          total_menses_score: 15,
          phases_bleeding: 0
        }
      })
    });

    if (mlCheck.ok) {
      const mlData = await mlCheck.json();
      return res.json({
        status: 'healthy',
        message: 'ML models loaded successfully',
        ml_ready: true,
        test_prediction: mlData
      });
    } else {
      return res.json({
        status: 'warning',
        message: 'Database connected but ML service unavailable',
        ml_ready: false
      });
    }
  } catch (err) {
    res.json({
      status: 'error',
      message: 'Failed to check ML service',
      error: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

export { router as predictionsRouter };