#!/usr/bin/env python3
import sys
import subprocess
import json

# Test data
test_features = {
    "MeanCycleLength": 28,
    "LengthofLutealPhase": 14,
    "LengthofMenses": 5,
    "MeanBleedingIntensity": 2,
    "TotalNumberofHighDays": 5,
    "TotalNumberofPeakDays": 2,
    "TotalDaysofFertility": 6,
    "Age": 30,
    "BMI": 22,
    "Numberpreg": 0,
    "Livingkids": 0,
    "Miscarriages": 0,
    "Abortions": 0,
    "Reprocate": 1,
    "Breastfeeding": 0,
    "NumberofDaysofIntercourse": 3,
    "IntercourseInFertileWindow": 2,
    "TotalMensesScore": 10,
    "UnusualBleeding": 0,
    "PhasesBleeding": 0
}

print("Testing predict.py with cycle prediction...")
result = subprocess.run(
    ['py', 'predict.py', 'cycle', json.dumps(test_features)],
    capture_output=True,
    text=True
)

print("STDOUT:", result.stdout)
if result.stderr:
    print("STDERR:", result.stderr)
print("Return code:", result.returncode)

if result.returncode == 0:
    try:
        prediction = json.loads(result.stdout)
        print("\n✅ SUCCESS!")
        print(f"Predicted cycle length: {prediction.get('predicted_cycle_length', 'N/A')} days")
    except:
        print("\n❌ Invalid JSON output")