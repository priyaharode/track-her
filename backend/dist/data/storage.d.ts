interface StoredPrediction {
    timestamp: string;
    input: any;
    prediction: any;
}
export declare function storePrediction(prediction: StoredPrediction): void;
export declare function getPredictions(): StoredPrediction[];
export declare function clearPredictions(): void;
export declare function getPredictionStats(): {
    totalPredictions: number;
    lastPrediction: StoredPrediction;
};
export {};
