import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { authMiddleware, AuthRequest } from '../middleware/auth';

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'trackher_db',
  user: 'trackher_user',
  password: '12345678',
});

const router = Router();

// Call Python script for ML predictions
function predictWithML(input: any): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      // Fix path to point to backend root, then to predict.py
      const pythonScript = path.join(__dirname, '..', '..', 'predict.py');
      console.log('Python script path:', pythonScript);
      
      // Use 'py' for Windows, 'python' for Mac/Linux
      const pythonCommand = process.platform === 'win32' ? 'py' : 'python';
      console.log('Using Python command:', pythonCommand);
      
      const python = spawn(pythonCommand, [pythonScript, JSON.stringify(input)], {
        timeout: 30000, // 30 second timeout
      });

      let output = '';
      let error = '';

      python.stdout.on('data', (data) => {
        output += data.toString();
      });

      python.stderr.on('data', (data) => {
        error += data.toString();
      });

      python.on('close', (code) => {
        console.log(`Python script exited with code ${code}`);
        if (error) console.log('Python stderr:', error);
        
        if (code === 0 && output) {
          try {
            const result = JSON.parse(output.trim());
            console.log('ML prediction result:', result);
            resolve(result);
          } catch (e) {
            console.error('Failed to parse Python output:', output);
            reject(new Error(`Failed to parse ML predictions: ${output}`));
          }
        } else {
          reject(new Error(`Python script failed with code ${code}: ${error}`));
        }
      });

      python.on('error', (err) => {
        console.error('Failed to spawn Python process:', err);
        reject(new Error(`Python spawn error: ${err.message}`));
      });
    } catch (err) {
      console.error('Error in predictWithML:', err);
      reject(err);
    }
  });
}

// POST /api/predict - Save prediction using ML
router.post('/predict', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const input = req.body;

    console.log('Received prediction input:', input);

    // Validate required fields
    if (!input.lastPeriodDate || !input.cycleLength) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: lastPeriodDate and cycleLength required',
      });
    }

    // Get ML predictions
    console.log('Calling ML model...');
    const mlResult = await predictWithML(input);

    if (!mlResult.success) {
      console.error('ML prediction failed:', mlResult.error);
      return res.status(500).json({
        success: false,
        message: 'ML prediction failed: ' + mlResult.error,
      });
    }

    const prediction = mlResult.predictions;

    // Save to database
    const result = await pool.query(
      `INSERT INTO predictions (
        userId, lastPeriodDate, cycleLength, periodDuration, flowIntensity,
        stressLevel, sleepHours, exerciseDays, moodLevel, energyLevel,
        nextPeriodDate, ovulationDate, currentCycleDay, pmsLikelihood
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      ) RETURNING *`,
      [
        userId,
        input.lastPeriodDate,
        input.cycleLength,
        input.periodDuration,
        input.flowIntensity,
        input.stressLevel,
        input.sleepHours,
        input.exerciseDays,
        input.moodLevel || 7,
        input.energyLevel || 6,
        prediction.nextPeriodDate,
        prediction.ovulationDate,
        prediction.currentCycleDay,
        prediction.pmsLikelihood,
      ]
    );

    console.log('Prediction saved to DB:', result.rows[0].id);

    // Return full prediction data
    res.json({
      success: true,
      message: 'Prediction saved successfully',
      data: {
        ...mlResult.predictions,
        ...mlResult.fertility,
        recommendations: mlResult.recommendations,
        id: result.rows[0].id,
        createdAt: result.rows[0].createdat,
      },
    });
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save prediction: ' + (error as any).message,
    });
  }
});

// GET /api/predictions - Get all predictions for user
router.get('/predictions', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      `SELECT * FROM predictions 
       WHERE userId = $1 
       ORDER BY createdAt DESC 
       LIMIT 10`,
      [userId]
    );

    const formattedPredictions = result.rows.map(row => ({
      id: row.id,
      userId: row.userid,
      lastPeriodDate: row.lastperioddate,
      cycleLength: row.cyclelength,
      periodDuration: row.periodduration,
      flowIntensity: row.flowintensity,
      stressLevel: row.stresslevel,
      sleepHours: row.sleephours,
      exerciseDays: row.exercisedays,
      moodLevel: row.moodlevel,
      energyLevel: row.energylevel,
      nextPeriodDate: row.nextperioddate,
      ovulationDate: row.ovulationdate,
      currentCycleDay: row.currentcycleday,
      pmsLikelihood: row.pmslikelihood,
      createdAt: row.createdat,
    }));

    res.json({
      success: true,
      data: formattedPredictions,
    });
  } catch (error) {
    console.error('Error fetching predictions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch predictions',
    });
  }
});

// GET /api/predictions/latest
router.get('/predictions/latest', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      `SELECT * FROM predictions WHERE userId = $1 ORDER BY createdAt DESC LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, data: null });
    }

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        id: row.id,
        userId: row.userid,
        lastPeriodDate: row.lastperioddate,
        cycleLength: row.cyclelength,
        periodDuration: row.periodduration,
        flowIntensity: row.flowintensity,
        stressLevel: row.stresslevel,
        sleepHours: row.sleephours,
        exerciseDays: row.exercisedays,
        moodLevel: row.moodlevel,
        energyLevel: row.energylevel,
        nextPeriodDate: row.nextperioddate,
        ovulationDate: row.ovulationdate,
        currentCycleDay: row.currentcycleday,
        pmsLikelihood: row.pmslikelihood,
        createdAt: row.createdat,
      },
    });
  } catch (error) {
    console.error('Error fetching latest prediction:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch latest prediction' });
  }
});

// GET /api/stats
router.get('/stats', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      `SELECT 
        COUNT(*) as totalPredictions,
        ROUND(AVG(cycleLength)) as avgCycleLength,
        ROUND(AVG(stressLevel)) as avgStressLevel,
        ROUND(AVG(sleepHours)::numeric, 1) as avgSleepHours,
        ROUND(AVG(pmsLikelihood)::numeric, 3) as avgPmsLikelihood
      FROM predictions WHERE userId = $1`,
      [userId]
    );

    const stats = result.rows[0];

    res.json({
      success: true,
      data: {
        totalPredictions: parseInt(stats.totalpredictions) || 0,
        avgCycleLength: parseInt(stats.avgcyclelength) || 28,
        avgStressLevel: parseInt(stats.avgstresslevel) || 5,
        avgSleepHours: parseFloat(stats.avgsleephours) || 7,
        avgPmsLikelihood: parseFloat(stats.avgpmslikelihood) || 0.3,
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

export const predictionsRouter = router;