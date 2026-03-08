import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Prediction } from '../services/api';
import '../styles/charts.css';

interface ChartVisualizationProps {
  predictions: Prediction[];
}

export const ChartVisualization: React.FC<ChartVisualizationProps> = ({ predictions }) => {
  if (predictions.length === 0) {
    return (
      <div className="chart-placeholder">
        <p>📊 Make predictions to see visualization charts</p>
      </div>
    );
  }

  // Prepare data for cycle length chart
  const cycleLengthData = predictions.slice(-7).map((p, i) => ({
    date: new Date(p.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    length: p.input.cycleLength,
  }));

  // Prepare data for stress vs sleep
  const lifestyleData = predictions.slice(-7).map((p, i) => ({
    date: new Date(p.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    stress: p.input.stressLevel,
    sleep: p.input.sleepHours * 2, // Scale for visibility
  }));

  // PMS likelihood distribution
  const pmsData = [
    {
      name: 'PMS Risk',
      value: Math.round((predictions[predictions.length - 1]?.predictions.pmsLikelihood || 0.5) * 100),
    },
    {
      name: 'No PMS Risk',
      value: 100 - Math.round((predictions[predictions.length - 1]?.predictions.pmsLikelihood || 0.5) * 100),
    },
  ];

  const COLORS = [
    'var(--color-warning)',
    'var(--color-success)',
  ];

  return (
    <div className="charts-container animate-fade">
      <h3 className="charts-title">📈 Health Analytics</h3>

      <div className="charts-grid">
        {/* Cycle Length Trend */}
        <div className="chart-wrapper">
          <h4>Cycle Length Trend</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={cycleLengthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-light)" />
              <XAxis dataKey="date" stroke="var(--color-gray)" />
              <YAxis stroke="var(--color-gray)" />
              <Tooltip
                contentStyle={{
                  background: 'white',
                  border: '2px solid var(--color-primary-light)',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="length"
                stroke="var(--color-primary)"
                dot={{ fill: 'var(--color-primary)', r: 5 }}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Stress vs Sleep */}
        <div className="chart-wrapper">
          <h4>Lifestyle Factors</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={lifestyleData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-light)" />
              <XAxis dataKey="date" stroke="var(--color-gray)" />
              <YAxis stroke="var(--color-gray)" />
              <Tooltip
                contentStyle={{
                  background: 'white',
                  border: '2px solid var(--color-primary-light)',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="stress" fill="var(--color-warning)" name="Stress (1-10)" />
              <Bar dataKey="sleep" fill="var(--color-accent)" name="Sleep (hours x2)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* PMS Risk Distribution */}
        <div className="chart-wrapper">
          <h4>Current PMS Risk</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pmsData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pmsData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === 0 ? 'var(--color-warning)' : 'var(--color-success)'}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};