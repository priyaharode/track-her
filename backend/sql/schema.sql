-- Create users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  firstName VARCHAR(100),
  lastName VARCHAR(100),
  age INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create predictions table
CREATE TABLE predictions (
  id SERIAL PRIMARY KEY,
  userId INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lastPeriodDate DATE NOT NULL,
  cycleLength INT,
  periodDuration INT,
  flowIntensity INT,
  stressLevel INT,
  sleepHours DECIMAL(3,1),
  exerciseDays INT,
  moodLevel INT,
  energyLevel INT,
  nextPeriodDate DATE,
  ovulationDate DATE,
  currentCycleDay INT,
  pmsLikelihood DECIMAL(5,2),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create daily entries table (for tracking day-by-day)
CREATE TABLE daily_entries (
  id SERIAL PRIMARY KEY,
  userId INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  entryDate DATE NOT NULL,
  mood INT,
  energy INT,
  symptoms TEXT[], -- Array of symptoms
  notes TEXT,
  stressLevel INT,
  sleepHours DECIMAL(3,1),
  exerciseDays INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(userId, entryDate)
);

-- Create indexes for faster queries
CREATE INDEX idx_predictions_userId ON predictions(userId);
CREATE INDEX idx_predictions_createdAt ON predictions(createdAt);
CREATE INDEX idx_daily_entries_userId ON daily_entries(userId);
CREATE INDEX idx_daily_entries_entryDate ON daily_entries(entryDate);