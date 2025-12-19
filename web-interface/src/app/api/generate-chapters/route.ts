import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import path from 'path';
import fs from 'fs';

// Lazy initialization to avoid build-time errors
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export async function POST(request: NextRequest) {
  try {
    const { transcript, segments, videoTitle, videoDuration, videoPath, checkExisting = false } = await request.json();
    
    if (!transcript) {
      return NextResponse.json({ 
        success: false, 
        error: 'Transcript is required' 
      }, { status: 400 });
    }

    // Check for existing chapters data if videoPath is provided
    if (checkExisting && videoPath) {
      const videoBaseName = path.basename(videoPath, path.extname(videoPath));
      const processingDir = path.join(process.cwd(), '..', 'data', 'uploads', 'temp_processing');
      const chaptersFile = path.join(processingDir, `${videoBaseName}_chapters.json`);
      
      if (fs.existsSync(chaptersFile)) {
        try {
          const existingChapters = JSON.parse(fs.readFileSync(chaptersFile, 'utf-8'));
          console.log('📚 [CHAPTERS] Found existing chapters for:', videoBaseName);
          return NextResponse.json({
            success: true,
            chapters: existingChapters.chapters,
            model: existingChapters.model || 'gpt-4o-mini'
          });
        } catch (error) {
          console.error('📚 [CHAPTERS] Error reading existing chapters:', error);
        }
      }
    }

    console.log('📚 [CHAPTERS] Starting chapter generation for:', videoTitle);
    console.log('📚 [CHAPTERS] Video duration:', videoDuration, 'seconds');
    console.log('📚 [CHAPTERS] Transcript length:', transcript.length, 'characters');

    // Create a structured prompt for GPT
    const prompt = `You are a YouTube video editor expert. Analyze the following transcript and create meaningful chapters that would help viewers navigate the content effectively.

Video Title: "${videoTitle}"
Video Duration: ${Math.floor(videoDuration / 60)}:${(videoDuration % 60).toFixed(0).padStart(2, '0')}
Transcript Length: ${transcript.length} characters

Transcript:
${transcript}

Please generate 3-8 meaningful chapters that:
1. Represent distinct topics or sections in the video
2. Have engaging, descriptive titles (not just "Chapter 1", etc.)
3. Are evenly distributed throughout the video duration
4. Each chapter should be at least 30 seconds long
5. Titles should be YouTube-friendly (concise but descriptive)

${segments && segments.length > 0 ? `
Available timestamp segments for reference:
${segments.slice(0, 10).map((seg: any, i: number) => 
  `${Math.floor(seg.start / 60)}:${(seg.start % 60).toFixed(0).padStart(2, '0')} - ${seg.text.substring(0, 100)}...`
).join('\n')}
` : ''}

Return your response as a JSON object with this exact structure:
{
  "chapters": [
    {
      "title": "Introduction to the Topic",
      "startTime": 0,
      "endTime": 45,
      "description": "Brief overview of what will be covered"
    },
    {
      "title": "Main Content Section",
      "startTime": 45,
      "endTime": 120,
      "description": "Detailed explanation of the key concepts"
    }
  ]
}

Make sure:
- startTime and endTime are in seconds
- Chapters don't overlap
- All chapters combined cover the full video duration
- Titles are engaging and specific to the content
- Each chapter has a brief description`;

    try {
      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional YouTube video editor who specializes in creating engaging chapter breakdowns. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const responseText = completion.choices[0].message.content;
      
      if (!responseText) {
        throw new Error('No response from GPT');
      }

      // Parse the JSON response
      let chaptersData;
      try {
        // Try to extract JSON from the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          chaptersData = JSON.parse(jsonMatch[0]);
        } else {
          chaptersData = JSON.parse(responseText);
        }
      } catch (parseError) {
        console.error('📚 [CHAPTERS] JSON parsing error:', parseError);
        console.error('📚 [CHAPTERS] Raw response:', responseText);
        throw new Error('Failed to parse GPT response as JSON');
      }

      // Validate the response structure
      if (!chaptersData.chapters || !Array.isArray(chaptersData.chapters)) {
        throw new Error('Invalid response structure from GPT');
      }

      // Validate and clean up chapters
      const validChapters = chaptersData.chapters.filter((chapter: any) => {
        return chapter.title && 
               typeof chapter.startTime === 'number' && 
               typeof chapter.endTime === 'number' &&
               chapter.startTime < chapter.endTime &&
               chapter.endTime <= videoDuration;
      });

      if (validChapters.length === 0) {
        throw new Error('No valid chapters generated');
      }

      // Sort chapters by start time
      validChapters.sort((a: any, b: any) => a.startTime - b.startTime);

      // Add IDs to chapters
      const chaptersWithIds = validChapters.map((chapter: any, index: number) => ({
        id: `chapter-${index + 1}`,
        ...chapter,
        duration: chapter.endTime - chapter.startTime
      }));

      console.log('📚 [CHAPTERS] Chapter generation completed');
      console.log('📚 [CHAPTERS] Generated', chaptersWithIds.length, 'chapters');

      const result = {
        success: true,
        chapters: chaptersWithIds,
        model: 'gpt-4o-mini'
      };

      // Save chapters result to file for future use if videoPath is provided
      if (videoPath) {
        try {
          const videoBaseName = path.basename(videoPath, path.extname(videoPath));
          const processingDir = path.join(process.cwd(), '..', 'data', 'uploads', 'temp_processing');
          
          // Ensure directory exists
          if (!fs.existsSync(processingDir)) {
            fs.mkdirSync(processingDir, { recursive: true });
          }
          
          const chaptersFile = path.join(processingDir, `${videoBaseName}_chapters.json`);
          fs.writeFileSync(chaptersFile, JSON.stringify(result, null, 2));
          console.log('📚 [CHAPTERS] Saved chapters data to:', chaptersFile);
        } catch (saveError) {
          console.error('📚 [CHAPTERS] Error saving chapters:', saveError);
        }
      }

      return NextResponse.json(result);

    } catch (error) {
      console.error('📚 [CHAPTERS] GPT API error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to generate chapters with GPT'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('📚 [CHAPTERS] General error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
} 