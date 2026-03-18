import { SubmissionData } from './types';

export async function fetchBoundlessSubmissions(): Promise<SubmissionData[]> {
  try {
    const submissions: SubmissionData[] = [];
    const uniqueUrls = new Set<string>();
    let page = 1;
    let hasNext = true;

    while (hasNext) {
      const url = `${process.env.NEXT_PUBLIC_BOUNDLESS_API}/api/hackathons/boundless-on-x-test/submissions/explore?page=${page}&limit=50`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) break;
      
      const responseData = await res.json();
      const items = responseData.data?.submissions || [];
      const pagination = responseData.data?.pagination;

      for (const item of items) {
        let tweetUrl = (item as any).twitterUrl || '';

        // Helper function to extract URL from a block of text
        const extractTweetUrl = (text: string) => {
          if (!text) return null;
          // Look for status first
          const statusRegex = /(https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[a-zA-Z0-9_\/]+\/status\/[0-9]+)/i;
          const statusMatch = text.match(statusRegex);
          if (statusMatch) return statusMatch[1];
          
          // Fallback to profile
          const profileRegex = /(https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[a-zA-Z0-9_]+)/i;
          const profileMatch = text.match(profileRegex);
          return profileMatch ? profileMatch[1] : null;
        };
        
        // 1. Check videoUrl
        if (!tweetUrl && item.videoUrl) {
          tweetUrl = extractTweetUrl(item.videoUrl) || '';
        }

        // 2. Check links array
        if (!tweetUrl && item.links && Array.isArray(item.links)) {
          const linkObj = item.links.find((l: any) => {
            const url = typeof l === 'string' ? l : (l?.url || '');
            return url && (url.includes('twitter.com') || url.includes('x.com'));
          });
          if (linkObj) tweetUrl = typeof linkObj === 'string' ? linkObj : linkObj.url;
        }
        
        // 3. Check description
        if (!tweetUrl && item.description) {
          tweetUrl = extractTweetUrl(item.description) || '';
        }

        // 4. Check introduction
        if (!tweetUrl && item.introduction) {
          tweetUrl = extractTweetUrl(item.introduction) || '';
        }

        // 5. Check additional fallback fields
        const extraFields = [
          (item as any).projectName,
          (item as any).name,
          (item as any).title,
          (item as any).project_name,
          (item as any).participant?.name
        ];
        
        if (!tweetUrl) {
          for (const field of extraFields) {
            if (field) {
              tweetUrl = extractTweetUrl(String(field)) || '';
              if (tweetUrl) break;
            }
          }
        }


        if (tweetUrl) {
          const submissionId = item.id || `sub-${Math.random().toString(36).substring(2, 9)}`;
          
          if (!uniqueUrls.has(submissionId)) {
            uniqueUrls.add(submissionId);

            // Extract tweetId and handle from URL
            let xHandle = item.participant?.username || 'Unknown';
            let tweetId = undefined;
            let isProfile = false;
            let category: any = item.category || 'single_tweet';
            
            // Normalize category for internal use
            const catLower = String(category).toLowerCase();
            if (catLower.includes('thread')) category = 'thread';
            else if (catLower.includes('meme') || catLower.includes('visual')) category = 'meme_visual';
            else category = 'single_tweet';

            
            try {
              const urlObj = new URL(tweetUrl);
              const parts = urlObj.pathname.split('/').filter(Boolean);
              const statusIdx = parts.indexOf('status');
              
              if (statusIdx > 0) {
                // If the part before 'status' is not a real username (like 'i'), use participant username
                const extractedHandle = parts[statusIdx - 1];
                if (extractedHandle !== 'i' && extractedHandle !== 'status') {
                  xHandle = extractedHandle;
                }
                
                const possibleId = parts[statusIdx + 1];
                const idMatch = possibleId ? possibleId.match(/^(\d+)/) : null;
                if (idMatch) {
                  tweetId = idMatch[1];
                } else {
                  isProfile = true;
                }
              } else {
                isProfile = true;
                if (parts.length > 0 && (xHandle === 'Unknown' || xHandle === 'i')) {
                  xHandle = parts[0];
                }
              }
            } catch (e) {
              isProfile = true;
            }

            submissions.push({
              id: submissionId,
              submittedBy: item.projectName || item.participant?.name || item.name || item.submittedBy || 'Unknown',
              xHandle,
              tweetUrl,
              tweetId,
              isProfile,
              category
            });


          }
        }

      }


      hasNext = pagination?.hasNext || false;
      page++;
      
      // Safety break to prevent infinite loops if API is weird
      if (page > 10) break;
    }
    
    return submissions;
  } catch (error) {
    console.error('Failed to fetch Boundless submissions:', error);
    return [];
  }
}
