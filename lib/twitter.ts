import { TweetData, TweetMetrics } from './types';

const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN;
const SOCIALDATA_API_KEY = process.env.SOCIALDATA_API_KEY;

export async function fetchTweet(tweetId: string): Promise<TweetData | null> {
  if (SOCIALDATA_API_KEY) {
    return fetchTweetSocialData(tweetId);
  }

  if (!X_BEARER_TOKEN) throw new Error("Missing X_BEARER_TOKEN or SOCIALDATA_API_KEY");
  
  const headers = { Authorization: `Bearer ${X_BEARER_TOKEN}` };
  const url = `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics,conversation_id,author_id,attachments,created_at&expansions=attachments.media_keys&media.fields=type,url,preview_image_url`;
  
  const res = await fetch(url, { headers });
  if (!res.ok) {
    console.warn(`Failed to fetch tweet ${tweetId}: ${res.statusText}`);
    return null;
  }
  
  const data = await res.json();
  if (!data.data) return null;
  
  return parseTweetData(data.data, data.includes);
}

async function fetchTweetSocialData(tweetId: string): Promise<TweetData | null> {
  let url = `https://api.socialdata.tools/twitter/tweets/${tweetId}`;
  const headers = { 
    'Authorization': `Bearer ${SOCIALDATA_API_KEY}`,
    'Accept': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  let res = await fetch(url, { headers });

  // FALLBACK: If initial call fails for ANY reason, try the thread endpoint which user confirmed works in Postman
  if (!res.ok) {
    console.warn(`[SOCIALDATA_FALLBACK] /tweets/${tweetId} failed with ${res.status} ${res.statusText}. Trying /thread/ fallback...`);
    url = `https://api.socialdata.tools/twitter/thread/${tweetId}`;
    res = await fetch(url, { headers });
  }

  if (!res.ok) {
    const errorMsg = `SocialData: Both /tweets/ and /thread/ failed for ${tweetId} (Final Status: ${res.status})`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  const data = await res.json();
  
  // Handing thread response format
  if (data.tweets && Array.isArray(data.tweets)) {
    const targetTweet = data.tweets.find((t: any) => t.id_str === tweetId || String(t.id) === tweetId);
    return targetTweet ? parseSocialDataTweet(targetTweet) : parseSocialDataTweet(data.tweets[0]);
  }
  
  return parseSocialDataTweet(data);
}



export async function fetchThread(conversationId: string, authorId: string): Promise<TweetData[]> {
  if (SOCIALDATA_API_KEY) {
    return fetchThreadSocialData(conversationId);
  }

  if (!X_BEARER_TOKEN) throw new Error("Missing X_BEARER_TOKEN or SOCIALDATA_API_KEY");
  
  const headers = { Authorization: `Bearer ${X_BEARER_TOKEN}` };
  const query = encodeURIComponent(`conversation_id:${conversationId} from:${authorId}`);
  const url = `https://api.twitter.com/2/tweets/search/recent?query=${query}&tweet.fields=public_metrics,conversation_id,author_id,attachments,created_at&expansions=attachments.media_keys&media.fields=type,url,preview_image_url&max_results=100`;
  
  const res = await fetch(url, { headers });
  if (!res.ok) {
    console.warn(`Failed to fetch thread for conv ${conversationId}: ${res.statusText}`);
    return [];
  }
  
  const data = await res.json();
  if (!data.data) return [];
  
  return data.data.map((tweet: any) => parseTweetData(tweet, data.includes)).sort((a: TweetData, b: TweetData) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

async function fetchThreadSocialData(conversationId: string): Promise<TweetData[]> {
  const url = `https://api.socialdata.tools/twitter/thread/${conversationId}`;
  
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${SOCIALDATA_API_KEY}` }
  });

  if (!res.ok) {
    const errorMsg = `SocialData: Failed to fetch thread for conv ${conversationId}: ${res.status} ${res.statusText}`;
    console.warn(errorMsg);
    throw new Error(errorMsg);
  }


  const data = await res.json();
  const tweets = data.tweets || [];
  
  return tweets.map((t: any) => parseSocialDataTweet(t)).sort((a: TweetData, b: TweetData) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}


function parseTweetData(tweet: any, includes: any): TweetData {
  const metrics = tweet.public_metrics || {};
  const parsedMetrics: TweetMetrics = {
    retweets: metrics.retweet_count || 0,
    quotes: metrics.quote_count || 0,
    bookmarks: metrics.bookmark_count || 0,
    replies: metrics.reply_count || 0,
    likes: metrics.like_count || 0,
    impressions: metrics.impression_count || 0,
  };

  const mediaUrls: string[] = [];
  let hasMedia = false;
  
  if (tweet.attachments?.media_keys && includes?.media) {
    hasMedia = true;
    for (const key of tweet.attachments.media_keys) {
      const media = includes.media.find((m: any) => m.media_key === key);
      if (media) {
        if (media.type === 'photo') {
          mediaUrls.push(media.url);
        } else if (media.preview_image_url) {
          mediaUrls.push(media.preview_image_url);
        }
      }
    }
  }

  return {
    id: tweet.id,
    text: tweet.text,
    authorId: tweet.author_id,
    authorHandle: 'Unknown',
    createdAt: tweet.created_at,
    metrics: parsedMetrics,
    hasMedia,
    mediaUrls,
    conversationId: tweet.conversation_id,
    isThread: false, 
  };
}

function parseSocialDataTweet(tweet: any): TweetData {
  const mediaUrls: string[] = [];
  const entities = tweet.extended_entities || tweet.entities || {};
  
  if (entities.media) {
    for (const m of entities.media) {
      mediaUrls.push(m.media_url_https || m.media_url);
    }
  }

  return {
    id: tweet.id_str,
    text: tweet.full_text || tweet.text,
    authorId: tweet.user?.id_str,
    authorHandle: tweet.user?.screen_name || 'Unknown',
    createdAt: tweet.created_at,
    metrics: {
      retweets: tweet.retweet_count || 0,
      quotes: tweet.quote_count || 0,
      bookmarks: tweet.bookmark_count || 0,
      replies: tweet.reply_count || 0,
      likes: tweet.favorite_count || 0,
      impressions: tweet.views_count || 0,
    },
    hasMedia: mediaUrls.length > 0,
    mediaUrls,
    conversationId: tweet.conversation_id_str,
    isThread: false,
  };
}

