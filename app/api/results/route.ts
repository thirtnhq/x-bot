import { NextResponse } from 'next/server';
import { getLastAnalysisResult } from '@/lib/firebase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
      return NextResponse.json({ error: 'Firebase not configured' }, { status: 500 });
    }
    
    const result = await getLastAnalysisResult();
    if (!result) {
      return NextResponse.json({ message: 'No analysis results found' }, { status: 404 });
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching results:', error);
    return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 });
  }
}
