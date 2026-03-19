import { NextResponse } from 'next/server';
import { scoreSubmission } from '@/lib/gemini';
import { calculateEngagementScore, calculateFinalScore } from '@/lib/scorer';
import { SubmissionData, Category, ScoreSnapshot } from '@/lib/types';

export const maxDuration = 300; // Allow Vercel functions to run for up to 5 mins
export const dynamic = 'force-dynamic';

/** Prize pool in order 1st → 8th (USDC) */
const PRIZE_POOL: string[] = [
  '50 USDC',
  '35 USDC',
  '25 USDC',
  '20 USDC',
  '19 USDC',
  '18 USDC',
  '17 USDC',
  '16 USDC',
];

export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = (data: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const { getRawSubmissions, saveAnalysis } = await import('@/lib/firebase');

        sendUpdate({ type: 'progress', message: 'Loading submissions from Firebase cache...' });
        const cachedSubmissions = await getRawSubmissions();

        if (!cachedSubmissions || cachedSubmissions.length === 0) {
          sendUpdate({
            type: 'error',
            message: 'No submissions found in cache. Please click "Sync Data" first to fetch from X.',
          });
          controller.close();
          return;
        }

        const totalSubmissions = cachedSubmissions.length;
        sendUpdate({ type: 'progress', message: `Found ${totalSubmissions} cached submissions. Starting AI analysis...` });

        let successfullyAnalyzed = 0;
        const processedSubs: SubmissionData[] = [];

        for (let i = 0; i < cachedSubmissions.length; i++) {
          const sub: SubmissionData = { ...cachedSubmissions[i] };
          sendUpdate({
            type: 'progress',
            message: `Analyzing submission ${i + 1}/${totalSubmissions}: ${sub.xHandle}...`,
          });

          try {
            const mainTweet = sub.tweetData;
            const threadTweets = sub.threadTweets || [];

            if (!mainTweet) {
              processedSubs.push(sub);
              continue;
            }

            // 1. Categorize — follows hackathon rules:
            //    thread      = 2+ connected tweets (main + at least 1 thread reply)
            //    meme_visual = single tweet that contains image or video (no thread)
            //    single_tweet = default (text-only or profile-only)
            let category: Category;
            const hasThread = threadTweets.length >= 1; // 1+ replies = 2 total tweets
            if (hasThread) {
              category = 'thread';
            } else if (mainTweet.hasMedia && mainTweet.mediaUrls.length > 0) {
              category = 'meme_visual';
            } else {
              category = sub.category || 'single_tweet';
            }
            sub.category = category;

            // 2. Aggregate engagement metrics (sum across thread tweets too)
            const totalMetrics = { ...mainTweet.metrics };
            if (category === 'thread' && threadTweets.length > 0) {
              for (const t of threadTweets) {
                totalMetrics.retweets    += (t.metrics?.retweets    || 0);
                totalMetrics.quotes      += (t.metrics?.quotes      || 0);
                totalMetrics.bookmarks   += (t.metrics?.bookmarks   || 0);
                totalMetrics.replies     += (t.metrics?.replies     || 0);
                totalMetrics.likes       += (t.metrics?.likes       || 0);
                totalMetrics.impressions += (t.metrics?.impressions || 0);
              }
            }
            sub.engagementScore = calculateEngagementScore(totalMetrics);

            // 3. AI Scoring
            sendUpdate({
              type: 'progress',
              message: `Scoring submission ${i + 1}/${totalSubmissions} with AI...`,
            });
            const aiScores = await scoreSubmission(category, mainTweet, threadTweets);
            sub.aiScores = aiScores;

            // 4. Final Score (65% AI overall + 35% real engagement)
            sub.finalScore = calculateFinalScore(aiScores, sub.engagementScore);

            processedSubs.push(sub);
            successfullyAnalyzed++;
          } catch (err: unknown) {
            console.error(`Error processing submission ${sub.id}:`, err);
            processedSubs.push(sub);
          }
        }

        sendUpdate({ type: 'progress', message: 'Finalizing results and assigning prizes...' });

        // ── Ranking & prize assignment ──────────────────────────────────────────
        const validSubs = processedSubs.filter(s => s.finalScore !== undefined);
        validSubs.sort((a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0));

        // Assign stable rank, prize, and full score snapshot to every scored submission
        validSubs.forEach((sub, idx) => {
          sub.rank = idx + 1;
          if (idx < PRIZE_POOL.length) {
            sub.prize = PRIZE_POOL[idx];
          }
          // Record the complete score breakdown for this submission
          if (sub.aiScores && sub.engagementScore !== undefined && sub.finalScore !== undefined) {
            const snapshot: ScoreSnapshot = {
              creativity:          sub.aiScores.creativity,
              clarity:             sub.aiScores.clarity,
              engagementPotential: sub.aiScores.engagement,
              aiOverall:           sub.aiScores.overall,
              realEngagement:      sub.engagementScore,
              finalScore:          sub.finalScore,
            };
            sub.scoreSnapshot = snapshot;
          }
        });

        // Top-8 prize winners (might be fewer if not enough valid subs)
        const prizeWinners = validSubs.slice(0, PRIZE_POOL.length);

        // Category splits (all scored, not capped)
        const threads      = validSubs.filter(s => s.category === 'thread');
        const singleTweets = validSubs.filter(s => s.category === 'single_tweet');
        const memesVisuals = validSubs.filter(s => s.category === 'meme_visual');

        const finalResult: {
          threads: SubmissionData[];
          singleTweets: SubmissionData[];
          memesVisuals: SubmissionData[];
          prizeWinners: SubmissionData[];
          allRanked: SubmissionData[];
          allSubmissions: SubmissionData[];
          analyzedAt: string;
          totalSubmissions: number;
          successfullyAnalyzed: number;
          id?: string;
        } = {
          threads,
          singleTweets,
          memesVisuals,
          prizeWinners,           // top 8 with rank + prize + scoreSnapshot
          allRanked: validSubs,   // all scored, sorted descending
          allSubmissions: processedSubs,
          analyzedAt: new Date().toISOString(),
          totalSubmissions,
          successfullyAnalyzed,
        };

        // Persist to Firebase
        if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
          try {
            const analysisId = await saveAnalysis(finalResult);
            finalResult.id = analysisId;
          } catch (firebaseErr) {
            console.error('Firebase save failed:', firebaseErr);
          }
        }

        sendUpdate({ type: 'complete', data: finalResult });
        controller.close();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Analysis failed. Please check the server logs.';
        console.error('Analysis failed:', error);
        sendUpdate({ type: 'error', message });
        controller.close();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

