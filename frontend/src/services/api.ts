import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:5000/api';
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface CycleInput {
  cycleLength: number;
  periodDuration: number;
  flowIntensity: number;
  stressLevel: number;
  sleepHours: number;
  exerciseDays: number;
  age: number;
}

export interface Prediction {
  id: string;
  timestamp: string;
  input: CycleInput;
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
  nextPeriodDate: string;
  ovulationDate: string;
}

export const predictAPI = {
  predict: async (input: CycleInput) => {
    const response = await api.post('/predict', input);
    return response.data.data as Prediction;
  },

  getHistory: async () => {
    const response = await api.get('/history');
    return response.data.data as Prediction[];
  },

  getLatest: async () => {
    const response = await api.get('/latest');
    return response.data.data as Prediction;
  },

  health: async () => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api;