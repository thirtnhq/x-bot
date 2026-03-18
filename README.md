# 🏆 Boundless X Challenge — AI Leaderboard Bot

An AI-powered leaderboard and engagement scoring tool for the **Boundless on X Hackathon**. It automatically fetches all participant submissions, pulls live Twitter/X metrics via the SocialData API, and uses Google Gemini (via Replicate) to score and rank every entry.

---

## ✨ Features

- **One-click full analysis** — Sync data from X and run AI scoring in a single button press
- **AI scoring** — Each submission is scored by Gemini on content quality, creativity, and relevance
- **Engagement metrics** — Fetches real-time likes, retweets, quotes, replies, bookmarks, and impressions
- **Thread support** — Aggregates metrics across all tweets in a thread
- **Category breakdown** — Separates results into Threads, Single Tweets, and Memes/Visuals
- **Top 15 leaderboard** — Combined AI + engagement score ranking
- **Firebase caching** — Results are persisted so the UI loads instantly on return visits
- **Historical comparison** — Compare multiple analysis runs over time

---

## 🏗️ Architecture

```
Boundless API ──► fetchBoundlessSubmissions()  ──► SocialData API (fetchTweet / fetchThread)
                           │                                   │
                           └───────────► Firebase Cache ◄──────┘
                                               │
                                        Gemini via Replicate
                                               │
                                        Scored & Ranked Results
                                               │
                                          Next.js UI
```

### Key Files

| File | Purpose |
|---|---|
| `lib/boundless.ts` | Fetches all hackathon submissions from the Boundless API with pagination |
| `lib/twitter.ts` | Fetches tweet/thread data and metrics from SocialData API (with fallback logic) |
| `lib/gemini.ts` | Calls Gemini 2.0 Flash via Replicate to score each submission |
| `lib/scorer.ts` | Calculates engagement scores and combines them with AI scores |
| `lib/firebase.ts` | Persists raw submission cache and final analysis results to Firestore |
| `lib/types.ts` | Shared TypeScript types |
| `app/api/submissions/sync/route.ts` | SSE endpoint — fetches submissions and enriches them with X data |
| `app/api/analyze/route.ts` | SSE endpoint — runs AI scoring on cached submissions |
| `app/api/results/route.ts` | Loads the latest analysis from Firebase |
| `app/page.tsx` | Main dashboard UI |
| `components/ResultsTable.tsx` | Renders the scored leaderboard table |
| `components/CategoryTabs.tsx` | Tab navigation (Top 15, Threads, Single Tweets, Memes) |
| `components/CompareView.tsx` | Side-by-side comparison of historical analysis runs |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A [SocialData](https://socialdata.tools) account with API credits
- A [Replicate](https://replicate.com) account (for Gemini access)
- A [Firebase](https://firebase.google.com) project with Firestore enabled

### 1. Clone the repo

```bash
git clone https://github.com/thirtnhq/x-bot.git
cd x-bot
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example env file and fill in your keys:

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

```env
# SocialData API — used to fetch tweet metrics (https://socialdata.tools)
SOCIALDATA_API_KEY=your_socialdata_key

# Replicate — used to run Gemini AI scoring (https://replicate.com)
REPLICATE_API_TOKEN=your_replicate_token

# Google Gemini API key (fallback / direct usage)
GEMINI_API_KEY=your_gemini_key

# Firebase Firestore — for caching submissions and results
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Boundless API base URL
NEXT_PUBLIC_BOUNDLESS_API=

# Optional: X/Twitter Bearer Token (not required unless SocialData is unavailable)
X_BEARER_TOKEN=
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔄 How to Use

1. Open the app at `http://localhost:3000`
2. Click the **"🚀 Run Full Analysis"** button
3. The app will:
   - Fetch all submissions from the Boundless API
   - Pull tweet metrics from SocialData (threads get full thread data, single tweets get individual metrics)
   - Cache everything to Firebase
   - Run AI scoring via Gemini on each submission
   - Display the ranked leaderboard
4. Use the tabs to browse by category: **Top 15**, **Best Threads**, **Best Single Tweets**, **Best Memes & Visuals**, or **All Submissions**

> **Tip:** After the first run, results load instantly from Firebase. Use the "Compare Runs" tab to see how rankings change over time.

---

## 📊 Scoring System

Each submission receives a **Final Score (0–100)** calculated as:

```
Final Score = (AI Score × 0.6) + (Engagement Score × 0.4)
```

**AI Score** (via Gemini) evaluates:
- Content quality and clarity
- Creativity and originality  
- Relevance to the Boundless challenge
- Potential reach/virality

**Engagement Score** is derived from weighted tweet metrics:
- Impressions, likes, retweets, quotes, bookmarks, and replies

---

## 🔑 API Credit Notes

- **SocialData** charges **1 credit per tweet** and **2 credits per thread**
- Profile-only submissions (no tweet link) are automatically skipped to save credits
- The app uses a smart fallback: if the single-tweet endpoint fails, it retries with the thread endpoint

---

## 📦 Tech Stack

- **[Next.js 15](https://nextjs.org)** — App framework (App Router + API routes)
- **[Firebase Firestore](https://firebase.google.com)** — Data persistence and caching
- **[SocialData API](https://socialdata.tools)** — Real-time Twitter/X data
- **[Replicate](https://replicate.com)** (Gemini 2.0 Flash) — AI scoring
- **[Lucide React](https://lucide.dev)** — Icons
- **Vanilla CSS + Tailwind** — Styling
