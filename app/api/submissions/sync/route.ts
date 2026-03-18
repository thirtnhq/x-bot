import { NextResponse } from 'next/server';
import { fetchBoundlessSubmissions } from '@/lib/boundless';
import { fetchTweet, fetchThread } from '@/lib/twitter';
import { saveRawSubmissions } from '@/lib/firebase';
import { TweetData, SubmissionData } from '@/lib/types';


export const maxDuration = 300; // Allow up to 5 minutes for full sync

export async function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function sendUpdate(data: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        sendUpdate({ type: 'progress', message: 'Fetching submissions from Boundless...' });
        const boundlessItems = await fetchBoundlessSubmissions();
        sendUpdate({ type: 'progress', message: `Found ${boundlessItems.length} submissions. Fetching X data...` });

        const enrichedSubmissions = [];
        let count = 0;

        for (const item of boundlessItems) {
          count++;
          sendUpdate({ 
            type: 'progress', 
            message: `Processing ${count}/${boundlessItems.length}: ${item.submittedBy}...` 
          });

          let tweetData: TweetData | null = null;
          let threadTweets: TweetData[] = [];

          if (item.tweetUrl && item.tweetId && !item.isProfile) {
            try {
              if (item.category === 'thread') {
                // Use thread endpoint for submissions tagged as threads - populates "Best Threads" section
                sendUpdate({ type: 'progress', message: `Fetching thread for ${item.xHandle}...` });
                const threadData = await fetchThread(item.tweetId, item.xHandle);
                if (threadData.length > 0) {
                  tweetData = threadData[0]; // Main tweet is first
                  threadTweets = threadData.slice(1); // Rest are thread replies
                } else {
                  // Fallback to single tweet if thread fetch returns nothing
                  tweetData = await fetchTweet(item.tweetId);
                }
              } else {
                // Standard single tweet fetch for other categories (saves credits)
                sendUpdate({ type: 'progress', message: `Fetching metrics for ${item.xHandle}...` });
                tweetData = await fetchTweet(item.tweetId);
              }
            } catch (err: any) {
              console.warn(`Failed to fetch tweet for ${item.submittedBy}:`, err.message);
              // Attempt single tweet as final fallback
              try {
                tweetData = await fetchTweet(item.tweetId);
              } catch (fallbackErr: any) {
                console.warn(`Final fallback also failed for ${item.submittedBy}:`, fallbackErr.message);
              }
            }
          } else if (item.isProfile) {
            console.log(`Skipping SocialData for profile URL: ${item.submittedBy}`);
          }





          enrichedSubmissions.push({
            ...item,
            tweetData,
            threadTweets
          });
        }

        sendUpdate({ type: 'progress', message: 'Saving enriched data to Firebase...' });
        const success = await saveRawSubmissions(enrichedSubmissions);

        if (success) {
          sendUpdate({ type: 'complete', message: 'Synchronization successful!', count: enrichedSubmissions.length });
        } else {
          sendUpdate({ type: 'error', message: 'Failed to save to Firebase' });
        }

        controller.close();
      } catch (error: any) {
        console.error('Sync failed:', error);
        sendUpdate({ type: 'error', message: error.message || 'Unknown sync error' });
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
