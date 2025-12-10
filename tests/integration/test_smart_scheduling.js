// Test script for smart scheduling with a short video
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  channelId: 'UCyEJy0X-TquYLnp0siZnvog', // Your channel ID
  startDate: new Date(), // Today
  preferredTime: '07:00', // 7 AM
  slotInterval: '24h', // 24 hour interval
  newVideoType: 'short', // The new video is a short
};

// Global variable to track scheduled videos
const existingByDateAndTime = new Map();

// Simulate reading channel cache
function readChannelCache() {
  console.log('🔍 Reading channel cache...');
  
  try {
    // Create a simulated channel data structure with more realistic data
    const today = new Date();
    
    // Create tomorrow date correctly
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);
    
    const channelData = {
      channelId: config.channelId,
      title: 'Your Channel',
      videos: [
        // Existing videos in your channel (simulated)
        {
          id: 'video1',
          title: 'Existing Regular Video 1',
          publishAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
          duration: 'PT10M30S', // 10 minutes 30 seconds
          width: 1920,
          height: 1080
        },
        {
          id: 'video2',
          title: 'Existing Short 1',
          publishAt: new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          duration: 'PT59S', // 59 seconds
          width: 1080,
          height: 1920
        },
        {
          id: 'video3',
          title: 'Today Morning Regular Video',
          publishAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 7, 0, 0).toISOString(), // Today at 7 AM
          duration: 'PT5M', // 5 minutes
          width: 1920,
          height: 1080
        },
        {
          id: 'video4',
          title: 'Today Morning Short',
          publishAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 7, 0, 0).toISOString(), // Today at 7 AM
          duration: 'PT45S', // 45 seconds
          width: 1080,
          height: 1920
        },
        {
          id: 'video5',
          title: 'Tomorrow Morning Short (ALREADY SCHEDULED)',
          publishAt: new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 7, 0, 0).toISOString(), // Tomorrow at 7 AM
          duration: 'PT50S', // 50 seconds
          width: 1080,
          height: 1920
        },
        // Add more videos as needed
      ]
    };
    
    console.log(`✅ Found ${channelData.videos.length} videos in channel cache`);
    return channelData;
  } catch (error) {
    console.error('❌ Error reading channel cache:', error);
    return null;
  }
}

// Analyze existing videos and find available slots
function findAvailableTimeSlots(newVideo, channelData, startDate, slotInterval, preferredStartTime) {
  console.log('\n=== SMART SCHEDULING ANALYSIS ===');
  console.log(`Channel: ${channelData.channelId}`);
  console.log(`Total cached videos: ${channelData.videos.length}`);
  console.log(`Start date: ${startDate.toISOString().split('T')[0]}`);
  console.log(`Slot interval: ${slotInterval}`);
  console.log(`Preferred start time: ${preferredStartTime}`);
  console.log(`New video type: ${newVideo.type}`);

  // Calculate time slots based on interval
  const timeSlots = [];
  const intervalHours = parseInt(slotInterval.replace('h', ''));
  
  if (intervalHours === 24) {
    // Once per day
    timeSlots.push(preferredStartTime);
    console.log(`Time slots per day: ${timeSlots.join(', ')}`);
  } else {
    console.log('This test is for 24h intervals only');
    return null;
  }

  // Create a map to track existing videos by date and time
  // We're using the global existingByDateAndTime map

  // Analyze existing videos from cache
  console.log('\nAnalyzing existing videos...');
  channelData.videos.forEach(video => {
    if (video.publishAt) {
      const publishDateTime = new Date(video.publishAt);
      const date = publishDateTime.toISOString().split('T')[0];
      const time = publishDateTime.toISOString().split('T')[1].substring(0, 5);

      // Determine if it's a short based on dimensions and duration
      let isShort = false;
      if (video.duration) {
        const match = video.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (match) {
          const hours = parseInt(match[1] || '0');
          const minutes = parseInt(match[2] || '0');
          const seconds = parseInt(match[3] || '0');
          const totalSeconds = hours * 3600 + minutes * 60 + seconds;
          
          const isVertical = video.height > video.width;
          const durationIsShort = totalSeconds <= 180; // 3 minutes = 180 seconds
          isShort = isVertical && durationIsShort;
          
          console.log(`  Video: ${video.title}, Duration ${totalSeconds}s, Vertical: ${isVertical}, isShort: ${isShort}`);
        }
      }
      
      if (!existingByDateAndTime.has(date)) {
        existingByDateAndTime.set(date, new Map());
      }
      
      const dayData = existingByDateAndTime.get(date);
      if (!dayData.has(time)) {
        dayData.set(time, { regularVideos: false, shorts: false });
      }
      
      const timeSlotData = dayData.get(time);
      if (isShort) {
        timeSlotData.shorts = true;
      } else {
        timeSlotData.regularVideos = true;
      }
      
      console.log(`  ${date} ${time}: ${isShort ? 'SHORT' : 'REGULAR'} - "${video.title}"`);
    }
  });
  
  // Schedule the new video
  console.log('\nScheduling new video...');
  const isShort = newVideo.type === 'short';
  let scheduled = false;
  let attempts = 0;
  let searchDate = new Date(startDate);
  let timeSlotIndex = 0;
  
  while (!scheduled && attempts < 14) { // Try up to 14 days
    const dateStr = searchDate.toISOString().split('T')[0];
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
      const dayDataMap = existingByDateAndTime.get(dateStr);
      if (!dayDataMap.has(timeSlot)) {
        dayDataMap.set(timeSlot, { regularVideos: false, shorts: false });
      }
      const slotData = dayDataMap.get(timeSlot);
      
      if (isShort) {
        slotData.shorts = true;
      } else {
        slotData.regularVideos = true;
      }

      scheduled = true;
      return {
        name: newVideo.name,
        type: newVideo.type,
        scheduledDate: dateStr,
        scheduledTime: timeSlot,
      };
    }
    
    // Move to next day (for 24h interval)
    searchDate.setDate(searchDate.getDate() + 1);
    attempts++;
  }
  
  if (!scheduled) {
    // Force schedule if we couldn't find a slot
    const dateStr = searchDate.toISOString().split('T')[0];
    const time = timeSlots[0];
    console.log(`  ⚠️ CONFLICT: Forced scheduling on ${dateStr} ${time} after ${attempts} days searched`);
    
    return {
      name: newVideo.name,
      type: newVideo.type,
      scheduledDate: dateStr,
      scheduledTime: time,
      conflict: true,
      conflictReason: `Could not find available ${isShort ? 'SHORT' : 'REGULAR'} slot in ${attempts} days searched`
    };
  }
}

// Run the test
console.log('🚀 Starting Smart Scheduling Test');
console.log('=================================');

// Define our new video
const newVideo = {
  name: 'My New Short Video.mp4',
  type: config.newVideoType,
  duration: 45, // seconds
  width: 1080,
  height: 1920
};

// Get channel data
const channelData = readChannelCache();
if (!channelData) {
  console.error('❌ Test failed: Could not read channel data');
  process.exit(1);
}

// Find available slot
const scheduledVideo = findAvailableTimeSlots(
  newVideo,
  channelData,
  config.startDate,
  config.slotInterval,
  config.preferredTime
);

// Show results
console.log('\n=== SCHEDULING RESULT ===');
if (scheduledVideo) {
  console.log(`Video: ${scheduledVideo.name} (${scheduledVideo.type.toUpperCase()})`);
  console.log(`Scheduled for: ${scheduledVideo.scheduledDate} at ${scheduledVideo.scheduledTime}`);
  if (scheduledVideo.conflict) {
    console.log(`⚠️ Warning: ${scheduledVideo.conflictReason}`);
  } else {
    console.log('✅ Successfully scheduled without conflicts');
  }
} else {
  console.log('❌ Failed to schedule video');
}

console.log('\n=== SCHEDULE PREVIEW ===');
console.log('Date       | Time  | Regular | Short');
console.log('---------------------------------------');

// Show a calendar view of the next 7 days
const startDay = new Date(config.startDate);
for (let i = 0; i < 7; i++) {
  const currentDate = new Date(startDay);
  currentDate.setDate(currentDate.getDate() + i);
  const dateStr = currentDate.toISOString().split('T')[0];
  
  const dayData = existingByDateAndTime.get(dateStr);
  const timeSlotData = dayData?.get(config.preferredTime);
  
  const hasRegular = timeSlotData?.regularVideos ? '  ✓   ' : '      ';
  const hasShort = timeSlotData?.shorts ? '  ✓  ' : '     ';
  
  console.log(`${dateStr} | ${config.preferredTime} | ${hasRegular} | ${hasShort}`);
} 