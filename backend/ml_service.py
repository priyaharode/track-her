"""
ML Service Server - Wraps predict.py and exposes it as REST API on port 5001
Run this in a separate terminal to enable ML predictions
"""

from flask import Flask, request, jsonify
import json
import subprocess
import sys
import os

app = Flask(__name__)

# Path to your predict.py
PREDICT_SCRIPT = os.path.join(os.path.dirname(__file__), 'predict.py')

def call_predict_py(command: str, features: dict, symptoms: dict = None):
    """
    Call predict.py script with given command and data
    """
    try:
        # Prepare input data
        input_data = {
            "features": features,
            "symptoms": symptoms or {}
        }
        
        # Call predict.py
        result = subprocess.run(
            [sys.executable, PREDICT_SCRIPT, command, json.dumps(input_data)],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode != 0:
            print(f"Error running predict.py: {result.stderr}")
            return None
        
        # Parse output
        try:
            output = json.loads(result.stdout)
            return output
        except json.JSONDecodeError:
            print(f"Invalid JSON output: {result.stdout}")
            return None
            
    except subprocess.TimeoutExpired:
        print("predict.py timed out")
        return None
    except Exception as e:
        print(f"Error calling predict.py: {e}")
        return None


@app.route('/predict', methods=['POST'])
def predict():
    """
    POST /predict
    Body: {
      "features": { ...19 feature values... },
      "symptoms": { ...symptom values... }
    }
    Returns: ML predictions for cycle length, ovulation, and risk
    """
    try:
        data = request.json
        
        if not data or 'features' not in data:
            return jsonify({'error': 'Missing features'}), 400
        
        features = data.get('features', {})
        symptoms = data.get('symptoms', {})
        
        # Get predictions from predict.py
        cycle_result = call_predict_py('cycle', features, symptoms)
        ovulation_result = call_predict_py('ovulation', features, symptoms)
        risk_result = call_predict_py('risk', features, symptoms)
        
        if not cycle_result or not ovulation_result or not risk_result:
            return jsonify({'error': 'Failed to get predictions'}), 500
        
        # Combine results into single response
        response = {
            'cycleLength': cycle_result,
            'ovulationDay': ovulation_result,
            'medicalRisk': risk_result
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        print(f"Error in /predict: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    """
    GET /health
    Check if ML service is running
    """
    try:
        # Test predict.py
        test_features = {
            'MeanCycleLength': 28,
            'LengthofLutealPhase': 14,
            'LengthofMenses': 5,
            'MeanBleedingIntensity': 2.5,
            'TotalNumberofHighDays': 5,
            'TotalNumberofPeakDays': 2,
            'TotalDaysofFertility': 6,
            'Age': 30,
            'BMI': 22,
            'Numberpreg': 1,
            'Livingkids': 1,
            'Miscarriages': 0,
            'Abortions': 0,
            'Reprocate': 1,
            'Breastfeeding': 0,
            'NumberofDaysofIntercourse': 3,
            'IntercourseInFertileWindow': 2,
            'TotalMensesScore': 15,
            'UnusualBleeding': 0,
            'PhasesBleeding': 0
        }
        
        result = call_predict_py('cycle', test_features, {})
        
        if result:
            return jsonify({
                'status': 'healthy',
                'message': 'ML models loaded and running',
                'test_result': result
            }), 200
        else:
            return jsonify({
                'status': 'error',
                'message': 'Failed to call predict.py'
            }), 500
            
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@app.route('/', methods=['GET'])
def index():
    """Root endpoint"""
    return jsonify({
        'service': 'FemSync ML Prediction Service',
        'version': '1.0',
        'endpoints': {
            'POST /predict': 'Get ML predictions',
            'GET /health': 'Health check'
        }
    }), 200


if __name__ == '__main__':
    print("🚀 Starting ML Service on port 5001...")
    print("Make sure predict.py is in the same directory")
    print("Send POST requests to http://localhost:5001/predict")
    app.run(host='0.0.0.0', port=5001, debug=False)