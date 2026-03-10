// frontend/src/components/CyclePredictionCard.tsx

import React from 'react';

interface CycleData {
  predicted_cycle_length: number;
  confidence_interval: number;
  lower_bound: number;
  upper_bound: number;
  model: string;
  r2_score: number;
}

interface Props {
  data?: CycleData;
  loading: boolean;
}

export const CyclePredictionCard: React.FC<Props> = ({ data, loading }) => {
  if (loading) {
    return (
      <div style={{
        backgroundColor: '#F8BBD0',
        padding: '20px',
        borderRadius: '12px',
        marginBottom: '16px',
        textAlign: 'center',
        border: '2px solid #9C2B4E'
      }}>
        <p style={{ margin: '0', color: '#9C2B4E', fontWeight: 'bold' }}>
          ⏳ Calculating predictions...
        </p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div style={{
      backgroundColor: '#F8BBD0',      // Bloom light pink
      padding: '20px',
      borderRadius: '12px',
      marginBottom: '16px',
      border: '2px solid #9C2B4E',     // Burgundy border
      boxShadow: '0 2px 8px rgba(156, 43, 78, 0.1)'
    }}>
      {/* Header */}
      <h3 style={{
        margin: '0 0 16px 0',
        color: '#9C2B4E',
        fontSize: '18px',
        fontWeight: '600'
      }}>
        📅 Next Period Prediction
      </h3>

      {/* Main prediction */}
      <div style={{
        textAlign: 'center',
        marginBottom: '16px'
      }}>
        <p style={{
          fontSize: '36px',
          fontWeight: 'bold',
          margin: '0',
          color: '#9C2B4E'
        }}>
          {data.predicted_cycle_length.toFixed(1)}
        </p>
        <p style={{
          fontSize: '14px',
          color: '#666',
          margin: '4px 0 0 0'
        }}>
          days
        </p>
      </div>

      {/* Confidence range */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '12px'
      }}>
        <p style={{
          margin: '0 0 8px 0',
          fontSize: '12px',
          color: '#666',
          fontWeight: '500'
        }}>
          Confidence Range
        </p>
        <p style={{
          margin: '0',
          fontSize: '14px',
          color: '#9C2B4E',
          fontWeight: '600'
        }}>
          {data.lower_bound.toFixed(0)} – {data.upper_bound.toFixed(0)} days
        </p>
      </div>

      {/* Confidence interval explanation */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '12px'
      }}>
        <p style={{
          margin: '0 0 4px 0',
          fontSize: '12px',
          color: '#666'
        }}>
          ± {data.confidence_interval.toFixed(1)} days margin of error
        </p>
        <p style={{
          margin: '0',
          fontSize: '12px',
          color: '#999'
        }}>
          95% confidence level
        </p>
      </div>

      {/* Model info */}
      <div style={{
        borderTop: '1px solid rgba(156, 43, 78, 0.2)',
        paddingTop: '12px',
        fontSize: '11px',
        color: '#999'
      }}>
        <p style={{ margin: '0 0 4px 0' }}>
          <strong>Model:</strong> {data.model}
        </p>
        <p style={{ margin: '0' }}>
          <strong>Accuracy (R²):</strong> {(data.r2_score * 100).toFixed(0)}%
        </p>
      </div>

      {/* Helpful note */}
      <p style={{
        fontSize: '12px',
        color: '#666',
        marginTop: '12px',
        marginBottom: '0',
        fontStyle: 'italic',
        padding: '8px',
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderRadius: '6px'
      }}>
        ℹ️ This is a prediction based on your cycle history. Actual dates may vary by 2-3 days due to natural cycle variations.
      </p>
    </div>
  );
};