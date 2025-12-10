import type { ProcessingOptions, VideoDiscovery } from '../types';

export interface CostBreakdown {
  gptCost: number;
  dalleCost: number;
  whisperCost: number;
  totalCost: number;
  videoCount: number;
}

export const calculateEstimatedCost = (
  options: ProcessingOptions,
  videoDiscovery?: VideoDiscovery | null
): CostBreakdown => {
  const videoCount = videoDiscovery?.totalVideos || 1;
  let gptCost = 0;
  let dalleCost = 0;
  let whisperCost = 0;

  // Only calculate if API key is present
  if (!options.openaiKey) {
    return { gptCost: 0, dalleCost: 0, whisperCost: 0, totalCost: 0, videoCount };
  }

  // GPT costs (only if features are enabled)
  if (!options.skipGpt || options.useGptForDescription || options.useGptForTags || options.useGptForTitle) {
    // Estimated $0.0015 per video for GPT-4o-mini (based on ~1000 tokens total)
    gptCost = 0.0015 * videoCount;
  }

  // DALL-E costs (only if thumbnails enabled)
  if (!options.skipThumbnail) {
    let thumbnailCount = videoCount; // Default to all videos
    
    // If thumbnail mode is landscape-only, only count landscape videos
    if (options.thumbnailMode === 'landscape-only' && videoDiscovery?.landscapeCount !== undefined) {
      thumbnailCount = videoDiscovery.landscapeCount;
    }
    
    dalleCost = 0.04 * thumbnailCount; // $0.04 per image
  }

  // Whisper is FREE (runs locally)
  whisperCost = 0;

  const totalCost = gptCost + dalleCost + whisperCost;

  return {
    gptCost,
    dalleCost,
    whisperCost,
    totalCost,
    videoCount
  };
};

export const formatCost = (cost: number): string => {
  if (cost === 0) return '$0.00';
  if (cost < 0.001) return '<$0.001';
  if (cost < 1) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}; 