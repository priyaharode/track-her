import React, { useMemo, useState } from 'react';

// Embedded CSS
const calendarStyles = `
  .cycle-calendar-container {
    width: 100%;
    max-width: 32rem;
    margin: 0 auto;
    background: white;
    border-radius: 1rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    padding: 1.5rem;
    border: 1px solid #f3f4f6;
  }

  .cycle-calendar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
  }

  .cycle-calendar-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
  }

  .calendar-nav-button {
    padding: 0.5rem;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: background-color 0.2s;
    border-radius: 0.5rem;
    font-size: 1.25rem;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .calendar-nav-button:hover {
    background-color: #f3f4f6;
  }

  .cycle-legend {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    font-size: 0.75rem;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .legend-color {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 0.125rem;
  }

  .legend-item span {
    color: #666;
  }

  .day-names {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0.25rem;
    margin-bottom: 0.5rem;
  }

  .day-name {
    text-align: center;
    font-size: 0.75rem;
    font-weight: 600;
    color: #6b7280;
    padding: 0.5rem 0;
  }

  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 0.25rem;
    margin-bottom: 1.5rem;
  }

  .calendar-day {
    aspect-ratio: 1;
    padding: 0.25rem;
    border: none;
    border-radius: 0.5rem;
    font-size: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: box-shadow 0.2s;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .calendar-day:hover:not(:disabled) {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .calendar-day:disabled {
    cursor: default;
    opacity: 0.3;
  }

  .phase-period {
    background-color: #fee2e2;
    color: #7f1d1d;
  }

  .phase-follicular {
    background-color: #dbeafe;
    color: #1e3a8a;
  }

  .phase-ovulation {
    background-color: #fce7f3;
    color: #831843;
  }

  .phase-luteal {
    background-color: #fef3c7;
    color: #78350f;
  }

  .phase-none {
    background-color: #f9fafb;
    color: #d1d5db;
  }

  .phase-today {
    background: linear-gradient(135deg, #818cf8 0%, #4f46e5 100%);
    color: white;
    font-weight: 600;
  }



  @media (max-width: 640px) {
    .cycle-calendar-container {
      padding: 1rem;
    }

    .cycle-legend {
      grid-template-columns: repeat(2, 1fr);
      font-size: 0.7rem;
    }

    .calendar-day {
      font-size: 0.7rem;
    }

    .day-name {
      font-size: 0.7rem;
    }
  }
`;

interface CalendarDay {
  date: Date;
  day: number;
  month: number;
  year: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  cyclePhase: 'period' | 'follicular' | 'ovulation' | 'luteal' | 'none';
  cycleDay: number | null;
  daysFromCycleStart: number;
}

interface CycleCalendarProps {
  lastPeriodDate: string;
  cycleLength: number;
  periodDuration: number;
  currentMonth?: Date;
  onDateSelect?: (date: Date) => void;
}

const CycleCalendar: React.FC<CycleCalendarProps> = ({
  lastPeriodDate,
  cycleLength,
  periodDuration,
  currentMonth = new Date(),
  onDateSelect
}) => {
  const [displayMonth, setDisplayMonth] = useState(new Date(currentMonth));

  // Calculate cycle phases
  const getCycleInfo = (date: Date) => {
    const lastPeriod = new Date(lastPeriodDate);
    lastPeriod.setHours(0, 0, 0, 0);

    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    const timeDiff = checkDate.getTime() - lastPeriod.getTime();
    const daysFromStart = Math.floor(timeDiff / (1000 * 3600 * 24));

    // Only show cycle info for dates within 2 cycles
    if (daysFromStart < -7 || daysFromStart > cycleLength * 2) {
      return { cyclePhase: 'none' as const, cycleDay: null, daysFromStart: -1 };
    }

    // If before cycle start, show as pre-cycle
    if (daysFromStart < 0) {
      return { cyclePhase: 'none' as const, cycleDay: null, daysFromStart };
    }

    const dayInCycle = daysFromStart % cycleLength;

    // Determine phase
    let cyclePhase: 'period' | 'follicular' | 'ovulation' | 'luteal' = 'follicular';

    if (dayInCycle < periodDuration) {
      cyclePhase = 'period';
    } else if (dayInCycle < 14) {
      cyclePhase = 'follicular';
    } else if (dayInCycle < 16) {
      cyclePhase = 'ovulation';
    } else {
      cyclePhase = 'luteal';
    }

    return {
      cyclePhase,
      cycleDay: dayInCycle + 1,
      daysFromStart
    };
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = displayMonth.getFullYear();
    const month = displayMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const isCurrentMonth = date.getMonth() === month;
      const isToday = date.getTime() === today.getTime();

      const { cyclePhase, cycleDay, daysFromStart } = getCycleInfo(date);

      days.push({
        date,
        day: date.getDate(),
        month: date.getMonth(),
        year: date.getFullYear(),
        isCurrentMonth,
        isToday,
        cyclePhase,
        cycleDay,
        daysFromCycleStart: daysFromStart
      });
    }

    return days;
  }, [displayMonth, lastPeriodDate, cycleLength, periodDuration]);

  const getPhaseClassName = (phase: string, isToday: boolean): string => {
    if (isToday) return 'phase-today';

    switch (phase) {
      case 'period':
        return 'phase-period';
      case 'follicular':
        return 'phase-follicular';
      case 'ovulation':
        return 'phase-ovulation';
      case 'luteal':
        return 'phase-luteal';
      default:
        return 'phase-none';
    }
  };

  const previousMonth = () => {
    setDisplayMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setDisplayMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const monthName = displayMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <>
      <style>{calendarStyles}</style>
      <div className="cycle-calendar-container">
        {/* Header */}
        <div className="cycle-calendar-header">
          <button
            onClick={previousMonth}
            className="calendar-nav-button"
            aria-label="Previous month"
          >
            ◀
          </button>

          <h2>{monthName}</h2>

          <button
            onClick={nextMonth}
            className="calendar-nav-button"
            aria-label="Next month"
          >
            ▶
          </button>
        </div>

        {/* Legend */}
        <div className="cycle-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#fee2e2' }}></div>
            <span>Period</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#dbeafe' }}></div>
            <span>Fertile</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#fce7f3' }}></div>
            <span>Ovulation</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#fef3c7' }}></div>
            <span>Luteal</span>
          </div>
        </div>

        {/* Day names */}
        <div className="day-names">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="day-name">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="calendar-grid">
          {calendarDays.map((day, idx) => (
            <button
              key={idx}
              onClick={() => onDateSelect?.(day.date)}
              disabled={!day.isCurrentMonth}
              className={`calendar-day ${getPhaseClassName(day.cyclePhase, day.isToday)}`}
              title={
                day.cyclePhase !== 'none'
                  ? `Day ${day.cycleDay} - ${day.cyclePhase}`
                  : ''
              }
            >
              <span>{day.day}</span>
              {day.cyclePhase !== 'none' && day.cycleDay && (
                <span style={{ fontSize: '0.6rem', opacity: 0.75 }}>{day.cycleDay}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default CycleCalendar;