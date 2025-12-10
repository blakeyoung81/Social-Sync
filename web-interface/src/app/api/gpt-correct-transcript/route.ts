import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { videoPath, transcript, segments, videoTitle } = await request.json();
    
    // If videoPath is provided, load transcript from file
    let transcriptData = { transcript, segments, videoTitle };
    
    if (videoPath) {
      const videoBaseName = path.basename(videoPath, path.extname(videoPath));
      const processingDir = path.join(process.cwd(), '..', 'data', 'uploads', 'temp_processing');
      const transcriptionFile = path.join(processingDir, `${videoBaseName}_transcription.json`);
      
      if (fs.existsSync(transcriptionFile)) {
        try {
          const savedData = JSON.parse(fs.readFileSync(transcriptionFile, 'utf8'));
          transcriptData = {
            transcript: savedData.fullText,
            segments: savedData.segments,
            videoTitle: videoBaseName
          };
        } catch (error) {
          console.error('🤖 [GPT CORRECTION] Error loading transcript from file:', error);
        }
      }
    }
    
    if (!transcriptData.transcript) {
      return NextResponse.json({ 
        success: false, 
        error: 'Transcript is required or transcript file not found' 
      }, { status: 400 });
    }

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'OpenAI API key not configured' 
      }, { status: 500 });
    }

    console.log('🤖 [GPT CORRECTION] Starting transcript correction for:', transcriptData.videoTitle);
    console.log('🤖 [GPT CORRECTION] Original transcript length:', transcriptData.transcript.length, 'characters');

    // Call OpenAI API to correct the transcript
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
9. Return ONLY the accuracy-corrected transcript text

Video Title: ${transcriptData.videoTitle || 'Unknown'}`
          },
          {
            role: 'user',
            content: `Please correct and improve this video transcript:\n\n${transcriptData.transcript}`
          }
        ],
        max_tokens: Math.min(4000, transcriptData.transcript.length * 2),
        temperature: 0.3
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('🤖 [GPT CORRECTION] OpenAI API error:', openaiResponse.status, errorData);
      return NextResponse.json({ 
        success: false, 
        error: `OpenAI API error: ${openaiResponse.status}` 
      }, { status: 500 });
    }

    const openaiResult = await openaiResponse.json();
    const correctedTranscript = openaiResult.choices[0]?.message?.content?.trim();

    if (!correctedTranscript) {
      console.error('🤖 [GPT CORRECTION] No corrected transcript received from OpenAI');
      return NextResponse.json({ 
        success: false, 
        error: 'No corrected transcript received from OpenAI' 
      }, { status: 500 });
    }

    console.log('🤖 [GPT CORRECTION] Correction completed');
    console.log('🤖 [GPT CORRECTION] Corrected transcript length:', correctedTranscript.length, 'characters');

    // If segments were provided, try to maintain timing by proportionally adjusting text
    let correctedSegments = transcriptData.segments;
    if (transcriptData.segments && transcriptData.segments.length > 0) {
      // For now, keep original segments but could implement smarter text-to-segment mapping
      console.log('🤖 [GPT CORRECTION] Maintaining original segment timing');
    }

    // Save corrected transcript to file if videoPath was provided
    if (videoPath) {
      try {
        const videoBaseName = path.basename(videoPath, path.extname(videoPath));
        const processingDir = path.join(process.cwd(), '..', 'data', 'uploads', 'temp_processing');
        const transcriptionFile = path.join(processingDir, `${videoBaseName}_transcription.json`);
        
        // Update the existing transcription file with corrected text
        if (fs.existsSync(transcriptionFile)) {
          const savedData = JSON.parse(fs.readFileSync(transcriptionFile, 'utf8'));
          savedData.fullText = correctedTranscript;
          savedData.correctedByGPT = true;
          savedData.gptModel = 'gpt-4o-mini';
          fs.writeFileSync(transcriptionFile, JSON.stringify(savedData, null, 2));
          console.log('🤖 [GPT CORRECTION] Updated transcription file with corrected text');
        }
      } catch (saveError) {
        console.error('🤖 [GPT CORRECTION] Error saving corrected transcript:', saveError);
      }
    }

    return NextResponse.json({
      success: true,
      correctedTranscript,
      correctedSegments,
      originalLength: transcriptData.transcript.length,
      correctedLength: correctedTranscript.length,
      model: 'gpt-4o-mini'
    });

  } catch (error) {
    console.error('🤖 [GPT CORRECTION] API Error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to correct transcript',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 