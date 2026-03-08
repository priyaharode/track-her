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
export declare function makePrediction(input: PredictionInput): Promise<PredictionOutput>;
