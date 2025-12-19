import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// Lazy initialization to avoid build-time errors
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export async function POST(req: NextRequest) {
  try {
    const { words } = await req.json();

    if (!words || !Array.isArray(words) || words.length === 0) {
      return NextResponse.json({ error: 'Transcript data is required' }, { status: 400 });
    }

    // Reconstruct the full text for the prompt
    const fullText = words.map(w => w.text).join(' ');

    const systemPrompt = `You are a video editing assistant. Your task is to identify the most important, impactful, or informative sentences from the following transcript. These will be used to generate "highlight" captions. Return a JSON array of objects, where each object represents a highlight and contains the "start" and "end" time of that highlight segment. The start time should be the start time of the first word in the highlight, and the end time should be the end time of the last word. Be selective and only choose a few key moments.`;
    
    const userPrompt = `Transcript:\n\n${fullText}\n\nIdentify the highlight segments.`;

    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.2,
    });
    
    const rawResult = response.choices[0].message.content;
    if (!rawResult) {
      throw new Error("OpenAI returned an empty response.");
    }
    
    const result = JSON.parse(rawResult);

    // TODO: We might need to map the text result back to the word timestamps
    // For now, let's assume the model can return timestamps if we ask.
    // A better implementation would be to find the returned text in the transcript and get the timestamps.
    // Let's refine the prompt to ask for text, start, and end.

    return NextResponse.json({ success: true, highlights: result.highlights || [] });

  } catch (error) {
    console.error('[HIGHLIGHTS API] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to generate highlights', details: errorMessage }, { status: 500 });
  }
} 