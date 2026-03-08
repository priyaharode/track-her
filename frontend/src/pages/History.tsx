import React, { useState, useEffect } from 'react';
import { Prediction, predictAPI } from '../services/api';
import '../styles/history.css';

export const History: React.FC = () => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const data = await predictAPI.getHistory();
      setPredictions(data.reverse());
    } catch (err) {
      console.error('Failed to load history');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="history-page">
      <div className="history-container">
        <h2>📜 Prediction History</h2>
        <p className="subtitle">View all your previous cycle predictions and health data</p>

        {isLoading ? (
          <div className="loading">
            <span className="spinner">⏳</span> Loading history...
          </div>
        ) : predictions.length === 0 ? (
          <div className="empty-state">
            <p>No predictions yet. Go to the dashboard to make your first prediction!</p>
          </div>
        ) : (
          <div className="history-table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Cycle Length</th>
                  <th>Next Period</th>
                  <th>Ovulation</th>
                  <th>PMS Risk</th>
                  <th>Stress Level</th>
                  <th>Sleep Hours</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((pred) => (
                  <tr key={pred.id}>
                    <td className="date-cell">
                      {new Date(pred.timestamp).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td>{pred.input.cycleLength} days</td>
                    <td className="highlight-primary">{pred.nextPeriodDate}</td>
                    <td className="highlight-accent">{pred.ovulationDate}</td>
                    <td>
                      <span className={`pms-badge pms-${getPMSLevel(pred.predictions.pmsLikelihood)}`}>
                        {Math.round(pred.predictions.pmsLikelihood * 100)}%
                      </span>
                    </td>
                    <td>
                      <div className="stress-indicator">
                        <div
                          className="stress-bar"
                          style={{
                            width: `${(pred.input.stressLevel / 10) * 100}%`,
                          }}
                        />
                        <span className="stress-text">{pred.input.stressLevel}/10</span>
                      </div>
                    </td>
                    <td>{pred.input.sleepHours.toFixed(1)} hrs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button onClick={loadHistory} className="btn btn-secondary btn-small">
          🔄 Refresh History
        </button>
      </div>
    </div>
  );
};

function getPMSLevel(likelihood: number): string {
  if (likelihood <= 0.25) return 'low';
  if (likelihood <= 0.5) return 'medium';
  if (likelihood <= 0.75) return 'high';
  return 'very-high';
}

export default History;