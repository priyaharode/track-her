export interface PredictionInput {
  daysSincePeriod: number;
  cycleLength: number;
  periodDuration: number;
  flowIntensity: number;
  stressLevel: number;
  sleepHours: number;
  exerciseDays: number;
  age: number;
  cycleDay: number;
}

export interface PredictionOutput {
  nextPeriodDays: number;
  ovulationDay: number;
  pmsLikelihood: number;
}

export async function makePrediction(input: PredictionInput): Promise<PredictionOutput> {
  // Calculate period prediction
  const daysUntilPeriod = input.cycleLength - input.daysSincePeriod;

  // Ovulation is typically around day 14
  const ovulationDay = Math.round(input.cycleLength / 2);

  // PMS likelihood increases as period approaches
  const daysBeforePeriod = daysUntilPeriod;
  let pmsBase = Math.max(0, 1 - (daysBeforePeriod / 5));

  // Adjust for lifestyle factors
  const stressMultiplier = 1 + (input.stressLevel / 10) * 0.3;
  const sleepMultiplier = input.sleepHours < 7 ? 1.2 : 1.0;
  const exerciseMultiplier = input.exerciseDays < 3 ? 1.1 : 0.9;

  const pmsLikelihood = Math.min(1, pmsBase * stressMultiplier * sleepMultiplier * exerciseMultiplier);

  return {
    nextPeriodDays: daysUntilPeriod,
    ovulationDay: ovulationDay,
    pmsLikelihood: pmsLikelihood
  };
}