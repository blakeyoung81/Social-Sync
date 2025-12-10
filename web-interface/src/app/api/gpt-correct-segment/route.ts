import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ success: false, error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a medical transcription accuracy specialist. Your ONLY job is to fix transcription errors - words that were incorrectly transcribed from what the speaker actually said.

CRITICAL INSTRUCTIONS:
1. PRESERVE ALL words the speaker said - never remove anything
2. ONLY fix words that were clearly transcribed incorrectly (e.g., "hypertention" → "hypertension", "cardiak" → "cardiac")
3. Use medical context to identify likely transcription errors
4. Fix basic grammar ONLY when it's clearly a transcription error (e.g., "he are" → "he is")
5. PRESERVE all filler words, repetitions, false starts, and natural speech patterns
6. PRESERVE all "um", "uh", "like", "you know", etc.
7. PRESERVE all repeated words and self-corrections
8. Focus on making the transcript match what was actually spoken
9. Return ONLY the accuracy-corrected text, no additional commentary or quotation marks.`
          },
          {
            role: 'user',
            content: text
          }
        ],
        max_tokens: text.length * 2 + 50,
        temperature: 0.3
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      return NextResponse.json({ success: false, error: `OpenAI API error: ${openaiResponse.status}` }, { status: 500 });
    }

    const openaiResult = await openaiResponse.json();
    const correctedText = openaiResult.choices[0]?.message?.content?.trim();

    if (!correctedText) {
      return NextResponse.json({ success: false, error: 'No corrected text received from OpenAI' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      correctedText,
    });

  } catch (error) {
    console.error('🤖 [GPT CORRECTION] API Error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to correct segment',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 