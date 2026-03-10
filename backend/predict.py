#!/usr/bin/env python3
"""
FemSync ML Prediction Engine
Predicts cycle length, ovulation day, and generates medical risk alerts
"""

import json
import sys
import pickle
import os
import numpy as np
from pathlib import Path

# Configuration
MODEL_DIR = Path(__file__).parent / 'models'

class FemSyncPredictor:
    def __init__(self, model_dir=MODEL_DIR):
        """Initialize predictor with trained models"""
        self.model_dir = model_dir
        
        # Load models
        with open(model_dir / 'cycle_model.pkl', 'rb') as f:
            self.cycle_model = pickle.load(f)
        
        with open(model_dir / 'ovulation_model.pkl', 'rb') as f:
            self.ovulation_model = pickle.load(f)
        
        with open(model_dir / 'scaler.pkl', 'rb') as f:
            self.scaler = pickle.load(f)
        
        with open(model_dir / 'feature_columns.pkl', 'rb') as f:
            self.feature_columns = pickle.load(f)
        
        with open(model_dir / 'risk_thresholds.pkl', 'rb') as f:
            self.risk_thresholds = pickle.load(f)
        
        with open(model_dir / 'config.json', 'r') as f:
            self.config = json.load(f)
    
    def predict_cycle_length(self, features_dict):
        """
        Predict next cycle length
        
        Args:
            features_dict (dict): Feature values matching feature_columns
        
        Returns:
            dict: Prediction with confidence interval
        """
        try:
            # Convert to feature vector
            feature_vector = self._dict_to_vector(features_dict)
            
            # Scale features
            scaled_features = self.scaler.transform([feature_vector])
            
            # Predict
            prediction = self.cycle_model.predict(scaled_features)[0]
            
            # Confidence interval (±2 std errors)
            confidence_interval = 3.5  # Approximate from training RMSE
            
            return {
                'predicted_cycle_length': float(prediction),
                'confidence_interval': float(confidence_interval),
                'lower_bound': float(prediction - confidence_interval),
                'upper_bound': float(prediction + confidence_interval),
                'model': self.config['best_cycle_model'],
                'r2_score': self.config['cycle_metrics']['R2']
            }
        except Exception as e:
            return {'error': str(e)}
    
    def predict_ovulation_day(self, features_dict):
        """
        Predict ovulation day in cycle
        
        Args:
            features_dict (dict): Feature values matching feature_columns
        
        Returns:
            dict: Prediction with confidence interval
        """
        try:
            # Convert to feature vector
            feature_vector = self._dict_to_vector(features_dict)
            
            # Scale features
            scaled_features = self.scaler.transform([feature_vector])
            
            # Predict
            prediction = self.ovulation_model.predict(scaled_features)[0]
            
            # Confidence interval
            confidence_interval = 2.1  # Approximate from training RMSE
            
            return {
                'predicted_ovulation_day': float(prediction),
                'confidence_interval': float(confidence_interval),
                'lower_bound': float(prediction - confidence_interval),
                'upper_bound': float(prediction + confidence_interval),
                'model': self.config['best_ovulation_model'],
                'r2_score': self.config['ovulation_metrics']['R2']
            }
        except Exception as e:
            return {'error': str(e)}
    
    def assess_medical_risk(self, symptoms_dict):
        """
        Assess medical risk based on symptoms
        
        Args:
            symptoms_dict (dict): Keys must include:
                - unusual_bleeding (0 or 1)
                - mean_bleeding_intensity (float)
                - length_of_menses (int)
                - total_menses_score (int)
                - phases_bleeding (0 or 1)
        
        Returns:
            dict: Risk assessment with level and recommendations
        """
        try:
            thresholds = self.risk_thresholds
            risk_count = 0
            triggered_risks = []
            
            # Check unusual bleeding (high priority)
            if symptoms_dict.get('unusual_bleeding', 0) >= thresholds['UnusualBleeding']:
                risk_count += 1
                triggered_risks.append('Unusual Bleeding Pattern Detected')
            
            # Check bleeding intensity
            if symptoms_dict.get('mean_bleeding_intensity', 0) > thresholds['MeanBleedingIntensity']:
                risk_count += 1
                triggered_risks.append(f"Heavy Bleeding (>{thresholds['MeanBleedingIntensity']:.1f})")
            
            # Check menses length
            if symptoms_dict.get('length_of_menses', 0) > thresholds['LengthofMenses']:
                risk_count += 1
                triggered_risks.append(f"Prolonged Period (>{thresholds['LengthofMenses']:.0f} days)")
            
            # Check total menses score
            if symptoms_dict.get('total_menses_score', 0) > thresholds['TotalMensesScore']:
                risk_count += 1
                triggered_risks.append(f"Severe Symptoms (score>{thresholds['TotalMensesScore']:.0f})")
            
            # Check phases bleeding
            if symptoms_dict.get('phases_bleeding', 0) >= thresholds['PhasesBleeding']:
                risk_count += 1
                triggered_risks.append('Abnormal Bleeding Phases')
            
            # Determine risk level
            if symptoms_dict.get('unusual_bleeding', 0) >= 1:
                risk_level = 'RED'
            elif risk_count >= 4:
                risk_level = 'RED'
            elif risk_count >= 2:
                risk_level = 'ORANGE'
            elif risk_count >= 1:
                risk_level = 'YELLOW'
            else:
                risk_level = 'GREEN'
            
            # Generate recommendations
            recommendations = self._get_recommendations(risk_level, triggered_risks)
            
            return {
                'risk_level': risk_level,
                'risk_score': risk_count,
                'triggered_indicators': triggered_risks,
                'recommendations': recommendations,
                'should_alert_user': risk_level in ['RED', 'ORANGE']
            }
        except Exception as e:
            return {'error': str(e)}
    
    def _dict_to_vector(self, features_dict):
        """Convert feature dictionary to numpy vector"""
        vector = []
        for col in self.feature_columns:
            value = features_dict.get(col, 0)
            # Handle missing values with 0
            vector.append(float(value) if value is not None else 0.0)
        return np.array(vector)
    
    def _get_recommendations(self, risk_level, triggered_risks):
        """Generate health recommendations based on risk"""
        recommendations = {
            'GREEN': [
                '✅ Your cycle appears normal',
                '📅 Continue tracking daily symptoms',
                '💪 Maintain healthy lifestyle habits'
            ],
            'YELLOW': [
                '⚠️ Minor symptom variations detected',
                '📝 Note: Track these symptoms carefully',
                '⏰ Monitor over next cycle for patterns',
                '👨‍⚕️ No action needed unless symptoms persist'
            ],
            'ORANGE': [
                '⚠️ Multiple concerning symptoms detected',
                '📋 Recommended: Track detailed daily logs',
                '👨‍⚕️ Consider consulting healthcare provider',
                '🏥 Schedule check-up if symptoms continue'
            ],
            'RED': [
                '🚨 MEDICAL ALERT: Significant symptoms detected',
                '👨‍⚕️ RECOMMENDED: Consult healthcare provider soon',
                '📞 Call doctor if experiencing: severe pain, excessive bleeding',
                '🏥 Seek emergency care if: lightheadedness, heavy bleeding with clots'
            ]
        }
        return recommendations.get(risk_level, [])


def main():
    """CLI interface for testing"""
    if len(sys.argv) < 2:
        print("Usage: python predict.py <command> <json_input>")
        print("Commands: cycle, ovulation, risk")
        sys.exit(1)
    
    command = sys.argv[1]
    json_input = sys.argv[2] if len(sys.argv) > 2 else '{}'
    
    try:
        predictor = FemSyncPredictor()
        features = json.loads(json_input)
        
        if command == 'cycle':
            result = predictor.predict_cycle_length(features)
        elif command == 'ovulation':
            result = predictor.predict_ovulation_day(features)
        elif command == 'risk':
            result = predictor.assess_medical_risk(features)
        else:
            result = {'error': f'Unknown command: {command}'}
        
        print(json.dumps(result))
    except json.JSONDecodeError:
        print(json.dumps({'error': 'Invalid JSON input'}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)


if __name__ == '__main__':
    main()