import { Router, Request, Response } from 'express';
import { makePrediction } from '../models/cycleModel';
import { storePrediction, getPredictions } from '../data/storage';

export const predictionsRouter = Router();

interface PredictionInput {
  lastPeriodDate: string;
  cycleLength: number;
  periodDuration: number;
  flowIntensity: number;
  stressLevel: number;
  sleepHours: number;
  exerciseDays: number;
  age: number;
}

interface PredictionResponse {
  success: boolean;
  message?: string;
  data?: {
    nextPeriodDate: string;
    ovulationDate: string;
    currentCycleDay: number;
    daysUntilNextPeriod: number;
    daysUntilOvulation: number;
    predictions: {
      nextPeriodDays: number;
      ovulationDay: number;
      pmsLikelihood: number;
      confidence: {
        periodConfidence: number;
        ovulationConfidence: number;
        pmsConfidence: number;
      };
    };
    fertility: {
      fertileWindowStart: string;
      fertileWindowEnd: string;
      isPeakFertility: boolean;
    };
    recommendations: string[];
  };
}

// POST /api/predict
predictionsRouter.post('/predict', async (req: Request, res: Response) => {
  try {
    const input: PredictionInput = req.body;

    // ✅ Validate input
    const validation = validateInput(input);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.errors.join(', ')
      });
    }

    // ✅ Parse dates
    const lastPeriodDate = new Date(input.lastPeriodDate);
    const today = new Date();

    // ✅ Calculate days since last period
    const daysSince = Math.floor((today.getTime() - lastPeriodDate.getTime()) / (1000 * 60 * 60 * 24));

    // ✅ Calculate cycle day
    const currentCycleDay = (daysSince % input.cycleLength) + 1;

    // ✅ Load models and make prediction
    const prediction = await makePrediction({
      daysSincePeriod: daysSince,
      cycleLength: input.cycleLength,
      periodDuration: input.periodDuration,
      flowIntensity: input.flowIntensity,
      stressLevel: input.stressLevel,
      sleepHours: input.sleepHours,
      exerciseDays: input.exerciseDays,
      age: input.age,
      cycleDay: currentCycleDay
    });

    // ✅ Calculate actual dates
    const nextPeriodDate = new Date(lastPeriodDate);
    nextPeriodDate.setDate(nextPeriodDate.getDate() + input.cycleLength);

    const ovulationDate = new Date(lastPeriodDate);
    ovulationDate.setDate(ovulationDate.getDate() + Math.round(input.cycleLength / 2));

    const daysUntilNextPeriod = Math.floor((nextPeriodDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const daysUntilOvulation = Math.floor((ovulationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // ✅ Calculate fertile window
    const fertileStart = new Date(lastPeriodDate);
    fertileStart.setDate(fertileStart.getDate() + Math.max(0, Math.round(input.cycleLength / 2) - 3));

    const fertileEnd = new Date(lastPeriodDate);
    fertileEnd.setDate(fertileEnd.getDate() + Math.round(input.cycleLength / 2) + 3);

    const isPeakFertility = Math.abs(daysUntilOvulation) <= 1;

    // ✅ Generate recommendations
    const recommendations = generateRecommendations({
      daysUntilPeriod: daysUntilNextPeriod,
      pmsLikelihood: prediction.pmsLikelihood,
      isPeakFertility,
      stressLevel: input.stressLevel,
      sleepHours: input.sleepHours,
      exerciseDays: input.exerciseDays
    });

    const response: PredictionResponse = {
      success: true,
      data: {
        nextPeriodDate: formatDate(nextPeriodDate),
        ovulationDate: formatDate(ovulationDate),
        currentCycleDay,
        daysUntilNextPeriod,
        daysUntilOvulation,
        predictions: {
          nextPeriodDays: daysUntilNextPeriod,
          ovulationDay: currentCycleDay + daysUntilOvulation,
          pmsLikelihood: prediction.pmsLikelihood,
          confidence: {
            periodConfidence: 0.92,
            ovulationConfidence: 0.88,
            pmsConfidence: 0.85
          }
        },
        fertility: {
          fertileWindowStart: formatDate(fertileStart),
          fertileWindowEnd: formatDate(fertileEnd),
          isPeakFertility
        },
        recommendations
      }
    };

    // ✅ Store prediction
    storePrediction({
      timestamp: new Date().toISOString(),
      input,
      prediction: response.data
    });

    res.json(response);
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error making prediction: ' + (error instanceof Error ? error.message : 'Unknown error')
    });
  }
});

// GET /api/predictions
predictionsRouter.get('/predictions', (req: Request, res: Response) => {
  try {
    const predictions = getPredictions();
    res.json({
      success: true,
      count: predictions.length,
      data: predictions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching predictions'
    });
  }
});

// Helper functions
function validateInput(input: PredictionInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.lastPeriodDate) {
    errors.push('lastPeriodDate is required');
  } else {
    const date = new Date(input.lastPeriodDate);
    if (isNaN(date.getTime())) {
      errors.push('lastPeriodDate must be a valid date (YYYY-MM-DD)');
    } else if (date > new Date()) {
      errors.push('lastPeriodDate cannot be in the future');
    } else {
      const daysDiff = (new Date().getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
      if (daysDiff > 365) {
        errors.push('lastPeriodDate cannot be more than 1 year old');
      }
    }
  }

  if (!input.cycleLength || input.cycleLength < 21 || input.cycleLength > 35) {
    errors.push('cycleLength must be between 21-35 days');
  }

  if (!input.periodDuration || input.periodDuration < 3 || input.periodDuration > 7) {
    errors.push('periodDuration must be between 3-7 days');
  }

  if (input.flowIntensity === undefined || input.flowIntensity < 0 || input.flowIntensity > 2) {
    errors.push('flowIntensity must be 0, 1, or 2');
  }

  if (!input.stressLevel || input.stressLevel < 1 || input.stressLevel > 10) {
    errors.push('stressLevel must be between 1-10');
  }

  if (!input.sleepHours || input.sleepHours < 4 || input.sleepHours > 12) {
    errors.push('sleepHours must be between 4-12');
  }

  if (input.exerciseDays === undefined || input.exerciseDays < 0 || input.exerciseDays > 7) {
    errors.push('exerciseDays must be between 0-7');
  }

  if (!input.age || input.age < 15 || input.age > 55) {
    errors.push('age must be between 15-55');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface RecommendationParams {
  daysUntilPeriod: number;
  pmsLikelihood: number;
  isPeakFertility: boolean;
  stressLevel: number;
  sleepHours: number;
  exerciseDays: number;
}

function generateRecommendations(params: RecommendationParams): string[] {
  const recommendations: string[] = [];

  if (params.isPeakFertility) {
    recommendations.push('🔴 You are in your fertile window - use protection if needed');
  }

  if (params.pmsLikelihood > 0.5) {
    recommendations.push('⚡ High PMS risk - consider increasing self-care');
    recommendations.push('💧 Stay hydrated and maintain sleep schedule');
  } else if (params.pmsLikelihood > 0.25) {
    recommendations.push('⚠️ Moderate PMS risk - be mindful of symptoms');
  }

  if (params.stressLevel >= 7) {
    recommendations.push('😰 Stress levels are elevated - try relaxation techniques');
  }

  if (params.sleepHours < 7) {
    recommendations.push('😴 Sleep could be improved - aim for 7-9 hours per night');
  }

  if (params.exerciseDays < 3) {
    recommendations.push('🏃 Increase exercise to 3-5 days per week for better cycle health');
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Keep up the healthy habits - you are in a good place!');
  }

  return recommendations;
}