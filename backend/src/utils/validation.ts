/**
 * Validation utilities for all inputs
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validate prediction save request
 */
export const validatePredictionInput = (data: any): ValidationResult => {
  const errors: ValidationError[] = [];

  // Required fields
  if (!data.lastPeriodDate || typeof data.lastPeriodDate !== 'string') {
    errors.push({ field: 'lastPeriodDate', message: 'Last period date is required' });
  }

  if (!data.cycleLength || typeof data.cycleLength !== 'number') {
    errors.push({ field: 'cycleLength', message: 'Cycle length is required' });
  }

  // Validate cycle length (21-35 days is normal)
  if (data.cycleLength && (data.cycleLength < 21 || data.cycleLength > 35)) {
    errors.push({ 
      field: 'cycleLength', 
      message: 'Cycle length should be between 21 and 35 days' 
    });
  }

  // Validate period duration
  if (data.periodDuration && (data.periodDuration < 3 || data.periodDuration > 7)) {
    errors.push({ 
      field: 'periodDuration', 
      message: 'Period duration should be between 3 and 7 days' 
    });
  }

  // Validate flow intensity (0-2)
  if (data.flowIntensity !== undefined && (data.flowIntensity < 0 || data.flowIntensity > 2)) {
    errors.push({ 
      field: 'flowIntensity', 
      message: 'Flow intensity should be between 0 and 2' 
    });
  }

  // Validate stress level (1-10)
  if (data.stressLevel && (data.stressLevel < 1 || data.stressLevel > 10)) {
    errors.push({ 
      field: 'stressLevel', 
      message: 'Stress level should be between 1 and 10' 
    });
  }

  // Validate sleep hours (4-12)
  if (data.sleepHours && (data.sleepHours < 4 || data.sleepHours > 12)) {
    errors.push({ 
      field: 'sleepHours', 
      message: 'Sleep hours should be between 4 and 12' 
    });
  }

  // Validate exercise days (0-7)
  if (data.exerciseDays !== undefined && (data.exerciseDays < 0 || data.exerciseDays > 7)) {
    errors.push({ 
      field: 'exerciseDays', 
      message: 'Exercise days should be between 0 and 7' 
    });
  }

  // Validate mood level (1-10)
  if (data.moodLevel && (data.moodLevel < 1 || data.moodLevel > 10)) {
    errors.push({ 
      field: 'moodLevel', 
      message: 'Mood level should be between 1 and 10' 
    });
  }

  // Validate energy level (1-10)
  if (data.energyLevel && (data.energyLevel < 1 || data.energyLevel > 10)) {
    errors.push({ 
      field: 'energyLevel', 
      message: 'Energy level should be between 1 and 10' 
    });
  }

  // Validate date format
  if (data.lastPeriodDate) {
    if (!isValidDate(data.lastPeriodDate)) {
      errors.push({ 
        field: 'lastPeriodDate', 
        message: 'Invalid date format. Use YYYY-MM-DD' 
      });
    }

    // Date should not be in future
    if (new Date(data.lastPeriodDate) > new Date()) {
      errors.push({ 
        field: 'lastPeriodDate', 
        message: 'Last period date cannot be in the future' 
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate login/signup request
 */
export const validateAuthInput = (email: string, password: string): ValidationResult => {
  const errors: ValidationError[] = [];

  if (!email || typeof email !== 'string') {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!isValidEmail(email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  }

  if (!password || typeof password !== 'string') {
    errors.push({ field: 'password', message: 'Password is required' });
  } else if (password.length < 6) {
    errors.push({ field: 'password', message: 'Password must be at least 6 characters' });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Helper: Check if date string is valid (YYYY-MM-DD)
 */
export const isValidDate = (dateString: string): boolean => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

/**
 * Helper: Check if email is valid
 */
export const isValidEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Helper: Sanitize string input
 */
export const sanitizeString = (str: string): string => {
  return str.trim().replace(/[<>]/g, '');
};