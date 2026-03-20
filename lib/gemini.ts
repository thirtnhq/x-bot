import Replicate from 'replicate';
import { AIScores, Category, TweetData } from './types';

/** Shape of the raw JSON object returned by the AI model */
interface AIRawResponse {
  creativity: number;
  clarity: number;
  engagement: number;
  reasoning?: string;
}

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

  const prompt = `You are an expert judge for the "Boundless X Challenge" — a social media hackathon run by Boundless.

## About Boundless
Boundless (boundlessfi.xyz) is a decentralized crowdfunding and project-funding platform built on the **Stellar blockchain**.
Key features:
- Trustless escrow powered by Trustless Work — funds are only released when milestones are met
- Reputation system for builders and funders
- Passkey-based wallets (no seed phrases)
- Four funding modes: Crowdfunding, Hackathons, Bounties, and Grants
- Builders can launch campaigns, join hackathons, and apply for grants
- Funders get transparent milestone tracking and on-chain accountability

## Hackathon Categories
Entries fall into one of three categories. Apply the category-specific lens below:

**Thread (3–5 tweets):** A multi-tweet story or explanation. Judge whether it tells a clear, engaging narrative about Boundless — building up context, explaining value, and finishing with a memorable takeaway. Flow and coherence across tweets matters.

**Single Tweet:** One standalone tweet. Must be catchy, clear, and self-contained. Brevity and impact are key — does it make someone want to learn more about Boundless in one reading?

**Meme / Visual:** An image or short video that promotes or explains Boundless in a fun, creative way. Visual impact, originality, and whether the message is instantly clear from the image alone are key.

## Submission Being Judged
Category: ${category}
Content:
${content}

## Scoring Instructions
Score each criterion from **0 to 10** (integers preferred):

1. **Creativity** (35%): How original, catchy, or unexpected is the approach? Does it stand out from generic crypto posts?
2. **Clarity & Message** (35%): How clearly does it communicate what Boundless is or why it matters? Would someone unfamiliar with Boundless understand the value after seeing this?
3. **Engagement Potential** (30%): How likely is this to get real traction on X — retweets, replies, likes? Does it inspire sharing or curiosity?

## Judging Notes
- Reward entries that explain Boundless accurately (escrow, Stellar, milestone-based funding) over vague hype
- Strong single tweets are concise and punchy — penalise waffle
- Threads that repeat the same point across tweets without building should score lower on Clarity
- Memes with no clear connection to Boundless (just generic crypto/money imagery) should score lower on Creativity and Clarity

Return ONLY a valid JSON object — no markdown, no surrounding text:
{
  "creativity": number (0-10),
  "clarity": number (0-10),
  "engagement": number (0-10),
  "reasoning": "2-3 sentence explanation of the scores"
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


    // Replicate — Claude 4 Sonnet
    const output: string[] | string = await replicate.run(
      "anthropic/claude-4-sonnet",
      { input }
    ) as string[] | string;

    // Replicate output for Gemini usually comes as an array of strings (parts of the response)
    const text = Array.isArray(output) ? output.join('') : (output?.toString() || "");

    // Log for debugging (only first 100 chars and last 100 chars if long)
    console.log(`Replicate Raw Output Preview: ${text.substring(0, 100)}...${text.substring(text.length - 100)}`);

    // More robust extraction: find the first { and the last }
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("No JSON object found in AI response");

    const cleaned = match[0].trim();
    let parsed: AIRawResponse;
    try {
      parsed = JSON.parse(cleaned) as AIRawResponse;
    } catch (parseErr) {
      console.error("Failed to parse AI JSON. Raw text received:", text);
      throw parseErr;
    }



    // Calculate 0-100 weighted score (creativity 35% + clarity 35% + engagement 30%)
    // Each raw sub-score is 0-10; max = 10×3.5 + 10×3.5 + 10×3.0 = 100
    // Clamp defensively in case the model returns a value slightly outside 0-10
    const creativity  = Math.min(10, Math.max(0, parsed.creativity  || 0));
    const clarity     = Math.min(10, Math.max(0, parsed.clarity     || 0));
    const engagement  = Math.min(10, Math.max(0, parsed.engagement  || 0));
    const overall = Math.min(100, Math.max(0, Math.round(
      (creativity  * 3.5) +
      (clarity     * 3.5) +
      (engagement  * 3.0)
    )));

    return {
      creativity,
      clarity,
      engagement,
      overall,
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

