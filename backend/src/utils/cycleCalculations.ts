// frontend/src/utils/cycleCalculations.ts

export interface CycleCalculation {
  nextPeriodDate: string;
  ovulationDate: string;
  daysUntilNextPeriod: number;
  daysUntilOvulation: number;
  currentCycleDay: number;
  pmsLikelihood: number;
  recommendations: string[];
}

/**
 * Calculate cycle predictions from raw period data
 * @param lastPeriodDate - Start date of last period
 * @param cycleLength - Average cycle length in days
 * @param periodDuration - Average period duration in days
 * @param stressLevel - Current stress level (1-10)
 * @param sleepHours - Average sleep hours
 * @returns Calculated cycle data
 */
export const calculateCyclePredictions = (
  lastPeriodDate: string,
  cycleLength: number,
  periodDuration: number,
  stressLevel: number,
  sleepHours: number
): CycleCalculation => {
  // Parse dates
  const lastPeriod = new Date(lastPeriodDate);
  const today = new Date();

  // Calculate current cycle day
  const timeDiff = today.getTime() - lastPeriod.getTime();
  const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
  const currentCycleDay = (daysDiff % cycleLength) + 1;

  // Calculate next period date
  const nextPeriodDate = new Date(lastPeriod);
  nextPeriodDate.setDate(nextPeriodDate.getDate() + cycleLength);
  const nextPeriodStr = nextPeriodDate.toISOString().split('T')[0];

  // Calculate daysUntilNextPeriod
  const daysUntilNextPeriod = Math.ceil(
    (nextPeriodDate.getTime() - today.getTime()) / (1000 * 3600 * 24)
  );

  // Calculate ovulation (typically 14 days before next period)
  const ovulationDate = new Date(lastPeriod);
  ovulationDate.setDate(ovulationDate.getDate() + Math.round(cycleLength / 2));
  const ovulationStr = ovulationDate.toISOString().split('T')[0];

  const daysUntilOvulation = Math.ceil(
    (ovulationDate.getTime() - today.getTime()) / (1000 * 3600 * 24)
  );

  // Calculate PMS likelihood (increases closer to period)
  let pmsLikelihood = 0;
  const daysBeforePeriod = cycleLength - currentCycleDay;
  if (daysBeforePeriod <= 7 && daysBeforePeriod > 0) {
    pmsLikelihood = (7 - daysBeforePeriod) / 7; // 0-100%
  }

  // Apply modifiers based on lifestyle
  pmsLikelihood += stressLevel * 0.02; // High stress increases PMS
  pmsLikelihood -= sleepHours * 0.01; // Good sleep reduces PMS
  pmsLikelihood = Math.max(0, Math.min(1, pmsLikelihood)); // Clamp 0-1

  // Generate recommendations
  const recommendations: string[] = [];

  if (daysBeforePeriod <= 7 && daysBeforePeriod > 0) {
    recommendations.push('PMS symptoms may start soon. Stay hydrated and manage stress.');
    recommendations.push('Get 7-9 hours of sleep to minimize PMS symptoms.');
  }

  if (daysBeforePeriod <= 14 && daysBeforePeriod > 5) {
    recommendations.push('This is your fertile window. Consider timing if planning pregnancy.');
  }

  if (stressLevel > 7) {
    recommendations.push('Your stress level is high. Consider meditation, exercise, or relaxation techniques.');
  }

  if (sleepHours < 6) {
    recommendations.push('You\'re not getting enough sleep. Aim for 7-9 hours for better cycle regularity.');
  }

  if (recommendations.length === 0) {
    recommendations.push('You\'re doing great! Keep maintaining healthy lifestyle habits.');
  }

  return {
    nextPeriodDate: nextPeriodStr,
    ovulationDate: ovulationStr,
    daysUntilNextPeriod,
    daysUntilOvulation,
    currentCycleDay,
    pmsLikelihood,
    recommendations
  };
};

/**
 * Convert features object for ML predictions
 */
export const buildMLFeatures = (
  cycleLength: number,
  periodDuration: number,
  flowIntensity: number,
  stressLevel: number,
  age: number
) => {
  const flowIntensityMap = {
    0: 1.5, // Light
    1: 2.5, // Normal
    2: 3.5  // Heavy
  };

  return {
    MeanCycleLength: cycleLength,
    LengthofLutealPhase: Math.round(cycleLength * 0.4),
    LengthofMenses: periodDuration,
    MeanBleedingIntensity: flowIntensityMap[flowIntensity as keyof typeof flowIntensityMap] || 2.5,
    TotalNumberofHighDays: 5,
    TotalNumberofPeakDays: 2,
    TotalDaysofFertility: 6,
    Age: age,
    BMI: 22,
    Numberpreg: 1,
    Livingkids: 1,
    Miscarriages: 0,
    Abortions: 0,
    Reprocate: 1,
    Breastfeeding: 0,
    NumberofDaysofIntercourse: 3,
    IntercourseInFertileWindow: 2,
    TotalMensesScore: stressLevel * 2,
    UnusualBleeding: 0,
    PhasesBleeding: 0
  };
};

/**
 * Convert symptoms object for ML predictions
 */
export const buildMLSymptoms = (
  periodDuration: number,
  flowIntensity: number,
  stressLevel: number
) => {
  const flowIntensityMap = {
    0: 1.5, // Light
    1: 2.5, // Normal
    2: 3.5  // Heavy
  };

  return {
    unusual_bleeding: 0,
    mean_bleeding_intensity: flowIntensityMap[flowIntensity as keyof typeof flowIntensityMap] || 2.5,
    length_of_menses: periodDuration,
    total_menses_score: stressLevel * 2,
    phases_bleeding: 0
  };
};