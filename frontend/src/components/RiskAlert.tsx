// frontend/src/components/RiskAlert.tsx

import React from 'react';

interface MedicalRiskData {
  risk_level: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
  risk_score: number;
  triggered_indicators: string[];
  recommendations: string[];
  should_alert_user: boolean;
}

interface RiskAlertProps {
  data?: MedicalRiskData;
}

export const RiskAlert: React.FC<RiskAlertProps> = ({ data }) => {
  if (!data || data.risk_level === 'GREEN') {
    return null;  // Don't show green alerts
  }

  // Color configuration
  const colorConfig = {
    YELLOW: {
      bg: '#FCD34D',           // Amber
      text: '#1F2937',         // Dark text
      border: '#FBBF24',
      icon: '⚠️'
    },
    ORANGE: {
      bg: '#FB923C',           // Orange
      text: '#1F2937',         // Dark text
      border: '#F97316',
      icon: '⚠️'
    },
    RED: {
      bg: '#EF4444',           // Red
      text: '#FFFFFF',         // White text
      border: '#DC2626',
      icon: '🚨'
    }
  };

  const colors = colorConfig[data.risk_level];

  return (
    <div style={{
      backgroundColor: colors.bg,
      color: colors.text,
      padding: '16px',
      borderRadius: '12px',
      marginBottom: '16px',
      borderLeft: `4px solid ${colors.border}`,
      boxShadow: `0 2px 8px rgba(0, 0, 0, 0.1)`
    }}>
      {/* Header */}
      <h3 style={{
        margin: '0 0 12px 0',
        fontSize: '16px',
        fontWeight: '600',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span>{colors.icon}</span>
        <span>Health Alert - {data.risk_level}</span>
      </h3>

      {/* Risk score */}
      <div style={{
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        padding: '8px 12px',
        borderRadius: '6px',
        marginBottom: '12px',
        fontSize: '12px',
        fontWeight: '500'
      }}>
        Risk Score: {data.risk_score}/5
      </div>

      {/* Symptoms detected */}
      {data.triggered_indicators.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <p style={{
            fontWeight: '600',
            margin: '0 0 8px 0',
            fontSize: '14px'
          }}>
            Symptoms Detected:
          </p>
          <ul style={{
            margin: '0',
            paddingLeft: '20px',
            fontSize: '13px'
          }}>
            {data.triggered_indicators.map((indicator, i) => (
              <li key={i} style={{ marginBottom: '4px' }}>
                {indicator}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      <div>
        <p style={{
          fontWeight: '600',
          margin: '0 0 8px 0',
          fontSize: '14px'
        }}>
          Recommendations:
        </p>
        <ul style={{
          margin: '0',
          paddingLeft: '20px',
          fontSize: '13px'
        }}>
          {data.recommendations.map((rec, i) => (
            <li key={i} style={{ marginBottom: '4px' }}>
              {rec}
            </li>
          ))}
        </ul>
      </div>

      {/* Call to action for RED */}
      {data.risk_level === 'RED' && (
        <div style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: `1px solid ${colors.border}`,
          fontWeight: '600',
          fontSize: '13px'
        }}>
          👉 Please consult with a healthcare provider as soon as possible.
        </div>
      )}
    </div>
  );
};