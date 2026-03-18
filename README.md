# BoundlessFi X Challenge Analyzer

A Next.js 14 application built with the App Router to automatically analyze, score, and rank Twitter/X submissions for the Boundless hackathon. It uses the Gemini AI API for intelligent content scoring and the Twitter v2 API for fetching detailed engagement metrics and media.

## Features Let’s Dive In

*   **⚡️ Live SSE Streaming**: See progress updates in real-time as the app fetches submissions, analyzes tweets, and invokes Gemini.
*   **🐦 Twitter/X Integration**: Uses Twitter v2 API to fetch full engagement metrics, including full conversation threads and media (images, videos).
*   **🧠 Gemini AI Scoring**: Leverages `gemini-1.5-flash` to holistically evaluate tweets based on categories using a custom tailored prompt! Note you can swap out `gemini-1.5-flash` to `gemini-1.5-pro` for an even smarter (but slightly slower) response.
*   **📊 Multi-Dimensional Analysis**: Scores clarity, creativity, relevance, storytelling, visual quality, and overall impact, and aggregates them into a final score.

## Prerequisite Keys Needed

You will need two API keys to run this locally.

1.  **X/Twitter Bearer Token**
    *   Go to the [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
    *   Create a Project and App.
    *   Generate a Bearer Token.

2.  **Gemini API Key**
    *   Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
    *   Click "Create API Key" and copy the value.

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   ```bash
   cp .env.example .env.local
   ```
   Open `.env.local` and add your keys from above.

3. **Run the Development Server**
   ```bash
   npm run dev
   ```

4. **Open Application**
   Visit [http://localhost:3000](http://localhost:3000)

## Tech Stack Overview

- Next.js 14 (App Router)
- React 18, Server Components
- Tailwind CSS
- lucide-react (Icons)
- @google/generative-ai
