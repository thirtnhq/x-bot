import { TweetMetrics, AIScores } from './types';

export function calculateEngagementScore(metrics: TweetMetrics): number {
  // Real engagement from Twitter metrics
  const raw = (metrics.retweets * 6) + 
              (metrics.quotes * 5) + 
              (metrics.bookmarks * 2) + 
              (metrics.replies * 3) + 
              (metrics.likes * 1) + 
              (metrics.impressions * 0.01);
              
  const score = Math.round((raw / 500) * 100);
  return Math.min(100, score);
}

export function calculateFinalScore(aiScores: AIScores, engagementScore: number): number {
  // Combine AI evaluation (70%) with real-world engagement (30%)
  // aiScores.overall is already 0-100 based on the weights
  return Math.round((aiScores.overall * 0.7) + (engagementScore * 0.3));
}

