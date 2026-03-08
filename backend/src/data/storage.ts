interface StoredPrediction {
  timestamp: string;
  input: any;
  prediction: any;
}

const predictions: StoredPrediction[] = [];

export function storePrediction(prediction: StoredPrediction): void {
  predictions.push(prediction);
  console.log(`✅ Prediction stored (Total: ${predictions.length})`);
}

export function getPredictions(): StoredPrediction[] {
  return predictions;
}

export function clearPredictions(): void {
  predictions.length = 0;
  console.log('🗑️ All predictions cleared');
}

export function getPredictionStats() {
  return {
    totalPredictions: predictions.length,
    lastPrediction: predictions[predictions.length - 1] || null
  };
}