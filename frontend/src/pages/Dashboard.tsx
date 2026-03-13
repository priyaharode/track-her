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
  const [activeTab, setActiveTab] = useState<'calendar' | 'trends'>('calendar');
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedLogDate, setSelectedLogDate] = useState<string>(new Date().toISOString().split('T')[0]);

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
          <h1 style={{ margin: '0 0 4px 0', fontSize: '28px', fontWeight: '700', color: '#8b1a1a' }}>HER Dashboard🎀</h1>
          <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>Welcome back pretty woman!</p>
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
          📅 Calendar
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
      </div>

      {/* Alerts */}
      {error && <div style={{ background: '#f5e8eb', color: '#8b1a1a', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>❌ {error}</div>}
      {successMessage && <div style={{ background: '#d1fae5', color: '#065f46', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>✅ {successMessage}</div>}

      {/* CALENDAR TAB */}
      {activeTab === 'calendar' && currentPrediction && (
        <div>
          {/* Horizontal Layout: Calendar (Left) | Cycle Info + Phases + Stats (Right) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            {/* LEFT COLUMN: Calendar + Log Button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Calendar Card */}
              <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <CycleCalendar
                  lastPeriodDate={currentPrediction.lastperioddate}
                  cycleLength={currentPrediction.cyclelength}
                  periodDuration={currentPrediction.periodduration}
                  onDateSelect={(date) => {
                    setSelectedLogDate(date.toISOString().split('T')[0]);
                    setShowLogModal(true);
                  }}
                />
                {/* Log Period Button Below Calendar */}
                <button
                  onClick={() => {
                    setSelectedLogDate(new Date().toISOString().split('T')[0]);
                    setShowLogModal(true);
                  }}
                  style={{
                    width: '100%',
                    marginTop: '16px',
                    padding: '12px',
                    background: 'linear-gradient(135deg, #8b1a1a 0%, #a52c3a 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '16px',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                >
                  📝 Log Period
                </button>
              </div>
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
                    <div style={{ background: '#8b1a1a', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#ffffff' }}>Current Cycle</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                        <div>
                          <div style={{ fontSize: '12px', color: '#ffffff', marginBottom: '4px' }}>📅 Next Period</div>
                          <div style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff' }}>{formatDate(currentPrediction.nextperioddate)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#ffffff', marginBottom: '4px' }}>💕 Ovulation</div>
                          <div style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff' }}>{daysUntilOvulation} days</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#ffffff', marginBottom: '4px' }}>✨ Fertility</div>
                          <div style={{ fontSize: '18px', fontWeight: '700', color: '#ffffff' }}>{fertilityLabel}</div>
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

      {/* MODAL: Log Period Form */}
      {showLogModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <form onSubmit={(e) => {
            e.preventDefault();
            
            // Calculate dates based on selected log date
            const nextPeriodDate = new Date(selectedLogDate);
            nextPeriodDate.setDate(nextPeriodDate.getDate() + cycleLength);
            const nextPeriodStr = nextPeriodDate.toISOString().split('T')[0];

            const ovulationDate = new Date(selectedLogDate);
            ovulationDate.setDate(ovulationDate.getDate() + Math.round(cycleLength / 2));
            const ovulationStr = ovulationDate.toISOString().split('T')[0];

            const lastPeriod = new Date(selectedLogDate);
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

            // Send to backend
            const sendData = async () => {
              setSubmitLoading(true);
              try {
                const saveRes = await fetch('http://localhost:5000/api/predictions/save', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                  },
                  body: JSON.stringify({
                    lastPeriodDate: selectedLogDate,
                    cycleLength,
                    periodDuration,
                    flowIntensity,
                    stressLevel,
                    sleepHours,
                    exerciseDays: 3,
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
                setSuccessMessage('✅ Logged successfully!');
                setShowLogModal(false);
                setTimeout(() => setSuccessMessage(''), 3000);
              } catch (err) {
                setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
              } finally {
                setSubmitLoading(false);
              }
            };

            sendData();
          }} style={{ 
            background: 'white', 
            borderRadius: '12px', 
            padding: '32px', 
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowLogModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>

            <h3 style={{ marginBottom: '8px', fontSize: '24px' }}>🌸 How are you feeling today?</h3>
            <p style={{ color: '#666', marginBottom: '24px', fontSize: '14px' }}>Logging for: <strong>{new Date(selectedLogDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong></p>

            {/* Flow Intensity */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', fontSize: '14px' }}>🩸 Flow Today</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                {['Light', 'Moderate', 'Heavy'].map((intensity) => (
                  <button
                    key={intensity}
                    type="button"
                    onClick={() => setFlowIntensity(intensity === 'Light' ? 0 : intensity === 'Moderate' ? 1 : 2)}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      border: '2px solid',
                      borderColor: flowIntensity === (intensity === 'Light' ? 0 : intensity === 'Moderate' ? 1 : 2) ? '#8b1a1a' : '#e8d5d8',
                      background: flowIntensity === (intensity === 'Light' ? 0 : intensity === 'Moderate' ? 1 : 2) ? '#faf8f9' : 'white',
                      cursor: 'pointer',
                      fontWeight: '500',
                      fontSize: '14px',
                      transition: 'all 0.2s'
                    }}
                  >
                    {intensity === 'Light' ? '🩸' : intensity === 'Moderate' ? '🩸🩸' : '🩸🩸🩸'}
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>{intensity}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Symptoms */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', fontSize: '14px' }}>💭 Symptoms Today (select all that apply)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Cramps', emoji: '😣' },
                  { label: 'Headache', emoji: '🤕' },
                  { label: 'Fatigue', emoji: '😴' },
                  { label: 'Bloating', emoji: '🤰' },
                  { label: 'Nausea', emoji: '🤢' },
                  { label: 'Mood Swings', emoji: '😤' },
                  { label: 'Tender Breasts', emoji: '😩' },
                  { label: 'Acne', emoji: '😔' },
                ].map((symptom) => (
                  <label key={symptom.label} style={{ display: 'flex', alignItems: 'center', padding: '10px', border: '1px solid #e8d5d8', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>
                    <input
                      type="checkbox"
                      name={`symptom_${symptom.label}`}
                      defaultChecked={false}
                      style={{ marginRight: '8px', cursor: 'pointer' }}
                    />
                    <span>{symptom.emoji} {symptom.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Mood */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', fontSize: '14px' }}>😊 Mood Today</label>
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                {['😢', '😕', '😐', '🙂', '😊'].map((emoji, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setMoodLevel(idx + 1)}
                    style={{
                      fontSize: '32px',
                      background: moodLevel === idx + 1 ? '#e8d5d8' : 'transparent',
                      border: moodLevel === idx + 1 ? '2px solid #8b1a1a' : 'none',
                      borderRadius: '50%',
                      width: '50px',
                      height: '50px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Energy */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '12px', fontWeight: '600', fontSize: '14px' }}>⚡ Energy Level: {energyLevel}/10</label>
              <input
                type="range"
                name="energyLevel"
                min="1"
                max="10"
                value={energyLevel}
                onChange={(e) => setEnergyLevel(Number(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* Notes */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>📝 Notes (optional)</label>
              <textarea
                name="notes"
                placeholder="Anything else you want to remember about today?"
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  border: '1px solid #d1d5db',
                  fontFamily: 'inherit',
                  fontSize: '14px',
                  minHeight: '80px',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Hidden Backend Data - MUST have name attributes */}
            <input type="hidden" name="lastPeriodDate" value={selectedLogDate} />
            <input type="hidden" name="cycleLength" value={cycleLength} />
            <input type="hidden" name="periodDuration" value={periodDuration} />
            <input type="hidden" name="flowIntensity" value={flowIntensity} />
            <input type="hidden" name="stressLevel" value={stressLevel} />
            <input type="hidden" name="sleepHours" value={sleepHours} />
            <input type="hidden" name="moodLevel" value={moodLevel} />
            <input type="hidden" name="energyLevel" value={energyLevel} />
            <input type="hidden" name="exerciseDays" value={3} />

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowLogModal(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#f0f0f0',
                  color: '#333',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#8b1a1a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: submitLoading ? 'not-allowed' : 'pointer',
                  opacity: submitLoading ? 0.7 : 1,
                  fontSize: '16px'
                }}
              >
                {submitLoading ? '⏳ Saving...' : '💾 Log Today'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}