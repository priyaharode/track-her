// frontend/src/hooks/usePredictions.ts

import { useState } from 'react';
import { buildMLFeatures, buildMLSymptoms } from '../utils/cycleCalculations';

export interface MLPredictionResponse {
  cycleLength?: {
    predicted_cycle_length: number;
    confidence_interval: number;
    lower_bound: number;
    upper_bound: number;
    model: string;
    r2_score: number;
  };
  ovulationDay?: {
    predicted_ovulation_day: number;
    confidence_interval: number;
    lower_bound: number;
    upper_bound: number;
    model: string;
    r2_score: number;
  };
  medicalRisk?: {
    risk_level: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
    risk_score: number;
    triggered_indicators: string[];
    recommendations: string[];
    should_alert_user: boolean;
  };
}

interface UsePredictionsReturn {
  fetchMLPredictions: (
    cycleLength: number,
    periodDuration: number,
    flowIntensity: number,
    stressLevel: number,
    age: number
  ) => Promise<MLPredictionResponse | null>;
  loading: boolean;
  error: string | null;
  predictions: MLPredictionResponse | null;
  clearError: () => void;
}

/**
 * Hook for fetching ML predictions from backend
 * Properly handles authentication and error states
 */
export const usePredictions = (token: string | null | undefined): UsePredictionsReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<MLPredictionResponse | null>(null);

  const fetchMLPredictions = async (
    cycleLength: number,
    periodDuration: number,
    flowIntensity: number,
    stressLevel: number,
    age: number
  ): Promise<MLPredictionResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      // Validate token exists
      if (!token) {
        throw new Error('Authentication required. Please login first.');
      }

      // Build feature sets using utility functions
      const features = buildMLFeatures(cycleLength, periodDuration, flowIntensity, stressLevel, age);
      const symptoms = buildMLSymptoms(periodDuration, flowIntensity, stressLevel);

      // Make API call
      const response = await fetch('http://localhost:5000/api/predictions/full', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ features, symptoms })
      });

      // Handle HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `ML Prediction API error: ${response.status} ${response.statusText}`
        );
      }

      // Parse and validate response
      const data: MLPredictionResponse = await response.json();

      if (!data.cycleLength || !data.ovulationDay || !data.medicalRisk) {
        throw new Error('Invalid ML response format');
      }

      // Store predictions
      setPredictions(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('ML Prediction Error:', errorMessage, err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return {
    fetchMLPredictions,
    loading,
    error,
    predictions,
    clearError
  };
};