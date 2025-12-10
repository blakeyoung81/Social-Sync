import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key is required' }, { status: 400 });
    }

    // Get usage data for the current month
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];

    try {
      // Call OpenAI Usage API
      const response = await fetch(`https://api.openai.com/v1/usage?date=${startDate}&date=${endDate}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          return NextResponse.json({ 
            error: 'Invalid API key',
            success: false 
          }, { status: 401 });
        }
        
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const usageData = await response.json();
      
      // Calculate costs based on current pricing
      let totalCost = 0;
      let gptCost = 0;
      let dalleImageCount = 0;
      let dalleCost = 0;
      let whisperCost = 0;

      // Parse usage data (OpenAI returns daily usage records)
      if (usageData.data && Array.isArray(usageData.data)) {
        usageData.data.forEach((day: any) => {
          if (day.results && Array.isArray(day.results)) {
            day.results.forEach((result: any) => {
              // GPT-4o-mini costs
              if (result.snapshot_id?.includes('gpt-4o-mini')) {
                const inputTokens = result.n_context_tokens_total || 0;
                const outputTokens = result.n_generated_tokens_total || 0;
                
                // Current pricing: $0.15/1M input, $0.60/1M output
                gptCost += (inputTokens * 0.15 / 1000000) + (outputTokens * 0.60 / 1000000);
              }
              
              // DALL-E 3 costs
              if (result.snapshot_id?.includes('dall-e-3')) {
                const images = result.n_generated || 0;
                dalleImageCount += images;
                // Standard 1024x1024 images: $0.04 each
                dalleCost += images * 0.04;
              }
              
              // Whisper costs (though we run it locally, this tracks API usage if any)
              if (result.snapshot_id?.includes('whisper')) {
                const seconds = result.n_requests || 0; // This might need adjustment based on actual API response
                whisperCost += seconds * 0.006 / 60; // $0.006 per minute
              }
            });
          }
        });
      }

      totalCost = gptCost + dalleCost + whisperCost;

      return NextResponse.json({
        success: true,
        currentMonth: {
          totalCost,
          gptCost,
          dalleCost,
          dalleImageCount,
          whisperCost,
          startDate,
          endDate
        },
        rawData: usageData, // Include raw data for debugging
        lastUpdated: new Date().toISOString()
      });

    } catch (apiError: any) {
      console.error('OpenAI API error:', apiError);
      
      return NextResponse.json({
        error: 'Failed to fetch usage data from OpenAI',
        details: apiError.message,
        success: false
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error fetching OpenAI usage:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      success: false
    }, { status: 500 });
  }
} 