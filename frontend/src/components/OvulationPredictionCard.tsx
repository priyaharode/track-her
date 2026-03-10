// frontend/src/components/OvulationPredictionCard.tsx

import React from 'react';

interface OvulationData {
  predicted_ovulation_day: number;
  confidence_interval: number;
  lower_bound: number;
  upper_bound: number;
  model: string;
  r2_score: number;
}

interface Props {
  data?: OvulationData;
  loading: boolean;
}

export const OvulationPredictionCard: React.FC<Props> = ({ data, loading }) => {
  if (loading) {
    return null;
  }

  if (!data) {
    return null;
  }

  return (
    <div style={{
      backgroundColor: '#FBF8F7',       // Cream
      padding: '20px',
      borderRadius: '12px',
      marginBottom: '16px',
      border: '2px solid #A4161A',      // Wine red border
      boxShadow: '0 2px 8px rgba(164, 22, 26, 0.1)'
    }}>
      {/* Header */}
      <h3 style={{
        margin: '0 0 16px 0',
        color: '#A4161A',
        fontSize: '18px',
        fontWeight: '600'
      }}>
        🎯 Fertility Window
      </h3>

      {/* Main prediction */}
      <div style={{
        textAlign: 'center',
        marginBottom: '16px'
      }}>
        <p style={{
          fontSize: '32px',
          fontWeight: 'bold',
          margin: '0',
          color: '#A4161A'
        }}>
          Day {data.predicted_ovulation_day.toFixed(1)}
        </p>
        <p style={{
          fontSize: '12px',
          color: '#666',
          margin: '4px 0 0 0'
        }}>
          of your cycle
        </p>
      </div>

      {/* Fertile window */}
      <div style={{
        backgroundColor: 'rgba(164, 22, 26, 0.05)',
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '12px',
        textAlign: 'center'
      }}>
        <p style={{
          margin: '0 0 8px 0',
          fontSize: '12px',
          color: '#666',
          fontWeight: '500'
        }}>
          Fertile Window
        </p>
        <p style={{
          margin: '0',
          fontSize: '16px',
          color: '#A4161A',
          fontWeight: '600'
        }}>
          Days {data.lower_bound.toFixed(0)} – {data.upper_bound.toFixed(0)}
        </p>
      </div>

      {/* What this means */}
      <div style={{
        backgroundColor: 'rgba(164, 22, 26, 0.05)',
        padding: '12px',
        borderRadius: '8px',
        marginBottom: '12px',
        fontSize: '13px',
        color: '#333'
      }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: '500' }}>
          Peak fertility period:
        </p>
        <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '12px' }}>
          <li style={{ marginBottom: '4px' }}>
            Highest chance of conception: 2-3 days before ovulation
          </li>
          <li>
            Last fertile day: 12-24 hours after ovulation
          </li>
        </ul>
      </div>

      {/* Model info */}
      <div style={{
        borderTop: '1px solid rgba(164, 22, 26, 0.2)',
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
    </div>
  );
};