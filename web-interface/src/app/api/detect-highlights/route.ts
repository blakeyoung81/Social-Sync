import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function POST(request: NextRequest) {
  try {
    const { transcript, segments, videoTitle, videoDuration, videoPath, checkExisting = false } = await request.json();
    
    // Check for existing highlights data if videoPath is provided
    if (checkExisting && videoPath) {
      const videoBaseName = path.basename(videoPath, path.extname(videoPath));
      const processingDir = path.join(process.cwd(), '..', 'data', 'uploads', 'temp_processing');
      const highlightsFile = path.join(processingDir, `${videoBaseName}_highlights.json`);
      
      if (fs.existsSync(highlightsFile)) {
        try {
          const existingData = JSON.parse(fs.readFileSync(highlightsFile, 'utf8'));
          console.log('🌟 [AI HIGHLIGHTS] Found existing highlights for:', videoBaseName);
          return NextResponse.json({
            success: true,
            ...existingData,
            fromCache: true
          });
        } catch (error) {
          console.error('🌟 [AI HIGHLIGHTS] Error reading existing highlights:', error);
          // Continue with new analysis
        }
      }
      
      // If checkExisting is true but no existing data found, return empty result
      return NextResponse.json({
        success: false,
        error: 'No existing highlights found'
      });
    }
    
    if (!transcript) {
      return NextResponse.json({ 
        success: false, 
        error: 'Transcript is required' 
      }, { status: 400 });
    }

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'OpenAI API key not configured' 
      }, { status: 500 });
    }

    console.log('🌟 [AI HIGHLIGHTS] Starting highlights detection for:', videoTitle);
    console.log('🌟 [AI HIGHLIGHTS] Video duration:', videoDuration, 'seconds');
    console.log('🌟 [AI HIGHLIGHTS] Transcript length:', transcript.length, 'characters');

    // Create a prompt for highlight detection
    const highlightPrompt = `Analyze this video transcript and identify the most important highlights/key moments. 

Video Title: ${videoTitle || 'Unknown'}
Video Duration: ${videoDuration || 'Unknown'} seconds

For each highlight, provide:
1. A brief title (max 50 characters)
2. A description of why it's important (max 100 characters)
3. The approximate start time in seconds (estimate based on transcript flow)
4. The approximate end time in seconds (usually 10-30 seconds after start)
5. Importance level: "high", "medium", or "low"

Focus on:
- Key educational points or main concepts
- Important medical/technical information
- Memorable quotes or statements
- Actionable advice or tips
- Surprising or interesting facts
- Conclusions or summaries

Return ONLY a JSON array with this exact format:
[
  {
    "title": "Brief title",
    "description": "Why this moment is important",
    "startTime": 45.2,
    "endTime": 65.8,
    "importance": "high"
  }
]

Transcript:
${transcript}`;

    // Call OpenAI API to detect highlights
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
            content: 'You are an expert video content analyzer. You identify the most important and engaging moments in video transcripts. Always return valid JSON only.'
          },
          {
            role: 'user',
            content: highlightPrompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error('🌟 [AI HIGHLIGHTS] OpenAI API error:', openaiResponse.status, errorData);
      return NextResponse.json({ 
        success: false, 
        error: `OpenAI API error: ${openaiResponse.status}` 
      }, { status: 500 });
    }

    const openaiResult = await openaiResponse.json();
    const highlightsResponse = openaiResult.choices[0]?.message?.content?.trim();

    if (!highlightsResponse) {
      console.error('🌟 [AI HIGHLIGHTS] No highlights response received from OpenAI');
      return NextResponse.json({ 
        success: false, 
        error: 'No highlights response received from OpenAI' 
      }, { status: 500 });
    }

    try {
      // Parse the JSON response
      const parsedResponse = JSON.parse(highlightsResponse);
      let highlights = [];
      
      // Handle different response formats
      if (Array.isArray(parsedResponse)) {
        highlights = parsedResponse;
      } else if (parsedResponse.highlights && Array.isArray(parsedResponse.highlights)) {
        highlights = parsedResponse.highlights;
      } else {
        console.warn('🌟 [AI HIGHLIGHTS] Unexpected response format, trying to extract highlights');
        highlights = [];
      }

      // Validate and clean highlights
      const validHighlights = highlights.filter((highlight: any) => 
        highlight.title && 
        highlight.description && 
        typeof highlight.startTime === 'number' && 
        typeof highlight.endTime === 'number' &&
        highlight.startTime < highlight.endTime
      ).map((highlight: any) => ({
        title: String(highlight.title).substring(0, 50),
        description: String(highlight.description).substring(0, 100),
        startTime: Math.max(0, Number(highlight.startTime)),
        endTime: Math.min(videoDuration || 3600, Number(highlight.endTime)),
        importance: ['high', 'medium', 'low'].includes(highlight.importance) ? highlight.importance : 'medium'
      }));

      console.log('🌟 [AI HIGHLIGHTS] Detection completed');
      console.log('🌟 [AI HIGHLIGHTS] Found', validHighlights.length, 'valid highlights');

      const result = {
        success: true,
        highlights: validHighlights,
        totalHighlights: validHighlights.length,
        model: 'gpt-4o-mini'
      };

      // Save highlights result to file for future use if videoPath is provided
      if (videoPath) {
        try {
          const videoBaseName = path.basename(videoPath, path.extname(videoPath));
          const processingDir = path.join(process.cwd(), '..', 'data', 'uploads', 'temp_processing');
          const highlightsFile = path.join(processingDir, `${videoBaseName}_highlights.json`);
          
          if (!fs.existsSync(processingDir)) {
            fs.mkdirSync(processingDir, { recursive: true });
          }
          fs.writeFileSync(highlightsFile, JSON.stringify(result, null, 2));
          console.log('🌟 [AI HIGHLIGHTS] Saved highlights data to:', highlightsFile);
        } catch (saveError) {
          console.error('🌟 [AI HIGHLIGHTS] Error saving highlights data:', saveError);
        }
      }

      return NextResponse.json(result);

    } catch (parseError) {
      console.error('🌟 [AI HIGHLIGHTS] Failed to parse highlights response:', highlightsResponse);
      console.error('🌟 [AI HIGHLIGHTS] Parse error:', parseError);
      
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to parse highlights response',
        details: 'Invalid JSON format'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('🌟 [AI HIGHLIGHTS] API Error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to detect highlights',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 