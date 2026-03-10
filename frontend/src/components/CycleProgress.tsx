import React from 'react';

interface CycleProgressProps {
  currentDay: number;
  cycleLength: number;
  phase: string;
}

export function CycleProgress({ currentDay, cycleLength, phase }: CycleProgressProps) {
  const percentage = (currentDay / cycleLength) * 100;
  const circumference = 2 * Math.PI * 95;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="cycle-progress-ring">
      <svg width="200" height="200" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7B68EE" />
            <stop offset="100%" stopColor="#FF6B9D" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="95" className="progress-circle-bg" />
        <circle
          cx="100"
          cy="100"
          r="95"
          className="progress-circle-fill"
          style={{ strokeDashoffset }}
        />
      </svg>

      <div className="progress-circle">
        <div className="progress-content">
          <p className="progress-day">{currentDay}</p>
          <p className="progress-label">Day of Cycle</p>
          <p className="progress-phase">{phase}</p>
        </div>
      </div>
    </div>
  );
}