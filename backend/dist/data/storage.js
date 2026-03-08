"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storePrediction = storePrediction;
exports.getPredictions = getPredictions;
exports.clearPredictions = clearPredictions;
exports.getPredictionStats = getPredictionStats;
const predictions = [];
function storePrediction(prediction) {
    predictions.push(prediction);
    console.log(`✅ Prediction stored (Total: ${predictions.length})`);
}
function getPredictions() {
    return predictions;
}
function clearPredictions() {
    predictions.length = 0;
    console.log('🗑️ All predictions cleared');
}
function getPredictionStats() {
    return {
        totalPredictions: predictions.length,
        lastPrediction: predictions[predictions.length - 1] || null
    };
}
//# sourceMappingURL=storage.js.map