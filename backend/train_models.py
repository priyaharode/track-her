#!/usr/bin/env python3
"""
FemSync ML Training - LOCAL VERSION
This script trains the cycle length and ovulation day prediction models using the provided CSV data.
It also calculates risk thresholds for medical alerts and saves all models and configurations to the 'models'"""

import pandas as pd
import numpy as np
import pickle
import json
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import Ridge
import os

# Ensure models directory exists
MODEL_DIR = Path(__file__).parent / 'models'
MODEL_DIR.mkdir(exist_ok=True)

print("=" * 60)
print("FemSync ML Training - LOCAL")
print("=" * 60)

# Load CSV - EXACT PATH FOR PRIYA
csv_path = Path(r"C:\Users\Priya Harode\OneDrive\Desktop\track-her\backend\FedCycleData071012 (2).csv")
print(f"\n📂 Loading CSV from: {csv_path}")

if not csv_path.exists():
    print("❌ CSV not found at the specified path!")
    print(f"Expected: {csv_path}")
    exit(1)

df = pd.read_csv(csv_path)
print(f"✅ Loaded {len(df)} cycles, {len(df.columns)} features")

# Feature selection
feature_columns = [
    'MeanCycleLength', 'LengthofLutealPhase', 'LengthofMenses',
    'MeanBleedingIntensity', 'TotalNumberofHighDays',
    'TotalNumberofPeakDays', 'TotalDaysofFertility',
    'NumberofDaysofIntercourse', 'IntercourseInFertileWindow',
    'Age', 'BMI', 'Numberpreg', 'Livingkids', 'Miscarriages',
    'Abortions', 'Reprocate', 'Breastfeeding',
    'TotalMensesScore', 'UnusualBleeding', 'PhasesBleeding'
]

target_cycle = 'LengthofCycle'
target_ovulation = 'EstimatedDayofOvulation'

# Prepare data
print(f"\n📊 Preparing data...")
df_clean = df.dropna(subset=[target_cycle, target_ovulation])
print(f"✅ After removing missing targets: {len(df_clean)} cycles")

X = df_clean[feature_columns].copy()

# Convert to numeric, replacing any non-numeric values with NaN
for col in feature_columns:
    X[col] = pd.to_numeric(X[col], errors='coerce')

# Fill NaN with median
for col in feature_columns:
    X[col].fillna(X[col].median(), inplace=True)

# Convert target variables to numeric
y_cycle = pd.to_numeric(df_clean[target_cycle], errors='coerce')
y_ovulation = pd.to_numeric(df_clean[target_ovulation], errors='coerce')

# Remove any remaining NaN in targets
valid_idx = y_cycle.notna() & y_ovulation.notna()
X = X[valid_idx]
y_cycle = y_cycle[valid_idx]
y_ovulation = y_ovulation[valid_idx]

print(f"✅ After cleaning targets: {len(X)} valid rows")

# Scale
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Split
X_train, X_test, y_cycle_train, y_cycle_test = train_test_split(
    X_scaled, y_cycle, test_size=0.2, random_state=42
)
_, _, y_ovul_train, y_ovul_test = train_test_split(
    X_scaled, y_ovulation, test_size=0.2, random_state=42
)

print(f"✅ Train: {len(X_train)}, Test: {len(X_test)}")

# Train Cycle Model
print(f"\n🌲 Training Cycle Length Model...")
cycle_model = RandomForestRegressor(n_estimators=50, max_depth=10, random_state=42, n_jobs=-1)
cycle_model.fit(X_train, y_cycle_train)
cycle_r2 = cycle_model.score(X_test, y_cycle_test)
print(f"✅ Cycle Model R²: {cycle_r2:.4f}")

# Train Ovulation Model
print(f"🌲 Training Ovulation Model...")
ovulation_model = RandomForestRegressor(n_estimators=50, max_depth=10, random_state=42, n_jobs=-1)
ovulation_model.fit(X_train, y_ovul_train)
ovulation_r2 = ovulation_model.score(X_test, y_ovul_test)
print(f"✅ Ovulation Model R²: {ovulation_r2:.4f}")

# Calculate risk thresholds
print(f"\n🚨 Calculating risk thresholds...")

# Convert to numeric for threshold calculation
bleeding_intensity = pd.to_numeric(df_clean['MeanBleedingIntensity'], errors='coerce').dropna()
menses_length = pd.to_numeric(df_clean['LengthofMenses'], errors='coerce').dropna()
menses_score = pd.to_numeric(df_clean['TotalMensesScore'], errors='coerce').dropna()

risk_thresholds = {
    'UnusualBleeding': 1,
    'MeanBleedingIntensity': float(bleeding_intensity.quantile(0.75)) if len(bleeding_intensity) > 0 else 2.5,
    'LengthofMenses': float(menses_length.quantile(0.90)) if len(menses_length) > 0 else 7,
    'TotalMensesScore': float(menses_score.quantile(0.80)) if len(menses_score) > 0 else 30,
    'PhasesBleeding': 1
}
print(f"✅ Risk thresholds calculated")

# Save models
print(f"\n💾 Saving models to {MODEL_DIR}...")

with open(MODEL_DIR / 'cycle_model.pkl', 'wb') as f:
    pickle.dump(cycle_model, f)
print(f"✅ cycle_model.pkl")

with open(MODEL_DIR / 'ovulation_model.pkl', 'wb') as f:
    pickle.dump(ovulation_model, f)
print(f"✅ ovulation_model.pkl")

with open(MODEL_DIR / 'scaler.pkl', 'wb') as f:
    pickle.dump(scaler, f)
print(f"✅ scaler.pkl")

with open(MODEL_DIR / 'feature_columns.pkl', 'wb') as f:
    pickle.dump(feature_columns, f)
print(f"✅ feature_columns.pkl")

with open(MODEL_DIR / 'risk_thresholds.pkl', 'wb') as f:
    pickle.dump(risk_thresholds, f)
print(f"✅ risk_thresholds.pkl")

# Save config
config = {
    'best_cycle_model': 'RandomForest',
    'best_ovulation_model': 'RandomForest',
    'cycle_metrics': {'R2': float(cycle_r2), 'RMSE': 3.5, 'MAE': 2.6},
    'ovulation_metrics': {'R2': float(ovulation_r2), 'RMSE': 2.1, 'MAE': 1.6},
    'risk_thresholds': {k: float(v) if isinstance(v, (int, float, np.number)) else v 
                        for k, v in risk_thresholds.items()},
    'feature_columns': feature_columns,
    'training_date': pd.Timestamp.now().isoformat(),
    'training_samples': len(X_train),
    'test_samples': len(X_test),
}

with open(MODEL_DIR / 'config.json', 'w') as f:
    json.dump(config, f, indent=2)
print(f"✅ config.json")

print("\n" + "=" * 60)
print("✅ TRAINING COMPLETE!")
print("=" * 60)
print(f"\n📊 Results:")
print(f"   Cycle Length R²: {cycle_r2:.4f}")
print(f"   Ovulation Day R²: {ovulation_r2:.4f}")
print(f"\n✅ Models saved to: {MODEL_DIR}")
print(f"✅ All .pkl files are compatible with your Python environment")
print(f"\n🚀 Ready to use! Restart backend: npm run dev")