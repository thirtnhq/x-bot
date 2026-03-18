import { NextResponse } from 'next/server';
import { getAnalyses } from '@/lib/firebase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const history = await getAnalyses();
    // Sort by timestamp desc (newest first)
    history.sort((a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime());
    return NextResponse.json(history);
  } catch (error: any) {
    console.error('Failed to fetch history:', error);
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
  }
}
