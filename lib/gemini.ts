import Replicate from 'replicate';
import { AIScores, Category, TweetData } from './types';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function scoreSubmission(category: Category, mainTweet: TweetData, threadTweets: TweetData[] = []): Promise<AIScores> {
  if (!process.env.REPLICATE_API_TOKEN) {
    console.warn("REPLICATE_API_TOKEN missing. Returning neutral scores.");
    return fallbackScores();
  }

  const isThread = category === 'thread';
  let content = `Main Tweet:\n${mainTweet.text}\nImage Count: ${mainTweet.mediaUrls.length}\n`;
  if (isThread && threadTweets.length > 0) {
    content += `\nThread Replies (from same author):\n`;
    threadTweets.forEach((t, i) => {
      content += `Tweet ${i + 2}: ${t.text}\n`;
    });
  }

  const prompt = `You are an expert judge for the "Boundless X Challenge".
Boundless is a decentralized crowdfunding platform for builders on the Stellar blockchain.

Analyze the following Twitter submission and score it based on these specific criteria:
1. Creativity (35% weight): How original, catchy, or creative is the content?
2. Clarity & Message (35% weight): How well does it explain Boundless or tell a clear story?
3. Engagement Potential (30% weight): How likely is this to resonate with the X community?

Category: ${category}
Submission Content:
${content}

Return ONLY a valid JSON object with the following structure:
{
  "creativity": number (0-10),
  "clarity": number (0-10),
  "engagement": number (0-10),
  "reasoning": "2-3 sentence explanation"
}
`;

  try {
    const input = {
      prompt: prompt,
      temperature: 1,
      top_p: 0.95,
      thinking_level: "high",
      max_output_tokens: 2000, // Reduced from 65535 for efficiency but still plenty
    };


    // Replicate's Gemini 3.1 Pro model
    const output: any = await replicate.run(
      "google/gemini-3.1-pro",
      { input }
    );

    // Replicate output for Gemini usually comes as an array of strings (parts of the response)
    const text = Array.isArray(output) ? output.join('') : (output?.toString() || "");
    
    // Log for debugging (only first 100 chars and last 100 chars if long)
    console.log(`Replicate Raw Output Preview: ${text.substring(0, 100)}...${text.substring(text.length - 100)}`);

    // More robust extraction: find the first { and the last }
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON object found in AI response");
    
    const cleaned = match[0].trim();
    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("Failed to parse AI JSON. Raw text received:", text);
      throw parseErr;
    }


    
    // Calculate 0-100 weighted score
    const overall = Math.round(
      (parsed.creativity * 3.5) + 
      (parsed.clarity * 3.5) + 
      (parsed.engagement * 3.0)
    );

    return {
      creativity: parsed.creativity || 0,
      clarity: parsed.clarity || 0,
      engagement: parsed.engagement || 0,
      overall: overall,
      reasoning: parsed.reasoning || "No reasoning provided."
    };
  } catch (err) {
    console.error("Replicate/Gemini scoring failed:", err);
    return fallbackScores();
  }
}


function fallbackScores(): AIScores {
  return {
    creativity: 5,
    clarity: 5,
    engagement: 5,
    overall: 50,
    reasoning: "AI scoring failed or skipped. Neutral scores applied."
  };
}

