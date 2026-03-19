import { TweetMetrics, AIScores } from './types';

/**
 * Scoring weights — adjust here to change the balance globally.
 *
 * AI criteria weights (must sum to 1.0):
 *   Creativity        35%
 *   Clarity & Message 35%
 *   Engagement Signal 30%
 *
 * Final score composition (must sum to 1.0):
 *   AI Overall        65%  (all three AI criteria already weighted inside)
 *   Real Engagement   35%  (actual Twitter metrics from the tweet/thread)
 *
 * Using 65/35 instead of 70/30 avoids double-counting engagement: the AI already
 * scores "Engagement Potential" (30% of the AI total), so real engagement gets
 * a slightly higher weight to balance discovery vs. quality.
 */
export const AI_WEIGHT = 0.65;
export const ENGAGEMENT_WEIGHT = 0.35;

/**
 * Converts raw Twitter engagement metrics into a normalised 0–100 score.
 * Weighted by action depth: retweets > quotes > replies > bookmarks > likes > impressions.
 */
export function calculateEngagementScore(metrics: TweetMetrics): number {
  const raw =
    (metrics.retweets    * 6)    +
    (metrics.quotes      * 5)    +
    (metrics.replies     * 3)    +
    (metrics.bookmarks   * 2)    +
    (metrics.likes       * 1)    +
    (metrics.impressions * 0.01);

  const score = Math.round((raw / 500) * 100);
  return Math.min(100, Math.max(0, score));
}

/**
 * Combines the AI quality score with real Twitter engagement into a single
 * 0–100 final score used for ranking.
 *
 * aiScores.overall  = weighted AI total (creativity 35% + clarity 35% + engagement 30%)
 * engagementScore   = normalised real-world engagement (0–100)
 */
export function calculateFinalScore(aiScores: AIScores, engagementScore: number): number {
  return Math.round(
    (aiScores.overall  * AI_WEIGHT) +
    (engagementScore   * ENGAGEMENT_WEIGHT)
  );
}
