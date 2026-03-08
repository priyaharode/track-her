import React, { useState, useEffect } from 'react';
import { CycleInput, Prediction, predictAPI } from '../services/api';
import { Form } from '../components/Form';
import { PredictionCard } from '../components/PredictionCard';
import { ChartVisualization } from '../components/ChartVisualization';
import '../styles/dashboard.css';

export const Dashboard: React.FC = () => {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [allPredictions, setAllPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLatest();
  }, []);

  const loadLatest = async () => {
    try {
      const data = await predictAPI.getLatest();
      setPrediction(data);
    } catch (err) {
      // No previous predictions yet
    }
  };

  const loadHistory = async () => {
    try {
      const data = await predictAPI.getHistory();
      setAllPredictions(data);
    } catch (err) {
      console.error('Failed to load history');
    }
  };

  const handleSubmit = async (formData: CycleInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await predictAPI.predict(formData);
      setPrediction(result);
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get predictions');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-container">
        <div className="dashboard-intro">
          <h2>Welcome to Your Health Dashboard</h2>
          <p>
            Enter your cycle information below, and our AI will predict your next period,
            ovulation day, and PMS likelihood based on your health patterns.
          </p>
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        <div className="dashboard-content">
          <div className="form-column">
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">📝 Enter Your Information</h3>
              </div>
              <CycleForm
                onSubmit={handleSubmit}
                isLoading={isLoading}
                initialData={prediction?.input}
              />
            </div>
          </div>

          <div className="results-column">
            {prediction ? (
              <>
                <PredictionCard prediction={prediction} />
                <ChartVisualization predictions={allPredictions} />
              </>
            ) : (
              <div className="placeholder-card">
                <div className="placeholder-icon">✨</div>
                <p>Fill in the form and click "Get Predictions" to see your personalized health insights</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;