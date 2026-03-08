import React, { useState } from 'react';
import { CycleInput, Prediction } from '../services/api';
import '../styles/form.css';

interface CycleFormProps {
  onSubmit: (data: CycleInput) => Promise<void>;
  isLoading?: boolean;
  initialData?: Partial<CycleInput>;
}

export const CycleForm: React.FC<CycleFormProps> = ({
  onSubmit,
  isLoading = false,
  initialData
}) => {
  const [formData, setFormData] = useState<CycleInput>(
    initialData
      ? ({
          cycleLength: initialData.cycleLength || 28,
          periodDuration: initialData.periodDuration || 5,
          flowIntensity: initialData.flowIntensity || 1,
          stressLevel: initialData.stressLevel || 5,
          sleepHours: initialData.sleepHours || 7,
          exerciseDays: initialData.exerciseDays || 3,
          age: initialData.age || 28,
        } as CycleInput)
      : {
          cycleLength: 28,
          periodDuration: 5,
          flowIntensity: 1,
          stressLevel: 5,
          sleepHours: 7,
          exerciseDays: 3,
          age: 28,
        }
  );

  const [errors, setErrors] = useState<string[]>([]);

const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
  const target = e.target as HTMLInputElement | HTMLSelectElement;
  const { name, value } = target;
  setFormData(prev => ({
    ...prev,
    [name]: parseFloat(value) || 0
  }));
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    
    // Validation
    const newErrors: string[] = [];
    if (formData.cycleLength < 21 || formData.cycleLength > 35)
      newErrors.push('Cycle length must be 21-35 days');
    if (formData.periodDuration < 3 || formData.periodDuration > 7)
      newErrors.push('Period duration must be 3-7 days');
    if (formData.age < 15 || formData.age > 55)
      newErrors.push('Age must be 15-55 years');

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      setErrors(['Failed to get predictions. Please try again.']);
    }
  };

  return (
    <form className="cycle-form" onSubmit={handleSubmit}>
      <div className="form-section">
        <h3>Cycle Information</h3>
        
        <div className="input-group">
          <label htmlFor="cycleLength">
            Cycle Length: <span className="value">{formData.cycleLength} days</span>
          </label>
          <input
            type="range"
            id="cycleLength"
            name="cycleLength"
            min="21"
            max="35"
            value={formData.cycleLength}
            onChange={handleChange}
          />
          <small>Average days from one period to the next (typical: 21-35)</small>
        </div>

        <div className="input-group">
          <label htmlFor="periodDuration">
            Period Duration: <span className="value">{formData.periodDuration} days</span>
          </label>
          <input
            type="range"
            id="periodDuration"
            name="periodDuration"
            min="3"
            max="7"
            value={formData.periodDuration}
            onChange={handleChange}
          />
          <small>How many days your period typically lasts</small>
        </div>

        <div className="input-group">
          <label htmlFor="flowIntensity">Flow Intensity</label>
          <select
            id="flowIntensity"
            name="flowIntensity"
            value={formData.flowIntensity}
            onChange={handleChange}
          >
            <option value={0}>Light</option>
            <option value={1}>Medium</option>
            <option value={2}>Heavy</option>
          </select>
        </div>
      </div>

      <div className="form-section">
        <h3>Lifestyle Factors</h3>
        
        <div className="input-group">
          <label htmlFor="stressLevel">
            Stress Level: <span className="value">{formData.stressLevel}/10</span>
          </label>
          <input
            type="range"
            id="stressLevel"
            name="stressLevel"
            min="1"
            max="10"
            value={formData.stressLevel}
            onChange={handleChange}
          />
          <small>1 = Very Relaxed, 10 = Very Stressed</small>
        </div>

        <div className="input-group">
          <label htmlFor="sleepHours">
            Sleep Hours: <span className="value">{formData.sleepHours.toFixed(1)} hrs</span>
          </label>
          <input
            type="range"
            id="sleepHours"
            name="sleepHours"
            min="4"
            max="12"
            step="0.5"
            value={formData.sleepHours}
            onChange={handleChange}
          />
        </div>

        <div className="input-group">
          <label htmlFor="exerciseDays">
            Exercise Days: <span className="value">{formData.exerciseDays} days/week</span>
          </label>
          <input
            type="range"
            id="exerciseDays"
            name="exerciseDays"
            min="0"
            max="7"
            value={formData.exerciseDays}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-section">
        <div className="input-group">
          <label htmlFor="age">Age</label>
          <input
            type="number"
            id="age"
            name="age"
            min="15"
            max="55"
            value={formData.age}
            onChange={handleChange}
          />
        </div>
      </div>

      {errors.length > 0 && (
        <div className="error-alert">
          {errors.map((error, i) => (
            <div key={i}>⚠️ {error}</div>
          ))}
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary btn-block"
        disabled={isLoading}
      >
        {isLoading ? '⏳ Generating Predictions...' : '✨ Get Predictions'}
      </button>
    </form>
  );
};