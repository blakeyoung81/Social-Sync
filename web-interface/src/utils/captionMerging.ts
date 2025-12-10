// Utility functions for smart caption merging

export interface CaptionOverlap {
  hasOverlap: boolean;
  expandedStart?: number;
  expandedEnd?: number;
  expandedText?: string;
}

export interface CaptionSegment {
  text: string;
  start: number;
  end: number;
  style: string;
}

/**
 * Check if two caption segments overlap or are adjacent
 */
export function checkCaptionOverlap(
  existing: CaptionSegment,
  newCaption: CaptionSegment,
  adjacencyThreshold: number = 0.5
): boolean {
  // Must have same style to be mergeable
  if (existing.style !== newCaption.style) {
    return false;
  }

  // Check for overlap
  const hasTimeOverlap = newCaption.start <= existing.end && newCaption.end >= existing.start;
  
  // Check for adjacency (within threshold)
  const isAdjacent = 
    Math.abs(newCaption.start - existing.end) <= adjacencyThreshold ||
    Math.abs(newCaption.end - existing.start) <= adjacencyThreshold;

  return hasTimeOverlap || isAdjacent;
}

/**
 * Calculate the expanded caption range and text
 */
export function calculateCaptionExpansion(
  existing: CaptionSegment,
  newCaption: CaptionSegment,
  getTextInRange?: (start: number, end: number) => string
): CaptionOverlap {
  if (!checkCaptionOverlap(existing, newCaption)) {
    return { hasOverlap: false };
  }

  const expandedStart = Math.min(existing.start, newCaption.start);
  const expandedEnd = Math.max(existing.end, newCaption.end);
  
  // Use provided function to get expanded text, or concatenate
  const expandedText = getTextInRange 
    ? getTextInRange(expandedStart, expandedEnd)
    : `${existing.text} ${newCaption.text}`.trim();

  return {
    hasOverlap: true,
    expandedStart,
    expandedEnd,
    expandedText
  };
}

/**
 * Find all captions that would be affected by a new caption
 */
export function findOverlappingCaptions(
  newCaption: CaptionSegment,
  existingCaptions: CaptionSegment[],
  adjacencyThreshold: number = 0.5
): CaptionSegment[] {
  return existingCaptions.filter(caption => 
    checkCaptionOverlap(caption, newCaption, adjacencyThreshold)
  );
}

/**
 * Get a human-readable description of the caption action
 */
export function getCaptionActionDescription(
  newCaption: CaptionSegment,
  existingCaptions: CaptionSegment[]
): string {
  const overlapping = findOverlappingCaptions(newCaption, existingCaptions);
  
  if (overlapping.length === 0) {
    return 'Creating new caption';
  } else if (overlapping.length === 1) {
    return 'Expanding existing caption';
  } else {
    return `Merging ${overlapping.length + 1} captions`;
  }
} 