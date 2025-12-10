import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';

interface VideoFile {
  name: string;
  path: string;
  size: number;
  type?: 'short' | 'regular';
  duration?: number;
  width?: number;
  height?: number;
  aspectRatio?: number;
  scheduledDate?: string;
  scheduledTime?: string;
  conflict?: boolean;
  conflictReason?: string;
}

const SUPPORTED_FORMATS = new Set(['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv', '.m4v']);

// Read cached YouTube channel data
async function readChannelCache() {
  try {
    // Go up one directory from web-interface to the project root, then to cache
    const cacheDir = path.join(process.cwd(), '..', 'cache', 'youtube');
    console.log(`🔍 [CACHE DEBUG] Looking for cache in directory: ${cacheDir}`);
    
    // First, try to read the channels_cache.json file
    const channelsCache = path.join(cacheDir, 'channels_cache.json');
    console.log(`🔍 [CACHE DEBUG] Checking for channels cache: ${channelsCache}`);
    
    if (await fs.access(channelsCache).then(() => true).catch(() => false)) {
      console.log(`✅ [CACHE DEBUG] Found channels_cache.json`);
      const channelsData = JSON.parse(await fs.readFile(channelsCache, 'utf-8'));
      console.log(`📄 [CACHE DEBUG] Channels data:`, JSON.stringify(channelsData, null, 2));
      
      // Use the first channel if no active channel is specified
      const channel = channelsData.channels?.[0];
      
      if (channel) {
        console.log(`📺 [CACHE DEBUG] Using channel: ${channel.id}`);
        const channelDataFile = path.join(cacheDir, `${channel.id}_channel_data.json`);
        console.log(`🔍 [CACHE DEBUG] Looking for channel data file: ${channelDataFile}`);
        
        if (await fs.access(channelDataFile).then(() => true).catch(() => false)) {
          console.log(`✅ [CACHE DEBUG] Found channel data file!`);
          const channelData = JSON.parse(await fs.readFile(channelDataFile, 'utf-8'));
          console.log(`📊 [CACHE DEBUG] Channel data loaded: ${channelData?.videos?.length || 0} videos for channel ${channelData?.channelId}`);
          return channelData;
        } else {
          console.log(`❌ [CACHE DEBUG] Channel data file not found: ${channelDataFile}`);
        }
      } else {
        console.log(`❌ [CACHE DEBUG] No channels found in channels_cache.json`);
      }
    } else {
      console.log(`❌ [CACHE DEBUG] channels_cache.json not found`);
      
      // Fallback: Try to find any channel data files directly
      console.log(`🔍 [CACHE DEBUG] Scanning for channel data files...`);
      try {
        const files = await fs.readdir(cacheDir);
        console.log(`📁 [CACHE DEBUG] Files in cache directory:`, files);
        
        const channelFiles = files.filter(f => f.endsWith('_channel_data.json'));
        console.log(`📺 [CACHE DEBUG] Found channel data files:`, channelFiles);
        
        if (channelFiles.length > 0) {
          const channelDataFile = path.join(cacheDir, channelFiles[0]);
          console.log(`📄 [CACHE DEBUG] Using first available channel file: ${channelDataFile}`);
          
          const channelData = JSON.parse(await fs.readFile(channelDataFile, 'utf-8'));
          console.log(`📊 [CACHE DEBUG] Channel data loaded: ${channelData?.videos?.length || 0} videos for channel ${channelData?.channelId}`);
          return channelData;
        }
      } catch (error) {
        console.log(`❌ [CACHE DEBUG] Error scanning cache directory:`, error);
      }
    }
  } catch (error) {
    console.warn('❌ [CACHE DEBUG] Could not read channel cache:', error);
  }
  
  console.log(`❌ [CACHE DEBUG] No channel cache found at all`);
  return null;
}

// Smart scheduling based on time slot intervals with proper type-based conflict detection
function findAvailableTimeSlots(videos: VideoFile[], channelData: any, startDate: string, slotInterval: string = '24h', preferredStartTime: string = '07:00') {
  console.log(`\n=== SMART SCHEDULING ANALYSIS ===`);
  console.log(`Channel: ${channelData?.channelId || 'Unknown'}`);
  console.log(`Total cached videos: ${channelData?.videos?.length || 0}`);
  console.log(`Start date: ${startDate}`);
  console.log(`Slot interval: ${slotInterval}`);
  console.log(`Preferred start time: ${preferredStartTime}`);

  // Calculate time slots based on interval
  const timeSlots: string[] = [];
  const intervalHours = parseInt(slotInterval.replace('h', ''));
  
  if (intervalHours === 8) {
    // 3 times per day: spread 8 hours apart starting from preferred time
    const startHour = parseInt(preferredStartTime.split(':')[0]);
    for (let i = 0; i < 3; i++) {
      const hour = (startHour + (i * 8)) % 24;
      timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
  } else if (intervalHours === 12) {
    // 2 times per day: 12 hours apart
    const startHour = parseInt(preferredStartTime.split(':')[0]);
    timeSlots.push(preferredStartTime);
    timeSlots.push(`${((startHour + 12) % 24).toString().padStart(2, '0')}:00`);
  } else if (intervalHours === 24) {
    // Once per day
    timeSlots.push(preferredStartTime);
  } else if (intervalHours === 48) {
    // Every other day
    timeSlots.push(preferredStartTime);
  }
  
  console.log(`Time slots per day: ${timeSlots.join(', ')}`);

  const existingByDateAndTime = new Map<string, Map<string, { 
    regularVideos: boolean; 
    shorts: boolean; 
  }>>();

  // Analyze existing videos from cache
  if (channelData?.videos) {
    console.log(`\nAnalyzing existing videos...`);
    let processedCount = 0;
    channelData.videos.forEach((video: any) => {
      if (video.publishAt) {
        const publishDateTime = new Date(video.publishAt);
        const date = publishDateTime.toISOString().split('T')[0];
        const time = publishDateTime.toISOString().split('T')[1].substring(0, 5);

        let isShort = false;
        // Type detection for cached videos (width, height, duration)
        if (video.duration) {
          const match = video.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
          if (match) {
            const hours = parseInt(match[1] || '0');
            const minutes = parseInt(match[2] || '0');
            const seconds = parseInt(match[3] || '0');
            const totalSeconds = hours * 3600 + minutes * 60 + seconds;
            
            let isActuallyVertical = false;
            if (typeof video.width === 'number' && typeof video.height === 'number') {
              isActuallyVertical = video.height > video.width;
            } else {
              if (processedCount < 10) { // Log only for the first few to avoid spamming
                console.warn(`  [CACHE WARNING] Dimensions (width/height) missing or not numbers for cached video ${video.id}. Cannot determine if vertical. Type will be based on duration only for this entry.`);
              }
            }

            const durationIsShort = totalSeconds <= 180; // 3 minutes = 180 seconds
            isShort = isActuallyVertical && durationIsShort;
            
            if (processedCount < 10) {
              console.log(`    Cached Video: ID ${video.id}, Duration ${totalSeconds}s, Vertical: ${isActuallyVertical}, isShort (Vertical & <3min): ${isShort}`);
            }
          }
        } else {
          if (processedCount < 10) {
            console.log(`    No duration found for cached video ${video.id}, assuming REGULAR`);
          }
        }
        
        if (!existingByDateAndTime.has(date)) {
          existingByDateAndTime.set(date, new Map());
        }
        
        const dayData = existingByDateAndTime.get(date)!;
        if (!dayData.has(time)) {
          dayData.set(time, { regularVideos: false, shorts: false });
        }
        
        const timeSlotData = dayData.get(time)!;
        if (isShort) {
          timeSlotData.shorts = true;
        } else {
          timeSlotData.regularVideos = true;
        }
        
        processedCount++;
        if (processedCount <= 10) {
          console.log(`  ${date} ${time}: ${isShort ? 'SHORT' : 'REGULAR'} - "${video.title?.substring(0, 50)}..."`);
        }
      }
    });
    
    if (processedCount > 10) {
      console.log(`  ... and ${processedCount - 10} more videos`);
    }
  }
  
  // Schedule new videos - Each video independently finds the next available slot
  const scheduledVideos: VideoFile[] = [];
  
  console.log(`\nScheduling ${videos.length} new videos...`);
  
  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    const isShort = video.type === 'short';
    let scheduled = false;
    let attempts = 0;
    let searchDate = new Date(startDate); // Each video starts from the original start date
    let timeSlotIndex = 0; // Each video starts from the first time slot
    
    console.log(`\nVideo ${i + 1}: "${video.name}" (${isShort ? 'SHORT' : 'REGULAR'})`);
    console.log(`  Starting search from: ${searchDate.toISOString().split('T')[0]} at ${timeSlots[0]}`);
    
    while (!scheduled && attempts < 365) { // Allow up to 1 year of searching
      const dateStr = searchDate.toISOString().split('T')[0];
      
      // For 48h interval, only schedule on even days relative to start
      if (intervalHours === 48) {
        const daysDiff = Math.floor((searchDate.getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff % 2 !== 0) {
          searchDate.setDate(searchDate.getDate() + 1);
          attempts++;
          continue;
        }
      }
      
      const timeSlot = timeSlots[timeSlotIndex];
      const dayData = existingByDateAndTime.get(dateStr);
      const timeSlotData = dayData?.get(timeSlot);
      
      // Check if this time slot is available for this video type
      const hasConflict = (isShort && timeSlotData?.shorts) || (!isShort && timeSlotData?.regularVideos);

      if (hasConflict) {
        console.log(`  × ${dateStr} ${timeSlot}: Conflict. A ${isShort ? 'SHORT' : 'REGULAR'} video is already scheduled for this slot.`);
      } else {
        // Schedule the video
        console.log(`  → Scheduled ${dateStr} ${timeSlot}`);

        // Update the tracking for the slot
        if (!existingByDateAndTime.has(dateStr)) {
          existingByDateAndTime.set(dateStr, new Map());
        }
        const dayDataMap = existingByDateAndTime.get(dateStr)!;
        if (!dayDataMap.has(timeSlot)) {
          dayDataMap.set(timeSlot, { regularVideos: false, shorts: false });
        }
        const slotData = dayDataMap.get(timeSlot)!;
        
        if (isShort) {
          slotData.shorts = true;
        } else {
          slotData.regularVideos = true;
        }

        scheduledVideos.push({
          ...video,
          scheduledDate: dateStr,
          scheduledTime: timeSlot,
        });
        
        scheduled = true;
        break;
      }
      
      // Move to next time slot/day according to the interval
      timeSlotIndex = (timeSlotIndex + 1) % timeSlots.length;
      if (timeSlotIndex === 0) {
        // Moved through all time slots for this day, go to next day
        searchDate.setDate(searchDate.getDate() + 1);
      }
      attempts++;
    }
    
    if (!scheduled) {
      // Force schedule if we couldn't find a slot
      const dateStr = searchDate.toISOString().split('T')[0];
      const time = timeSlots[0];
      scheduledVideos.push({
        ...video,
        scheduledDate: dateStr,
        scheduledTime: time,
        conflict: true,
        conflictReason: `Could not find available ${isShort ? 'SHORT' : 'REGULAR'} slot in ${attempts} days searched`
      });
      console.log(`  ⚠️ CONFLICT: Forced scheduling on ${dateStr} ${time} after ${attempts} days searched`);
    }
  }
  
  console.log(`\n=== SCHEDULING COMPLETE ===`);
  console.log(`Scheduled ${scheduledVideos.length} videos`);
  console.log(`Conflicts: ${scheduledVideos.filter(v => v.conflict).length}`);
  
  return scheduledVideos;
}

// Node.js implementation with smart scheduling
async function discoverVideosNodeJS(inputFolder: string, analyzeTypes: boolean = false, generateSchedule: boolean = false, scheduleDate?: string, scheduleMode?: string, conflictMode?: string, slotInterval?: string, preferredTime?: string, processingMode?: string) {
  try {
    const folderExists = await fs.access(inputFolder).then(() => true).catch(() => false);
    
    if (!folderExists) {
      return {
        totalVideos: 0,
        totalSize: 0,
        estimatedDuration: 0,
        files: [],
        shortcuts: [],
        regularVideos: [],
        error: 'Folder does not exist'
      };
    }

    const files = await fs.readdir(inputFolder);
    const videoFiles: VideoFile[] = [];
    let totalSize = 0;

    for (const file of files) {
      const filePath = path.join(inputFolder, file);
      const ext = path.extname(file).toLowerCase();
      
      if (SUPPORTED_FORMATS.has(ext)) {
        try {
          const stats = await fs.stat(filePath);
          if (stats.isFile()) {
            const fileInfo: VideoFile = {
              name: file,
              path: filePath,
              size: stats.size,
              type: 'regular', // Default to regular without analysis
              duration: 0,
              width: 1920,
              height: 1080,
              aspectRatio: 1.78,
              scheduledDate: null,
              scheduledTime: null,
              conflict: false,
              conflictReason: null
            };

            // Try to get video metadata if analyzeTypes is true
            if (analyzeTypes) {
              try {
                const metadata = await getVideoMetadata(filePath);
                Object.assign(fileInfo, metadata);
              } catch (error) {
                console.warn(`Could not analyze video ${file}:`, error);
              }
            }

            videoFiles.push(fileInfo);
            totalSize += stats.size;
          }
        } catch (error) {
          console.warn(`Error reading file ${file}:`, error);
        }
      }
    }

    // 🚀 SINGLE UPLOAD FIX: For single upload mode, only process the first video
    let videosToProcess = videoFiles;
    console.log(`🎯 [SINGLE UPLOAD DEBUG] Processing mode: "${processingMode}"`);
    console.log(`🎯 [SINGLE UPLOAD DEBUG] Total videos found: ${videoFiles.length}`);
    if (processingMode === 'full-upload') {
      console.log(`🎯 [SINGLE UPLOAD] Processing mode is 'full-upload' - limiting to first video only`);
      videosToProcess = videoFiles.slice(0, 1);
      console.log(`🎯 [SINGLE UPLOAD] Videos after filtering: ${videosToProcess.length} (should be 1)`);
      if (videosToProcess.length > 0) {
        console.log(`🎯 [SINGLE UPLOAD] Selected video: ${videosToProcess[0].name}`);
      }
    } else {
      console.log(`🎯 [SINGLE UPLOAD DEBUG] Not single upload mode, processing all ${videosToProcess.length} videos`);
    }

    // Apply smart scheduling if requested
    let scheduledFiles = videosToProcess;
    
    console.log(`\n🧠 [SCHEDULING DEBUG] Parameters:`);
    console.log(`  generateSchedule: ${generateSchedule}`);
    console.log(`  scheduleMode: "${scheduleMode}"`);
    console.log(`  conflictMode: "${conflictMode}"`);
    console.log(`  videosToProcess.length: ${videosToProcess.length}`);
    console.log(`  Smart scheduling condition: ${generateSchedule && scheduleMode === 'smart' && conflictMode === 'smart-analysis' && videosToProcess.length > 0}`);
    
    if (generateSchedule && scheduleMode === 'smart' && conflictMode === 'smart-analysis' && videosToProcess.length > 0) {
      console.log(`🚀 [SCHEDULING DEBUG] Starting smart scheduling...`);
      const channelData = await readChannelCache();
      const startDate = scheduleDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Tomorrow
      
      if (channelData) {
        console.log(`✅ [SCHEDULING DEBUG] Found cached data for channel ${channelData.channelId} with ${channelData.videos?.length || 0} videos`);
        scheduledFiles = findAvailableTimeSlots(videosToProcess, channelData, startDate, slotInterval || '24h', preferredTime || '07:00');
      } else {
        console.log(`❌ [SCHEDULING DEBUG] No cached channel data found. Smart scheduling requires a channel scan. Aborting scheduling.`);
        // No fallback - return unscheduled files. The UI should handle this state.
        scheduledFiles = videosToProcess.map(file => ({
          ...file,
          conflict: true,
          conflictReason: 'Smart scheduling requires cached channel data. Please scan the channel first.'
        }));
      }
    } else {
      console.log(`⏭️ [SCHEDULING DEBUG] Skipping smart scheduling (condition not met)`);
    }

    // Separate shorts and regular videos
    const shortcuts = scheduledFiles.filter(f => f.type === 'short');
    const regularVideos = scheduledFiles.filter(f => f.type === 'regular');

    const result = {
      totalVideos: videoFiles.length, // Show total discovered for UI display
      totalSize,
      estimatedDuration: videoFiles.reduce((total, file) => total + (file.duration || 60), 0),
      files: scheduledFiles,
      shortcuts: shortcuts.map(file => ({
        file,
        scheduledDate: file.scheduledDate!,
        scheduledTime: file.scheduledTime!
      })),
      regularVideos: regularVideos.map(file => ({
        file,
        scheduledDate: file.scheduledDate!,
        scheduledTime: file.scheduledTime!
      }))
    };

    // Add scheduling preview if schedule was generated
    if (generateSchedule && scheduleMode === 'smart' && scheduledFiles.length > 0) {
      const dates = scheduledFiles.map(f => f.scheduledDate!).filter(Boolean);
      const conflicts = scheduledFiles.filter(f => f.conflict).length;
      
      (result as any).schedulingPreview = {
        firstUpload: dates[0],
        lastUpload: dates[dates.length - 1],
        totalDays: new Set(dates).size,
        shortSlots: shortcuts.length,
        regularSlots: regularVideos.length,
        conflicts: conflicts
      };
      
      // 🎯 [SINGLE UPLOAD FIX] Add debug info for single upload mode
      if (processingMode === 'full-upload') {
        console.log(`📅 [API DEBUG] Single upload mode - scheduling preview limited to ${scheduledFiles.length} video(s)`);
        console.log(`📅 [API DEBUG] Scheduling preview: ${JSON.stringify((result as any).schedulingPreview, null, 2)}`);
      }
    }

    // 🔧 [COMPREHENSIVE DEBUG] Add comprehensive debugging for all issues
    console.log(`\n=== COMPREHENSIVE SCHEDULING DEBUG ===`);
    console.log(`Processing Mode: ${processingMode}`);
    console.log(`Slot Interval: ${slotInterval}`);
    console.log(`Schedule Mode: ${scheduleMode}`);
    console.log(`Videos Found: ${videoFiles.length}`);
    console.log(`Videos Scheduled: ${scheduledFiles.length}`);
    console.log(`Generate Schedule: ${generateSchedule}`);
    
    if (processingMode === 'full-upload' && scheduledFiles.length > 1) {
      console.warn(`⚠️ [SINGLE UPLOAD WARNING] Single upload mode but ${scheduledFiles.length} videos scheduled!`);
    }
    
    if (result.schedulingPreview) {
      console.log(`Scheduling Preview:`, result.schedulingPreview);
    }
    console.log(`=== END COMPREHENSIVE DEBUG ===\n`);

    return result;
  } catch (error) {
    console.error('Node.js video discovery error:', error);
    return {
      totalVideos: 0,
      totalSize: 0,
      estimatedDuration: 0,
      files: [],
      shortcuts: [],
      regularVideos: [],
      error: 'Failed to discover videos'
    };
  }
}

// Video metadata extraction using ffprobe
const videoMetadataCache = new Map<string, Partial<VideoFile>>();

async function getVideoMetadata(filePath: string): Promise<Partial<VideoFile>> {
  // Check cache first
  if (videoMetadataCache.has(filePath)) {
    console.log(`🎥 [VIDEO DEBUG] Using cached metadata for ${path.basename(filePath)}`);
    return videoMetadataCache.get(filePath)!;
  }

  return new Promise((resolve) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height:format=duration',
      '-of', 'json',
      filePath
    ]);

    let stdout = '';

    ffprobe.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code === 0 && stdout) {
        try {
          const data = JSON.parse(stdout);
          const stream = data.streams?.[0];
          const format = data.format;
          
          if (stream) {
            const width = parseInt(stream.width) || 1920;
            const height = parseInt(stream.height) || 1080;
            const duration = format?.duration ? parseFloat(format.duration) : 60;
            const aspectRatio = width / height;
            
            // Determine if it's a Short based on dimensions
            // 1080x1920 = Shorts, 1920x1080 = Regular
            const type = (width === 1080 && height === 1920) ? 'short' : 'regular';
            
            console.log(`🎥 [VIDEO DEBUG] ${path.basename(filePath)}: ${width}x${height} (ratio: ${aspectRatio.toFixed(2)}) - ${duration.toFixed(1)}s - Type: ${type.toUpperCase()}`);
            console.log(`   Format-based type: ${width}x${height} → ${type.toUpperCase()}`);
            
            const result = {
              width,
              height,
              duration,
              aspectRatio,
              type
            };
            
            // Cache the result
            videoMetadataCache.set(filePath, result);
            
            resolve(result);
            return;
          }
        } catch (error) {
          console.warn(`Failed to parse ffprobe output:`, error);
        }
      }
      
      // Default values if ffprobe fails
      console.log(`🎥 [VIDEO DEBUG] ${path.basename(filePath)}: ffprobe failed, using defaults (1920x1080, 60s, regular)`);
      const result = {
        width: 1920,
        height: 1080,
        duration: 60,
        aspectRatio: 1.78,
        type: 'regular' as const
      };
      
      // Cache the default result too
      videoMetadataCache.set(filePath, result);
      
      resolve(result);
    });
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = body ? JSON.parse(body) : {};
    
    console.log(`\n🚀 [API DEBUG] POST /api/discover-videos called with params:`, JSON.stringify(params, null, 2));
    
    const { 
      inputFolder, 
      analyzeTypes = false, 
      generateSchedule = false, 
      scheduleDate, 
      scheduleMode, 
      conflictMode, 
      slotInterval = '24h',
      preferredTime = '07:00',
      processingMode
    } = params;

    console.log(`🔧 [API DEBUG] Extracted parameters:`);
    console.log(`  inputFolder: "${inputFolder}"`);
    console.log(`  analyzeTypes: ${analyzeTypes}`);
    console.log(`  generateSchedule: ${generateSchedule}`);
    console.log(`  scheduleDate: "${scheduleDate}"`);
    console.log(`  scheduleMode: "${scheduleMode}"`);
    console.log(`  conflictMode: "${conflictMode}"`);
    console.log(`  slotInterval: "${slotInterval}"`);
    console.log(`  preferredTime: "${preferredTime}"`);
    console.log(`  processingMode: "${processingMode}"`);

    if (!inputFolder) {
      return NextResponse.json({ error: 'Input folder is required' }, { status: 400 });
    }

    // Use Node.js implementation with smart scheduling
    const result = await discoverVideosNodeJS(inputFolder, analyzeTypes, generateSchedule, scheduleDate, scheduleMode, conflictMode, slotInterval, preferredTime, processingMode);
    
    console.log(`✅ [API DEBUG] Returning result with ${result.files?.length || 0} files`);
    if (result.schedulingPreview) {
      console.log(`📅 [API DEBUG] Scheduling preview:`, result.schedulingPreview);
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      totalVideos: 0,
      totalSize: 0,
      estimatedDuration: 0,
      files: [],
      shortcuts: [],
      regularVideos: [],
      error: 'Internal server error'
    }, { status: 500 });
  }
} 