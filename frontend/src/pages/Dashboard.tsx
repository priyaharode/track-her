import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthContext';
import CycleCalendar from '../components/CycleCalendar';

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
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [currentPrediction, setCurrentPrediction] = useState<Prediction | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'calendar' | 'trends' | 'form'>('calendar');

  const [lastPeriodDate, setLastPeriodDate] = useState('2026-02-12');
  const [cycleLength, setCycleLength] = useState(27);
  const [periodDuration, setPeriodDuration] = useState(4);
  const [flowIntensity, setFlowIntensity] = useState(1);
  const [stressLevel, setStressLevel] = useState(5);
  const [sleepHours, setSleepHours] = useState(7.5);
  const [exerciseDays, setExerciseDays] = useState(3);
  const [moodLevel, setMoodLevel] = useState(7);
  const [energyLevel, setEnergyLevel] = useState(6);

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const predRes = await fetch('http://localhost:5000/api/predictions', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (predRes.ok) {
        const predData = await predRes.json();
        const predictionsData = predData.data || [];
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
      }

      const statsRes = await fetch('http://localhost:5000/api/predictions/stats', {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);

    try {
      const nextPeriodDate = new Date(lastPeriodDate);
      nextPeriodDate.setDate(nextPeriodDate.getDate() + cycleLength);
      const nextPeriodStr = nextPeriodDate.toISOString().split('T')[0];

      const ovulationDate = new Date(lastPeriodDate);
      ovulationDate.setDate(ovulationDate.getDate() + Math.round(cycleLength / 2));
      const ovulationStr = ovulationDate.toISOString().split('T')[0];

      const lastPeriod = new Date(lastPeriodDate);
      const today = new Date();
      const timeDiff = today.getTime() - lastPeriod.getTime();
      const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
      const currentCycleDay = (daysDiff % cycleLength) + 1;

      const daysBeforePeriod = cycleLength - currentCycleDay;
      let pmsLikelihood = 0;
      if (daysBeforePeriod <= 7 && daysBeforePeriod > 0) {
        pmsLikelihood = (7 - daysBeforePeriod) / 7;
      }
      pmsLikelihood += stressLevel * 0.02;
      pmsLikelihood -= sleepHours * 0.01;
      pmsLikelihood = Math.max(0, Math.min(1, pmsLikelihood));

      const saveRes = await fetch('http://localhost:5000/api/predictions/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          lastPeriodDate,
          cycleLength,
          periodDuration,
          flowIntensity,
          stressLevel,
          sleepHours,
          exerciseDays,
          moodLevel,
          energyLevel,
          nextPeriodDate: nextPeriodStr,
          ovulationDate: ovulationStr,
          currentCycleDay,
          pmsLikelihood
        })
      });

      if (!saveRes.ok) {
        const errorData = await saveRes.json();
        throw new Error(errorData.error || 'Failed to save');
      }

      await loadData();
      setSuccessMessage('✅ Prediction saved!');
      setActiveTab('calendar');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSubmitLoading(false);
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

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
      }));
  }, [predictions]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#faf8f9', padding: '20px' }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Loading your health data...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f9', padding: '20px' }}>
      {/* Header */}
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: '700', color: '#8b1a1a' }}>HER Dashboard</h1>
          <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>Welcome back pretty woman! 🎀</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ color: '#666' }}>{user?.email}</span>
          <button
            onClick={logout}
            style={{ padding: '8px 16px', background: '#8b1a1a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
          >
            🚪 Logout
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '2px solid #e8d5d8', marginBottom: '24px' }}>
        <button
          onClick={() => setActiveTab('calendar')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: activeTab === 'calendar' ? '600' : '500',
            color: activeTab === 'calendar' ? '#8b1a1a' : '#666',
            borderBottom: activeTab === 'calendar' ? '3px solid #8b1a1a' : 'none',
            marginBottom: '-2px'
          }}
        >
          📅 Insights   
        </button>
        <button
          onClick={() => setActiveTab('trends')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: activeTab === 'trends' ? '600' : '500',
            color: activeTab === 'trends' ? '#8b1a1a' : '#666',
            borderBottom: activeTab === 'trends' ? '3px solid #8b1a1a' : 'none',
            marginBottom: '-2px'
          }}
        >
          📈 Trends ({predictions.length})
        </button>
        <button
          onClick={() => setActiveTab('form')}
          style={{
            padding: '12px 20px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: activeTab === 'form' ? '600' : '500',
            color: activeTab === 'form' ? '#8b1a1a' : '#666',
            borderBottom: activeTab === 'form' ? '3px solid #8b1a1a' : 'none',
            marginBottom: '-2px'
          }}
        >
          ✏️ Update
        </button>
      </div>

      {/* Alerts */}
      {error && <div style={{ background: '#f5e8eb', color: '#8b1a1a', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>❌ {error}</div>}
      {successMessage && <div style={{ background: '#d1fae5', color: '#065f46', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>✅ {successMessage}</div>}

      {/* CALENDAR TAB */}
      {activeTab === 'calendar' && currentPrediction && (
        <div>
          {/* Horizontal Layout: Calendar (Left) | Cycle Info + Phases + Stats (Right) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            {/* LEFT COLUMN: Calendar Only */}
            <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <CycleCalendar
                lastPeriodDate={currentPrediction.lastperioddate}
                cycleLength={currentPrediction.cyclelength}
                periodDuration={currentPrediction.periodduration}
              />
            </div>

            {/* RIGHT COLUMN: Current Cycle + Phases + Statistics */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Current Cycle - Fertility Prediction */}
              {currentPrediction && (() => {
                const today = new Date();
                const nextPeriod = new Date(currentPrediction.nextperioddate);
                const ovulationDate = new Date(currentPrediction.ovulationdate);
                const daysUntilOvulation = Math.ceil((ovulationDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
                
                let fertilityLabel = '';
                if (daysUntilOvulation >= 0 && daysUntilOvulation <= 2) {
                  fertilityLabel = 'Peak Fertility';
                } else if (daysUntilOvulation > 2 && daysUntilOvulation <= 5) {
                  fertilityLabel = 'High Fertility';
                } else if (daysUntilOvulation > 5 && daysUntilOvulation <= 10) {
                  fertilityLabel = 'Moderate';
                } else {
                  fertilityLabel = 'Low';
                }
                
                return (
                  <>
                    {/* Current Cycle Card */}
                    <div style={{ background: 'linear-gradient(135deg, #8b1a1a 0%, #a52c3a 100%)', borderRadius: '12px', padding: '24px', color: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Current Cycle</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                        <div>
                          <div style={{ fontSize: '12px', marginBottom: '4px' }}>Next Period</div>
                          <div style={{ fontSize: '18px', fontWeight: '700' }}>{formatDate(currentPrediction.nextperioddate)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', marginBottom: '4px' }}>Ovulation</div>
                          <div style={{ fontSize: '18px', fontWeight: '700'}}>{daysUntilOvulation} days</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', marginBottom: '4px' }}>Fertility</div>
                          <div style={{ fontSize: '18px', fontWeight: '700' }}>{fertilityLabel}</div>
                        </div>
                      </div>
                    </div>

                    {/* Phases Card */}
                    <div style={{ background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <span style={{ fontSize: '24px' }}>🩸</span>
                          <div>
                            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#8b1a1a', margin: '0 0 4px 0' }}>Menstrual Phase</h4>
                            <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>Your period is here</p>
                          </div>
                        </div>
                      </div>

                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <span style={{ fontSize: '24px' }}>🌱</span>
                          <div>
                            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#a52c3a', margin: '0 0 4px 0' }}>Follicular Phase</h4>
                            <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>Increasing energy and fertility</p>
                          </div>
                        </div>
                      </div>

                      <div style={{ marginBottom: '20px' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <span style={{ fontSize: '24px' }}>💕</span>
                          <div>
                            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#c9516c', margin: '0 0 4px 0' }}>Ovulation Phase</h4>
                            <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>Most fertile days - peak fertility</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <span style={{ fontSize: '24px' }}>🌙</span>
                          <div>
                            <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#7d3a3f', margin: '0 0 4px 0' }}>Luteal Phase</h4>
                            <p style={{ fontSize: '14px', color: '#666', margin: '0' }}>Preparation for next period</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Statistics - Below Phases */}
                    {stats && stats.totalPredictions > 0 && (
                      <div style={{ background: 'linear-gradient(135deg, #8b1a1a 0%, #a52c3a 100%)', borderRadius: '12px', padding: '24px', color: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>📊 Your Statistics</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                          <div>
                            <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>Total Predictions</div>
                            <div style={{ fontSize: '24px', fontWeight: '700' }}>{stats.totalPredictions}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>Avg Cycle</div>
                            <div style={{ fontSize: '24px', fontWeight: '700' }}>{Math.round(stats.avgCycleLength)} days</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>Avg Stress</div>
                            <div style={{ fontSize: '24px', fontWeight: '700' }}>{Math.round(stats.avgStressLevel)}/10</div>
                          </div>
                          <div>
                            <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px' }}>Avg Sleep</div>
                            <div style={{ fontSize: '24px', fontWeight: '700' }}>{stats.avgSleepHours.toFixed(1)}h</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* TRENDS TAB */}
      {activeTab === 'trends' && (
        <div>
          <h3>📈 Your Health Trends</h3>
          {trendData.length > 0 ? (
            <>
              <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h4 style={{ marginBottom: '16px' }}>⚡ PMS Risk Trend</h4>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="pms" stroke="#8b1a1a" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h4 style={{ marginBottom: '16px' }}>😰 Stress Level Trend</h4>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 10]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="stress" stroke="#a52c3a" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <p>No trend data yet</p>
          )}
        </div>
      )}

      {/* FORM TAB */}
      {activeTab === 'form' && (
        <div>
          <form onSubmit={handleSubmit} style={{ maxWidth: '600px', background: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginBottom: '24px' }}>Update Your Health Profile</h3>

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ marginBottom: '16px' }}>📅 Period Information</h4>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Last Period Date</label>
                <input
                  type="date"
                  value={lastPeriodDate}
                  onChange={(e) => setLastPeriodDate(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', boxSizing: 'border-box' }}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Cycle Length: {cycleLength}d</label>
                  <input
                    type="range"
                    min="21"
                    max="35"
                    value={cycleLength}
                    onChange={(e) => setCycleLength(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Duration: {periodDuration}d</label>
                  <input
                    type="range"
                    min="3"
                    max="7"
                    value={periodDuration}
                    onChange={(e) => setPeriodDuration(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ marginBottom: '16px' }}>💅 Lifestyle</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Stress: {stressLevel}/10</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={stressLevel}
                    onChange={(e) => setStressLevel(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Sleep: {sleepHours}h</label>
                  <input
                    type="range"
                    min="4"
                    max="12"
                    step="0.5"
                    value={sleepHours}
                    onChange={(e) => setSleepHours(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Mood: {moodLevel}/10</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={moodLevel}
                    onChange={(e) => setMoodLevel(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Energy: {energyLevel}/10</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={energyLevel}
                    onChange={(e) => setEnergyLevel(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitLoading}
              style={{
                width: '100%',
                padding: '12px',
                background: '#8b1a1a',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: submitLoading ? 'not-allowed' : 'pointer',
                opacity: submitLoading ? 0.7 : 1
              }}
            >
              {submitLoading ? '⏳ Saving...' : '💾 Save Prediction'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}