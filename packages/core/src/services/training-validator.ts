export interface TrainingMetrics {
  dataQuality: number;
  diversityScore: number;
  balanceScore: number;
  confidenceScore: number;
}

export class TrainingValidator {
  validateTrainingData(examples: any[]): TrainingMetrics {
    return {
      dataQuality: this.calculateDataQuality(examples),
      diversityScore: this.calculateDiversity(examples),
      balanceScore: this.calculateBalance(examples),
      confidenceScore: this.calculateConfidence(examples)
    };
  }

  private calculateDataQuality(examples: any[]): number {
    // Quality based on length, completeness, grammar
    let qualitySum = 0;
    examples.forEach(ex => {
      let score = 0;
      if (ex.input && ex.output) score += 0.4;
      if (ex.input.length > 10 && ex.input.length < 500) score += 0.3;
      if (ex.output.length > 10 && ex.output.length < 1000) score += 0.3;
      qualitySum += score;
    });
    return qualitySum / examples.length;
  }

  private calculateDiversity(examples: any[]): number {
    const inputLengths = examples.map(ex => ex.input.length);
    const avgLength = inputLengths.reduce((a, b) => a + b, 0) / inputLengths.length;
    const variance = inputLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / inputLengths.length;
    return Math.min(1, variance / 10000); // Normalize variance
  }

  private calculateBalance(examples: any[]): number {
    // Check if examples are balanced across different types
    return examples.length > 50 ? 1 : examples.length / 50;
  }

  private calculateConfidence(examples: any[]): number {
    // Overall confidence in training effectiveness
    const quality = this.calculateDataQuality(examples);
    const diversity = this.calculateDiversity(examples);
    const balance = this.calculateBalance(examples);
    return (quality + diversity + balance) / 3;
  }
}