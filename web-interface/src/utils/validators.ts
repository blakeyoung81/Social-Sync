import { SUPPORTED_VIDEO_FORMATS } from '../constants/processing';

/**
 * Check if a file is a supported video format
 */
export function isVideoFile(filename: string): boolean {
  const extension = getFileExtension(filename);
  return SUPPORTED_VIDEO_FORMATS.includes(extension);
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string {
  return filename.toLowerCase().substring(filename.lastIndexOf('.'));
}

/**
 * Validate OpenAI API key format
 */
export function isValidOpenAIApiKey(key: string): boolean {
  // OpenAI API keys start with "sk-" and are typically 51 characters long
  return /^sk-[a-zA-Z0-9]{48}$/.test(key);
}

/**
 * Validate folder path
 */
export function isValidFolderPath(path: string): boolean {
  // Basic validation - not empty and looks like a path
  return path.trim().length > 0 && (path.includes('/') || path.includes('\\'));
}

/**
 * Validate silence threshold
 */
export function isValidSilenceThreshold(value: number): boolean {
  return value >= 0.01 && value <= 0.2;
}

/**
 * Validate silence margin
 */
export function isValidSilenceMargin(value: number): boolean {
  return value >= 0 && value <= 2;
}

/**
 * Check if file size is reasonable for processing
 */
export function isReasonableFileSize(sizeInBytes: number): boolean {
  const maxSizeGB = 10; // 10GB limit
  const maxSizeBytes = maxSizeGB * 1024 * 1024 * 1024;
  return sizeInBytes > 0 && sizeInBytes <= maxSizeBytes;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
} 