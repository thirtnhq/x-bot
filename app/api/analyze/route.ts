import { NextResponse } from 'next/server';
import { fetchBoundlessSubmissions } from '@/lib/boundless';
import { fetchTweet, fetchThread } from '@/lib/twitter';
import { scoreSubmission } from '@/lib/gemini';
import { calculateEngagementScore, calculateFinalScore } from '@/lib/scorer';
import { SubmissionData, TweetData, Category, AIScores } from '@/lib/types';

export const maxDuration = 300; // Allow Vercel functions to run for up to 5 mins
export const dynamic = 'force-dynamic';

export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendUpdate = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      let items: any[] = [];
      let fullRawPayload: any = null; // Store full unmodified payload
      try {
        const { getRawSubmissions, saveAnalysis } = await import('@/lib/firebase');
        
        sendUpdate({ type: 'progress', message: 'Loading submissions from Firebase cache...' });
        const cachedSubmissions = await getRawSubmissions();
        
        if (!cachedSubmissions || cachedSubmissions.length === 0) {
          sendUpdate({ 
            type: 'error', 
            message: 'No submissions found in cache. Please click "Sync Data" first to fetch from X.' 
          });
          controller.close();
          return;
        }

        const totalSubmissions = cachedSubmissions.length;
        sendUpdate({ type: 'progress', message: `Found ${totalSubmissions} cached submissions. Starting AI analysis...` });

        let successfullyAnalyzed = 0;
        const processedSubs: SubmissionData[] = [];

        for (let i = 0; i < cachedSubmissions.length; i++) {
          const sub = { ...cachedSubmissions[i] };
          sendUpdate({ 
            type: 'progress', 
            message: `Analyzing submission ${i + 1}/${totalSubmissions}: ${sub.xHandle}...` 
          });

          try {
            const mainTweet = sub.tweetData;
            const threadTweets = sub.threadTweets || [];

            if (!mainTweet) {
              processedSubs.push(sub);
              continue;
            }

            // 1. Categorize (if not already)
            let category: Category = sub.category || 'single_tweet';
            if (threadTweets.length > 0) {
              category = 'thread';
            } else if (mainTweet.hasMedia) {
              category = 'meme_visual';
            }
            sub.category = category;

            // 2. Calculate Engagement Score
            let totalMetrics = { ...mainTweet.metrics };
            if (category === 'thread' && threadTweets.length > 0) {
                for (const t of threadTweets) {
                    totalMetrics.retweets += (t.metrics?.retweets || 0);
                    totalMetrics.quotes += (t.metrics?.quotes || 0);
                    totalMetrics.bookmarks += (t.metrics?.bookmarks || 0);
                    totalMetrics.replies += (t.metrics?.replies || 0);
                    totalMetrics.likes += (t.metrics?.likes || 0);
                    totalMetrics.impressions += (t.metrics?.impressions || 0);
                }
            }
            
            sub.engagementScore = calculateEngagementScore(totalMetrics);

            // 3. AI Scoring with Replicate/Gemini
            sendUpdate({ 
              type: 'progress', 
              message: `Scoring submission ${i + 1}/${totalSubmissions} with AI...` 
            });
            const aiScores = await scoreSubmission(category, mainTweet, threadTweets);
            sub.aiScores = aiScores;

            // 4. Final Score Calculation
            sub.finalScore = calculateFinalScore(aiScores, sub.engagementScore);
            
            processedSubs.push(sub);
            successfullyAnalyzed++;

          } catch (err: any) {
            console.error(`Error processing submission ${sub.id}:`, err);
            processedSubs.push(sub);
          }
        }

        sendUpdate({ type: 'progress', message: 'Finalizing results...' });

        // Sort and filter results
        const validSubs = processedSubs.filter(s => s.finalScore !== undefined);
        validSubs.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));

        const threads = validSubs.filter(s => s.category === 'thread');
        const singleTweets = validSubs.filter(s => s.category === 'single_tweet');
        const memesVisuals = validSubs.filter(s => s.category === 'meme_visual');
        // All scored submissions ranked — no cap
        const allRanked = validSubs;

        const finalResult: any = {
          threads,
          singleTweets,
          memesVisuals,
          top8: allRanked,   // all scored, ranked
          top15: allRanked,
          allSubmissions: processedSubs,
          analyzedAt: new Date().toISOString(),
          totalSubmissions,
          successfullyAnalyzed
        };


        // Save to Firebase for persistence
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
      } catch (error: any) {
        console.error('Analysis failed:', error);
        sendUpdate({ type: 'error', message: error.message || 'Analysis failed. Please check the server logs.' });
        controller.close();
      }

    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

function isThreadCategory(cat: Category): cat is 'thread' {
    return cat === 'thread';
}
