import { useState, useMemo } from 'react';
import './App.css';

interface PredictionData {
  nextPeriodDate: string;
  ovulationDate: string;
  currentCycleDay: number;
  daysUntilNextPeriod: number;
  daysUntilOvulation: number;
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
  fertility: {
    fertileWindowStart: string;
    fertileWindowEnd: string;
    isPeakFertility: boolean;
  };
  recommendations: string[];
}

function App() {
  const [lastPeriodDate, setLastPeriodDate] = useState('2026-03-01');
  const [cycleLength, setCycleLength] = useState(28);
  const [periodDuration, setPeriodDuration] = useState(5);
  const [flowIntensity, setFlowIntensity] = useState(1);
  const [stressLevel, setStressLevel] = useState(5);
  const [sleepHours, setSleepHours] = useState(7.5);
  const [exerciseDays, setExerciseDays] = useState(3);
  const [age, setAge] = useState(28);
  
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<PredictionData[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Real-time calculations
  const pmsPreview = useMemo(() => {
    if (!lastPeriodDate) return 0;
    const lastPeriod = new Date(lastPeriodDate);
    const today = new Date();
    const daysSince = Math.floor((today.getTime() - lastPeriod.getTime()) / (1000 * 60 * 60 * 24));
    const daysBeforePeriod = cycleLength - daysSince;
    let pmsBase = Math.max(0, 1 - (daysBeforePeriod / 5));
    const stressMultiplier = 1 + (stressLevel / 10) * 0.3;
    const sleepMultiplier = sleepHours < 7 ? 1.2 : 1.0;
    const exerciseMultiplier = exerciseDays < 3 ? 1.1 : 0.9;
    return Math.min(1, pmsBase * stressMultiplier * sleepMultiplier * exerciseMultiplier);
  }, [lastPeriodDate, cycleLength, stressLevel, sleepHours, exerciseDays]);

  const cycleDay = useMemo(() => {
    if (!lastPeriodDate) return 0;
    const lastPeriod = new Date(lastPeriodDate);
    const today = new Date();
    const daysSince = Math.floor((today.getTime() - lastPeriod.getTime()) / (1000 * 60 * 60 * 24));
    return (daysSince % cycleLength) + 1;
  }, [lastPeriodDate, cycleLength]);

  const cyclePhase = useMemo(() => {
    if (cycleDay <= periodDuration) return { name: 'Menstruation', emoji: '🔴', color: '#e74c3c' };
    if (cycleDay <= 13) return { name: 'Follicular', emoji: '🟡', color: '#f39c12' };
    if (cycleDay <= 16) return { name: 'Ovulation', emoji: '💚', color: '#27ae60' };
    return { name: 'Luteal', emoji: '💜', color: '#9b59b6' };
  }, [cycleDay, periodDuration]);

  const handleGetPredictions = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!lastPeriodDate) {
        setError('Please select your last period date');
        setLoading(false);
        return;
      }

      const response = await fetch('http://localhost:5000/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lastPeriodDate,
          cycleLength,
          periodDuration,
          flowIntensity,
          stressLevel,
          sleepHours,
          exerciseDays,
          age,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to get predictions');
        setLoading(false);
        return;
      }

      const data = await response.json();
      if (data.success) {
        setPrediction(data.data);
        setHistory([...history, data.data]);
        setError('');
        setActiveTab('results');
      } else {
        setError(data.message || 'Failed to get predictions');
      }
    } catch (err) {
      setError('Error connecting to server. Make sure backend is running on port 5000.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRiskLevel = (pms: number) => {
    if (pms > 0.7) return { level: 'HIGH', emoji: '🔴', color: '#e74c3c' };
    if (pms > 0.4) return { level: 'MODERATE', emoji: '🟡', color: '#f39c12' };
    if (pms > 0.2) return { level: 'LOW', emoji: '🟢', color: '#27ae60' };
    return { level: 'MINIMAL', emoji: '💚', color: '#2ecc71' };
  };

  const riskInfo = getRiskLevel(pmsPreview);

  return (
    <div className="app">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-content">
          <div className="nav-brand">
            <span className="brand-icon">🌸</span>
            <h1>TrackHER</h1>
            <p>AI Health Companion</p>
          </div>
          <div className="nav-actions">
            <button 
              className={`nav-btn ${showHistory ? 'active' : ''}`}
              onClick={() => setShowHistory(!showHistory)}
            >
              📋 {history.length > 0 && <span className="count">{history.length}</span>}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {!showHistory ? (
          <div className="dashboard">
            {/* Sidebar - Form */}
            <aside className="sidebar">
              <div className="form-wrapper">
                <div className="form-header">
                  <h2>Your Profile</h2>
                  <p>Personalized insights based on your health data</p>
                </div>

                <form onSubmit={handleGetPredictions} className="health-form">
                  {/* Section 1: Critical Info */}
                  <div className="form-section critical">
                    <div className="section-header">
                      <span className="icon">📅</span>
                      <h3>Period Information</h3>
                    </div>

                    <div className="form-field">
                      <label htmlFor="lastPeriodDate">Last Period Started *</label>
                      <input
                        type="date"
                        id="lastPeriodDate"
                        value={lastPeriodDate}
                        onChange={(e) => setLastPeriodDate(e.target.value)}
                        required
                        className="input-date"
                      />
                      <span className="field-hint">🔑 Most important field for accurate predictions</span>
                    </div>

                    <div className="form-field">
                      <div className="field-header">
                        <label>Cycle Length</label>
                        <span className="value-display">{cycleLength} days</span>
                      </div>
                      <input
                        type="range"
                        min="21"
                        max="35"
                        value={cycleLength}
                        onChange={(e) => setCycleLength(Number(e.target.value))}
                        className="slider-input"
                      />
                      <div className="range-markers">
                        <mark>21</mark>
                        <mark>28</mark>
                        <mark>35</mark>
                      </div>
                    </div>

                    <div className="form-field">
                      <div className="field-header">
                        <label>Period Duration</label>
                        <span className="value-display">{periodDuration} days</span>
                      </div>
                      <input
                        type="range"
                        min="3"
                        max="7"
                        value={periodDuration}
                        onChange={(e) => setPeriodDuration(Number(e.target.value))}
                        className="slider-input"
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="flowIntensity">Flow Intensity</label>
                      <div className="button-group">
                        {[0, 1, 2].map((val) => (
                          <button
                            key={val}
                            type="button"
                            className={`option-btn ${flowIntensity === val ? 'active' : ''}`}
                            onClick={() => setFlowIntensity(val)}
                          >
                            {val === 0 ? '🟢 Light' : val === 1 ? '🟡 Medium' : '🔴 Heavy'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Lifestyle */}
                  <div className="form-section lifestyle">
                    <div className="section-header">
                      <span className="icon">💪</span>
                      <h3>Lifestyle Factors</h3>
                    </div>

                    <div className="form-field">
                      <div className="field-header">
                        <label>Stress Level</label>
                        <span className="value-display">{stressLevel}/10</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={stressLevel}
                        onChange={(e) => setStressLevel(Number(e.target.value))}
                        className="slider-input stress-slider"
                      />
                      <div className="range-labels">
                        <small>😊 Relaxed</small>
                        <small>😰 Stressed</small>
                      </div>
                    </div>

                    <div className="form-field">
                      <div className="field-header">
                        <label>Sleep Hours</label>
                        <span className="value-display">{sleepHours} hrs</span>
                      </div>
                      <input
                        type="range"
                        min="4"
                        max="12"
                        step="0.5"
                        value={sleepHours}
                        onChange={(e) => setSleepHours(Number(e.target.value))}
                        className="slider-input"
                      />
                      <div className="range-markers">
                        <mark>4</mark>
                        <mark>8</mark>
                        <mark>12</mark>
                      </div>
                    </div>

                    <div className="form-field">
                      <div className="field-header">
                        <label>Exercise Days</label>
                        <span className="value-display">{exerciseDays}/7</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="7"
                        value={exerciseDays}
                        onChange={(e) => setExerciseDays(Number(e.target.value))}
                        className="slider-input"
                      />
                    </div>

                    <div className="form-field">
                      <label htmlFor="age">Age</label>
                      <input
                        type="number"
                        id="age"
                        min="15"
                        max="55"
                        value={age}
                        onChange={(e) => setAge(Number(e.target.value))}
                        className="input-number"
                      />
                    </div>
                  </div>

                  {/* Error Alert */}
                  {error && (
                    <div className="alert alert-error">
                      <span className="alert-icon">⚠️</span>
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button 
                    type="submit" 
                    className="btn btn-primary btn-lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner"></span> Analyzing...
                      </>
                    ) : (
                      <>✨ Get Predictions</>
                    )}
                  </button>
                </form>
              </div>
            </aside>

            {/* Main Panel - Results */}
            <section className="main-panel">
              {/* Live PMS Preview */}
              <div className="live-pms-card">
                <div className="card-headline">
                  <h3>⚡ Live PMS Risk Monitor</h3>
                  <span className="live-indicator">LIVE</span>
                </div>

                <div className="pms-gauge">
                  <div className="gauge-outer">
                    <div 
                      className="gauge-fill" 
                      style={{
                        background: `conic-gradient(${riskInfo.color} 0deg ${pmsPreview * 360}deg, #e0e0e0 ${pmsPreview * 360}deg 360deg)`,
                      }}
                    ></div>
                    <div className="gauge-inner">
                      <div className="gauge-value">
                        <span className="number">{Math.round(pmsPreview * 100)}</span>
                        <span className="unit">%</span>
                      </div>
                      <div className="gauge-level">{riskInfo.level}</div>
                    </div>
                  </div>
                </div>

                {/* Factor Breakdown */}
                <div className="factors-grid">
                  <div className="factor-card">
                    <div className="factor-icon">📅</div>
                    <div className="factor-content">
                      <span className="factor-name">Cycle Day</span>
                      <span className={`factor-value ${cycleDay > 24 ? 'critical' : cycleDay > 14 ? 'warning' : 'good'}`}>
                        {cycleDay}/{cycleLength}
                      </span>
                    </div>
                  </div>

                  <div className="factor-card">
                    <div className="factor-icon">😰</div>
                    <div className="factor-content">
                      <span className="factor-name">Stress</span>
                      <span className={`factor-value ${stressLevel >= 7 ? 'critical' : stressLevel >= 4 ? 'warning' : 'good'}`}>
                        {stressLevel}/10
                      </span>
                    </div>
                  </div>

                  <div className="factor-card">
                    <div className="factor-icon">😴</div>
                    <div className="factor-content">
                      <span className="factor-name">Sleep</span>
                      <span className={`factor-value ${sleepHours < 7 ? 'critical' : 'good'}`}>
                        {sleepHours}h
                      </span>
                    </div>
                  </div>

                  <div className="factor-card">
                    <div className="factor-icon">🏃</div>
                    <div className="factor-content">
                      <span className="factor-name">Exercise</span>
                      <span className={`factor-value ${exerciseDays < 3 ? 'warning' : 'good'}`}>
                        {exerciseDays}d
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pms-insight">
                  <p>💡 <strong>Move the sliders</strong> to see how each factor affects your PMS risk in real-time!</p>
                </div>
              </div>

              {/* Cycle Phase Card */}
              {lastPeriodDate && (
                <div className="phase-card" style={{ borderColor: cyclePhase.color }}>
                  <div className="phase-header">
                    <span className="phase-emoji">{cyclePhase.emoji}</span>
                    <div>
                      <h3>Current Phase</h3>
                      <p className="phase-name">{cyclePhase.name}</p>
                    </div>
                  </div>
                  <div className="phase-description">
                    {cyclePhase.name === 'Menstruation' && 'Your period - focus on rest and hydration'}
                    {cyclePhase.name === 'Follicular' && 'Building energy - great time for new projects'}
                    {cyclePhase.name === 'Ovulation' && 'Peak energy and fertility - you\'re at your most confident!'}
                    {cyclePhase.name === 'Luteal' && 'Winding down - honor your need for rest'}
                  </div>
                </div>
              )}

              {/* Predictions Display */}
              {prediction && (
                <>
                  <div className="predictions-grid">
                    {/* Next Period */}
                    <div className="prediction-card next-period">
                      <div className="prediction-header">
                        <span className="prediction-icon">📅</span>
                        <div>
                          <h4>Next Period</h4>
                          <span className="confidence-badge">{Math.round(prediction.predictions.confidence.periodConfidence * 100)}%</span>
                        </div>
                      </div>
                      <div className="prediction-date">{prediction.nextPeriodDate}</div>
                      <div className="prediction-meta">
                        <span className="meta-label">In</span>
                        <span className="meta-value">{prediction.daysUntilNextPeriod}</span>
                        <span className="meta-label">days</span>
                      </div>
                    </div>

                    {/* Ovulation */}
                    <div className="prediction-card ovulation">
                      <div className="prediction-header">
                        <span className="prediction-icon">💚</span>
                        <div>
                          <h4>Ovulation</h4>
                          <span className="confidence-badge">{Math.round(prediction.predictions.confidence.ovulationConfidence * 100)}%</span>
                        </div>
                      </div>
                      <div className="prediction-date">{prediction.ovulationDate}</div>
                      <div className="prediction-meta">
                        <span className="meta-label">In</span>
                        <span className="meta-value">{prediction.daysUntilOvulation}</span>
                        <span className="meta-label">days</span>
                      </div>
                    </div>

                    {/* Fertile Window */}
                    <div className="prediction-card fertile">
                      <div className="prediction-header">
                        <span className="prediction-icon">💫</span>
                        <div>
                          <h4>Fertile Window</h4>
                        </div>
                      </div>
                      <div className="fertile-dates">
                        {prediction.fertility.fertileWindowStart} → {prediction.fertility.fertileWindowEnd}
                      </div>
                      {prediction.fertility.isPeakFertility && (
                        <div className="peak-badge">🔴 PEAK TODAY</div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="cycle-progress-card">
                    <h4>Cycle Progress</h4>
                    <div className="progress-container">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${(prediction.currentCycleDay / cycleLength) * 100}%` }}
                        ></div>
                      </div>
                      <div className="progress-labels">
                        <span>Day {prediction.currentCycleDay}</span>
                        <span>{cycleLength} days</span>
                      </div>
                    </div>
                  </div>

                  {/* Recommendations */}
                  {prediction.recommendations.length > 0 && (
                    <div className="recommendations-card">
                      <h4>✅ Health Tips</h4>
                      <ul className="tips-list">
                        {prediction.recommendations.map((rec, idx) => (
                          <li key={idx}><span className="check">✓</span>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {!prediction && (
                <div className="empty-state">
                  <div className="empty-icon">✨</div>
                  <h3>Ready to get personalized insights?</h3>
                  <p>Fill in your health information and click "Get Predictions"</p>
                </div>
              )}
            </section>
          </div>
        ) : (
          /* History View */
          <div className="history-view">
            <div className="history-header">
              <h2>📋 Your Prediction History</h2>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowHistory(false)}
              >
                ← Back to Dashboard
              </button>
            </div>

            {history.length === 0 ? (
              <div className="empty-history">
                <span className="empty-icon">📭</span>
                <p>No predictions yet. Start tracking your cycle!</p>
              </div>
            ) : (
              <div className="history-timeline">
                {history.map((h, idx) => (
                  <div key={idx} className="timeline-item">
                    <div className="timeline-date">{new Date(h.nextPeriodDate).toLocaleDateString()}</div>
                    <div className="timeline-card">
                      <div className="timeline-stat">
                        <span className="stat-icon">📅</span>
                        <span className="stat-label">Days:</span>
                        <span className="stat-value">{h.daysUntilNextPeriod}</span>
                      </div>
                      <div className="timeline-stat">
                        <span className="stat-icon">⚡</span>
                        <span className="stat-label">PMS:</span>
                        <span className={`stat-value ${Math.round(h.predictions.pmsLikelihood * 100) > 50 ? 'high' : 'low'}`}>
                          {Math.round(h.predictions.pmsLikelihood * 100)}%
                        </span>
                      </div>
                      <div className="timeline-stat">
                        <span className="stat-icon">🔄</span>
                        <span className="stat-label">Cycle:</span>
                        <span className="stat-value">Day {h.currentCycleDay}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>🌸 TrackHER | Your AI-Powered Women's Health Companion | v1.0</p>
      </footer>
    </div>
  );
}

export default App;