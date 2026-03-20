export type Category = 'thread' | 'single_tweet' | 'meme_visual';

export interface AIScores {
  clarity: number;     // 35%
  creativity: number;  // 35%
  engagement: number;  // 30% (AI predicted)
  overall: number;     // 0-100 total
  reasoning: string;
}

export interface TweetMetrics {
  retweets: number;
  quotes: number;
  bookmarks: number;
  replies: number;
  likes: number;
  impressions: number;
}

export interface TweetData {
  id: string;
  text: string;
  authorId: string;
  authorHandle: string;
  createdAt: string;
  metrics: TweetMetrics;
  hasMedia: boolean;
  mediaUrls: string[];
  conversationId: string;
  isThread: boolean;
}

/** Full score breakdown recorded for each winner */
export interface ScoreSnapshot {
  creativity: number;       // AI: 0–10 (35% weight)
  clarity: number;          // AI: 0–10 (35% weight)
  engagementPotential: number; // AI: 0–10 (30% weight)
  aiOverall: number;        // Weighted AI total: 0–100
  realEngagement: number;   // Twitter metric score: 0–100
  finalScore: number;       // 65% aiOverall + 35% realEngagement: 0–100
}

export interface SubmissionData {
  id: string;
  submittedBy: string;
  xHandle: string;
  tweetUrl: string;
  tweetId?: string;
  isProfile?: boolean;

  tweetData?: TweetData;
  threadTweets?: TweetData[];
  category?: Category;
  aiScores?: AIScores;
  engagementScore?: number;
  finalScore?: number;

  /** Assigned after final ranking */
  rank?: number;
  /** Prize label e.g. "50 USDC" */
  prize?: string;
  /** Full score breakdown snapshot recorded for all prize winners */
  scoreSnapshot?: ScoreSnapshot;
}


export interface AnalysisResult {
  id?: string;
  threads: SubmissionData[];
  singleTweets: SubmissionData[];
  memesVisuals: SubmissionData[];
  /** Top 15 prize winners with rank, prize, and scoreSnapshot assigned */
  prizeWinners: SubmissionData[];
  /** All scored submissions, sorted by finalScore descending */
  allRanked: SubmissionData[];
  allSubmissions: SubmissionData[];
  analyzedAt: string;
  totalSubmissions: number;
  successfullyAnalyzed: number;
  rawSubmissions?: SubmissionData[];
  fullRawPayload?: Record<string, unknown>;
}


