export class MemoryEngine {
    private weights: number[];
    private learningRate: number = 0.01;

    constructor(weights?: number[]) {
        // Features: [bias, review_count, days_since_last_review]
        this.weights = weights || [0.5, -0.1, -0.05];
    }

    /**
     * Predicts recall probability (0.0 to 1.0)
     * @param reviewCount Number of times the question was reviewed
     * @param lastReviewedAt Timestamp of last review (ISO string)
     */
    predict(reviewCount: number, lastReviewedAt: string | null): number {
        const daysSince = lastReviewedAt
            ? (Date.now() - new Date(lastReviewedAt).getTime()) / (1000 * 60 * 60 * 24)
            : 100.0; // Treat new questions as "old" to prioritize them

        // Feature vector: [1, reviewCount, daysSince]
        const x = [1, reviewCount, Math.min(daysSince, 365)];
        const score = this.weights.reduce((sum, w, i) => sum + w * x[i], 0);

        // Sigmoid-like clipping (0 to 1)
        return Math.max(0, Math.min(1, score));
    }

    /**
     * Updates the model weights based on user performance
     * @param reviewCount Current review count
     * @param lastReviewedAt Current last reviewed timestamp
     * @param label 1.0 for Correct, 0.0 for Incorrect
     */
    train(reviewCount: number, lastReviewedAt: string | null, label: number): number[] {
        const daysSince = lastReviewedAt
            ? (Date.now() - new Date(lastReviewedAt).getTime()) / (1000 * 60 * 60 * 24)
            : 100.0;

        const x = [1, reviewCount, Math.min(daysSince, 365)];
        const prediction = this.predict(reviewCount, lastReviewedAt);
        const error = label - prediction;

        // Update weights: w = w + lr * error * x
        this.weights = this.weights.map((w, i) => w + this.learningRate * error * x[i]);

        return this.weights;
    }

    getWeights(): number[] {
        return this.weights;
    }
}
