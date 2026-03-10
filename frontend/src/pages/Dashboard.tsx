import { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { usePredictions } from '../hooks/usePredictions';
import { buildMLFeatures, buildMLSymptoms } from '../utils/cycleCalculations';
import { RiskAlert } from '../components/RiskAlert';
import '../styles/dashboard.css';

interface Prediction {
  id: number;
  userid: number;
  lastperioddate: string;
  nextperioddate: string;
  ovulationdate: string;
  currentcycleday: number;
  pmslikelihood: number;
  cyclelength: number;
  periodduration: number;
  flowintensity: number;
  stresslevel: number;
  sleephours: number;
  exercisedays: number;
  moodlevel: number;
  energylevel: number;
  createdat: string;
  updatedat: string;
}

interface Stats {
  totalPredictions: number;
  avgCycleLength: number;
  avgStressLevel: number;
  avgSleepHours: number;
  avgPmsLikelihood: number;
}

export default function Dashboard() {
  const { user, token, logout } = useAuth();
  const { fetchMLPredictions, loading: mlLoading, error: mlError, predictions: mlPredictions } = usePredictions(token || undefined);

  // Data state
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [currentPrediction, setCurrentPrediction] = useState<Prediction | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('current');

  // Form state
  const [lastPeriodDate, setLastPeriodDate] = useState('2026-02-12');
  const [cycleLength, setCycleLength] = useState(28);
  const [periodDuration, setPeriodDuration] = useState(5);
  const [flowIntensity, setFlowIntensity] = useState(1);
  const [stressLevel, setStressLevel] = useState(5);
  const [sleepHours, setSleepHours] = useState(7.5);
  const [exerciseDays, setExerciseDays] = useState(3);
  const [moodLevel, setMoodLevel] = useState(7);
  const [energyLevel, setEnergyLevel] = useState(6);
  const [age, setAge] = useState(28);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      // Load predictions
      const predRes = await fetch('http://localhost:5000/api/predictions', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (predRes.ok) {
        const predData = await predRes.json();
        const predictionsData = predData.data || [];
        console.log('✅ Loaded predictions:', predictionsData);
        setPredictions(predictionsData);

        if (predictionsData.length > 0) {
          const latest = predictionsData[0];
          setCurrentPrediction(latest);
          setLastPeriodDate(latest.lastperioddate);
          setCycleLength(latest.cyclelength);
          setPeriodDuration(latest.periodduration);
          setFlowIntensity(latest.flowintensity || 1);
          setStressLevel(latest.stresslevel);
          setSleepHours(latest.sleephours);
          setExerciseDays(latest.exercisedays);
          setMoodLevel(latest.moodlevel || 7);
          setEnergyLevel(latest.energylevel || 6);
        }
      } else {
        console.warn('⚠️ Could not load predictions');
      }

      // Load stats
      const statsRes = await fetch('http://localhost:5000/api/stats', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        console.log('✅ Loaded stats:', statsData.data);
        setStats(statsData.data);
      }
    } catch (err) {
      console.error('❌ Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Convert ML cycle length (days) to next period DATE
   */
  const calculateDateFromCycleLength = (startDate: string, cycleLengthDays: number): string => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + Math.round(cycleLengthDays));
    return date.toISOString().split('T')[0];
  };

  /**
   * Calculate ovulation date (typically day 14 of cycle)
   */
  const calculateOvulationDate = (startDate: string, cycleLengthDays: number): string => {
    const date = new Date(startDate);
    const ovulationDay = Math.round(cycleLengthDays / 2);
    date.setDate(date.getDate() + ovulationDay);
    return date.toISOString().split('T')[0];
  };

  /**
   * Calculate days until date
   */
  const daysUntil = (dateStr: string | undefined): number | string => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      const today = new Date();
      const diffTime = date.getTime() - today.getTime();
      const days = Math.ceil(diffTime / (1000 * 3600 * 24));
      return isNaN(days) ? 'N/A' : days;
    } catch {
      return 'N/A';
    }
  };

  /**
   * Calculate current cycle day
   */
  const getCurrentCycleDay = (lastPeriodDate: string, cycleLength: number): number => {
    const lastPeriod = new Date(lastPeriodDate);
    const today = new Date();
    const timeDiff = today.getTime() - lastPeriod.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
    return (daysDiff % cycleLength) + 1;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setSuccessMessage('');
    setSubmitLoading(true);

    try {
      console.log('🚀 Step 1: Getting ML predictions...');
      
      // Get ML predictions
      const mlResult = await fetchMLPredictions(
        cycleLength,
        periodDuration,
        flowIntensity,
        stressLevel,
        age
      );

      if (!mlResult) {
        throw new Error('Failed to get ML predictions');
      }

      console.log('✅ Step 2: Got ML predictions, calculating dates...');

      // Extract ML cycle prediction (in days)
      const mlCycleLengthDays = mlResult.cycleLength?.predicted_cycle_length || cycleLength;
      
      // Calculate next period date from ML prediction
      const nextPeriodDate = calculateDateFromCycleLength(lastPeriodDate, mlCycleLengthDays);
      const ovulationDate = calculateOvulationDate(lastPeriodDate, mlCycleLengthDays);
      const currentCycleDay = getCurrentCycleDay(lastPeriodDate, cycleLength);

      // Calculate PMS likelihood
      const daysBeforePeriod = cycleLength - currentCycleDay;
      let pmsLikelihood = 0;
      if (daysBeforePeriod <= 7 && daysBeforePeriod > 0) {
        pmsLikelihood = (7 - daysBeforePeriod) / 7;
      }
      pmsLikelihood += stressLevel * 0.02;
      pmsLikelihood -= sleepHours * 0.01;
      pmsLikelihood = Math.max(0, Math.min(1, pmsLikelihood));

      console.log('✅ Step 3: Saving to database...');

      // Save to database
      const saveRes = await fetch('http://localhost:5000/api/predictions/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lastPeriodDate,
          cycleLength: Math.round(mlCycleLengthDays),
          periodDuration,
          flowIntensity,
          stressLevel,
          sleepHours,
          exerciseDays,
          moodLevel,
          energyLevel,
          nextPeriodDate,
          ovulationDate,
          currentCycleDay,
          pmsLikelihood
        })
      });

      if (!saveRes.ok) {
        const error = await saveRes.json();
        throw new Error(error.error || 'Failed to save prediction');
      }

      console.log('✅ Step 4: Reloading data...');

      // Reload to show in history
      await loadData();

      setSuccessMessage('✅ Prediction saved! Check History & Trends to see it.');
      setActiveTab('current');

      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ Error:', errorMsg);
      setSubmitError(`Error: ${errorMsg}`);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Format date
  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return 'N/A';
    try {
      if (dateStr.includes('T')) return dateStr.split('T')[0];
      return dateStr;
    } catch {
      return 'N/A';
    }
  };

  // Trend data
  const trendData = useMemo(() => {
    if (!predictions || predictions.length === 0) return [];
    return predictions
      .slice()
      .reverse()
      .map((p: any, idx) => ({
        name: `#${predictions.length - idx}`,
        pms: Math.round((p.pmslikelihood || 0) * 100),
        stress: p.stresslevel || 0,
        sleep: Math.round((p.sleephours || 0) * 10) / 10 || 0,
        energy: p.energylevel || 0,
        mood: p.moodlevel || 0,
      }));
  }, [predictions]);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-state">
          <span className="spinner"></span>
          <p>Loading your health data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1>HER Dashboard</h1>
          <p>Welcome back pretty woman! 🎀</p>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span>{user?.email}</span>
          </div>
          <button className="btn-logout" onClick={logout}>
            🚪 Logout
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        {/* Tabs */}
        <div className="tab-bar">
          <button
            className={`tab-btn ${activeTab === 'current' ? 'active' : ''}`}
            onClick={() => setActiveTab('current')}
          >
            📊 Current Prediction
          </button>
          <button
            className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            📈 History & Trends ({predictions.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`}
            onClick={() => setActiveTab('form')}
          >
            ✏️ Update Profile
          </button>
        </div>

        {/* Errors & Success */}
        {error && <div className="error-alert" style={{ marginBottom: '16px' }}>❌ {error}</div>}
        {successMessage && (
          <div style={{
            backgroundColor: '#D1FAE5',
            color: '#065F46',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            border: '1px solid #6EE7B7',
            fontWeight: '500'
          }}>
            {successMessage}
          </div>
        )}

        {/* ========== CURRENT PREDICTION TAB ========== */}
        {activeTab === 'current' && (
          <div className="tab-content">
            {/* Risk Alert (from ML) */}
            {mlPredictions && <RiskAlert data={mlPredictions.medicalRisk} />}

            {mlError && (
              <div style={{
                backgroundColor: '#FEE2E2',
                color: '#991B1B',
                padding: '12px 16px',
                borderRadius: '8px',
                marginBottom: '16px',
                border: '1px solid #FECACA'
              }}>
                ⚠️ {mlError}
              </div>
            )}

            <h3 style={{
              margin: '0 0 16px 0',
              color: '#9C2B4E',
              fontSize: '20px',
              fontWeight: '600'
            }}>
              📅 Cycle Calendar
            </h3>

            {currentPrediction ? (
              <>
                {/* Stat Cards Grid */}
                <div className="stats-grid">
                  <div className="stat-card">
                    <h3>📅 LAST PERIOD</h3>
                    <p className="stat-value">{formatDate(currentPrediction?.lastperioddate)}</p>
                    <p className="stat-meta">Start date</p>
                  </div>

                  <div className="stat-card">
                    <h3>📅 NEXT PERIOD</h3>
                    <p className="stat-value">{formatDate(currentPrediction?.nextperioddate)}</p>
                    <p className="stat-meta">{daysUntil(currentPrediction?.nextperioddate)} days away</p>
                  </div>

                  <div className="stat-card">
                    <h3>🎯 OVULATION</h3>
                    <p className="stat-value">{formatDate(currentPrediction?.ovulationdate)}</p>
                    <p className="stat-meta">{daysUntil(currentPrediction?.ovulationdate)} days away</p>
                  </div>

                  <div className="stat-card">
                    <h3>⚡ PMS RISK</h3>
                    <p className="stat-value">{Math.round((currentPrediction?.pmslikelihood || 0) * 100)}%</p>
                    <p className="stat-meta">Current risk</p>
                  </div>

                  <div className="stat-card">
                    <h3>🔄 CYCLE DAY</h3>
                    <p className="stat-value">Day {currentPrediction?.currentcycleday}</p>
                    <p className="stat-meta">of {currentPrediction?.cyclelength} days</p>
                  </div>

                  <div className="stat-card">
                    <h3>😴 SLEEP</h3>
                    <p className="stat-value">{currentPrediction?.sleephours}h</p>
                    <p className="stat-meta">Average</p>
                  </div>

                  <div className="stat-card">
                    <h3>😰 STRESS</h3>
                    <p className="stat-value">{currentPrediction?.stresslevel}/10</p>
                    <p className="stat-meta">Current level</p>
                  </div>

                  <div className="stat-card">
                    <h3>😊 MOOD</h3>
                    <p className="stat-value">{currentPrediction?.moodlevel}/10</p>
                    <p className="stat-meta">Today</p>
                  </div>
                </div>

                {/* Stats */}
                {stats && stats.totalPredictions > 0 && (
                  <div className="insights-card">
                    <h3>📊 Your Statistics</h3>
                    <div className="insights-grid">
                      <div className="insight">
                        <span className="insight-label">Total Predictions:</span>
                        <span className="insight-value">{stats.totalPredictions}</span>
                      </div>
                      <div className="insight">
                        <span className="insight-label">Average Cycle:</span>
                        <span className="insight-value">{Math.round(stats.avgCycleLength)} days</span>
                      </div>
                      <div className="insight">
                        <span className="insight-label">Avg Stress:</span>
                        <span className="insight-value">{Math.round(stats.avgStressLevel)}/10</span>
                      </div>
                      <div className="insight">
                        <span className="insight-label">Avg Sleep:</span>
                        <span className="insight-value">{stats.avgSleepHours.toFixed(1)}h</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">✨</div>
                <h3>No predictions yet</h3>
                <p>Update your profile and click "Get Predictions" to start</p>
              </div>
            )}
          </div>
        )}

        {/* ========== HISTORY & TRENDS TAB ========== */}
        {activeTab === 'history' && (
          <div className="tab-content">
            <h3>📈 Your Health Trends Over Time</h3>

            {trendData.length > 0 ? (
              <>
                {/* PMS Trend */}
                <div className="chart-container">
                  <h4>⚡ PMS Risk by Update</h4>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} label={{ value: 'Risk %', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="pms" stroke="#e74c3c" dot={{ fill: '#e74c3c', r: 5 }} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Stress Trend */}
                <div className="chart-container">
                  <h4>😰 Stress Level by Update</h4>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 10]} />
                      <Tooltip />
                      <Line type="monotone" dataKey="stress" stroke="#f39c12" dot={{ fill: '#f39c12', r: 5 }} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* History */}
                <div className="history-list">
                  <h4>📋 All Updates ({predictions.length})</h4>
                  {predictions.map((pred: any, idx) => (
                    <div key={idx} className="history-item">
                      <div className="history-header">
                        <strong>Update #{predictions.length - idx}</strong>
                        <span className="history-meta">{formatDate(pred.createdat)}</span>
                      </div>
                      <div className="history-details">
                        <span>📅 {formatDate(pred.lastperioddate)} → {formatDate(pred.nextperioddate)}</span>
                        <span>🔄 Day {pred.currentcycleday}/{pred.cyclelength}</span>
                        <span>⚡ PMS: {Math.round((pred.pmslikelihood || 0) * 100)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <p>💭 No history yet. Create a prediction to see trends!</p>
              </div>
            )}
          </div>
        )}

        {/* ========== FORM TAB ========== */}
        {activeTab === 'form' && (
          <div className="tab-content">
            <form className="update-form" onSubmit={handleSubmit}>
              <h3>Update Your Health Profile</h3>

              <div className="form-section">
                <h4>📅 Period Information</h4>
                <div className="form-field">
                  <label>Last Period Date</label>
                  <input
                    type="date"
                    value={lastPeriodDate}
                    onChange={(e) => setLastPeriodDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label>Cycle Length: {cycleLength}d</label>
                    <input
                      type="range"
                      min="21"
                      max="35"
                      value={cycleLength}
                      onChange={(e) => setCycleLength(Number(e.target.value))}
                    />
                  </div>
                  <div className="form-field">
                    <label>Duration: {periodDuration}d</label>
                    <input
                      type="range"
                      min="3"
                      max="7"
                      value={periodDuration}
                      onChange={(e) => setPeriodDuration(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label>Flow Intensity</label>
                  <div className="button-group">
                    {[0, 1, 2].map(v => (
                      <button
                        key={v}
                        type="button"
                        className={`opt-btn ${flowIntensity === v ? 'active' : ''}`}
                        onClick={() => setFlowIntensity(v)}
                      >
                        {v === 0 ? '💚 Light' : v === 1 ? '💛 Normal' : '❤️ Heavy'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4>💅 Lifestyle</h4>
                <div className="form-row">
                  <div className="form-field">
                    <label>Stress: {stressLevel}/10</label>
                    <input type="range" min="1" max="10" value={stressLevel} onChange={(e) => setStressLevel(Number(e.target.value))} />
                  </div>
                  <div className="form-field">
                    <label>Sleep: {sleepHours}h</label>
                    <input type="range" min="4" max="12" step="0.5" value={sleepHours} onChange={(e) => setSleepHours(Number(e.target.value))} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label>Exercise: {exerciseDays}/7</label>
                    <input type="range" min="0" max="7" value={exerciseDays} onChange={(e) => setExerciseDays(Number(e.target.value))} />
                  </div>
                  <div className="form-field">
                    <label>Mood: {moodLevel}/10</label>
                    <input type="range" min="1" max="10" value={moodLevel} onChange={(e) => setMoodLevel(Number(e.target.value))} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label>Energy: {energyLevel}/10</label>
                    <input type="range" min="1" max="10" value={energyLevel} onChange={(e) => setEnergyLevel(Number(e.target.value))} />
                  </div>
                  <div className="form-field">
                    <label>Age</label>
                    <input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} min="15" max="55" />
                  </div>
                </div>
              </div>

              {submitError && <div className="error-alert">{submitError}</div>}

              <button
                type="submit"
                className="btn-submit"
                disabled={submitLoading || mlLoading}
                style={{
                  opacity: submitLoading || mlLoading ? 0.7 : 1,
                  cursor: submitLoading || mlLoading ? 'not-allowed' : 'pointer'
                }}
              >
                {submitLoading ? '⏳ Saving...' : '🚀 Get Predictions'}
              </button>

              <p style={{
                marginTop: '12px',
                fontSize: '12px',
                color: '#999',
                textAlign: 'center'
              }}>
                ML-powered analysis + automatic save to history
              </p>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}