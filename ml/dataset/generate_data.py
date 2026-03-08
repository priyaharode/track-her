import pandas as pd
import numpy as np

# Set random seed
np.random.seed(42)

# Number of samples
n_samples = 5000

# Generate synthetic data
data = {
    'cycle_length': np.random.normal(28, 2.5, n_samples).astype(int),
    'period_duration': np.random.normal(5, 1, n_samples).astype(int),
    'flow_intensity': np.random.choice([0, 1, 2], n_samples),
    'stress_level': np.random.randint(1, 11, n_samples),
    'sleep_hours': np.random.normal(7, 1, n_samples),
    'exercise_days': np.random.randint(0, 8, n_samples),
    'age': np.random.randint(18, 50, n_samples),
}

# Create DataFrame
df = pd.DataFrame(data)

# Clip values to realistic ranges
df['cycle_length'] = df['cycle_length'].clip(21, 35)
df['period_duration'] = df['period_duration'].clip(3, 7)
df['sleep_hours'] = df['sleep_hours'].clip(4, 12).round(1)
df['exercise_days'] = df['exercise_days'].clip(0, 7)

# Target variable: days until next period (0-28)
df['days_until_period'] = np.random.normal(14, 5, n_samples).astype(int).clip(0, 28)

# Ovulation day
df['ovulation_day'] = (df['cycle_length'] / 2).astype(int)

# PMS likelihood
pms_prob = (
    (11 - df['stress_level']) / 10 * 0.3 +
    (df['sleep_hours'] / 12) * 0.3 +
    (1 - df['days_until_period'] / 28) * 0.4
)
df['pms_likelihood'] = (np.random.rand(n_samples) < pms_prob).astype(int)

# Save CSV
df.to_csv('cycle_data.csv', index=False)

print(f"Dataset created with {len(df)} samples\n")
print(df.head())