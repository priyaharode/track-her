import React from 'react';
import { Prediction } from '../services/api';
import '../styles/prediction-card.css';

interface PredictionCardProps {
  prediction: Prediction;
}

export const PredictionCard: React.FC<PredictionCardProps> = ({ prediction }) => {
  const {
    nextPeriodDate,
    ovulationDate,
    predictions: {
      nextPeriodDays,
      pmsLikelihood,
      confidence
    }
  } = prediction;

  const calculateDaysFromNow = (dateString: string): number => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const periodDaysFromNow = calculateDaysFromNow(nextPeriodDate);
  const ovulationDaysFromNow = calculateDaysFromNow(ovulationDate);
  const pmsPercentage = Math.round(pmsLikelihood * 100);

  return (
    <div className="prediction-card animate-in">
      <div className="card-header">
        <h2 className="card-title">🔮 Your Predictions</h2>
        <span className="timestamp">
          {new Date(prediction.timestamp).toLocaleDateString()}
        </span>
      </div>

      <div className="predictions-grid">
        {/* Next Period Card */}
        <div className="prediction-item period">
          <div className="prediction-icon">📅</div>
          <div className="prediction-content">
            <p className="label">Next Period</p>
            <p className="date">{nextPeriodDate}</p>
            <p className="info">
              {periodDaysFromNow === 0 && "Today"}
              {periodDaysFromNow === 1 && "Tomorrow"}
              {periodDaysFromNow > 1 && `In ${periodDaysFromNow} days`}
              {periodDaysFromNow < 0 && `${Math.abs(periodDaysFromNow)} days ago`}
            </p>
            <div className="confidence-bar">
              <div
                className="confidence-fill"
                style={{ width: `${confidence.periodConfidence * 100}%` }}
              />
            </div>
            <p className="confidence-text">
              Confidence: {Math.round(confidence.periodConfidence * 100)}%
            </p>
          </div>
        </div>

        {/* Ovulation Day Card */}
        <div className="prediction-item ovulation">
          <div className="prediction-icon">💚</div>
          <div className="prediction-content">
            <p className="label">Ovulation Day</p>
            <p className="date">{ovulationDate}</p>
            <p className="info">
              {ovulationDaysFromNow === 0 && "Today"}
              {ovulationDaysFromNow === 1 && "Tomorrow"}
              {ovulationDaysFromNow > 1 && `In ${ovulationDaysFromNow} days`}
              {ovulationDaysFromNow < 0 && `${Math.abs(ovulationDaysFromNow)} days ago`}
            </p>
            <div className="confidence-bar">
              <div
                className="confidence-fill"
                style={{ width: `${confidence.ovulationConfidence * 100}%` }}
              />
            </div>
            <p className="confidence-text">
              Confidence: {Math.round(confidence.ovulationConfidence * 100)}%
            </p>
          </div>
        </div>

        {/* PMS Likelihood Card */}
        <div className="prediction-item pms">
          <div className="prediction-icon">⚡</div>
          <div className="prediction-content">
            <p className="label">PMS Likelihood</p>
            <p className="percentage">{pmsPercentage}%</p>
            <div className="pms-bar">
              <div
                className="pms-fill"
                style={{ width: `${pmsPercentage}%` }}
              />
            </div>
            <p className="pms-text">
              {pmsPercentage <= 25 && "😊 Very Low"}
              {pmsPercentage > 25 && pmsPercentage <= 50 && "🙂 Moderate"}
              {pmsPercentage > 50 && pmsPercentage <= 75 && "😐 Likely"}
              {pmsPercentage > 75 && "😕 Very Likely"}
            </p>
            <div className="confidence-bar">
              <div
                className="confidence-fill"
                style={{ width: `${confidence.pmsConfidence * 100}%` }}
              />
            </div>
            <p className="confidence-text">
              Confidence: {Math.round(confidence.pmsConfidence * 100)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};