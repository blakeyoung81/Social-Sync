import { NextResponse } from 'next/server';
import { createClient } from 'pexels';

const client = createClient(process.env.PEXELS_API_KEY || '');

export async function POST(request: Request) {
  if (!process.env.PEXELS_API_KEY) {
    return NextResponse.json({ error: 'Pexels API key not configured' }, { status: 500 });
  }

  const { query } = await request.json();

  if (!query) {
    return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
  }

  try {
    const response = await client.videos.search({ query, per_page: 15 });
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error searching Pexels:', error);
    return NextResponse.json({ error: 'Failed to search for videos on Pexels' }, { status: 500 });
  }
} 